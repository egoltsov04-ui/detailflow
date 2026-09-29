-- Detailflow platform update 033–039. Apply after 032. Repeatable.
-- Run the entire file in SQL Editor. Keep this transaction intact.
-- Adds specializations, billing terms, administrator permissions, receipts, CRM and audit.
begin;
-- 033_staff_specializations.sql · SHA256 12ff1e25402181725d40cbe7a6f6d5b928f0d519678bb6c984cbdd68a665c325
alter table public.staff_profiles add column if not exists all_services boolean not null default true;

create or replace function public.staff_can_perform(staff uuid,service uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from staff_profiles p join services s on s.id=service and s.tenant_id=p.tenant_id
 where p.id=staff and p.active and s.active and (p.all_services or exists(select 1 from staff_services x where x.staff_id=p.id and x.service_id=s.id)));
$$;
revoke all on function public.staff_can_perform(uuid,uuid) from public,anon;
grant execute on function public.staff_can_perform(uuid,uuid) to authenticated,service_role;

drop policy if exists "members access staff services" on public.staff_services;
drop policy if exists "manager manages skills" on public.staff_services;
create policy "manager manages skills" on public.staff_services for all
using(exists(select 1 from staff_profiles p where p.id=staff_id and is_tenant_manager(p.tenant_id)))
with check(exists(select 1 from staff_profiles p join services s on s.tenant_id=p.tenant_id where p.id=staff_id and s.id=service_id and is_tenant_manager(p.tenant_id)));

create or replace function public.set_staff_services(staff_input uuid,all_input boolean,services_input uuid[]) returns void
language plpgsql security definer set search_path=public as $$
declare p staff_profiles;
begin
 select * into p from staff_profiles where id=staff_input for update;
 if p.id is null or not is_tenant_manager(p.tenant_id) then raise exception 'Немає доступу'; end if;
 if all_input is null or services_input is null or exists(select 1 from unnest(services_input) v where not exists(select 1 from services where id=v and tenant_id=p.tenant_id and active)) then raise exception 'Перевірте список послуг'; end if;
 update staff_profiles set all_services=all_input where id=p.id;
 delete from staff_services where staff_id=p.id;
 insert into staff_services(staff_id,service_id) select p.id,v from (select distinct unnest(services_input) v) x;
end $$;
revoke all on function public.set_staff_services(uuid,boolean,uuid[]) from public,anon;
grant execute on function public.set_staff_services(uuid,boolean,uuid[]) to authenticated;

create or replace function public.guard_staff_service_assignment() returns trigger
language plpgsql security definer set search_path=public as $$
declare member uuid; chosen uuid;
begin
 if tg_table_name='work_order_jobs' then
  if tg_op='UPDATE' and new.staff_id is not distinct from old.staff_id and new.service_id is not distinct from old.service_id then return new; end if;
  member=new.staff_id;chosen=new.service_id;
 elsif tg_table_name='appointment_services' then
  select staff_id into member from appointments where id=new.appointment_id;chosen=new.service_id;
 else
  if new.staff_id is not null and (tg_op='INSERT' or new.staff_id is distinct from old.staff_id) and exists(select 1 from appointment_services a where a.appointment_id=new.id and a.service_id is not null and not staff_can_perform(new.staff_id,a.service_id)) then raise exception 'Майстер не виконує всі послуги запису'; end if;
  return new;
 end if;
 if member is not null and chosen is not null and not staff_can_perform(member,chosen) then raise exception 'Майстер не виконує цю послугу. Змініть виконавця або спеціалізацію'; end if;
 return new;
end $$;
drop trigger if exists staff_service_assignment on public.work_order_jobs;
create trigger staff_service_assignment before insert or update on public.work_order_jobs for each row execute function public.guard_staff_service_assignment();
drop trigger if exists staff_service_assignment on public.appointment_services;
create trigger staff_service_assignment before insert or update on public.appointment_services for each row execute function public.guard_staff_service_assignment();
drop trigger if exists staff_service_assignment on public.appointments;
create trigger staff_service_assignment before insert or update on public.appointments for each row execute function public.guard_staff_service_assignment();
notify pgrst,'reload schema';

-- 034_subscription_lifecycle.sql · SHA256 3407b89bb0d3bd3bdb8bd71770b5f0feb063f22f5def1d5d058e8b4a8159926a
alter table public.subscriptions add column if not exists current_period_end timestamptz;
-- Existing paid subscriptions did not record a term. Preserve access for a migration grace period.
update public.subscriptions set current_period_end=now()+interval '1 month' where status='active' and current_period_end is null;

create or replace function public.subscription_allows_new_work(studio uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from subscriptions where tenant_id=studio and
 ((status='trialing' and trial_ends_at>now()) or (status='active' and current_period_end>now())));
$$;
create or replace function public.guard_subscription_capacity() returns trigger
language plpgsql security definer set search_path=public as $$
declare sub subscriptions; maximum integer;
begin
 -- No destructive action on expiration: existing records and in-progress jobs remain accessible.
 if tg_table_name='staff_profiles' then
  if not new.active then return new; end if;
  if tg_op='UPDATE' then if old.active then return new; end if; end if;
 end if;
 perform 1 from tenants where id=new.tenant_id for update;
 select * into sub from subscriptions where tenant_id=new.tenant_id;
 if not subscription_allows_new_work(new.tenant_id) then raise exception 'Період доступу завершено. Власник має продовжити тариф'; end if;
 if tg_table_name='staff_profiles' then
  maximum=case sub.plan when 'start' then 3 when 'studio' then 10 else null end;
  if maximum is not null and (select count(*) from staff_profiles where tenant_id=new.tenant_id and active and id<>new.id)>=maximum then raise exception 'Досягнуто ліміт майстрів тарифу. Оберіть інший тариф'; end if;
 end if;
 return new;
end $$;
drop trigger if exists subscription_capacity on public.staff_profiles;
create trigger subscription_capacity before insert or update of active on public.staff_profiles for each row execute function public.guard_subscription_capacity();
drop trigger if exists subscription_capacity on public.appointments;
create trigger subscription_capacity before insert on public.appointments for each row execute function public.guard_subscription_capacity();

create or replace function public.apply_subscription_payment(reference_input text,amount_input numeric,currency_input text,status_input text) returns void
language plpgsql security definer set search_path=public as $$
declare bill payment_orders;
begin
 select * into bill from payment_orders where order_reference=reference_input for update;
 if bill.id is null or amount_input is distinct from bill.amount or currency_input is distinct from bill.currency then raise exception 'Payment does not match order'; end if;
 if bill.status='approved' then return; end if;
 if status_input='Approved' then
  perform 1 from tenants where id=bill.tenant_id for update;
  insert into subscriptions(tenant_id,plan,status,provider,provider_subscription_id,current_period_end)
  values(bill.tenant_id,bill.plan,'active','wayforpay',bill.order_reference,now()+interval '1 month')
  on conflict(tenant_id) do update set plan=excluded.plan,status='active',provider='wayforpay',provider_subscription_id=excluded.provider_subscription_id,
   current_period_end=greatest(now(),coalesce(subscriptions.current_period_end,now()))+interval '1 month',updated_at=now();
  update payment_orders set status='approved',provider_status=status_input,paid_at=now(),updated_at=now() where id=bill.id;
 elsif status_input in ('Declined','Expired','Refunded','Voided') then
  update payment_orders set status='declined',provider_status=status_input,updated_at=now() where id=bill.id;
 else
  update payment_orders set provider_status=status_input,updated_at=now() where id=bill.id;
 end if;
end $$;
revoke all on function public.apply_subscription_payment(text,numeric,text,text) from public,anon,authenticated;
grant execute on function public.apply_subscription_payment(text,numeric,text,text) to service_role;
revoke all on function public.subscription_allows_new_work(uuid) from public,anon;
grant execute on function public.subscription_allows_new_work(uuid) to authenticated,service_role;
notify pgrst,'reload schema';

-- 035_studio_administrators.sql · SHA256 340e2284bfbfa708c99e888f3bf44d65bbc6a94c1ea96170771025d9bb2e4017
alter table public.tenant_memberships add column if not exists active boolean not null default true;
alter table public.tenant_memberships add column if not exists finance_access boolean not null default false;
create or replace function public.is_tenant_member(target_tenant uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from tenant_memberships where tenant_id=target_tenant and user_id=auth.uid() and active)$$;
create or replace function public.is_tenant_manager(target_tenant uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from tenant_memberships where tenant_id=target_tenant and user_id=auth.uid() and active and role in ('owner','admin'))$$;
create or replace function public.is_tenant_owner(target_tenant uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from tenant_memberships where tenant_id=target_tenant and user_id=auth.uid() and active and role='owner')$$;
create or replace function public.can_view_finance(target_tenant uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from tenant_memberships where tenant_id=target_tenant and user_id=auth.uid() and active and (role='owner' or (role='admin' and finance_access)))$$;
revoke all on function public.is_tenant_owner(uuid),public.can_view_finance(uuid) from public,anon;
grant execute on function public.is_tenant_owner(uuid),public.can_view_finance(uuid) to authenticated,service_role;
drop policy if exists "managers manage memberships" on public.tenant_memberships;
drop policy if exists "owners manage memberships" on public.tenant_memberships;
create policy "owners manage memberships" on public.tenant_memberships for all using(is_tenant_owner(tenant_id)) with check(is_tenant_owner(tenant_id) and role in ('admin','master'));
-- An owner account cannot be disabled or demoted through a generic membership update.
create or replace function public.guard_owner_membership() returns trigger language plpgsql as $$begin
 if auth.uid() is not null and old.role='owner' then raise exception 'Передача прав власника потребує окремої процедури'; end if;
 if tg_op='DELETE' then return old;end if;return new;end$$;
drop trigger if exists protect_owner on public.tenant_memberships;
create trigger protect_owner before update or delete on public.tenant_memberships for each row execute function public.guard_owner_membership();

create or replace function public.resolve_my_access() returns jsonb language plpgsql security definer set search_path=public as $$
declare m tenant_memberships;s staff_profiles;r text;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into m from tenant_memberships where user_id=auth.uid() and role in ('owner','admin','super_admin') order by case when role='super_admin' then 0 else 1 end,created_at limit 1;
 if m.user_id is not null then return jsonb_build_object('role',case when m.active then m.role::text else 'blocked' end,'tenant_id',case when m.active then m.tenant_id end,'finance_access',m.active and (m.role='owner' or m.finance_access),'needs_password',exists(select 1 from auth.users where id=auth.uid() and coalesce(encrypted_password,'')=''));end if;
 select * into s from staff_profiles where user_id=auth.uid();
 if s.id is not null then
  if not s.active then return jsonb_build_object('role','blocked');end if;
  return jsonb_build_object('role','master','tenant_id',s.tenant_id,'needs_password',exists(select 1 from auth.users where id=auth.uid() and coalesce(encrypted_password,'')=''));
 end if;
 select status into r from studio_access_requests where user_id=auth.uid();
 return jsonb_build_object('role',case when r is null then 'unlinked' else 'owner_request' end,'status',r);
end$$;

do $$declare t text;p record;begin
 foreach t in array array['expenses','cash_transactions','staff_service_compensation','staff_earnings','staff_payouts','payment_orders'] loop
  for p in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',p.policyname,t);end loop;
  execute format('create policy "finance access" on public.%I for all using(can_view_finance(tenant_id)) with check(can_view_finance(tenant_id))',t);
 end loop;
end$$;
create policy "master reads own earnings" on public.staff_earnings for select using(is_own_staff_profile(staff_id));
create policy "master reads own rates" on public.staff_service_compensation for select using(is_own_staff_profile(staff_id));
create policy "master reads own payouts" on public.staff_payouts for select using(exists(select 1 from staff_earnings e where e.id=earning_id and is_own_staff_profile(e.staff_id)));

create or replace function public.list_studio_administrators(studio uuid) returns jsonb language plpgsql security definer set search_path=public as $$begin
 if not is_tenant_owner(studio) then raise exception 'Потрібні права власника';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',p.full_name,'email',u.email,'active',m.active,'finance_access',m.finance_access,'registered',u.last_sign_in_at is not null)) from tenant_memberships m join profiles p on p.id=m.user_id join auth.users u on u.id=m.user_id where m.tenant_id=studio and m.role='admin'),'[]');
end$$;
revoke all on function public.list_studio_administrators(uuid) from public,anon;
grant execute on function public.list_studio_administrators(uuid) to authenticated;

-- Payroll is privileged even when invoked through a SECURITY DEFINER function.
do $$begin
 if to_regprocedure('public.record_staff_payout_internal(uuid,numeric,public.payment_method,uuid,text)') is null then
  alter function public.record_staff_payout(uuid,numeric,public.payment_method,uuid,text) rename to record_staff_payout_internal;
 end if;
end$$;
revoke all on function public.record_staff_payout_internal(uuid,numeric,public.payment_method,uuid,text) from public,anon,authenticated;
create or replace function public.record_staff_payout(earning_id_input uuid,amount_input numeric,method_input public.payment_method,request_id uuid,note_input text default '') returns void language plpgsql security definer set search_path=public as $$begin
 if not exists(select 1 from staff_earnings where id=earning_id_input and can_view_finance(tenant_id)) then raise exception 'Немає доступу до зарплат';end if;
 perform record_staff_payout_internal(earning_id_input,amount_input,method_input,request_id,note_input);
end$$;
revoke all on function public.record_staff_payout(uuid,numeric,public.payment_method,uuid,text) from public,anon;
grant execute on function public.record_staff_payout(uuid,numeric,public.payment_method,uuid,text) to authenticated;

create or replace function public.guard_compensation_edit() returns trigger language plpgsql security definer set search_path=public as $$begin
 if auth.uid() is not null and not can_view_finance(new.tenant_id) and (new.compensation_percent is distinct from old.compensation_percent or new.hourly_rate is distinct from old.hourly_rate) then raise exception 'Немає прав змінювати оплату майстра';end if;return new;
end$$;
drop trigger if exists guard_compensation_edit on public.staff_profiles;
create trigger guard_compensation_edit before update on public.staff_profiles for each row execute function public.guard_compensation_edit();

create or replace function public.get_team_profiles(studio uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$begin
 if not is_tenant_member(studio) then raise exception 'Немає доступу';end if;
 return coalesce((select jsonb_agg((case when can_view_finance(studio) or s.user_id=auth.uid() then to_jsonb(s) else to_jsonb(s)-'compensation_percent'-'hourly_rate' end)||jsonb_build_object('staff_services',coalesce((select jsonb_agg(jsonb_build_object('service_id',service_id)) from staff_services where staff_id=s.id),'[]')) order by s.created_at) from staff_profiles s where s.tenant_id=studio and s.active and (is_tenant_manager(studio) or s.user_id=auth.uid())),'[]');
end$$;
-- Row security cannot hide individual salary columns. Read them only through a checked RPC.
revoke select on public.staff_profiles from authenticated;
do $$declare cols text;begin
 select string_agg(quote_ident(column_name),',') into cols from information_schema.columns where table_schema='public' and table_name='staff_profiles' and column_name not in ('compensation_percent','hourly_rate');
 execute 'grant select ('||cols||') on public.staff_profiles to authenticated';
end$$;
create or replace function public.save_staff_base_rate(staff_input uuid,percent_input numeric,hourly_input numeric) returns jsonb language plpgsql security definer set search_path=public as $$declare p staff_profiles;begin
 select * into p from staff_profiles where id=staff_input for update;
 if p.id is null or not can_view_finance(p.tenant_id) then raise exception 'Немає доступу';end if;
 update staff_profiles set compensation_percent=percent_input,hourly_rate=hourly_input where id=p.id returning * into p;
 return to_jsonb(p);
end$$;
create or replace function public.get_workflow_snapshot(studio uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$declare finance boolean:=can_view_finance(studio);begin
 if not is_tenant_member(studio) then raise exception 'Немає доступу';end if;
 return jsonb_build_object(
 'can_view_finance',finance,
 'jobs',coalesce((select jsonb_agg((case when finance or is_own_staff_profile(j.staff_id) then to_jsonb(j) else to_jsonb(j)-'rate'-'pay_mode' end)||jsonb_build_object('can_view_pay',finance or is_own_staff_profile(j.staff_id)) order by j.created_at) from work_order_jobs j where j.tenant_id=studio and can_access_job(j.id)),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(e)||jsonb_build_object('detail',case when finance or exists(select 1 from work_order_jobs j where j.id=e.job_id and is_own_staff_profile(j.staff_id)) then e.detail else e.detail-'pay'-'rate'-'pay_mode' end) order by e.created_at) from work_job_events e where e.tenant_id=studio and can_access_job(e.job_id)),'[]'),
 'shifts',coalesce((select jsonb_agg(to_jsonb(s) order by s.started_at) from staff_shifts s where s.tenant_id=studio and (is_tenant_manager(studio) or is_own_staff_profile(s.staff_id))),'[]'),
 'earnings',coalesce((select jsonb_agg(to_jsonb(e) order by e.accrued_at) from staff_earnings e where e.tenant_id=studio and (finance or is_own_staff_profile(e.staff_id))),'[]'),
 'payouts',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from staff_payouts p join staff_earnings e on e.id=p.earning_id where p.tenant_id=studio and (finance or is_own_staff_profile(e.staff_id))),'[]'),
 'services',coalesce((select jsonb_agg(to_jsonb(s)) from services s where s.tenant_id=studio and s.active),'[]'));
end$$;
revoke select on public.work_order_jobs,public.work_job_events from authenticated;
revoke all on function public.get_team_profiles(uuid),public.save_staff_base_rate(uuid,numeric,numeric),public.get_workflow_snapshot(uuid) from public,anon;
grant execute on function public.get_team_profiles(uuid),public.save_staff_base_rate(uuid,numeric,numeric),public.get_workflow_snapshot(uuid) to authenticated;

-- Operational administrators may assign work using saved rates, but cannot override pay.
do $$begin if to_regprocedure('public.save_work_job_internal(uuid,jsonb,integer)') is null then alter function public.save_work_job(uuid,jsonb,integer) rename to save_work_job_internal;end if;end$$;
revoke all on function public.save_work_job_internal(uuid,jsonb,integer) from public,anon,authenticated;
create or replace function public.save_work_job(order_id uuid,job_input jsonb,expected_version integer default null) returns uuid language plpgsql security definer set search_path=public as $$declare studio uuid;begin
 select tenant_id into studio from work_orders where id=order_id;
 if not is_tenant_manager(studio) then raise exception 'Немає доступу';end if;
 if not can_view_finance(studio) then
  if coalesce(job_input->>'pay_mode','auto')<>'auto' then raise exception 'Оплату майстра налаштовує власник';end if;
  job_input=(job_input-'rate')||jsonb_build_object('pay_mode','auto');
 end if;
 return save_work_job_internal(order_id,job_input,expected_version);
end$$;
revoke all on function public.save_work_job(uuid,jsonb,integer) from public,anon;
grant execute on function public.save_work_job(uuid,jsonb,integer) to authenticated;
notify pgrst,'reload schema';

-- 036_receipts_crm.sql · SHA256 9400df6d850535159ec5d9dff481f1c0d6692bd1031697c7514c48b91cc29714
create table if not exists public.order_receipts(
 id uuid primary key default gen_random_uuid(),number bigint generated always as identity unique,
 tenant_id uuid not null references tenants(id),work_order_id uuid not null unique references work_orders(id),
 snapshot jsonb not null,subtotal numeric(12,2) not null,discount numeric(12,2) not null default 0,
 total numeric(12,2) generated always as(subtotal-discount) stored,created_at timestamptz not null default now(),created_by uuid references profiles(id),
 check(discount>=0 and discount<=subtotal));
create table if not exists public.order_payments(
 id uuid primary key,tenant_id uuid not null references tenants(id),work_order_id uuid not null references work_orders(id),
 amount numeric(12,2) not null check(amount>0),method payment_method not null,paid_on date not null,
 note text not null default '',created_at timestamptz not null default now(),created_by uuid references profiles(id));
alter table public.order_receipts enable row level security;
alter table public.order_payments enable row level security;
drop policy if exists "managers read order receipts" on public.order_receipts;
create policy "managers read order receipts" on public.order_receipts for select using(is_tenant_manager(tenant_id));
drop policy if exists "managers read order payments" on public.order_payments;
create policy "managers read order payments" on public.order_payments for select using(is_tenant_manager(tenant_id));
grant select on public.order_receipts,public.order_payments to authenticated;
revoke insert,update,delete on public.order_receipts,public.order_payments from authenticated,anon;

create or replace function public.issue_order_receipt(order_input uuid,discount_input numeric default 0) returns jsonb language plpgsql security definer set search_path=public as $$
declare o work_orders;r order_receipts;lines jsonb;studio tenants;c clients;
begin
 select * into o from work_orders where id=order_input for update;
 if o.id is null or not is_tenant_manager(o.tenant_id) then raise exception 'Немає доступу';end if;
 select * into r from order_receipts where work_order_id=o.id;
 if r.id is not null then return to_jsonb(r);end if;
 if o.status not in ('ready','issued') then raise exception 'Спочатку підтвердьте всі роботи';end if;
 if discount_input is null or discount_input<0 or discount_input>o.total or discount_input<>round(discount_input,2) or o.deposit>o.total-discount_input then raise exception 'Знижка перевищує неоплачений залишок';end if;
 select * into studio from tenants where id=o.tenant_id;select * into c from clients where id=o.client_id;
 select jsonb_agg(jsonb_build_object('name',title,'amount',price,'staff_id',staff_id) order by position,created_at) into lines from work_order_jobs where work_order_id=o.id;
 insert into order_receipts(tenant_id,work_order_id,subtotal,discount,created_by,snapshot)
 values(o.tenant_id,o.id,o.total,discount_input,auth.uid(),jsonb_build_object('studio',studio.name,'address',studio.address,'phone',studio.phone,'client',c.full_name,'client_id',c.id,'client_phone',c.phone,'vehicle',o.vehicle_label,'order',o.title,'lines',coalesce(lines,jsonb_build_array(jsonb_build_object('name',o.title,'amount',o.total))))) returning * into r;
 return to_jsonb(r);
end$$;

create or replace function public.record_order_payment(order_input uuid,amount_input numeric,method_input payment_method,date_input date,request_input uuid,note_input text default '') returns void language plpgsql security definer set search_path=public as $$
declare o work_orders;p order_payments;net numeric;
begin
 select * into o from work_orders where id=order_input for update;
 if o.id is null or not is_tenant_manager(o.tenant_id) then raise exception 'Немає доступу';end if;
 select * into p from order_payments where id=request_input;
 if p.id is not null then
  if p.work_order_id<>o.id or p.amount<>amount_input or p.method<>method_input or p.paid_on<>date_input then raise exception 'Ідентифікатор платежу вже використаний';end if;return;
 end if;
 select total into net from order_receipts where work_order_id=o.id;net=coalesce(net,o.total);
 if o.status='cancelled' or amount_input is null or amount_input<=0 or amount_input<>round(amount_input,2) or amount_input>net-o.deposit or date_input is null or request_input is null then raise exception 'Перевірте суму та залишок оплати';end if;
 insert into order_payments(id,tenant_id,work_order_id,amount,method,paid_on,note,created_by) values(request_input,o.tenant_id,o.id,amount_input,method_input,date_input,left(coalesce(note_input,''),2000),auth.uid());
 update work_orders set deposit=deposit+amount_input where id=o.id;
 insert into cash_transactions(tenant_id,transaction_date,direction,amount,category,title,payment_method,client_id,note)
 values(o.tenant_id,date_input,'income',amount_input,'Оплата замовлення','Оплата замовлення: '||o.title,method_input,o.client_id,left(coalesce(note_input,''),2000));
end$$;

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
 return cid;
end$$;
revoke all on function public.issue_order_receipt(uuid,numeric),public.record_order_payment(uuid,numeric,payment_method,date,uuid,text),public.save_client_card(uuid,uuid,jsonb) from public,anon;
grant execute on function public.issue_order_receipt(uuid,numeric),public.record_order_payment(uuid,numeric,payment_method,date,uuid,text),public.save_client_card(uuid,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';

-- 037_operational_permissions.sql · SHA256 7d82e391291aa19956bff5ae490302b927b2e78693d55873cd3ca5a1b2b39b14
-- Keep historical salary fields private as well as the newer job rate.
revoke select on public.work_orders from authenticated;
do $$declare cols text;begin
 select string_agg(quote_ident(column_name),',') into cols from information_schema.columns where table_schema='public' and table_name='work_orders' and column_name not in ('compensation_percent','compensation_fixed');
 execute 'grant select ('||cols||') on public.work_orders to authenticated';
end$$;
create or replace function public.get_studio_orders(studio uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$begin
 if not is_tenant_member(studio) then raise exception 'Немає доступу';end if;
 return coalesce((select jsonb_agg(
 (case when can_view_finance(studio) or is_own_staff_profile(o.staff_id) then to_jsonb(o) else to_jsonb(o)-'compensation_percent'-'compensation_fixed' end)
 || jsonb_build_object('staff_profiles',jsonb_build_object('full_name',s.full_name),'clients',jsonb_build_object('full_name',c.full_name,'vehicles',coalesce((select jsonb_agg(to_jsonb(v)) from vehicles v where v.client_id=o.client_id and v.tenant_id=studio),'[]')),
 'appointments',jsonb_build_object('vehicles',(select to_jsonb(v) from appointments a join vehicles v on v.id=a.vehicle_id where a.id=o.appointment_id)),
 'receipt_total',(select total from order_receipts where work_order_id=o.id)) order by o.created_at desc,o.id)
 from work_orders o left join clients c on c.id=o.client_id left join staff_profiles s on s.id=o.staff_id
 where o.tenant_id=studio and (is_tenant_manager(studio) or is_own_staff_profile(o.staff_id) or can_read_job_order(o.id))),'[]');
end$$;
revoke all on function public.get_studio_orders(uuid) from public,anon;
grant execute on function public.get_studio_orders(uuid) to authenticated;

create or replace function public.guard_compensation_edit() returns trigger language plpgsql security definer set search_path=public as $$begin
 if auth.uid() is null or can_view_finance(new.tenant_id) then return new;end if;
 if tg_op='INSERT' then
  if new.compensation_percent is not null or coalesce(new.hourly_rate,0)<>0 then raise exception 'Немає прав змінювати оплату майстра';end if;
 elsif new.compensation_percent is distinct from old.compensation_percent or new.hourly_rate is distinct from old.hourly_rate then raise exception 'Немає прав змінювати оплату майстра';end if;
 return new;
end$$;
drop trigger if exists guard_compensation_edit on public.staff_profiles;
create trigger guard_compensation_edit before insert or update on public.staff_profiles for each row execute function public.guard_compensation_edit();
create or replace function public.guard_order_compensation() returns trigger language plpgsql security definer set search_path=public as $$begin
 if auth.uid() is null or can_view_finance(new.tenant_id) then return new;end if;
 if tg_op='INSERT' then
  if new.compensation_percent is not null or new.compensation_fixed is not null then raise exception 'Оплату майстра налаштовує власник';end if;
 elsif new.compensation_percent is distinct from old.compensation_percent or new.compensation_fixed is distinct from old.compensation_fixed then raise exception 'Оплату майстра налаштовує власник';end if;
 return new;
end$$;
drop trigger if exists guard_order_compensation on public.work_orders;
create trigger guard_order_compensation before insert or update on public.work_orders for each row execute function public.guard_order_compensation();
notify pgrst,'reload schema';

-- 038_manual_booking.sql · SHA256 56a7172332bb702dddf0c7f17fc43307555bd66c9cda6e42b94ee15ffd2c3c5e
alter table public.appointments add column if not exists manual_request_id uuid;
create unique index if not exists appointments_manual_request on public.appointments(manual_request_id) where manual_request_id is not null;
create or replace function public.create_manual_booking(studio uuid,request_input uuid,booking jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare s services;v jsonb;cid uuid;vid uuid;sid uuid;aid uuid;start_time timestamptz;zone text;wall timestamp;price_value numeric;minutes_value integer;name_value text;phone_value text;car_value text;
begin
 if not is_tenant_manager(studio) then raise exception 'Немає доступу';end if;
 if request_input is null then raise exception 'Відсутній ідентифікатор запису';end if;
 -- Serialize duplicate requests and capacity checks for this studio.
 select timezone into zone from tenants where id=studio for update;
 select id,client_id into aid,cid from appointments where tenant_id=studio and manual_request_id=request_input;
 if aid is not null then return jsonb_build_object('id',aid,'client_id',cid);end if;
 select * into s from services where tenant_id=studio and name=booking->>'service' and active for share;
 if s.id is null then raise exception 'Послуга недоступна. Оновіть каталог';end if;
 price_value=s.price;minutes_value=s.duration_minutes;name_value=s.name;
 if jsonb_array_length(s.variants)>0 then
  select value into v from jsonb_array_elements(s.variants) where value->>'id'=booking->>'variant_id';
  if v is null then raise exception 'Оберіть актуальний варіант послуги';end if;
  price_value=(v->>'price')::numeric;minutes_value=(v->>'duration_minutes')::integer;name_value=s.name||' · '||(v->>'name');
 elsif coalesce(booking->>'variant_id','')<>'' then raise exception 'Варіант більше недоступний';end if;
 if price_value is distinct from (booking->>'expected_price')::numeric or minutes_value is distinct from (booking->>'expected_minutes')::integer then raise exception 'Ціна або тривалість змінилася. Оновіть каталог і перевірте запис';end if;
 sid=nullif(booking->>'staff_id','')::uuid;
 if sid is not null and not staff_can_perform(sid,s.id) then raise exception 'Майстер не виконує цю послугу';end if;
 wall=((booking->>'date')||' '||(booking->>'time'))::timestamp;
 start_time=wall at time zone coalesce(zone,'Europe/Kyiv');
 if start_time at time zone coalesce(zone,'Europe/Kyiv')<>wall then raise exception 'Час пропущено через перехід на літній час';end if;
 if length(trim(coalesce(booking->>'client','')))<2 then raise exception 'Вкажіть ім’я клієнта';end if;
 cid=nullif(booking->>'client_id','')::uuid;
 phone_value=nullif(regexp_replace(coalesce(booking->>'phone',''),'[^0-9]','','g'),'');
 if phone_value is not null and length(phone_value) not between 10 and 15 then raise exception 'Вкажіть телефон із кодом країни';end if;
 if cid is not null then
  perform 1 from clients where id=cid and tenant_id=studio;if not found then raise exception 'Клієнта не знайдено';end if;
 elsif phone_value is not null then
  select id into cid from clients where tenant_id=studio and regexp_replace(phone,'[^0-9]','','g')=phone_value order by created_at limit 1;
 end if;
 if cid is null then insert into clients(tenant_id,full_name,phone) values(studio,left(trim(booking->>'client'),120),case when phone_value is not null then '+'||phone_value end) returning id into cid;end if;
 car_value=nullif(trim(booking->>'vehicle'),'');
 if car_value is not null then
  select id into vid from vehicles where tenant_id=studio and client_id=cid and (notes=car_value or concat_ws(' ',nullif(make,''),nullif(model,''),nullif(plate_number,''))=car_value) limit 1;
  if vid is null then insert into vehicles(tenant_id,client_id,notes) values(studio,cid,left(car_value,2000)) returning id into vid;end if;
 end if;
 insert into appointments(tenant_id,client_id,vehicle_id,staff_id,starts_at,ends_at,status,source,manual_request_id)
 values(studio,cid,vid,sid,start_time,start_time+make_interval(mins=>minutes_value),'confirmed','admin',request_input) returning id into aid;
 insert into appointment_services(appointment_id,service_id,service_name,unit_price,duration_minutes) values(aid,s.id,name_value,price_value,minutes_value);
 return jsonb_build_object('id',aid,'client_id',cid);
end$$;
revoke all on function public.create_manual_booking(uuid,uuid,jsonb) from public,anon;
grant execute on function public.create_manual_booking(uuid,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';

-- 039_operations.sql · SHA256 ae366d3a20bde297361fe896c3b5d287e1311652abfcfe818dff015477c18856
-- Audit snapshots may contain salary and client data. Team-wide read access is unsafe.
drop policy if exists "members read audit logs" on public.audit_logs;
drop policy if exists "owner reads audit logs" on public.audit_logs;
create policy "owner reads audit logs" on public.audit_logs for select using(is_tenant_owner(tenant_id));
revoke insert,update,delete on public.audit_logs from authenticated,anon;
create index if not exists audit_logs_tenant_created on public.audit_logs(tenant_id,created_at desc);
create or replace function public.audit_row_change() returns trigger language plpgsql security definer set search_path=public as $$
declare before_row jsonb;after_row jsonb;row_data jsonb;
begin
 if tg_op<>'INSERT' then before_row=to_jsonb(old);end if;
 if tg_op<>'DELETE' then after_row=to_jsonb(new);end if;
 if tg_op='UPDATE' and before_row=after_row then return new;end if;
 row_data=coalesce(after_row,before_row);
 insert into audit_logs(tenant_id,actor_id,entity_type,entity_id,action,before_data,after_data)
 values((row_data->>'tenant_id')::uuid,auth.uid(),tg_table_name,coalesce(row_data->>'id',row_data->>'user_id')::uuid,lower(tg_op),before_row,after_row);
 if tg_op='DELETE' then return old;end if;return new;
end$$;
do $$declare tab text;begin
 foreach tab in array array['clients','vehicles','staff_profiles','tenant_memberships','subscriptions','cash_transactions','staff_earnings','staff_payouts','order_receipts','order_payments','work_orders'] loop
  execute format('drop trigger if exists platform_audit on public.%I',tab);
  execute format('create trigger platform_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()',tab);
 end loop;
end$$;
-- Directly created orders are subject to the same subscription term as calendar bookings.
drop trigger if exists subscription_capacity on public.work_orders;
create trigger subscription_capacity before insert on public.work_orders for each row execute function public.guard_subscription_capacity();
create or replace function public.platform_readiness() returns boolean language sql stable security definer set search_path=public as $$
 select to_regprocedure('public.create_manual_booking(uuid,uuid,jsonb)') is not null
 and to_regprocedure('public.get_studio_orders(uuid)') is not null
 and to_regprocedure('public.apply_subscription_payment(text,numeric,text,text)') is not null
 and to_regclass('public.order_receipts') is not null
 and exists(select 1 from pg_trigger where tgname='platform_audit' and tgrelid='public.tenant_memberships'::regclass);
$$;
revoke all on function public.platform_readiness() from public,anon,authenticated;
grant execute on function public.platform_readiness() to service_role;
notify pgrst,'reload schema';
commit;
