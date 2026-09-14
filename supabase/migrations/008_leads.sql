create table public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  staff_id uuid references public.staff_profiles(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 180),
  phone text,
  source text not null default 'manual',
  status text not null default 'new' check (status in ('new', 'in_progress', 'deferred', 'won', 'lost')),
  priority text not null default 'normal' check (priority in ('normal', 'urgent')),
  due_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_tenant_status_idx on public.leads(tenant_id, status, due_at);

alter table public.leads enable row level security;

create policy "members access leads"
on public.leads for all
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));
