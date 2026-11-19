-- Rollback of 075: cancelling orders without a booking goes away; their saved kind and reason are dropped.
begin;
drop function if exists public.studio_walk_in_visits(uuid,date,date);
drop function if exists public.cancel_work_order(uuid,text,text);
create or replace function public.guard_work_order_update() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.tenant_id is distinct from old.tenant_id then raise exception 'Не можна змінити студію'; end if;
 if exists(select 1 from work_order_jobs where work_order_id=old.id) then
   if pg_trigger_depth()>1 then return new; end if;
   if not is_tenant_manager(old.tenant_id) then raise exception 'Використайте картку призначеної роботи'; end if;
   if new.staff_id is distinct from old.staff_id or new.total is distinct from old.total or new.checklist is distinct from old.checklist or new.approved_at is distinct from old.approved_at then raise exception 'Редагуйте роботи всередині замовлення'; end if;
   if new.status is distinct from old.status and not (old.status='ready' and new.status='issued') then raise exception 'Статус визначається виконанням робіт'; end if;
 end if;
 return new;
end $$;
alter table public.work_orders drop constraint if exists work_orders_cancel_reason_length;
alter table public.work_orders drop constraint if exists work_orders_cancel_kind_check;
alter table public.work_orders drop column if exists cancel_reason;
alter table public.work_orders drop column if exists cancel_kind;
notify pgrst, 'reload schema';
commit;
