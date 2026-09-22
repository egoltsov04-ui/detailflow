-- A calendar booking becomes a task card for the owner automatically.
alter table public.work_orders
  add column if not exists appointment_id uuid unique references public.appointments(id) on delete cascade;

create or replace function public.create_work_order_from_appointment_service()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  appointment public.appointments;
  customer public.clients;
  vehicle_label text;
begin
  select * into appointment from public.appointments where id = new.appointment_id;
  if appointment.id is null then return new; end if;
  select * into customer from public.clients where id = appointment.client_id;
  select coalesce(v.notes, concat_ws(' ', v.make, v.model, v.plate_number))
    into vehicle_label from public.vehicles v where v.id = appointment.vehicle_id;

  insert into public.work_orders (
    tenant_id, appointment_id, client_id, staff_id, title, vehicle_label,
    service_summary, status, total, deposit, checklist, created_by
  ) values (
    appointment.tenant_id, appointment.id, appointment.client_id, appointment.staff_id,
    new.service_name, coalesce(vehicle_label, 'Авто не вказано'), new.service_name,
    case when appointment.staff_id is null then 'new' else 'assigned' end,
    new.unit_price, 0,
    jsonb_build_array(jsonb_build_object('id', 'service', 'title', new.service_name, 'done', false)),
    appointment.created_by
  ) on conflict (appointment_id) do nothing;
  -- A personal rule for this service overrides the master's base percentage.
  if appointment.staff_id is not null then
    update public.work_orders as target
      set compensation_percent = rate.percent,
          compensation_fixed = rate.fixed_amount
      from public.staff_service_compensation as rate
      where target.appointment_id = appointment.id
        and rate.staff_id = appointment.staff_id
        and rate.service_id = new.service_id;
  end if;
  return new;
end;
$$;

drop trigger if exists appointment_service_creates_work_order on public.appointment_services;
create trigger appointment_service_creates_work_order
after insert on public.appointment_services
for each row execute function public.create_work_order_from_appointment_service();
