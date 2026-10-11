begin;
alter table tenants alter column shift_max_hours set default 16;
alter table tenants alter column break_max_minutes set default 120;
-- Keep saved per-studio settings. Restore individual values from backup if needed.
create or replace function public.close_overdue_shifts(studio uuid default null) returns integer language plpgsql security definer set search_path=public as $$
declare r record;j record;deadline timestamptz;day_end timestamptz;reason text;closed integer:=0;role_value text;
begin
 role_value=coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','');
 if studio is null then
  if role_value<>'service_role' then raise exception 'Немає доступу';end if;
 elsif not is_tenant_manager(studio) and not exists(select 1 from staff_profiles where tenant_id=studio and is_own_staff_profile(id)) then raise exception 'Немає доступу';end if;
 for r in select sh.*,t.shift_max_hours,t.break_max_minutes,t.shift_close_time,t.timezone from staff_shifts sh join tenants t on t.id=sh.tenant_id where sh.ended_at is null and (studio is null or sh.tenant_id=studio) for update of sh skip locked loop
  deadline=r.started_at+make_interval(hours=>r.shift_max_hours);reason='shift_limit';
  if r.paused_at is not null and r.paused_at+make_interval(mins=>r.break_max_minutes)<deadline then deadline=r.paused_at+make_interval(mins=>r.break_max_minutes);reason='break_limit';end if;
  if r.shift_close_time is not null then
   day_end=((r.started_at at time zone r.timezone)::date+r.shift_close_time) at time zone r.timezone;
   if day_end<=r.started_at then day_end=(((r.started_at at time zone r.timezone)::date+1)+r.shift_close_time) at time zone r.timezone;end if;
   if day_end<deadline then deadline=day_end;reason='studio_closed';end if;
  end if;
  if deadline>now() then continue;end if;
  for j in update work_order_jobs set worked_seconds=worked_seconds+greatest(0,floor(extract(epoch from deadline-running_since)))::integer,running_since=null,status='waiting',version=version+1,updated_at=now() where staff_id=r.staff_id and running_since is not null returning id,tenant_id loop
   insert into work_job_events(tenant_id,job_id,actor_id,event,detail) values(j.tenant_id,j.id,null,'pause',jsonb_build_object('automatic',true,'reason',reason,'ended_at',deadline));
  end loop;
  update staff_shifts set ended_at=deadline,paused_at=null,
   pause_seconds=pause_seconds+case when r.paused_at is null then 0 else greatest(0,floor(extract(epoch from deadline-r.paused_at)))::integer end,
   breaks=case when r.paused_at is null then breaks else breaks||jsonb_build_array(jsonb_build_object('from',r.paused_at,'to',deadline)) end,
   auto_closed_reason=reason,auto_closed_at=now() where id=r.id;
  closed=closed+1;
 end loop;
 return closed;
end$$;
commit;
