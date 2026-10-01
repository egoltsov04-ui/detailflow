-- Detailflow phase 1, apply after platform_033_039.sql. Repeatable.
-- Run this entire file as one transaction.
begin;
-- 040_staff_calendar.sql

create or replace function public.staff_calendar(staff_input uuid,from_input date,to_input date) returns jsonb
language plpgsql security definer set search_path=public as $$
declare member staff_profiles;zone text;begin
 select * into member from staff_profiles where id=staff_input;
 if member.id is null or not (is_tenant_manager(member.tenant_id) or (is_own_staff_profile(member.id) and is_tenant_member(member.tenant_id))) then raise exception 'Немає доступу до календаря';end if;
 if from_input is null or to_input is null or to_input<from_input or to_input-from_input>62 then raise exception 'Оберіть період до 62 днів';end if;
 select timezone into zone from tenants where id=member.tenant_id;
 return jsonb_build_object('timezone',zone,'schedules',coalesce((select jsonb_agg(jsonb_build_object('weekday',weekday,'starts_at',starts_at,'ends_at',ends_at)) from work_schedules where staff_id=member.id),'[]'),
 'appointments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'starts_at',a.starts_at,'ends_at',a.ends_at,'status',a.status,'client',c.full_name,'vehicle',coalesce(nullif(concat_ws(' ',v.make,v.model,v.plate_number),''),v.notes,''),'services',(select string_agg(service_name,' + ') from appointment_services where appointment_id=a.id)))
 from appointments a left join clients c on c.id=a.client_id left join vehicles v on v.id=a.vehicle_id
 where a.tenant_id=member.tenant_id and a.status not in ('cancelled','no_show') and a.starts_at<(to_input+1)::timestamp at time zone zone and a.ends_at>from_input::timestamp at time zone zone
 and (a.staff_id=member.id or exists(select 1 from work_orders o join work_order_jobs j on j.work_order_id=o.id where o.appointment_id=a.id and j.staff_id=member.id))),'[]'));
end$$;
revoke all on function public.staff_calendar(uuid,date,date) from public,anon;
grant execute on function public.staff_calendar(uuid,date,date) to authenticated;
notify pgrst,'reload schema';

-- 041_studio_setup_support.sql

alter table public.tenants add column if not exists onboarding_completed_at timestamptz;
create or replace function public.is_support_user() returns boolean language sql stable security definer set search_path=public as $$select auth.uid() is not null and exists(select 1 from tenant_memberships where user_id=auth.uid() and role='super_admin' and active)$$;
create or replace function public.support_list_studios(search_input text default '',offset_input integer default 0) returns jsonb language plpgsql security definer set search_path=public as $$begin
 if not is_support_user() then raise exception 'Потрібні права підтримки';end if;
 if offset_input<0 then raise exception 'Некоректна сторінка';end if;
 return coalesce((select jsonb_agg(x) from(select t.id,t.name,t.slug,t.timezone,t.phone,t.email,t.created_at,s.plan,s.status,s.trial_ends_at,s.current_period_end,
 (select count(*) from staff_profiles p where p.tenant_id=t.id and p.active) staff_count,
 (select count(*) from clients c where c.tenant_id=t.id) client_count
 from tenants t left join subscriptions s on s.tenant_id=t.id where concat_ws(' ',t.name,t.slug,t.email) ilike '%'||left(search_input,100)||'%' order by t.created_at desc,t.id offset offset_input limit 50)x),'[]');
end$$;
create or replace function public.support_set_subscription(studio uuid,plan_input text,status_input text,end_input timestamptz,note_input text) returns void language plpgsql security definer set search_path=public as $$
declare prior jsonb;begin
 if not is_support_user() then raise exception 'Потрібні права підтримки';end if;
 if plan_input not in ('start','studio','pro') or status_input not in ('trialing','active','past_due','cancelled') or length(trim(note_input))<5 or length(note_input)>2000 then raise exception 'Оберіть тариф, статус та вкажіть причину зміни';end if;
 if status_input in ('active','trialing') and (end_input is null or end_input<=now() or end_input>now()+interval '2 years') then raise exception 'Вкажіть майбутню дату завершення, не більше двох років';end if;
 select to_jsonb(s) into prior from subscriptions s where tenant_id=studio for update;
 if prior is null then raise exception 'Підписку не знайдено';end if;
 update subscriptions set plan=plan_input,status=status_input,trial_ends_at=case when status_input='trialing' then end_input else trial_ends_at end,current_period_end=case when status_input='active' then end_input else current_period_end end,updated_at=now() where tenant_id=studio;
 insert into audit_logs(tenant_id,actor_id,entity_type,entity_id,action,before_data,after_data) values(studio,auth.uid(),'subscriptions', (prior->>'id')::uuid,'support_adjustment',prior,jsonb_build_object('plan',plan_input,'status',status_input,'end',end_input,'reason',trim(note_input)));
end$$;
create or replace function public.studio_setup(studio uuid,profile_input jsonb default null,complete_input boolean default false) returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;zone text;begin
 if not is_tenant_owner(studio) then raise exception 'Потрібні права власника';end if;
 perform 1 from tenants where id=studio for update;
 if profile_input is not null then
  zone=profile_input->>'timezone';
  if length(trim(coalesce(profile_input->>'name','')))<2 or length(trim(coalesce(profile_input->>'address','')))<3 or length(regexp_replace(coalesce(profile_input->>'phone',''),'\D','','g'))<10 or not exists(select 1 from pg_timezone_names where name=zone) then raise exception 'Заповніть назву, адресу, телефон і часовий пояс';end if;
  update tenants set name=left(trim(profile_input->>'name'),120),address=left(trim(profile_input->>'address'),500),phone=left(trim(profile_input->>'phone'),40),timezone=zone where id=studio;
 end if;
 select jsonb_build_object('name',name,'address',coalesce(address,''),'phone',coalesce(phone,''),'timezone',timezone,'completed',onboarding_completed_at is not null,
 'services',(select count(*) from services where tenant_id=studio and active),'staff',(select count(*) from staff_profiles where tenant_id=studio and active),'schedules',(select count(*) from work_schedules where tenant_id=studio)) into result from tenants where id=studio;
 if complete_input then
  if length(result->>'address')<3 or length(regexp_replace(result->>'phone','\D','','g'))<10 or (result->>'services')::int=0 or (result->>'staff')::int=0 or (result->>'schedules')::int=0 then raise exception 'Додайте контакти, послугу, майстра та його графік';end if;
  update tenants set onboarding_completed_at=coalesce(onboarding_completed_at,now()) where id=studio;
  result=jsonb_set(result,'{completed}','true');
 end if;
 return result;
end$$;
revoke all on function public.support_list_studios(text,integer),public.support_set_subscription(uuid,text,text,timestamptz,text),public.studio_setup(uuid,jsonb,boolean) from public,anon;
grant execute on function public.support_list_studios(text,integer),public.support_set_subscription(uuid,text,text,timestamptz,text),public.studio_setup(uuid,jsonb,boolean) to authenticated;
notify pgrst,'reload schema';

-- 042_notification_queue.sql

alter table public.clients add column if not exists followup_enabled boolean not null default false;
alter table public.clients add column if not exists unsubscribe_token uuid not null default gen_random_uuid();
alter table public.reminder_settings add column if not exists repeat_enabled boolean not null default false;
create table if not exists public.notification_jobs(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references tenants(id) on delete cascade,
 dedupe_key text not null unique,channel text not null check(channel in ('email','push')),kind text not null,payload jsonb not null default '{}',
 recipient_user_id uuid references profiles(id) on delete cascade,status text not null default 'queued' check(status in ('queued','sending','sent','failed','uncertain','cancelled')),
 attempts integer not null default 0,next_attempt_at timestamptz not null default now(),expires_at timestamptz not null,
 claim_token uuid,locked_until timestamptz,last_error text,provider_id text,created_at timestamptz not null default now(),sent_at timestamptz);
alter table notification_jobs enable row level security;
drop policy if exists "manager reads delivery log" on notification_jobs;
create policy "manager reads delivery log" on notification_jobs for select using(is_tenant_manager(tenant_id));
grant select on notification_jobs to authenticated;
revoke insert,update,delete on notification_jobs from authenticated,anon;
create index if not exists notification_jobs_due on notification_jobs(next_attempt_at) where status in ('queued','failed');
create or replace function public.enqueue_client_reminders() returns void language plpgsql security definer set search_path=public as $$begin
 insert into notification_jobs(tenant_id,dedupe_key,channel,kind,payload,next_attempt_at,expires_at)
 select a.tenant_id,'visit:'||a.id||':'||h.hours||':'||a.starts_at::text,'email','visit_'||h.hours,jsonb_build_object('appointment_id',a.id,'starts_at',a.starts_at),a.starts_at-make_interval(hours=>h.hours),a.starts_at-case when h.hours=24 then interval '2 hours' else interval '15 minutes' end
 from appointments a join reminder_settings r on r.tenant_id=a.tenant_id cross join(values(24),(2))h(hours)
 where a.status='confirmed' and r.email_enabled and ((h.hours=24 and r.reminder_24h_enabled) or (h.hours=2 and r.reminder_2h_enabled))
 and a.starts_at-make_interval(hours=>h.hours)<=now() and a.starts_at-case when h.hours=24 then interval '2 hours' else interval '15 minutes' end>now()
 and not exists(select 1 from reminders old where old.appointment_id=a.id and old.channel='email' and old.scheduled_for=a.starts_at-make_interval(hours=>h.hours) and old.sent_at is not null)
 on conflict(dedupe_key) do nothing;
 insert into notification_jobs(tenant_id,dedupe_key,channel,kind,payload,next_attempt_at,expires_at)
 select a.tenant_id,'return:'||a.id||':'||s.id||':'||s.repeat_interval_months,'email','return_visit',jsonb_build_object('appointment_id',a.id,'service_id',s.id,'interval_months',s.repeat_interval_months),a.ends_at+make_interval(months=>s.repeat_interval_months),a.ends_at+make_interval(months=>s.repeat_interval_months)+interval '7 days'
 from appointments a join appointment_services x on x.appointment_id=a.id join services s on s.id=x.service_id join clients c on c.id=a.client_id join reminder_settings r on r.tenant_id=a.tenant_id
 where a.status='completed' and c.followup_enabled and c.email is not null and r.email_enabled and r.repeat_enabled and s.active and s.repeat_interval_months between 1 and 60
 and a.ends_at+make_interval(months=>s.repeat_interval_months) between now()-interval '7 days' and now()
 and not exists(select 1 from appointments newer join appointment_services nx on nx.appointment_id=newer.id where newer.tenant_id=a.tenant_id and newer.client_id=a.client_id and nx.service_id=s.id and newer.starts_at>a.starts_at and newer.status not in ('cancelled','no_show'))
 on conflict(dedupe_key) do nothing;
end$$;
create or replace function public.claim_notifications(channel_input text,limit_input integer default 5) returns setof notification_jobs language plpgsql security definer set search_path=public as $$begin
 update notification_jobs set status='uncertain',last_error='Delivery interrupted; verify provider before retry',claim_token=null where status='sending' and locked_until<now();
 update notification_jobs set status='cancelled',last_error='Notification expired' where status in ('queued','failed') and expires_at<=now();
 return query with candidates as(select id from notification_jobs where channel=channel_input and status in ('queued','failed') and attempts<5 and next_attempt_at<=now() and expires_at>now() order by next_attempt_at,id for update skip locked limit greatest(1,least(limit_input,20)))
 update notification_jobs j set status='sending',attempts=j.attempts+1,claim_token=gen_random_uuid(),locked_until=now()+interval '5 minutes' from candidates c where j.id=c.id returning j.*;
end$$;
create or replace function public.finish_notification(job_input uuid,token_input uuid,status_input text,error_input text default null,provider_input text default null) returns boolean language plpgsql security definer set search_path=public as $$begin
 if status_input not in ('sent','failed','uncertain','cancelled') then raise exception 'Invalid delivery status';end if;
 update notification_jobs set status=status_input,last_error=left(error_input,400),provider_id=left(provider_input,200),sent_at=case when status_input='sent' then now() else null end,next_attempt_at=now()+make_interval(mins=>least(120,5*power(2,attempts-1)::int)),claim_token=null,locked_until=null where id=job_input and claim_token=token_input and status='sending';
 return found;
end$$;
create or replace function public.retry_notification(job_input uuid) returns void language plpgsql security definer set search_path=public as $$begin
 update notification_jobs set status='queued',next_attempt_at=now(),attempts=0,last_error=null where id=job_input and is_tenant_owner(tenant_id) and status in ('failed','uncertain') and expires_at>now();
 if not found then raise exception 'Повтор недоступний: перевірте права та строк повідомлення';end if;
end$$;
revoke all on function public.enqueue_client_reminders(),public.claim_notifications(text,integer),public.finish_notification(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.enqueue_client_reminders(),public.claim_notifications(text,integer),public.finish_notification(uuid,uuid,text,text,text) to service_role;
revoke all on function public.retry_notification(uuid) from public,anon;
grant execute on function public.retry_notification(uuid) to authenticated;
create or replace function public.save_client_card(studio uuid,client_input uuid,card jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid:=coalesce(client_input,gen_random_uuid());v jsonb;vid uuid;phone_value text;email_value text;
begin
 if not is_tenant_manager(studio) then raise exception 'Немає доступу';end if;
 if length(trim(coalesce(card->>'name','')))<2 or length(card->>'name')>120 or jsonb_typeof(card->'vehicles') is distinct from 'array' or jsonb_array_length(card->'vehicles')>50 then raise exception 'Перевірте ім’я та список авто';end if;
 phone_value=nullif(regexp_replace(coalesce(card->>'phone',''),'[^+0-9]','','g'),'');email_value=nullif(lower(trim(card->>'email')),'');
 if phone_value is not null and length(regexp_replace(phone_value,'[^0-9]','','g')) not between 10 and 15 then raise exception 'Вкажіть телефон із кодом країни';end if;
 if email_value is not null and email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Перевірте email';end if;
 if client_input is not null then
  perform 1 from clients where id=cid and tenant_id=studio for update;if not found then raise exception 'Клієнта не знайдено';end if;
  update clients set full_name=trim(card->>'name'),phone=phone_value,email=email_value,notes=left(coalesce(card->>'notes',''),4000),tags=array(select jsonb_array_elements_text(coalesce(card->'tags','[]'))) where id=cid;
 else
  insert into clients(id,tenant_id,full_name,phone,email,notes,tags) values(cid,studio,trim(card->>'name'),phone_value,email_value,left(coalesce(card->>'notes',''),4000),array(select jsonb_array_elements_text(coalesce(card->'tags','[]'))));
 end if;
 for v in select value from jsonb_array_elements(card->'vehicles') loop
  if length(trim(coalesce(v->>'make','')||coalesce(v->>'model','')||coalesce(v->>'plate','')))=0 then raise exception 'Заповніть марку, модель або номер автомобіля';end if;
  vid=nullif(v->>'id','')::uuid;
  if vid is null then
   insert into vehicles(tenant_id,client_id,make,model,plate_number,year,notes) values(studio,cid,left(v->>'make',80),left(v->>'model',80),left(upper(v->>'plate'),30),nullif(v->>'year','')::smallint,left(coalesce(v->>'notes',''),2000));
  else
   update vehicles set make=left(v->>'make',80),model=left(v->>'model',80),plate_number=left(upper(v->>'plate'),30),year=nullif(v->>'year','')::smallint,notes=left(coalesce(v->>'notes',''),2000) where id=vid and client_id=cid and tenant_id=studio;
   if not found then raise exception 'Автомобіль не належить цьому клієнту';end if;
  end if;
 end loop;
 if card ? 'followupEnabled' then update clients set followup_enabled=coalesce((card->>'followupEnabled')::boolean,false) where id=cid;end if;
 return cid;
end$$;
notify pgrst,'reload schema';

-- 043_push_notifications.sql

create table if not exists public.push_subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid not null references profiles(id) on delete cascade,endpoint text not null unique,keys jsonb not null,locale text not null default 'uk' check(locale in ('uk','ru','en')),created_at timestamptz not null default now());
alter table push_subscriptions enable row level security;
revoke all on push_subscriptions from anon,authenticated;
grant select,insert,update,delete on push_subscriptions to service_role;
-- Serialize registrations for both the account and endpoint. Never transfer a device
-- to a different account through an upsert race.
create or replace function public.register_push_subscription(user_input uuid,endpoint_input text,keys_input jsonb,locale_input text default 'uk') returns text language plpgsql security definer set search_path=public as $$
declare existing_user uuid;begin
 perform pg_advisory_xact_lock(hashtextextended('push-user:'||user_input,0));
 perform pg_advisory_xact_lock(hashtextextended('push-endpoint:'||endpoint_input,0));
 select user_id into existing_user from push_subscriptions where endpoint=endpoint_input;
 if existing_user is not null and existing_user<>user_input then return 'conflict';end if;
 if existing_user is null and (select count(*) from push_subscriptions where user_id=user_input)>=8 then return 'limit';end if;
 insert into push_subscriptions(user_id,endpoint,keys,locale) values(user_input,endpoint_input,keys_input,locale_input)
 on conflict(endpoint) do update set keys=excluded.keys,locale=excluded.locale where push_subscriptions.user_id=excluded.user_id;
 return 'ok';
end$$;
revoke all on function public.register_push_subscription(uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.register_push_subscription(uuid,text,jsonb,text) to service_role;
create or replace function public.notify_work_change() returns trigger language plpgsql security definer set search_path=public as $$
declare recipients uuid[];kind_value text;begin
 if tg_op='UPDATE' and new.status=old.status and new.staff_id is not distinct from old.staff_id then return new;end if;
 if new.status='review' then
  kind_value='work_review';select array_agg(user_id) into recipients from tenant_memberships where tenant_id=new.tenant_id and active and role in ('owner','admin');
 elsif new.staff_id is not null and new.status in ('assigned','approved','waiting') then
  kind_value=case new.status when 'approved' then 'work_approved' when 'waiting' then 'work_returned' else 'work_assigned' end;
  select array_agg(user_id) into recipients from staff_profiles where id=new.staff_id and active;
 else return new;end if;
 insert into notification_jobs(tenant_id,dedupe_key,channel,kind,payload,recipient_user_id,expires_at)
 select new.tenant_id,'work:'||new.id||':'||new.version||':'||p.id,'push',kind_value,jsonb_build_object('subscription_id',p.id,'job_id',new.id),p.user_id,now()+interval '1 day' from push_subscriptions p where p.user_id=any(recipients) on conflict(dedupe_key) do nothing;
 return new;
end$$;
drop trigger if exists workflow_notifications on public.work_order_jobs;
create trigger workflow_notifications after insert or update on public.work_order_jobs for each row execute function public.notify_work_change();
notify pgrst,'reload schema';

-- 044_administrator_invite_recovery.sql

create table if not exists public.administrator_invitations(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references tenants(id) on delete cascade,email text not null unique,full_name text not null,user_id uuid references profiles(id) on delete set null,created_by uuid references profiles(id),created_at timestamptz not null default now(),accepted_at timestamptz);
alter table administrator_invitations enable row level security;
revoke all on administrator_invitations from anon,authenticated;
create or replace function public.reserve_administrator_invitation(studio uuid,owner_input uuid,email_input text,name_input text) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid;inv administrator_invitations;begin
 if not exists(select 1 from tenant_memberships where tenant_id=studio and user_id=owner_input and role='owner' and active) then raise exception 'Потрібні права власника';end if;
 if email_input<>lower(trim(email_input)) or email_input!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(name_input)<2 then raise exception 'Перевірте ім’я та email';end if;
 perform pg_advisory_xact_lock(hashtextextended(email_input,0));
 select id into uid from auth.users where lower(email)=email_input;
 if exists(select 1 from tenant_memberships where user_id=uid and (tenant_id<>studio or role<>'admin')) or exists(select 1 from staff_profiles where user_id=uid) then raise exception 'Email уже має іншу робочу роль';end if;
 select * into inv from administrator_invitations where email=email_input for update;
 if inv.id is not null and inv.tenant_id<>studio then raise exception 'Для цього email уже є запрошення до іншої студії';end if;
 if inv.id is null then insert into administrator_invitations(tenant_id,email,full_name,user_id,created_by) values(studio,email_input,name_input,uid,owner_input) returning * into inv;
 else update administrator_invitations set full_name=name_input,user_id=coalesce(uid,user_id) where id=inv.id returning * into inv;end if;
 return jsonb_build_object('id',inv.id,'user_id',uid);
end$$;
create or replace function public.attach_administrator_invitation(invite_input uuid,user_input uuid) returns void language plpgsql security definer set search_path=public as $$
declare inv administrator_invitations;begin
 select * into inv from administrator_invitations where id=invite_input for update;
 if inv.id is null or not exists(select 1 from auth.users where id=user_input and lower(email)=inv.email) then raise exception 'Запрошення не відповідає акаунту';end if;
 if exists(select 1 from tenant_memberships where user_id=user_input and (tenant_id<>inv.tenant_id or role<>'admin')) or exists(select 1 from staff_profiles where user_id=user_input) then raise exception 'Акаунт має іншу робочу роль';end if;
 insert into tenant_memberships(tenant_id,user_id,role,active,finance_access) values(inv.tenant_id,user_input,'admin',true,false) on conflict(tenant_id,user_id) do nothing;
 update administrator_invitations set user_id=user_input where id=inv.id;
end$$;
revoke all on function public.reserve_administrator_invitation(uuid,uuid,text,text),public.attach_administrator_invitation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_administrator_invitation(uuid,uuid,text,text),public.attach_administrator_invitation(uuid,uuid) to service_role;
do $$begin if to_regprocedure('public.resolve_my_access_before_invite_recovery()') is null then alter function public.resolve_my_access() rename to resolve_my_access_before_invite_recovery;end if;end$$;
revoke all on function public.resolve_my_access_before_invite_recovery() from public,anon,authenticated;
create or replace function public.resolve_my_access() returns jsonb language plpgsql security definer set search_path=public as $$
declare inv uuid;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select i.id into inv from administrator_invitations i join auth.users u on lower(u.email)=i.email where u.id=auth.uid() and u.email_confirmed_at is not null and i.accepted_at is null;
 if inv is not null then perform attach_administrator_invitation(inv,auth.uid());update administrator_invitations set accepted_at=now() where id=inv;end if;
 return resolve_my_access_before_invite_recovery();
end$$;
revoke all on function public.resolve_my_access() from public,anon;
grant execute on function public.resolve_my_access() to authenticated;
create or replace function public.platform_readiness() returns boolean language sql stable security definer set search_path=public as $$
 select to_regprocedure('public.create_manual_booking(uuid,uuid,jsonb)') is not null
 and to_regprocedure('public.get_studio_orders(uuid)') is not null
 and to_regprocedure('public.apply_subscription_payment(text,numeric,text,text)') is not null
 and to_regprocedure('public.staff_calendar(uuid,date,date)') is not null
 and to_regprocedure('public.studio_setup(uuid,jsonb,boolean)') is not null
 and to_regprocedure('public.register_push_subscription(uuid,text,jsonb,text)') is not null
 and to_regclass('public.notification_jobs') is not null
 and to_regclass('public.administrator_invitations') is not null
 and to_regclass('public.order_receipts') is not null
 and exists(select 1 from pg_trigger where tgname='platform_audit' and tgrelid='public.tenant_memberships'::regclass);
$$;
revoke all on function public.platform_readiness() from public,anon,authenticated;
grant execute on function public.platform_readiness() to service_role;
notify pgrst,'reload schema';

commit;
