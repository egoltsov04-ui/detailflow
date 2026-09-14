create table public.sales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  items jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0 check (total >= 0),
  payment_method text not null default 'card' check (payment_method in ('card', 'cash', 'transfer')),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index sales_tenant_created_idx on public.sales(tenant_id, created_at desc);

alter table public.sales enable row level security;

create policy "members access sales"
on public.sales for all
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));
