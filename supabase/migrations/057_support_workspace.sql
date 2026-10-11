begin;
alter table public.tenants add column if not exists is_internal boolean not null default false;
-- Identify internal spaces by support-only membership, never by a fuzzy name match.
update tenants t set is_internal=true where exists(select 1 from tenant_memberships m where m.tenant_id=t.id and m.role='super_admin') and not exists(select 1 from tenant_memberships m where m.tenant_id=t.id and m.role in ('owner','admin','master'));
alter table studio_access_requests drop constraint if exists studio_access_requests_status_check;
alter table studio_access_requests add constraint studio_access_requests_status_check check(status in ('pending','contacted','approved','rejected'));
create or replace function public.support_password_at() returns timestamptz language sql stable set search_path=public as $$
 select to_timestamp(max((a->>'timestamp')::double precision)) from jsonb_array_elements(coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->'amr','[]')) a where a->>'method'='password';
$$;
create or replace function public.is_support_user() returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(auth.uid() is not null and exists(select 1 from tenant_memberships where user_id=auth.uid() and role='super_admin' and active)
 and nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'aal'='aal2'
 and support_password_at()>now()-interval '30 minutes',false);
$$;
create or replace function public.require_support_write() returns void language plpgsql stable security definer set search_path=public as $$begin
 if not coalesce(is_support_user(),false) then raise exception 'Потрібні права підтримки та двофакторний вхід' using errcode='42501';end if;
 if support_password_at() is null or support_password_at()<=now()-interval '5 minutes' then raise exception 'Підтвердіть пароль повторно' using errcode='42501';end if;
end $$;
-- Support data never uses the client's choice of role or a hidden navigation item.
create table if not exists public.payments(
 id uuid primary key,studio_id uuid not null references tenants(id),amount numeric(12,2) not null check(amount>=0),
 method text not null check(method in ('transfer','card','cash')),paid_on date not null,comment text not null default '',
 months_added integer not null check(months_added in (1,3,12)),period_from timestamptz not null,period_to timestamptz not null,
 created_by uuid not null references profiles(id),created_at timestamptz not null default now(),check(period_to>period_from));
alter table payments enable row level security;
revoke all on payments from public,anon,authenticated;
grant select on payments to authenticated;
drop policy if exists support_payments on payments;
create policy support_payments on payments for select to authenticated using(coalesce(is_support_user(),false));
create index if not exists payments_studio_date_idx on payments(studio_id,created_at desc);
create or replace function public.support_studios_page(search_input text default '',offset_input integer default 0,filter_input text default '',sort_input text default 'access_end',desc_input boolean default false) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare rows jsonb;total bigint;begin
 if not coalesce(is_support_user(),false) then raise exception 'Потрібні права підтримки' using errcode='42501';end if;
 if offset_input<0 or sort_input not in ('name','plan','status','access_end','staff_count','client_count','last_activity') or filter_input not in ('','ending','trial','renew','active') then raise exception 'Невірний фільтр';end if;
 with studios as (
 select t.id,t.name,t.slug,t.timezone,t.phone,t.email,s.plan,s.status,s.trial_ends_at,s.current_period_end,
 case when s.status='trialing' then s.trial_ends_at else s.current_period_end end access_end,
 (select count(*) from staff_profiles p where p.tenant_id=t.id and p.active) staff_count,
 (select count(*) from clients c where c.tenant_id=t.id) client_count,
 greatest((select max(a.created_at) from audit_logs a where a.tenant_id=t.id),(select max(w.updated_at) from work_order_jobs w where w.tenant_id=t.id),(select max(u.last_sign_in_at) from tenant_memberships m join auth.users u on u.id=m.user_id where m.tenant_id=t.id and m.active)) last_activity
 from tenants t left join subscriptions s on s.tenant_id=t.id where not t.is_internal and concat_ws(' ',t.id::text,t.name,t.slug,t.email,t.phone) ilike '%'||left(coalesce(search_input,''),200)||'%'
 ),filtered as(select * from studios where filter_input='' or (filter_input='ending' and status in ('active','trialing') and access_end>now() and access_end<=now()+interval '7 days') or (filter_input='trial' and status='trialing') or (filter_input='renew' and (access_end is null or access_end<=now() or status in ('past_due','cancelled'))) or (filter_input='active' and status='active' and access_end>now())),paged as(
 select * from filtered order by
 case when not desc_input and sort_input in ('name','plan','status') then case sort_input when 'name' then name when 'plan' then plan else status end end asc nulls first,
 case when desc_input and sort_input in ('name','plan','status') then case sort_input when 'name' then name when 'plan' then plan else status end end desc nulls last,
 case when not desc_input and sort_input in ('staff_count','client_count') then case sort_input when 'staff_count' then staff_count else client_count end end asc,
 case when desc_input and sort_input in ('staff_count','client_count') then case sort_input when 'staff_count' then staff_count else client_count end end desc,
 case when not desc_input and sort_input in ('access_end','last_activity') then case sort_input when 'access_end' then access_end else last_activity end end asc nulls first,
 case when desc_input and sort_input in ('access_end','last_activity') then case sort_input when 'access_end' then access_end else last_activity end end desc nulls last,id limit 25 offset offset_input)
 select coalesce((select jsonb_agg(to_jsonb(p)) from paged p),'[]'),(select count(*) from filtered) into rows,total;
 return jsonb_build_object('rows',rows,'total',total);
end $$;
create or replace function public.support_platform_summary(from_input date,to_input date) returns jsonb language plpgsql stable security definer set search_path=public as $$begin
 if not coalesce(is_support_user(),false) then raise exception 'Потрібні права підтримки' using errcode='42501';end if;
 if from_input is null or to_input is null or to_input<from_input then raise exception 'Перевірте період';end if;
 return (with eligible as(select s.* from subscriptions s join tenants t on t.id=s.tenant_id where not t.is_internal),cohort as(select s.tenant_id from eligible s left join studio_access_requests r on r.tenant_id=s.tenant_id and r.status='approved' where coalesce(r.reviewed_at,s.created_at)::date between from_input and to_input and (s.trial_ends_at is not null or r.id is not null))
 select jsonb_build_object('paid_by_plan',coalesce((select jsonb_object_agg(plan,n) from(select plan,count(*) n from eligible where status='active' and current_period_end>now() group by plan) p),'{}'),
 'trial',(select count(*) from eligible where status='trialing' and trial_ends_at>now()),
 'ending',(select count(*) from eligible where status in ('active','trialing') and case when status='trialing' then trial_ends_at else current_period_end end between now() and now()+interval '7 days'),
 'cohort',(select count(*) from cohort),'converted',(select count(*) from cohort c where exists(select 1 from payments p where p.studio_id=c.tenant_id and p.paid_on<=to_input) or exists(select 1 from audit_logs a where a.tenant_id=c.tenant_id and a.entity_type='subscriptions' and a.after_data->>'status'='active' and a.created_at::date<=to_input))));
end $$;
create or replace function public.support_add_payment(studio uuid,request_input uuid,amount_input numeric,method_input text,paid_on_input date,months_input integer,comment_input text default '') returns uuid language plpgsql security definer set search_path=public as $$
declare existing payments;sub subscriptions;start_value timestamptz;end_value timestamptz;begin
 perform require_support_write();
 if request_input is null or amount_input is null or amount_input<0 or amount_input>9999999999.99 or method_input is null or method_input not in ('transfer','card','cash') or months_input is null or months_input not in (1,3,12) or paid_on_input is null or paid_on_input>current_date or (amount_input=0 and length(trim(coalesce(comment_input,'')))<5) or length(coalesce(comment_input,''))>1900 then raise exception 'Вкажіть суму, спосіб, дату та період оплати';end if;
 perform 1 from tenants where id=studio and not is_internal for update;if not found then raise exception 'Студію не знайдено';end if;
 select * into existing from payments where id=request_input;
 if found then
  if existing.studio_id<>studio or existing.amount<>amount_input or existing.method<>method_input or existing.paid_on<>paid_on_input or existing.months_added<>months_input or existing.comment<>coalesce(comment_input,'') then raise exception 'Ідентифікатор платежу вже використано';end if;return existing.id;
 end if;
 select * into sub from subscriptions where tenant_id=studio for update;
 start_value=greatest(now(),case when sub.status='trialing' then sub.trial_ends_at else sub.current_period_end end);end_value=start_value+make_interval(months=>months_input);
 perform support_set_subscription(studio,coalesce(sub.plan,'start'),'active',end_value,'Ручна оплата: '||request_input::text||' '||coalesce(comment_input,''));
 insert into payments(id,studio_id,amount,method,paid_on,comment,months_added,period_from,period_to,created_by) values(request_input,studio,amount_input,method_input,paid_on_input,coalesce(comment_input,''),months_input,start_value,end_value,auth.uid());
 return request_input;
end $$;
create or replace function public.support_studio_timeline(studio uuid,page_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path=public as $$begin
 if not coalesce(is_support_user(),false) then raise exception 'Потрібні права підтримки' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(r)) from (
 select e.*,coalesce(p.full_name,'—') actor_name from (
 select id,created_at,created_by actor_id,'payment' kind,jsonb_build_object('amount',amount,'method',method,'paid_on',paid_on,'reason',comment,'months',months_added,'end',period_to) detail from payments where studio_id=studio
 union all select id,created_at,actor_id,'change',jsonb_build_object('before',before_data,'after',after_data,'reason',after_data->>'reason') from audit_logs where tenant_id=studio and entity_type='subscriptions' and action='support_adjustment'
 ) e left join profiles p on p.id=e.actor_id order by created_at desc,id desc limit 25 offset greatest(page_offset,0)) r),'[]');
end $$;
create or replace function public.support_applications_queue() returns jsonb language plpgsql stable security definer set search_path=public as $$begin
 if not coalesce(is_support_user(),false) then raise exception 'Потрібні права підтримки' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(x)) from(select r.*,p.full_name,u.email,u.email_confirmed_at is not null email_confirmed,reviewer.full_name reviewed_name
 from studio_access_requests r join profiles p on p.id=r.user_id join auth.users u on u.id=r.user_id left join profiles reviewer on reviewer.id=r.reviewed_by order by r.created_at desc) x),'[]');
end $$;
create or replace function public.support_contact_application(request_id uuid,note_input text) returns void language plpgsql security definer set search_path=public as $$begin
 perform require_support_write();if length(trim(coalesce(note_input,'')))<3 then raise exception 'Вкажіть результат зв’язку';end if;
 update studio_access_requests set status='contacted',review_note=left(note_input,2000),reviewed_by=auth.uid(),reviewed_at=now() where id=request_id and status='pending';
 if not found then raise exception 'Заявку вже оброблено';end if;
end $$;
create or replace function public.audit_support_application() returns trigger language plpgsql security definer set search_path=public as $$begin
 if new.status is distinct from old.status then insert into audit_logs(tenant_id,actor_id,entity_type,entity_id,action,before_data,after_data)
 values(coalesce(new.tenant_id,(select tenant_id from tenant_memberships where user_id=auth.uid() and role='super_admin' and active limit 1)),auth.uid(),'studio_access_requests',new.id,'support_review',to_jsonb(old),to_jsonb(new)||jsonb_build_object('reason',new.review_note));end if;return new;
end $$;
drop trigger if exists audit_support_application on studio_access_requests;
create trigger audit_support_application after update on studio_access_requests for each row execute function audit_support_application();
create or replace function public.support_set_subscription(studio uuid,plan_input text,status_input text,end_input timestamptz,note_input text) returns void language plpgsql security definer set search_path=public as $$
declare prior jsonb;subscription_id uuid;begin
 perform require_support_write();
 if plan_input is null or status_input is null or note_input is null or plan_input not in ('start','studio','pro') or status_input not in ('trialing','active','past_due','cancelled') or length(trim(note_input))<5 or length(note_input)>2000 then raise exception 'Оберіть тариф, статус та вкажіть причину зміни';end if;
 if status_input in ('active','trialing') and (end_input is null or end_input<=now() or end_input>now()+interval '2 years') then raise exception 'Вкажіть майбутню дату завершення, не більше двох років';end if;
 perform 1 from tenants where id=studio and not is_internal for update;
 if not found then raise exception 'Студію не знайдено';end if;
 select to_jsonb(s) into prior from subscriptions s where tenant_id=studio for update;
 insert into subscriptions(tenant_id,plan,status,trial_ends_at,current_period_end)
 values(studio,plan_input,status_input,case when status_input='trialing' then end_input end,case when status_input='active' then end_input end)
 on conflict(tenant_id) do update set plan=excluded.plan,status=excluded.status,
 trial_ends_at=case when excluded.status='trialing' then excluded.trial_ends_at else subscriptions.trial_ends_at end,
 current_period_end=case when excluded.status='active' then excluded.current_period_end else subscriptions.current_period_end end,updated_at=now()
 returning id into subscription_id;
 insert into audit_logs(tenant_id,actor_id,entity_type,entity_id,action,before_data,after_data) values(studio,auth.uid(),'subscriptions', subscription_id,'support_adjustment',prior,jsonb_build_object('plan',plan_input,'status',status_input,'end',end_input,'reason',trim(note_input)));
end$$;

create or replace function public.support_review_application(request_id uuid,approve boolean,note text default '') returns uuid
language plpgsql security definer set search_path=public as $$
declare application public.studio_access_requests; studio_id uuid; owner_email text;
begin
 perform require_support_write();
 select * into application from public.studio_access_requests where id=request_id for update;
 if application.id is null then raise exception 'Заявку не знайдено'; end if;
 if application.status='approved' and approve then return application.tenant_id; end if;
 if application.status not in ('pending','contacted') then raise exception 'Заявку вже розглянуто'; end if;
 if not approve then
  if length(trim(note))=0 then raise exception 'Вкажіть причину відмови'; end if;
  update public.studio_access_requests set status='rejected',review_note=left(trim(note),2000),reviewed_by=auth.uid(),reviewed_at=now() where id=request_id;
  return null;
 end if;
 select email into owner_email from auth.users where id=application.user_id and email_confirmed_at is not null;
 if owner_email is null then raise exception 'Власник ще не підтвердив email'; end if;
 if exists(select 1 from public.tenant_memberships where user_id=application.user_id) then raise exception 'Акаунт уже має робочий профіль. Перевірте його перед активацією'; end if;
 studio_id=gen_random_uuid();
 insert into public.tenants(id,name,slug,phone,email) values(studio_id,application.studio_name,'studio-'||replace(studio_id::text,'-',''),application.phone,owner_email);
 insert into public.tenant_memberships(tenant_id,user_id,role) values(studio_id,application.user_id,'owner');
 insert into public.reminder_settings(tenant_id) values(studio_id);
 insert into public.subscriptions(tenant_id,plan,status,trial_ends_at) values(studio_id,'start','trialing',now()+interval '14 days');
 update public.studio_access_requests set status='approved',tenant_id=studio_id,reviewed_by=auth.uid(),review_note=left(trim(note),2000),reviewed_at=now() where id=request_id;
 return studio_id;
end;
$$;
create or replace function public.support_list_studios(search_input text default '',offset_input integer default 0) returns jsonb language plpgsql security definer set search_path=public as $$begin
 if not coalesce(is_support_user(),false) then raise exception 'Потрібні права підтримки';end if;
 if offset_input<0 then raise exception 'Некоректна сторінка';end if;
 return coalesce((select jsonb_agg(x) from(select t.id,t.name,t.slug,t.timezone,t.phone,t.email,t.created_at,s.plan,s.status,s.trial_ends_at,s.current_period_end,
 (select count(*) from staff_profiles p where p.tenant_id=t.id and p.active) staff_count,
 (select count(*) from clients c where c.tenant_id=t.id) client_count
 from tenants t left join subscriptions s on s.tenant_id=t.id where not t.is_internal and concat_ws(' ',t.id::text,t.name,t.slug,t.email,t.phone) ilike '%'||left(coalesce(search_input,''),100)||'%' order by t.created_at desc,t.id offset offset_input limit 50)x),'[]');
end$$;

revoke all on function public.support_password_at() from public,anon;
grant execute on function public.support_password_at() to authenticated;
revoke all on function public.require_support_write() from public,anon;
grant execute on function public.require_support_write() to authenticated;
revoke all on function public.support_studios_page(text,integer,text,text,boolean) from public,anon;
grant execute on function public.support_studios_page(text,integer,text,text,boolean) to authenticated;
revoke all on function public.support_platform_summary(date,date) from public,anon;
grant execute on function public.support_platform_summary(date,date) to authenticated;
revoke all on function public.support_add_payment(uuid,uuid,numeric,text,date,integer,text) from public,anon;
grant execute on function public.support_add_payment(uuid,uuid,numeric,text,date,integer,text) to authenticated;
revoke all on function public.support_studio_timeline(uuid,integer) from public,anon;
grant execute on function public.support_studio_timeline(uuid,integer) to authenticated;
revoke all on function public.support_applications_queue() from public,anon;
grant execute on function public.support_applications_queue() to authenticated;
revoke all on function public.support_contact_application(uuid,text) from public,anon;
grant execute on function public.support_contact_application(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
