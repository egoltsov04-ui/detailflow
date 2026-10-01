begin;
create or replace function public.staff_calendar(staff_input uuid,from_input date,to_input date) returns jsonb
language plpgsql security definer set search_path=public as $$
declare member staff_profiles;zone text;begin
 select * into member from staff_profiles where id=staff_input;
 if member.id is null or not (is_tenant_manager(member.tenant_id) or (is_own_staff_profile(member.id) and is_tenant_member(member.tenant_id))) then raise exception 'Немає доступу до календаря';end if;
 if from_input is null or to_input is null or to_input<from_input or to_input-from_input>62 then raise exception 'Оберіть період до 62 днів';end if;
 select timezone into zone from tenants where id=member.tenant_id;
 return jsonb_build_object('timezone',zone,'schedules',coalesce((select jsonb_agg(jsonb_build_object('weekday',weekday,'starts_at',starts_at,'ends_at',ends_at)) from work_schedules where staff_id=member.id),'[]'),
 'appointments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'starts_at',a.starts_at,'ends_at',a.ends_at,'status',a.status,'client',c.full_name,'vehicle',coalesce(nullif(concat_ws(' ',v.make,v.model,v.plate_number),''),v.notes,''),'services',(select string_agg(service_name,' + ') from appointment_services where appointment_id=a.id)))
 from appointments a left join clients c on c.id=a.client_id left join vehicles v on v.id=a.vehicle_id
 where a.tenant_id=member.tenant_id and a.status not in ('cancelled','no_show') and a.starts_at<(to_input+1)::timestamp at time zone zone and a.ends_at>from_input::timestamp at time zone zone
 and (a.staff_id=member.id or exists(select 1 from work_orders o join work_order_jobs j on j.work_order_id=o.id where o.appointment_id=a.id and j.staff_id=member.id))),'[]'));
end$$;
revoke all on function public.staff_calendar(uuid,date,date) from public,anon;
grant execute on function public.staff_calendar(uuid,date,date) to authenticated;
notify pgrst,'reload schema';
commit;
