create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  unit text not null default 'шт',
  quantity numeric(12,3) not null default 0 check (quantity >= 0),
  min_quantity numeric(12,3) not null default 0 check (min_quantity >= 0),
  last_unit_cost numeric(12,2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  expense_id uuid references public.expenses(id) on delete set null,
  movement_type text not null check (movement_type in ('purchase', 'write_off', 'adjustment')),
  quantity numeric(12,3) not null check (quantity <> 0),
  unit_cost numeric(12,2),
  note text,
  created_at timestamptz not null default now()
);

create index inventory_items_tenant_idx on public.inventory_items(tenant_id);
create index inventory_movements_item_idx on public.inventory_movements(inventory_item_id, created_at desc);

alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
create policy "members access inventory" on public.inventory_items for all using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "members access inventory movements" on public.inventory_movements for all using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
