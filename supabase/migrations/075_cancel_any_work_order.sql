-- "Клієнт не приїхав" and "Скасувати" for every order whose work has not started, not only for orders from a booking.
-- An order from a booking is cancelled through its booking as before (no_show / cancelled + reason on the booking).
-- An order without a booking keeps the kind and reason on itself. Analytics counts both (studio_walk_in_visits).
begin;
alter table public.work_orders add column if not exists cancel_kind text;
alter table public.work_orders add column if not exists cancel_reason text;
alter table public.work_orders drop constraint if exists work_orders_cancel_kind_check;
alter table public.work_orders add constraint work_orders_cancel_kind_check check (cancel_kind is null or cancel_kind in ('no_show','cancelled'));
alter table public.work_orders drop constraint if exists work_orders_cancel_reason_length;
alter table public.work_orders add constraint work_orders_cancel_reason_length check (cancel_reason is null or char_length(cancel_reason)<=200);

-- The order guard lets the status change through only for the order cancel_work_order is cancelling right now.
create or replace function public.guard_work_order_update() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.tenant_id is distinct from old.tenant_id then raise exception 'Не можна змінити студію'; end if;
 if exists(select 1 from work_order_jobs where work_order_id=old.id) then
   if pg_trigger_depth()>1 then return new; end if;
   if current_setting('detailflow.cancelling_order',true)=old.id::text then return new; end if;
   if not is_tenant_manager(old.tenant_id) then raise exception 'Використайте картку призначеної роботи'; end if;
   if new.staff_id is distinct from old.staff_id or new.total is distinct from old.total or new.checklist is distinct from old.checklist or new.approved_at is distinct from old.approved_at then raise exception 'Редагуйте роботи всередині замовлення'; end if;
   if new.status is distinct from old.status and not (old.status='ready' and new.status='issued') then raise exception 'Статус визначається виконанням робіт'; end if;
 end if;
 return new;
end $$;

create or replace function public.cancel_work_order(order_input uuid, kind_input text, reason_input text default '') returns void language plpgsql security definer set search_path=public as $$
declare o public.work_orders; reason text=nullif(left(trim(coalesce(reason_input,'')),200),'');
begin
 if kind_input not in ('no_show','cancelled') then raise exception 'Невідома дія'; end if;
 select * into o from work_orders where id=order_input for update;
 if o.id is null or not is_tenant_manager(o.tenant_id) then raise exception 'Замовлення не знайдено' using errcode='42501'; end if;
 if o.status not in ('new','assigned') or exists(select 1 from work_order_jobs where work_order_id=o.id and (worked_seconds>0 or status not in ('new','assigned'))) then
  raise exception 'Роботу вже почали. Скасувати можна лише замовлення, роботу за яким ще не починали'; end if;
 if o.appointment_id is not null then
  -- The booking trigger cancels the order; 074 keeps no_show on the booking.
  update appointments set status=kind_input::appointment_status, status_reason=reason where id=o.appointment_id;
  update work_orders set cancel_kind=kind_input, cancel_reason=reason where id=o.id;
 else
  perform set_config('detailflow.cancelling_order',o.id::text,true);
  update work_orders set status='cancelled', cancel_kind=kind_input, cancel_reason=reason where id=o.id;
  perform set_config('detailflow.cancelling_order','',true);
 end if;
end $$;
revoke all on function public.cancel_work_order(uuid,text,text) from public, anon;
grant execute on function public.cancel_work_order(uuid,text,text) to authenticated;

-- Orders without a booking for the no-show share in analytics; orders from a booking are counted through the booking.
create or replace function public.studio_walk_in_visits(studio uuid, from_input date, to_input date) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare zone text; lo timestamptz; hi timestamptz;
begin
 if not can_view_finance(studio) then raise exception 'Access denied' using errcode='42501'; end if;
 if from_input is null or to_input is null or to_input<from_input or to_input-from_input>366 then raise exception 'Оберіть період до року'; end if;
 select coalesce(timezone,'Europe/Kyiv') into zone from tenants where id=studio;
 lo=from_input::timestamp at time zone zone; hi=(to_input+1)::timestamp at time zone zone;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'staff_id',staff_id,'at',created_at,
   'status',case when cancel_kind='no_show' then 'no_show' when status='cancelled' then 'cancelled' else 'visit' end))
  from work_orders where tenant_id=studio and appointment_id is null and created_at>=lo and created_at<hi),'[]');
end $$;
revoke all on function public.studio_walk_in_visits(uuid,date,date) from public, anon;
grant execute on function public.studio_walk_in_visits(uuid,date,date) to authenticated;
notify pgrst, 'reload schema';
commit;
