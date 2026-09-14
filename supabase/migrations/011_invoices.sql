create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  number text not null,
  title text not null,
  line_items jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0 check (total >= 0),
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_at timestamptz,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, number)
);

create index invoices_tenant_status_idx on public.invoices(tenant_id, status, due_at);

alter table public.invoices enable row level security;

create policy "members access invoices"
on public.invoices for all
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));
