-- Records the exact time at which the current work-order status was set.

alter table public.work_orders
  add column if not exists status_changed_at timestamptz;

update public.work_orders
set status_changed_at = coalesce(status_changed_at, created_at)
where status_changed_at is null;

alter table public.work_orders
  alter column status_changed_at set default now(),
  alter column status_changed_at set not null;

create or replace function public.set_work_order_status_timestamp()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists work_orders_status_timestamp on public.work_orders;
create trigger work_orders_status_timestamp
before update on public.work_orders
for each row execute function public.set_work_order_status_timestamp();
