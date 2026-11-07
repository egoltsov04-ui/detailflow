create table if not exists public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  transaction_date date not null default current_date,
  direction text not null check (direction in ('income', 'expense')),
  amount numeric(12,2) not null check (amount > 0),
  payment_method public.payment_method not null default 'card',
  category text not null,
  title text not null,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists cash_transactions_tenant_date_idx
  on public.cash_transactions(tenant_id, transaction_date desc);

alter table public.cash_transactions enable row level security;

drop policy if exists "members access cash transactions" on public.cash_transactions;
create policy "members access cash transactions"
on public.cash_transactions for all
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));
