begin;
alter table public.staff_profiles add column if not exists all_services boolean not null default true;

create or replace function public.staff_can_perform(staff uuid,service uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from staff_profiles p join services s on s.id=service and s.tenant_id=p.tenant_id
 where p.id=staff and p.active and s.active and (p.all_services or exists(select 1 from staff_services x where x.staff_id=p.id and x.service_id=s.id)));
$$;
revoke all on function public.staff_can_perform(uuid,uuid) from public,anon;
grant execute on function public.staff_can_perform(uuid,uuid) to authenticated,service_role;

drop policy if exists "members access staff services" on public.staff_services;
drop policy if exists "manager manages skills" on public.staff_services;
create policy "manager manages skills" on public.staff_services for all
using(exists(select 1 from staff_profiles p where p.id=staff_id and is_tenant_manager(p.tenant_id)))
with check(exists(select 1 from staff_profiles p join services s on s.tenant_id=p.tenant_id where p.id=staff_id and s.id=service_id and is_tenant_manager(p.tenant_id)));

create or replace function public.set_staff_services(staff_input uuid,all_input boolean,services_input uuid[]) returns void
language plpgsql security definer set search_path=public as $$
declare p staff_profiles;
begin
 select * into p from staff_profiles where id=staff_input for update;
 if p.id is null or not is_tenant_manager(p.tenant_id) then raise exception 'Немає доступу'; end if;
 if all_input is null or services_input is null or exists(select 1 from unnest(services_input) v where not exists(select 1 from services where id=v and tenant_id=p.tenant_id and active)) then raise exception 'Перевірте список послуг'; end if;
 update staff_profiles set all_services=all_input where id=p.id;
 delete from staff_services where staff_id=p.id;
 insert into staff_services(staff_id,service_id) select p.id,v from (select distinct unnest(services_input) v) x;
end $$;
revoke all on function public.set_staff_services(uuid,boolean,uuid[]) from public,anon;
grant execute on function public.set_staff_services(uuid,boolean,uuid[]) to authenticated;

create or replace function public.guard_staff_service_assignment() returns trigger
language plpgsql security definer set search_path=public as $$
declare member uuid; chosen uuid;
begin
 if tg_table_name='work_order_jobs' then
  if tg_op='UPDATE' and new.staff_id is not distinct from old.staff_id and new.service_id is not distinct from old.service_id then return new; end if;
  member=new.staff_id;chosen=new.service_id;
 elsif tg_table_name='appointment_services' then
  select staff_id into member from appointments where id=new.appointment_id;chosen=new.service_id;
 else
  if new.staff_id is not null and (tg_op='INSERT' or new.staff_id is distinct from old.staff_id) and exists(select 1 from appointment_services a where a.appointment_id=new.id and a.service_id is not null and not staff_can_perform(new.staff_id,a.service_id)) then raise exception 'Майстер не виконує всі послуги запису'; end if;
  return new;
 end if;
 if member is not null and chosen is not null and not staff_can_perform(member,chosen) then raise exception 'Майстер не виконує цю послугу. Змініть виконавця або спеціалізацію'; end if;
 return new;
end $$;
drop trigger if exists staff_service_assignment on public.work_order_jobs;
create trigger staff_service_assignment before insert or update on public.work_order_jobs for each row execute function public.guard_staff_service_assignment();
drop trigger if exists staff_service_assignment on public.appointment_services;
create trigger staff_service_assignment before insert or update on public.appointment_services for each row execute function public.guard_staff_service_assignment();
drop trigger if exists staff_service_assignment on public.appointments;
create trigger staff_service_assignment before insert or update on public.appointments for each row execute function public.guard_staff_service_assignment();
notify pgrst,'reload schema';
commit;
