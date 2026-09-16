alter table public.inventory_items
  add column if not exists selling_price numeric(12,2) check (selling_price is null or selling_price >= 0);
