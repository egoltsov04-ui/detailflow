begin;
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
commit;
