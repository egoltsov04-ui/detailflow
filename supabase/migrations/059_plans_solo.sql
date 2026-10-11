begin;
-- Detect the first upgrade before installing the new configuration. Re-running
-- this migration must not assign legacy prices to studios created afterwards.
select set_config('detailflow.upgrade_legacy_plans',(to_regprocedure('public.plan_configuration()') is null)::text,true);
-- GENERATED from src/lib/plans.ts by scripts/build-plan-config.mjs.
create or replace function public.plan_configuration() returns jsonb language sql immutable set search_path=public as $$select '[{"id":"solo","name":"Solo","audience":"Майстер, що працює сам","price":390,"staffLimit":1,"adminLimit":0,"storageGB":2,"limit":"1 майстер — власник","features":{"team_module":false,"warehouse":false,"finance_full":false,"analytics_full":false,"repeat_visit_reminders":false,"priority_support":false}},{"id":"studio","name":"Студія","audience":"Команда з 2–5 майстрів","price":1190,"staffLimit":5,"adminLimit":3,"storageGB":10,"limit":"До 5 активних майстрів","features":{"team_module":true,"warehouse":true,"finance_full":true,"analytics_full":true,"repeat_visit_reminders":true,"priority_support":false}},{"id":"pro","name":"Pro","audience":"6+ майстрів та адміністратори","price":2490,"staffLimit":null,"adminLimit":null,"storageGB":50,"limit":"Без ліміту активних майстрів","features":{"team_module":true,"warehouse":true,"finance_full":true,"analytics_full":true,"repeat_visit_reminders":true,"priority_support":true}}]'::jsonb$$;
revoke all on function public.plan_configuration() from public,anon;
grant execute on function public.plan_configuration() to authenticated,service_role;

alter table subscriptions add column if not exists price_override numeric(12,2) check(price_override>=0);
alter table subscriptions add column if not exists price_locked boolean not null default false;
alter table subscriptions add column if not exists legacy_price numeric(12,2);
alter table subscriptions add column if not exists legacy_price_until timestamptz;
alter table studio_access_requests add column if not exists selected_plan text not null default 'studio' check(selected_plan in ('solo','studio','pro'));
alter table subscriptions drop constraint if exists subscriptions_plan_check;
-- Migrate only old plan records, exactly once; retain prepaid price.
update subscriptions s set legacy_price=case plan when 'start' then 690 when 'studio' then 1490 else 2990 end,legacy_price_until=case when status='active' then current_period_end end
 where legacy_price is null and plan in ('start','studio','pro') and (plan='start' or current_setting('detailflow.upgrade_legacy_plans')='true');
-- Plan guards below use the central configuration. Pause the old 3/10-seat guard during mapping.
drop trigger if exists subscription_plan_limit on subscriptions;
update subscriptions s set plan=case when s.plan='pro' or (select count(*) from staff_profiles p where p.tenant_id=s.tenant_id and p.active)>5 or (select count(*) from tenant_memberships m where m.tenant_id=s.tenant_id and m.active and m.role='admin')>3 then 'pro' else 'studio' end
 where s.plan='start' or (current_setting('detailflow.upgrade_legacy_plans')='true' and s.plan='studio' and ((select count(*) from staff_profiles p where p.tenant_id=s.tenant_id and p.active)>5 or (select count(*) from tenant_memberships m where m.tenant_id=s.tenant_id and m.active and m.role='admin')>3));
alter table subscriptions add constraint subscriptions_plan_check check(plan in ('solo','studio','pro'));
create or replace function public.plan_staff_limit(plan_input text) returns integer language plpgsql immutable set search_path=public as $$declare cfg jsonb;begin
 select v into cfg from jsonb_array_elements(plan_configuration()) v where v->>'id'=plan_input;
 if cfg is null then raise exception 'Невідомий тариф';end if;return (cfg->>'staffLimit')::integer;
end $$;
create or replace function public.studio_plan(studio uuid) returns jsonb language sql stable security definer set search_path=public as $$select v from subscriptions s cross join lateral jsonb_array_elements(plan_configuration()) v where s.tenant_id=studio and v->>'id'=s.plan$$;
create or replace function public.plan_has_feature(studio uuid,feature text) returns boolean language sql stable security definer set search_path=public as $$select coalesce((studio_plan(studio)->'features'->>feature)::boolean,false)$$;
create or replace function public.require_plan_feature(studio uuid,feature text) returns void language plpgsql stable security definer set search_path=public as $$begin
 if not plan_has_feature(studio,feature) then raise exception 'PLAN_FEATURE_REQUIRED' using errcode='42501',detail=feature;end if;
end $$;
create or replace function public.studio_staff_usage(studio uuid) returns bigint language sql stable security definer set search_path=public as $$
 select count(*) from staff_profiles p where p.tenant_id=studio and p.active and ((studio_plan(studio)->>'id')='solo' or not exists(select 1 from tenant_memberships m where m.tenant_id=studio and m.user_id=p.user_id and m.active and m.role in ('owner','admin')));
$$;
create or replace function public.guard_subscription_capacity() returns trigger language plpgsql security definer set search_path=public as $$declare maximum integer;cfg jsonb;begin
 if tg_table_name<>'staff_profiles' then
  perform 1 from tenants where id=new.tenant_id for update;
  if not subscription_allows_new_work(new.tenant_id) then raise exception 'SUBSCRIPTION_EXPIRED' using errcode='42501';end if;return new;
 end if;
 if not new.active then return new;end if;
 if tg_op='UPDATE' and old.active and new.tenant_id=old.tenant_id and new.user_id is not distinct from old.user_id then return new;end if;
 perform 1 from tenants where id=new.tenant_id for update;cfg=studio_plan(new.tenant_id);
 if not subscription_allows_new_work(new.tenant_id) then raise exception 'SUBSCRIPTION_EXPIRED' using errcode='42501';end if;
 if cfg->>'id'='solo' and not exists(select 1 from tenant_memberships where tenant_id=new.tenant_id and user_id=new.user_id and active and role='owner') then raise exception 'SOLO_OWNER_ONLY' using errcode='42501';end if;
 if cfg->>'id'<>'solo' and exists(select 1 from tenant_memberships where tenant_id=new.tenant_id and user_id=new.user_id and active and role in ('owner','admin')) then return new;end if;
 maximum=(cfg->>'staffLimit')::integer;
 if maximum is not null and studio_staff_usage(new.tenant_id)-(case when tg_op='UPDATE' and old.active and old.tenant_id=new.tenant_id and (cfg->>'id'='solo' or not exists(select 1 from tenant_memberships m where m.tenant_id=old.tenant_id and m.user_id=old.user_id and m.active and m.role in ('owner','admin'))) then 1 else 0 end)>=maximum then raise exception 'STAFF_LIMIT_REACHED' using errcode='42501';end if;return new;
end $$;
drop trigger if exists subscription_capacity on staff_profiles;
create trigger subscription_capacity before insert or update of active,tenant_id,user_id on staff_profiles for each row execute function guard_subscription_capacity();
create or replace function public.guard_subscription_plan() returns trigger language plpgsql security definer set search_path=public as $$declare cfg jsonb;used integer;maximum integer;begin
 if tg_op='UPDATE' and new.tenant_id<>old.tenant_id then raise exception 'Не можна перенести підписку до іншої студії';end if;
 perform 1 from tenants where id=new.tenant_id for update;
 select v into cfg from jsonb_array_elements(plan_configuration()) v where v->>'id'=new.plan;
 if cfg is null then raise exception 'Невідомий тариф';end if;
 select count(*) into used from staff_profiles p where tenant_id=new.tenant_id and active and not exists(select 1 from tenant_memberships m where m.tenant_id=p.tenant_id and m.user_id=p.user_id and m.active and m.role in ('owner','admin'));
 maximum=(cfg->>'staffLimit')::integer;
 if (new.plan='solo' and used>0) or (maximum is not null and used>maximum) then raise exception 'STAFF_LIMIT_REACHED' using errcode='42501';end if;
 if (cfg->>'adminLimit') is not null and (select count(*) from tenant_memberships where tenant_id=new.tenant_id and role='admin' and active)>(cfg->>'adminLimit')::integer then raise exception 'ADMIN_LIMIT_REACHED' using errcode='42501';end if;return new;
end $$;
create trigger subscription_plan_limit before insert or update of plan,tenant_id on subscriptions for each row execute function guard_subscription_plan();
create or replace function public.guard_admin_capacity() returns trigger language plpgsql security definer set search_path=public as $$declare maximum integer;used integer;begin
 if tg_table_name='tenant_memberships' then
  if new.role<>'admin' or not new.active then return new;end if;
  if tg_op='UPDATE' and old.role='admin' and old.active and old.tenant_id=new.tenant_id then return new;end if;
 end if;
 perform 1 from tenants where id=new.tenant_id for update;
 if not subscription_allows_new_work(new.tenant_id) then raise exception 'SUBSCRIPTION_EXPIRED' using errcode='42501';end if;
 maximum=(studio_plan(new.tenant_id)->>'adminLimit')::integer;
 if tg_table_name='tenant_memberships' then select count(*) into used from tenant_memberships where tenant_id=new.tenant_id and role='admin' and active;
 else select (select count(*) from tenant_memberships where tenant_id=new.tenant_id and role='admin' and active)+(select count(*) from administrator_invitations i where i.tenant_id=new.tenant_id and i.accepted_at is null and not exists(select 1 from tenant_memberships m where m.tenant_id=i.tenant_id and m.user_id=i.user_id and m.role='admin' and m.active)) into used;end if;
 if maximum is not null and used>=maximum then raise exception 'ADMIN_LIMIT_REACHED' using errcode='42501';end if;return new;
end $$;
drop trigger if exists admin_capacity on tenant_memberships;create trigger admin_capacity before insert or update on tenant_memberships for each row execute function guard_admin_capacity();
drop trigger if exists admin_capacity on administrator_invitations;create trigger admin_capacity before insert on administrator_invitations for each row execute function guard_admin_capacity();
create or replace function public.get_studio_entitlements(studio uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$begin
 if not is_tenant_manager(studio) then raise exception 'Немає доступу' using errcode='42501';end if;return studio_plan(studio);
end $$;
create or replace function public.guard_storage_quota() returns trigger language plpgsql security definer set search_path=public,storage as $$declare studio uuid;used bigint;maximum bigint;bytes bigint;begin
 if new.bucket_id<>'job-photos' then return new;end if;
 studio=split_part(new.name,'/',1)::uuid;perform 1 from public.tenants where id=studio for update;
 maximum=(public.studio_plan(studio)->>'storageGB')::bigint*1073741824;
 bytes=coalesce((new.metadata->>'size')::bigint,0);
 select coalesce(sum(coalesce((metadata->>'size')::bigint,0)),0) into used from storage.objects where bucket_id='job-photos' and split_part(name,'/',1)=studio::text and id<>new.id;
 if maximum is null or used+bytes>maximum then raise exception 'STORAGE_LIMIT_REACHED' using errcode='42501';end if;return new;
end $$;
drop trigger if exists studio_storage_quota on storage.objects;
create trigger studio_storage_quota before insert or update of metadata,name,bucket_id on storage.objects for each row execute function guard_storage_quota();
-- All warehouse writes, including security-definer RPCs, pass this trigger.
create or replace function public.guard_plan_module() returns trigger language plpgsql security definer set search_path=public as $$declare studio uuid;begin
 studio=case when tg_op='DELETE' then old.tenant_id else new.tenant_id end;perform require_plan_feature(studio,tg_argv[0]);
 if tg_op='DELETE' then return old;end if;return new;
end $$;
do $$declare tbl text;feature text;begin
 for tbl,feature in select * from (values('inventory_items','warehouse'),('inventory_movements','warehouse'),('sales','warehouse'),('tasks','team_module'),('staff_shifts','team_module'),('staff_earnings','team_module'),('staff_payouts','team_module'),('staff_service_compensation','team_module'),('invoices','finance_full')) x loop
  execute format('drop trigger if exists plan_module_guard on public.%I',tbl);
  execute format('create trigger plan_module_guard before insert or update or delete on public.%I for each row execute function public.guard_plan_module(%L)',tbl,feature);
 end loop;
end $$;
-- Guard reporting entry points; their computations remain byte-for-byte unchanged.
create or replace function public.guard_repeat_reminders() returns trigger language plpgsql security definer set search_path=public as $$begin
 if tg_table_name='reminder_settings' then
  if new.repeat_enabled then perform require_plan_feature(new.tenant_id,'repeat_visit_reminders');end if;
 elsif new.repeat_interval_months is not null then
  if tg_op='INSERT' or new.repeat_interval_months is distinct from old.repeat_interval_months then perform require_plan_feature(new.tenant_id,'repeat_visit_reminders');end if;
 end if;return new;
end $$;
drop trigger if exists repeat_plan_guard on reminder_settings;
create trigger repeat_plan_guard before insert or update of repeat_enabled on reminder_settings for each row execute function guard_repeat_reminders();
drop trigger if exists repeat_plan_guard on services;
create trigger repeat_plan_guard before insert or update of repeat_interval_months on services for each row execute function guard_repeat_reminders();
do $$declare fn record;definition text;begin
 for fn in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('business_analytics','business_analytics_v2') loop
  definition=pg_get_functiondef(fn.oid);
  if position('require_plan_feature' in definition)=0 then definition=regexp_replace(definition,'\mbegin\M',E'begin\n perform public.require_plan_feature(studio,''analytics_full'');','i');execute definition;end if;
 end loop;
end $$;

create or replace function public.ensure_solo_owner() returns trigger language plpgsql security definer set search_path=public as $$declare account uuid;begin
 if new.plan<>'solo' then return new;end if;
 select user_id into account from tenant_memberships where tenant_id=new.tenant_id and role='owner' and active order by created_at limit 1;
 if account is null then raise exception 'SOLO_OWNER_REQUIRED' using errcode='42501';end if;
 if not exists(select 1 from staff_profiles where tenant_id=new.tenant_id and user_id=account) then
  insert into staff_profiles(tenant_id,user_id,full_name,active,profile_completed_at,all_services,hourly_rate) select new.tenant_id,account,full_name,true,now(),true,0 from profiles where id=account;
 else
  update staff_profiles set active=true where tenant_id=new.tenant_id and user_id=account and not active;
 end if;return new;
end $$;
drop trigger if exists solo_owner on subscriptions;
create trigger solo_owner after insert or update of plan on subscriptions for each row execute function ensure_solo_owner();
create or replace function public.solo_work_action(job_input uuid,action_input text,version_input integer) returns void language plpgsql security definer set search_path=public as $$declare j work_order_jobs;owner_staff uuid;begin
 perform 1 from work_orders where id=(select work_order_id from work_order_jobs where id=job_input) for update;
 select * into j from work_order_jobs where id=job_input for update;
 if j.id is null or not is_tenant_owner(j.tenant_id) or studio_plan(j.tenant_id)->>'id'<>'solo' then raise exception 'SOLO_OWNER_ONLY' using errcode='42501';end if;
 if j.version<>version_input then raise exception 'Дані змінилися. Оновіть картку й повторіть дію';end if;
 if exists(select 1 from work_orders where id=j.work_order_id and status in ('ready','issued','cancelled')) then raise exception 'Замовлення закрите';end if;
 select id into owner_staff from staff_profiles where tenant_id=j.tenant_id and user_id=auth.uid() and active;
 if owner_staff is null then raise exception 'SOLO_OWNER_REQUIRED';end if;
 if action_input='start' then
  if j.status not in ('new','assigned','waiting') then raise exception 'Роботу неможливо розпочати';end if;
  if exists(select 1 from work_order_jobs where staff_id=owner_staff and status='in_progress' and id<>j.id) then raise exception 'Завершіть поточну роботу';end if;
  update work_order_jobs set staff_id=owner_staff,status='in_progress',running_since=now(),pay_mode='fixed',rate=0,version=version+1,updated_at=now() where id=j.id;
 elsif action_input='complete' then
  if j.status<>'in_progress' then raise exception 'Спочатку почніть роботу';end if;
  update work_order_jobs set status='approved',approved_at=now(),approved_by=auth.uid(),running_since=null,worked_seconds=worked_seconds+greatest(0,extract(epoch from now()-running_since)::integer),checklist=(select coalesce(jsonb_agg(jsonb_set(a,'{done}','true')),'[]') from jsonb_array_elements(j.checklist) a),rate=0,pay_mode='fixed',version=version+1,updated_at=now() where id=j.id;
 else raise exception 'Невідома дія';end if;
 insert into work_job_events(tenant_id,job_id,actor_id,event,detail) values(j.tenant_id,j.id,auth.uid(),'solo_'||action_input,'{}');
end $$;
-- Disable the team lifecycle for Solo even through direct RPC requests.
do $$declare fn record;definition text;begin
 for fn in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='act_work_job' loop
  definition=pg_get_functiondef(fn.oid);if position('require_plan_feature' in definition)=0 then
   definition=regexp_replace(definition,'\mbegin\M',E'begin\n perform public.require_plan_feature((select tenant_id from public.work_order_jobs where id=job_id_input),''team_module'');','i');execute definition;
  end if;
 end loop;
end $$;
create or replace function public.get_studio_billing(studio uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$begin
 if not is_tenant_manager(studio) then raise exception 'Тариф доступний власнику та адміністратору студії' using errcode='42501';end if;
 return jsonb_build_object('subscription',(select to_jsonb(s)||jsonb_build_object('staff_limit',plan_staff_limit(s.plan)) from subscriptions s where tenant_id=studio),'staff_count',studio_staff_usage(studio),
 'storage_bytes',(select coalesce(sum(coalesce((metadata->>'size')::bigint,0)),0) from storage.objects where bucket_id='job-photos' and split_part(name,'/',1)=studio::text),
 'admin_count',(select count(*) from tenant_memberships where tenant_id=studio and active and role='admin'),
 'orders',coalesce((select jsonb_agg(x) from(select id,plan,amount,status,created_at,paid_at from payment_orders where tenant_id=studio order by created_at desc limit 30)x),'[]'));
end $$;
create or replace function public.support_founder_price(studio uuid,price_input numeric,locked_input boolean,note_input text) returns void language plpgsql security definer set search_path=public as $$declare prior jsonb;sid uuid;begin
 perform require_support_write();if (price_input is not null and (price_input<0 or price_input>9999999999)) or length(trim(coalesce(note_input,'')))<5 then raise exception 'Вкажіть ціну та причину';end if;
 perform 1 from tenants where id=studio and not is_internal for update;if not found then raise exception 'Студію не знайдено';end if;
 select to_jsonb(s),s.id into prior,sid from subscriptions s where tenant_id=studio for update;if sid is null then raise exception 'Спочатку збережіть тариф студії';end if;
 update subscriptions set price_override=price_input,price_locked=coalesce(locked_input,false),updated_at=now() where id=sid;
 insert into audit_logs(tenant_id,actor_id,entity_type,entity_id,action,before_data,after_data) values(studio,auth.uid(),'subscriptions',sid,'support_adjustment',prior,jsonb_build_object('price_override',price_input,'price_locked',locked_input,'reason',note_input));
end $$;
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  if new.raw_user_meta_data ->> 'requested_role' = 'owner' then
    insert into public.studio_access_requests (user_id, studio_name, phone, messenger, contact, selected_plan)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'studio_name', 'Нова студія'), new.raw_user_meta_data ->> 'phone', new.raw_user_meta_data ->> 'messenger', new.raw_user_meta_data ->> 'contact',case when new.raw_user_meta_data->>'selected_plan' in ('solo','studio','pro') then new.raw_user_meta_data->>'selected_plan' else 'studio' end);
  end if;
  return new;
end;
$$;
create or replace function public.support_set_subscription(studio uuid,plan_input text,status_input text,end_input timestamptz,note_input text) returns void language plpgsql security definer set search_path=public as $$
declare prior jsonb;subscription_id uuid;begin
 perform require_support_write();
 if plan_input is null or status_input is null or note_input is null or plan_input not in ('solo','studio','pro') or status_input not in ('trialing','active','past_due','cancelled') or length(trim(note_input))<5 or length(note_input)>2000 then raise exception 'Оберіть тариф, статус та вкажіть причину зміни';end if;
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
 insert into public.subscriptions(tenant_id,plan,status,trial_ends_at) values(studio_id,application.selected_plan,'trialing',now()+interval '14 days');
 update public.studio_access_requests set status='approved',tenant_id=studio_id,reviewed_by=auth.uid(),review_note=left(trim(note),2000),reviewed_at=now() where id=request_id;
 return studio_id;
end;
$$;
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
 if not sub.price_locked and sub.price_override is not null then update subscriptions set price_override=null,legacy_price=sub.price_override,legacy_price_until=case when sub.status='trialing' then sub.trial_ends_at else sub.current_period_end end where tenant_id=studio;end if;
 perform support_set_subscription(studio,coalesce(sub.plan,'studio'),'active',end_value,'Ручна оплата: '||request_input::text||' '||coalesce(comment_input,''));
 insert into payments(id,studio_id,amount,method,paid_on,comment,months_added,period_from,period_to,created_by) values(request_input,studio,amount_input,method_input,paid_on_input,coalesce(comment_input,''),months_input,start_value,end_value,auth.uid());
 return request_input;
end $$;
revoke all on function public.studio_plan(uuid) from public,anon,authenticated;
grant execute on function public.studio_plan(uuid) to service_role;
revoke all on function public.plan_has_feature(uuid,text) from public,anon,authenticated;
grant execute on function public.plan_has_feature(uuid,text) to service_role;
revoke all on function public.require_plan_feature(uuid,text) from public,anon,authenticated;
grant execute on function public.require_plan_feature(uuid,text) to service_role;
revoke all on function public.studio_staff_usage(uuid) from public,anon,authenticated;
grant execute on function public.studio_staff_usage(uuid) to service_role;
revoke all on function public.get_studio_entitlements(uuid) from public,anon;
grant execute on function public.get_studio_entitlements(uuid) to authenticated,service_role;
revoke all on function public.solo_work_action(uuid,text,integer) from public,anon;
grant execute on function public.solo_work_action(uuid,text,integer) to authenticated,service_role;
revoke all on function public.support_founder_price(uuid,numeric,boolean,text) from public,anon;
grant execute on function public.support_founder_price(uuid,numeric,boolean,text) to authenticated,service_role;
create or replace function public.support_studios_page(search_input text default '',offset_input integer default 0,filter_input text default '',sort_input text default 'access_end',desc_input boolean default false) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare rows jsonb;total bigint;begin
 if not coalesce(is_support_user(),false) then raise exception 'Потрібні права підтримки' using errcode='42501';end if;
 if offset_input<0 or sort_input not in ('name','plan','status','access_end','staff_count','client_count','last_activity') or filter_input not in ('','ending','trial','renew','active','priority') then raise exception 'Невірний фільтр';end if;
 with studios as (
 select t.id,t.name,t.slug,t.timezone,t.phone,t.email,s.plan,s.status,s.trial_ends_at,s.current_period_end,s.price_override,s.price_locked,plan_has_feature(t.id,'priority_support') priority_support,
 case when s.status='trialing' then s.trial_ends_at else s.current_period_end end access_end,
 studio_staff_usage(t.id) staff_count,
 (select count(*) from clients c where c.tenant_id=t.id) client_count,
 greatest((select max(a.created_at) from audit_logs a where a.tenant_id=t.id),(select max(w.updated_at) from work_order_jobs w where w.tenant_id=t.id),(select max(u.last_sign_in_at) from tenant_memberships m join auth.users u on u.id=m.user_id where m.tenant_id=t.id and m.active)) last_activity
 from tenants t left join subscriptions s on s.tenant_id=t.id where not t.is_internal and concat_ws(' ',t.id::text,t.name,t.slug,t.email,t.phone) ilike '%'||left(coalesce(search_input,''),200)||'%'
 ),filtered as(select * from studios where filter_input='' or (filter_input='priority' and priority_support) or (filter_input='ending' and status in ('active','trialing') and access_end>now() and access_end<=now()+interval '7 days') or (filter_input='trial' and status='trialing') or (filter_input='renew' and (access_end is null or access_end<=now() or status in ('past_due','cancelled'))) or (filter_input='active' and status='active' and access_end>now())),paged as(
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
 return (with eligible as(select s.*,not exists(select 1 from payments p where p.studio_id=s.tenant_id and p.amount=0 and now()>=p.period_from and now()<p.period_to) billable from subscriptions s join tenants t on t.id=s.tenant_id where not t.is_internal),cohort as(select s.tenant_id from eligible s left join studio_access_requests r on r.tenant_id=s.tenant_id and r.status='approved' where coalesce(r.reviewed_at,s.created_at)::date between from_input and to_input and (s.trial_ends_at is not null or r.id is not null))
 select jsonb_build_object('paid_by_plan',coalesce((select jsonb_object_agg(plan,n) from(select plan,count(*) n from eligible where status='active' and current_period_end>now() and billable and coalesce(price_override,1)>0 group by plan) p),'{}'),
 'mrr',(select coalesce(sum(case when price_override is not null and (price_locked or current_period_end>now()) then price_override when legacy_price_until>now() then legacy_price else (studio_plan(tenant_id)->>'price')::numeric end),0) from eligible where status='active' and current_period_end>now() and billable and coalesce(price_override,1)>0),
 'trial',(select count(*) from eligible where status='trialing' and trial_ends_at>now()),
 'ending',(select count(*) from eligible where status in ('active','trialing') and case when status='trialing' then trial_ends_at else current_period_end end between now() and now()+interval '7 days'),
 'cohort',(select count(*) from cohort),'converted',(select count(*) from cohort c where exists(select 1 from payments p where p.studio_id=c.tenant_id and p.amount>0 and p.paid_on<=to_input) or exists(select 1 from payment_orders p where p.tenant_id=c.tenant_id and p.status='approved' and p.amount>0 and p.paid_at::date<=to_input))));
end $$;
notify pgrst,'reload schema';
commit;
