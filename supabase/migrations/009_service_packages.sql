create table public.service_packages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 180),
  category text not null default 'Комплексні послуги',
  description text,
  service_names jsonb not null default '[]'::jsonb,
  price numeric(12,2) not null default 0 check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index service_packages_tenant_idx on public.service_packages(tenant_id, active, created_at);

alter table public.service_packages enable row level security;

create policy "members access service packages"
on public.service_packages for all
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));
