create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  staff_id uuid references public.staff_profiles(id) on delete set null,
  appointment_id uuid unique references public.appointments(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 180),
  vehicle_label text,
  service_summary text,
  status text not null default 'new' check (status in ('new', 'in_progress', 'waiting', 'ready', 'issued', 'cancelled')),
  total numeric(12,2) not null default 0 check (total >= 0),
  deposit numeric(12,2) not null default 0 check (deposit >= 0 and deposit <= total),
  due_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index work_orders_tenant_status_idx on public.work_orders(tenant_id, status, due_at);

alter table public.work_orders enable row level security;
create policy "members access work orders"
on public.work_orders for all
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));
