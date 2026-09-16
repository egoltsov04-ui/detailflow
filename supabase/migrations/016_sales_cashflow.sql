alter table public.cash_transactions
  add column if not exists sale_id uuid references public.sales(id) on delete cascade;

create unique index if not exists cash_transactions_sale_id_unique
  on public.cash_transactions(sale_id)
  where sale_id is not null;

create or replace function public.record_sale_cash_transaction()
returns trigger
language plpgsql
as $$
begin
  insert into public.cash_transactions (
    tenant_id,
    client_id,
    sale_id,
    transaction_date,
    direction,
    amount,
    payment_method,
    category,
    title,
    note,
    created_by
  ) values (
    new.tenant_id,
    new.client_id,
    new.id,
    new.created_at::date,
    'income',
    new.total,
    new.payment_method::public.payment_method,
    'Продаж товарів',
    'Продаж товарів',
    new.note,
    new.created_by
  ) on conflict (sale_id) where sale_id is not null do nothing;

  return new;
end;
$$;

drop trigger if exists sales_cash_transaction on public.sales;
create trigger sales_cash_transaction
after insert on public.sales
for each row execute function public.record_sale_cash_transaction();
