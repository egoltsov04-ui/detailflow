-- Run once in Supabase SQL Editor after schema.sql.
-- Protects a staff member from overlapping active appointments and creates a draft receipt.

create extension if not exists btree_gist;

alter table public.appointments
  add constraint appointments_no_staff_overlap
  exclude using gist (
    staff_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status in ('confirmed', 'in_progress'));

create or replace function public.create_receipt_for_appointment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.receipts (tenant_id, appointment_id, subtotal, discount)
  values (new.tenant_id, new.id, 0, 0)
  on conflict (appointment_id) do nothing;
  return new;
end; $$;

create trigger appointment_creates_receipt
  after insert on public.appointments
  for each row execute procedure public.create_receipt_for_appointment();

create or replace function public.sync_receipt_subtotal()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.receipts
  set subtotal = (
    select coalesce(sum(quantity * unit_price), 0)
    from public.appointment_services
    where appointment_id = coalesce(new.appointment_id, old.appointment_id)
  )
  where appointment_id = coalesce(new.appointment_id, old.appointment_id);
  return coalesce(new, old);
end; $$;

create trigger appointment_services_sync_receipt
  after insert or update or delete on public.appointment_services
  for each row execute procedure public.sync_receipt_subtotal();

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (tenant_id, actor_id, entity_type, entity_id, action, after_data)
    values (new.tenant_id, actor, tg_table_name, new.id, 'created', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (tenant_id, actor_id, entity_type, entity_id, action, before_data, after_data)
    values (new.tenant_id, actor, tg_table_name, new.id, 'updated', to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (tenant_id, actor_id, entity_type, entity_id, action, before_data)
    values (old.tenant_id, actor, tg_table_name, old.id, 'deleted', to_jsonb(old));
    return old;
  end if;
  return null;
end; $$;

create trigger appointments_audit
  after insert or update or delete on public.appointments
  for each row execute procedure public.audit_row_change();

create trigger expenses_audit
  after insert or update or delete on public.expenses
  for each row execute procedure public.audit_row_change();
