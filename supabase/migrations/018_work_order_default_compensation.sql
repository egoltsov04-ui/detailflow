-- Run this after 017 if migration 017 has already been applied.
-- It snapshots the default percentage from the assigned master's profile.

create or replace function public.set_work_order_compensation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.staff_id is not null and new.compensation_percent is null and new.compensation_fixed is null then
    select compensation_percent into new.compensation_percent
    from public.staff_profiles where id = new.staff_id;
  end if;
  return new;
end;
$$;

drop trigger if exists work_orders_set_compensation on public.work_orders;
create trigger work_orders_set_compensation
before insert on public.work_orders
for each row execute function public.set_work_order_compensation();
