create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan text not null check (plan in ('start', 'studio', 'pro')),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'UAH',
  order_reference text not null unique,
  status text not null default 'created' check (status in ('created', 'approved', 'declined', 'expired')),
  provider_status text,
  provider_payload jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payment_orders_tenant_created_at_idx on public.payment_orders(tenant_id, created_at desc);

alter table public.payment_orders enable row level security;
create policy "members read payment orders" on public.payment_orders for select using (public.is_tenant_member(tenant_id));
