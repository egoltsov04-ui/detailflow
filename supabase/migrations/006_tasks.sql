create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  due_date date,
  staff_id uuid references public.staff_profiles(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_tenant_status_idx on public.tasks(tenant_id, status, due_date);

alter table public.tasks enable row level security;
create policy "members access tasks"
on public.tasks for all
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));
