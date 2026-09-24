-- Apply after 026. Keep assignment, review and payroll consistent across clients.
begin;

create or replace function public.set_work_order_compensation()
returns trigger language plpgsql security definer set search_path=public as $$
declare service uuid; rate public.staff_service_compensation;
begin
  if tg_op='UPDATE' and new.staff_id is not distinct from old.staff_id then return new; end if;
  if tg_op='INSERT' and (new.compensation_percent is not null or new.compensation_fixed is not null) then return new; end if;
  new.compensation_percent:=null; new.compensation_fixed:=null;
  if new.staff_id is not null then
    select compensation_percent into new.compensation_percent from public.staff_profiles
      where id=new.staff_id and tenant_id=new.tenant_id and active;
    -- A calendar booking currently represents one service. Do not choose an
    -- arbitrary rate if a future booking contains several different services.
    if (select count(*) from public.appointment_services where appointment_id=new.appointment_id)=1 then
      select service_id into service from public.appointment_services where appointment_id=new.appointment_id;
      select * into rate from public.staff_service_compensation where staff_id=new.staff_id and service_id=service and tenant_id=new.tenant_id;
      if found then new.compensation_percent:=rate.percent; new.compensation_fixed:=rate.fixed_amount; end if;
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists work_orders_set_compensation on public.work_orders;
create trigger work_orders_set_compensation before insert or update of staff_id on public.work_orders
for each row execute function public.set_work_order_compensation();

-- Repair only missing snapshots on unfinished orders; preserve explicit zero
-- rates and all previously approved payroll.
update public.work_orders o set compensation_percent=r.percent,compensation_fixed=r.fixed_amount
from public.appointment_services a,public.staff_service_compensation r
where a.appointment_id=o.appointment_id and r.service_id=a.service_id and r.staff_id=o.staff_id and r.tenant_id=o.tenant_id
  and (select count(*) from public.appointment_services x where x.appointment_id=o.appointment_id)=1
  and o.compensation_percent is null and o.compensation_fixed is null and o.approved_at is null
  and o.status in ('assigned','in_progress','waiting','review');
update public.work_orders o set compensation_percent=s.compensation_percent
from public.staff_profiles s where s.id=o.staff_id and s.tenant_id=o.tenant_id
  and o.compensation_percent is null and o.compensation_fixed is null and o.approved_at is null
  and o.status in ('assigned','in_progress','waiting','review');

create or replace function public.guard_work_order_update()
returns trigger language plpgsql security definer set search_path=public as $$
declare manager boolean:=public.is_tenant_manager(old.tenant_id);
begin
  if new.tenant_id is distinct from old.tenant_id then raise exception 'Не можна переносити замовлення між студіями'; end if;
  if new.staff_id is not null and not exists(select 1 from public.staff_profiles where id=new.staff_id and tenant_id=new.tenant_id) then
    raise exception 'Майстер належить іншій студії';
  end if;
  if not manager and auth.uid() is not null then
    if not public.is_own_staff_profile(old.staff_id) then raise exception 'Немає доступу до цього замовлення'; end if;
    if (to_jsonb(new)-array['status','checklist','submitted_for_review_at','updated_at','status_changed_at']) is distinct from
       (to_jsonb(old)-array['status','checklist','submitted_for_review_at','updated_at','status_changed_at']) then
      raise exception 'Майстер може змінювати лише виконання робіт';
    end if;
    if old.status not in ('assigned','in_progress','waiting') or new.status not in ('in_progress','review') then
      raise exception 'Недоступна зміна статусу';
    end if;
    if not exists(select 1 from public.staff_shifts where staff_id=old.staff_id and tenant_id=old.tenant_id and ended_at is null) then
      raise exception 'Спочатку розпочніть зміну';
    end if;
    if (select jsonb_agg(value-'done' order by ord) from jsonb_array_elements(new.checklist) with ordinality as e(value,ord)) is distinct from
       (select jsonb_agg(value-'done' order by ord) from jsonb_array_elements(old.checklist) with ordinality as e(value,ord)) then
      raise exception 'Склад чек-листа змінює власник';
    end if;
  end if;
  if old.approved_at is not null and (new.staff_id is distinct from old.staff_id or new.total is distinct from old.total or
    new.compensation_percent is distinct from old.compensation_percent or new.compensation_fixed is distinct from old.compensation_fixed or
    new.approved_at is distinct from old.approved_at or new.status not in ('ready','issued') or (old.status='issued' and new.status<>'issued')) then
    raise exception 'Нараховане замовлення не можна змінювати заднім числом';
  end if;
  if new.status in ('assigned','in_progress','review','ready') and new.staff_id is null then raise exception 'Спочатку призначте майстра'; end if;
  if new.status='review' and old.status<>'review' then
    if jsonb_array_length(new.checklist)=0 or exists(select 1 from jsonb_array_elements(new.checklist) item where item->'done' is distinct from 'true'::jsonb) then
      raise exception 'Виконайте всі пункти чек-листа перед перевіркою';
    end if;
    new.submitted_for_review_at:=now();
  end if;
  if new.status='ready' and old.status<>'ready' and (old.status<>'review' or new.approved_at is null or new.reviewed_by is distinct from auth.uid() or not manager) then
    raise exception 'Використайте підтвердження роботи з нарахуванням';
  end if;
  if new.status='issued' and old.status not in ('ready','issued') then raise exception 'Спочатку підтвердьте роботу'; end if;
  return new;
end; $$;
drop trigger if exists work_orders_guard_update on public.work_orders;
create trigger work_orders_guard_update before update on public.work_orders for each row execute function public.guard_work_order_update();

drop policy if exists "members access work orders" on public.work_orders;
drop policy if exists "managers access work orders" on public.work_orders;
create policy "managers access work orders" on public.work_orders for all
using(public.is_tenant_manager(tenant_id)) with check(public.is_tenant_manager(tenant_id));
drop policy if exists "master reads own orders" on public.work_orders;
create policy "master reads own orders" on public.work_orders for select using(public.is_own_staff_profile(staff_id));
drop policy if exists "master updates own orders" on public.work_orders;
create policy "master updates own orders" on public.work_orders for update
using(public.is_own_staff_profile(staff_id)) with check(public.is_own_staff_profile(staff_id));

-- FOR ALL previously allowed an assigned master to DELETE their own earnings.
drop policy if exists "members access staff earnings" on public.staff_earnings;
drop policy if exists "managers access earnings" on public.staff_earnings;
create policy "managers access earnings" on public.staff_earnings for all
using(public.is_tenant_manager(tenant_id)) with check(public.is_tenant_manager(tenant_id));
drop policy if exists "master reads earnings" on public.staff_earnings;
create policy "master reads earnings" on public.staff_earnings for select using(public.is_own_staff_profile(staff_id));

create or replace function public.guard_accrued_order_delete()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.approved_at is not null or exists(select 1 from public.staff_earnings where work_order_id=old.id) then
    raise exception 'Не можна видалити замовлення з нарахованою зарплатою';
  end if;
  return old;
end; $$;
drop trigger if exists work_orders_guard_delete on public.work_orders;
create trigger work_orders_guard_delete before delete on public.work_orders for each row execute function public.guard_accrued_order_delete();
commit;
