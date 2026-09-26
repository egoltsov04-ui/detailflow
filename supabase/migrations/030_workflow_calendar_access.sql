begin;
-- Calendar services become distinct jobs on the same car, with the service rate.
alter table public.appointment_services add column id uuid not null default gen_random_uuid() unique;
alter table public.work_order_jobs add column appointment_service_id uuid unique references public.appointment_services(id) on delete set null;
update public.work_order_jobs j set appointment_service_id=a.id,service_id=a.service_id
from public.work_orders o,public.appointment_services a
where j.work_order_id=o.id and a.appointment_id=o.appointment_id
and (select count(*) from public.appointment_services x where x.appointment_id=o.appointment_id)=1;
create or replace function public.create_work_order_from_appointment_service() returns trigger language plpgsql security definer set search_path=public as $$
declare a appointments; oid uuid; existing uuid; jid uuid; car text;
begin
 select * into a from appointments where id=new.appointment_id for update;
 select id into existing from work_orders where appointment_id=a.id;
 select coalesce(nullif(v.notes,''),concat_ws(' ',v.make,v.model,v.plate_number)) into car from vehicles v where v.id=a.vehicle_id;
 if existing is null then
 insert into work_orders(tenant_id,appointment_id,client_id,staff_id,title,vehicle_label,service_summary,status,total,checklist,created_by,due_at,notes)
 values(a.tenant_id,a.id,a.client_id,null,new.service_name,coalesce(car,'Авто не вказано'),new.service_name,'new',new.unit_price*new.quantity,
 jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'title',new.service_name,'done',false)),a.created_by,a.ends_at,a.notes) returning id into oid;
 select id into jid from work_order_jobs where work_order_id=oid;
 update work_order_jobs set appointment_service_id=new.id,service_id=new.service_id where id=jid;
 else
 if exists(select 1 from work_orders where id=existing and status in ('ready','issued','cancelled')) then raise exception 'Замовлення закрите'; end if;
 insert into work_order_jobs(tenant_id,work_order_id,appointment_service_id,service_id,title,price,checklist)
 values(a.tenant_id,existing,new.id,new.service_id,new.service_name,new.unit_price*new.quantity,jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'title',new.service_name,'done',false)));
 end if;
 return new;
end $$;

-- Prevent writes through older generic screens from changing the work of a colleague.
drop policy if exists "members access services" on public.services;
create policy "manager manages services" on public.services for all using(is_tenant_manager(tenant_id)) with check(is_tenant_manager(tenant_id));
create policy "staff reads catalog" on public.services for select using(is_tenant_member(tenant_id));
drop policy if exists "members access cash transactions" on public.cash_transactions;
create policy "manager manages cash" on public.cash_transactions for all using(is_tenant_manager(tenant_id)) with check(is_tenant_manager(tenant_id));
drop policy if exists "members access clients" on public.clients;
create policy "manager manages clients" on public.clients for all using(is_tenant_manager(tenant_id)) with check(is_tenant_manager(tenant_id));
create policy "master reads job client" on public.clients for select using(exists(select 1 from work_orders o where o.client_id=clients.id and public.can_read_job_order(o.id)));
drop policy if exists "members access vehicles" on public.vehicles;
create policy "manager manages vehicles" on public.vehicles for all using(is_tenant_manager(tenant_id)) with check(is_tenant_manager(tenant_id));
create policy "master reads job vehicle" on public.vehicles for select using(exists(select 1 from work_orders o where o.client_id=vehicles.client_id and public.can_read_job_order(o.id)));
drop policy if exists "members access appointments" on public.appointments;
create policy "manager manages calendar" on public.appointments for all using(is_tenant_manager(tenant_id)) with check(is_tenant_manager(tenant_id));
create policy "master reads job appointment" on public.appointments for select using(exists(select 1 from work_orders o where o.appointment_id=appointments.id and public.can_read_job_order(o.id)));
drop policy if exists "members access appointment services" on public.appointment_services;
create policy "manager manages appointment services" on public.appointment_services for all using(exists(select 1 from appointments a where a.id=appointment_id and is_tenant_manager(a.tenant_id))) with check(exists(select 1 from appointments a where a.id=appointment_id and is_tenant_manager(a.tenant_id)));
create policy "master reads appointment services" on public.appointment_services for select using(exists(select 1 from work_orders o where o.appointment_id=appointment_services.appointment_id and public.can_read_job_order(o.id)));
-- The owner cannot accidentally erase in-flight work or its evidence.
create or replace function public.guard_accrued_order_delete() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.approved_at is not null or exists(select 1 from staff_earnings where work_order_id=old.id) or exists(select 1 from work_order_jobs where work_order_id=old.id and (worked_seconds>0 or status not in ('new','assigned'))) then raise exception 'Замовлення з виконаною роботою зберігається в історії'; end if;
 return old;
end $$;
revoke all on function public.can_access_job(uuid),public.can_read_job_order(uuid),public.can_access_job_photo(text,boolean) from public,anon;
grant execute on function public.can_access_job(uuid),public.can_read_job_order(uuid),public.can_access_job_photo(text,boolean) to authenticated;

-- Compensation and studio finances are not writable by a master through the API.
drop policy if exists "members access staff compensation" on public.staff_service_compensation;
create policy "manager manages compensation" on public.staff_service_compensation for all using(is_tenant_manager(tenant_id)) with check(is_tenant_manager(tenant_id));
create policy "master reads own compensation" on public.staff_service_compensation for select using(is_own_staff_profile(staff_id));
drop policy if exists "members access schedules" on public.work_schedules;
create policy "manager manages schedules" on public.work_schedules for all using(is_tenant_manager(tenant_id)) with check(is_tenant_manager(tenant_id));
create policy "master reads own schedule" on public.work_schedules for select using(is_own_staff_profile(staff_id));
do $$ declare item record; begin
 for item in select * from (values
 ('receipts','members access receipts'),('expenses','members access expenses'),
 ('sales','members access sales'),('invoices','members access invoices'),
 ('payment_orders','members read payment orders')) as v(tbl,policy_name) loop
 execute format('drop policy if exists %I on public.%I',item.policy_name,item.tbl);
 execute format('create policy "manager accesses finance" on public.%I for all using(public.is_tenant_manager(tenant_id)) with check(public.is_tenant_manager(tenant_id))',item.tbl);
 end loop;
end $$;
-- Reject cross-studio references before any SECURITY DEFINER seed trigger runs.
create function public.guard_order_relations() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.client_id is not null and not exists(select 1 from clients where id=new.client_id and tenant_id=new.tenant_id) then raise exception 'Клієнт належить іншій студії'; end if;
 if new.staff_id is not null and not exists(select 1 from staff_profiles where id=new.staff_id and tenant_id=new.tenant_id) then raise exception 'Майстер належить іншій студії'; end if;
 if new.appointment_id is not null and not exists(select 1 from appointments where id=new.appointment_id and tenant_id=new.tenant_id) then raise exception 'Запис належить іншій студії'; end if;
 return new;
end $$;
create trigger orders_guard_relations before insert or update on public.work_orders for each row execute function public.guard_order_relations();
revoke all on function public.guard_order_relations() from public,anon,authenticated;

-- Calendar reflects execution; its status dropdown cannot bypass quality review.
create function public.sync_workflow_appointment() returns trigger language plpgsql security definer set search_path=public as $$
declare target public.appointment_status;
begin
 if new.appointment_id is null or new.status is not distinct from old.status then return new; end if;
 target:=case when new.status in ('in_progress','waiting','review') then 'in_progress'::appointment_status
 when new.status in ('ready','issued') then 'completed'::appointment_status
 when new.status='cancelled' then 'cancelled'::appointment_status else null end;
 if target is not null then update appointments set status=target where id=new.appointment_id and status is distinct from target; end if;
 return new;
end $$;
create trigger orders_sync_calendar after update on public.work_orders for each row execute function public.sync_workflow_appointment();
create function public.guard_workflow_calendar_status() returns trigger language plpgsql security definer set search_path=public as $$
declare o work_orders;
begin
 if new.status is not distinct from old.status or pg_trigger_depth()>1 then return new; end if;
 select * into o from work_orders where appointment_id=old.id for update;
 if o.id is null then return new; end if;
 if new.status in ('in_progress','completed') then raise exception 'Відкрийте роботи замовлення: виконання та перевірка змінять статус календаря автоматично'; end if;
 if o.status in ('ready','issued','cancelled') then raise exception 'Закрите замовлення не можна змінити через календар'; end if;
 if new.status in ('cancelled','no_show') and exists(select 1 from work_order_jobs where work_order_id=o.id and (worked_seconds>0 or status not in ('new','assigned'))) then raise exception 'Роботу вже почали. Спочатку відкрийте замовлення'; end if;
 return new;
end $$;
create trigger appointments_guard_workflow before update of status on public.appointments for each row execute function public.guard_workflow_calendar_status();
create function public.cancel_calendar_workflow() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status in ('cancelled','no_show') and new.status is distinct from old.status then
 update work_orders set status='cancelled' where appointment_id=new.id and status not in ('cancelled','ready','issued');
 end if;
 return new;
end $$;
create trigger appointments_cancel_workflow after update of status on public.appointments for each row execute function public.cancel_calendar_workflow();
revoke all on function public.sync_workflow_appointment(),public.guard_workflow_calendar_status(),public.cancel_calendar_workflow() from public,anon,authenticated;

-- The client enables the new workflow only after the full migration set succeeds.
create function public.job_workflow_version() returns integer language sql stable as $$select 30$$;
revoke all on function public.job_workflow_version() from public,anon;
grant execute on function public.job_workflow_version() to authenticated;
commit;
