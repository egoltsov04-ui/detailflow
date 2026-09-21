-- Detailer workflow: shift → assigned work → checklist → owner review → earnings.
-- Run after migrations 001–016 in Supabase SQL Editor.

alter table public.staff_profiles
  add column if not exists hourly_rate numeric(12,2) not null default 0 check (hourly_rate >= 0);

create or replace function public.is_own_staff_profile(target_staff uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.staff_profiles
  where id = target_staff and user_id = auth.uid()
); $$;

-- A rate can be set for a particular master and a particular service.
-- fixed_amount has priority over percent when both are filled in.
create table if not exists public.staff_service_compensation (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  staff_id uuid not null references public.staff_profiles(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  percent numeric(5,2) check (percent is null or percent between 0 and 100),
  fixed_amount numeric(12,2) check (fixed_amount is null or fixed_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, service_id),
  check (percent is not null or fixed_amount is not null)
);

alter table public.staff_service_compensation enable row level security;
drop policy if exists "members access staff compensation" on public.staff_service_compensation;
create policy "members access staff compensation"
on public.staff_service_compensation for all
using (public.is_tenant_manager(tenant_id))
with check (public.is_tenant_manager(tenant_id));

-- One open shift per master. The application uses this as a factual attendance log.
create table if not exists public.staff_shifts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  staff_id uuid not null references public.staff_profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at > started_at)
);
create unique index if not exists staff_shifts_one_open_per_staff
  on public.staff_shifts(staff_id) where ended_at is null;
create index if not exists staff_shifts_tenant_started_idx
  on public.staff_shifts(tenant_id, started_at desc);
alter table public.staff_shifts enable row level security;
drop policy if exists "members access staff shifts" on public.staff_shifts;
create policy "members access staff shifts"
on public.staff_shifts for all
using (public.is_tenant_manager(tenant_id) or public.is_own_staff_profile(staff_id))
with check (public.is_tenant_manager(tenant_id) or public.is_own_staff_profile(staff_id));

-- Keep existing statuses valid, then add the review path.
alter table public.work_orders
  drop constraint if exists work_orders_status_check;
alter table public.work_orders
  add constraint work_orders_status_check
  check (status in ('new', 'assigned', 'in_progress', 'waiting', 'review', 'ready', 'issued', 'cancelled'));

alter table public.work_orders
  add column if not exists checklist jsonb not null default '[]'::jsonb,
  add column if not exists submitted_for_review_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists review_note text,
  add column if not exists approved_at timestamptz,
  add column if not exists compensation_percent numeric(5,2) check (compensation_percent is null or compensation_percent between 0 and 100),
  add column if not exists compensation_fixed numeric(12,2) check (compensation_fixed is null or compensation_fixed >= 0);

-- Snapshot the master's default percentage at creation so later profile changes do
-- not rewrite already agreed compensation for existing orders.
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

-- An approved order produces one immutable earning row. It is intentionally separate
-- from cash flow: the studio may pay a master later, while the balance is already due.
create table if not exists public.staff_earnings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  staff_id uuid not null references public.staff_profiles(id) on delete restrict,
  work_order_id uuid not null unique references public.work_orders(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  calculation jsonb not null default '{}'::jsonb,
  status text not null default 'accrued' check (status in ('accrued', 'paid', 'void')),
  accrued_at timestamptz not null default now(),
  paid_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  note text
);
create index if not exists staff_earnings_staff_accrued_idx
  on public.staff_earnings(staff_id, accrued_at desc);
alter table public.staff_earnings enable row level security;
drop policy if exists "members access staff earnings" on public.staff_earnings;
create policy "members access staff earnings"
on public.staff_earnings for all
using (public.is_tenant_manager(tenant_id) or public.is_own_staff_profile(staff_id))
with check (public.is_tenant_manager(tenant_id));

-- Approval is the only operation that creates earnings. It can be safely retried.
create or replace function public.approve_work_order(target_work_order_id uuid, reviewer_note text default null)
returns public.staff_earnings
language plpgsql
security definer set search_path = public
as $$
declare
  target public.work_orders;
  payout numeric(12,2);
  result public.staff_earnings;
begin
  select * into target from public.work_orders where id = target_work_order_id for update;
  if target.id is null then raise exception 'Work order not found'; end if;
  if not public.is_tenant_manager(target.tenant_id) then raise exception 'Manager access required'; end if;
  if target.staff_id is null then raise exception 'Assign a master before approval'; end if;
  if target.status <> 'review' then raise exception 'Only work orders submitted for review can be approved'; end if;

  payout := coalesce(target.compensation_fixed, round(target.total * coalesce(target.compensation_percent, 0) / 100, 2));
  update public.work_orders
    set status = 'ready', reviewed_at = now(), reviewed_by = auth.uid(), review_note = reviewer_note,
        approved_at = now(), updated_at = now()
    where id = target.id;

  insert into public.staff_earnings (tenant_id, staff_id, work_order_id, amount, calculation, approved_by, note)
  values (target.tenant_id, target.staff_id, target.id, payout,
    jsonb_build_object('order_total', target.total, 'percent', target.compensation_percent, 'fixed_amount', target.compensation_fixed),
    auth.uid(), reviewer_note)
  on conflict (work_order_id) do update set note = excluded.note
  returning * into result;
  return result;
end;
$$;
