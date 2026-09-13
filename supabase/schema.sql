-- Detailflow Phase 1 schema for Supabase PostgreSQL.
-- Run this file once in Supabase: SQL Editor → New query → Run.

create extension if not exists pgcrypto;

create type public.app_role as enum ('owner', 'admin', 'master', 'super_admin');
create type public.appointment_status as enum ('confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
create type public.payment_method as enum ('card', 'cash', 'transfer');
create type public.reminder_channel as enum ('email', 'sms', 'push');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  locale text not null default 'uk' check (locale in ('uk', 'ru', 'en')),
  created_at timestamptz not null default now()
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,63}$'),
  address text,
  timezone text not null default 'Europe/Kyiv',
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table public.tenant_memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  category text not null,
  price numeric(12,2) not null check (price >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  repeat_interval_months integer check (repeat_interval_months is null or repeat_interval_months > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  phone text,
  specialty text,
  color text not null default '#3869e9',
  active boolean not null default true,
  compensation_percent numeric(5,2) check (compensation_percent between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.staff_services (
  staff_id uuid not null references public.staff_profiles(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (staff_id, service_id)
);

create table public.work_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  staff_id uuid not null references public.staff_profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  check (starts_at < ends_at),
  unique (staff_id, weekday)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (tenant_id, phone)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  make text,
  model text,
  plate_number text,
  year smallint check (year is null or year between 1900 and 2100),
  notes text
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  staff_id uuid references public.staff_profiles(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'confirmed',
  source text not null default 'admin' check (source in ('admin', 'public', 'phone')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);
create index appointments_tenant_starts_at_idx on public.appointments(tenant_id, starts_at);
create index appointments_staff_starts_at_idx on public.appointments(staff_id, starts_at);

create table public.appointment_services (
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  primary key (appointment_id, service_name)
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) generated always as (subtotal - discount) stored,
  payment_method public.payment_method,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  check (discount <= subtotal)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  expense_date date not null default current_date,
  category text not null,
  title text not null,
  amount numeric(12,2) not null check (amount > 0),
  payment_method public.payment_method,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.reminder_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  reminder_24h_enabled boolean not null default true,
  reminder_2h_enabled boolean not null default true,
  sender_name text,
  updated_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  channel public.reminder_channel not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  failed_at timestamptz,
  provider_message_id text,
  error_message text,
  unique (appointment_id, channel, scheduled_for)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  plan text not null check (plan in ('start', 'studio', 'pro')),
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'cancelled')),
  trial_ends_at timestamptz,
  provider text check (provider in ('wayforpay')),
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$ begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.is_tenant_member(target_tenant uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.tenant_memberships
  where tenant_id = target_tenant and user_id = auth.uid()
); $$;

create or replace function public.is_tenant_manager(target_tenant uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.tenant_memberships
  where tenant_id = target_tenant and user_id = auth.uid() and role in ('owner', 'admin')
); $$;

-- Creates a tenant and its first owner atomically for a newly registered user.
create or replace function public.bootstrap_tenant(tenant_name text, tenant_slug text, tenant_timezone text default 'Europe/Kyiv')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare new_tenant_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.tenants (name, slug, timezone) values (tenant_name, tenant_slug, tenant_timezone) returning id into new_tenant_id;
  insert into public.tenant_memberships (tenant_id, user_id, role) values (new_tenant_id, auth.uid(), 'owner');
  insert into public.reminder_settings (tenant_id) values (new_tenant_id);
  insert into public.subscriptions (tenant_id, plan, status, trial_ends_at) values (new_tenant_id, 'start', 'trialing', now() + interval '14 days');
  return new_tenant_id;
end; $$;

alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.services enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.staff_services enable row level security;
alter table public.work_schedules enable row level security;
alter table public.clients enable row level security;
alter table public.vehicles enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;
alter table public.receipts enable row level security;
alter table public.expenses enable row level security;
alter table public.reminder_settings enable row level security;
alter table public.reminders enable row level security;
alter table public.subscriptions enable row level security;
alter table public.audit_logs enable row level security;

create policy "users read own profile" on public.profiles for select using (id = auth.uid());
create policy "users update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "members read tenant" on public.tenants for select using (public.is_tenant_member(id));
create policy "members read memberships" on public.tenant_memberships for select using (public.is_tenant_member(tenant_id));
create policy "managers manage memberships" on public.tenant_memberships for all using (public.is_tenant_manager(tenant_id)) with check (public.is_tenant_manager(tenant_id));

create policy "members access services" on public.services for all using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "members access staff" on public.staff_profiles for all using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "members access schedules" on public.work_schedules for all using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "members access clients" on public.clients for all using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "members access vehicles" on public.vehicles for all using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "members access appointments" on public.appointments for all using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "members access receipts" on public.receipts for all using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "members access expenses" on public.expenses for all using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "members access settings" on public.reminder_settings for all using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_manager(tenant_id));
create policy "members read reminders" on public.reminders for select using (public.is_tenant_member(tenant_id));
create policy "members read subscriptions" on public.subscriptions for select using (public.is_tenant_member(tenant_id));
create policy "members read audit logs" on public.audit_logs for select using (public.is_tenant_member(tenant_id));

-- Child tables are protected through their parent appointment/staff/service records.
create policy "members access staff services" on public.staff_services for all using (exists (select 1 from public.staff_profiles s where s.id = staff_id and public.is_tenant_member(s.tenant_id))) with check (exists (select 1 from public.staff_profiles s where s.id = staff_id and public.is_tenant_member(s.tenant_id)));
create policy "members access appointment services" on public.appointment_services for all using (exists (select 1 from public.appointments a where a.id = appointment_id and public.is_tenant_member(a.tenant_id))) with check (exists (select 1 from public.appointments a where a.id = appointment_id and public.is_tenant_member(a.tenant_id)));
