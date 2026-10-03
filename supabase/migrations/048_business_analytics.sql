-- Preserve duration for new catalog jobs; legacy jobs deliberately remain unknown.
alter table public.work_order_jobs add column if not exists planned_minutes integer check(planned_minutes>0);
create or replace function public.snapshot_job_duration() returns trigger language plpgsql set search_path=public as $$
declare svc public.services; v jsonb;
begin
 if TG_OP='UPDATE' and new.service_id is not distinct from old.service_id and new.title is not distinct from old.title then
  new.planned_minutes=old.planned_minutes; return new;
 end if;
 new.planned_minutes=null;
 select * into svc from services where id=new.service_id and tenant_id=new.tenant_id;
 if found then
  if new.title=svc.name and jsonb_array_length(svc.variants)=0 then new.planned_minutes=svc.duration_minutes;
  else
   select value into v from jsonb_array_elements(svc.variants) where new.title=svc.name||' · '||(value->>'name');
   if v is not null then new.planned_minutes=(v->>'duration_minutes')::integer; end if;
  end if;
 end if;
 return new;
end $$;
drop trigger if exists job_duration_snapshot on public.work_order_jobs;
create trigger job_duration_snapshot before insert or update on public.work_order_jobs for each row execute function public.snapshot_job_duration();
-- Read-only reports: use the studio timezone and the existing finance permission.
create or replace function public.business_analytics(studio uuid, date_from date, date_to date)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare tz text; result jsonb;
begin
 if not can_view_finance(studio) then raise exception 'Access denied' using errcode='42501'; end if;
 if date_from is null or date_to is null or date_to < date_from or date_to-date_from > 1095 then raise exception 'Invalid report period'; end if;
 select coalesce(timezone,'Europe/Kyiv') into tz from tenants where id=studio;
 with completed as (
  select o.*,coalesce(o.approved_at,o.status_changed_at) finished
  from work_orders o where o.tenant_id=studio and o.status in ('ready','issued')
 ), period_orders as (
  select * from completed where (finished at time zone tz)::date between date_from and date_to
 ), client_history as (
  select client_id,count(*) visits,sum(total) value,min(finished) first_visit
  from completed where (finished at time zone tz)::date<=date_to group by client_id
 ), clients_report as (
  select c.id,c.full_name name,count(*) visits,sum(o.total) revenue,h.visits lifetime_visits,h.value lifetime_value,
   (h.first_visit at time zone tz)::date < date_from as "returning"
  from period_orders o join clients c on c.id=o.client_id join client_history h on h.client_id=c.id
  group by c.id,c.full_name,h.visits,h.value,h.first_visit
 ), jobs_report as (
  select j.* from work_order_jobs j where j.tenant_id=studio and j.status='approved'
   and (j.approved_at at time zone tz)::date between date_from and date_to
 ), masters as (
  select j.staff_id,coalesce(s.full_name,'—') name,count(*) jobs,sum(j.price) revenue,
   sum(j.worked_seconds) seconds,count(*) filter(where j.worked_seconds>0) timed_jobs,
   sum(j.price) filter(where j.worked_seconds>0) timed_revenue
  from jobs_report j left join staff_profiles s on s.id=j.staff_id group by j.staff_id,s.full_name
 ), services_report as (
  select title,count(*) jobs,count(*) filter(where planned_minutes is not null and worked_seconds>0) measured,
   avg(planned_minutes) filter(where planned_minutes is not null and worked_seconds>0) planned,
   avg(worked_seconds/60.0) filter(where planned_minutes is not null and worked_seconds>0) actual,
   count(*) filter(where planned_minutes is not null and worked_seconds>planned_minutes*60) exceeded
  from jobs_report group by title
 ), demand as (
  select extract(isodow from starts_at at time zone tz)::int weekday,
   extract(hour from starts_at at time zone tz)::int as booking_hour,count(*) bookings,
   count(*) filter(where status::text='cancelled') cancelled
  from appointments where tenant_id=studio and (starts_at at time zone tz)::date between date_from and date_to group by 1,2
 ), months as (
  select to_char(finished at time zone tz,'YYYY-MM') as month,count(*) orders,sum(total) revenue
  from period_orders group by 1
 )
 select jsonb_build_object(
  'timezone',tz,'orders',(select count(*) from period_orders),
  'revenue',coalesce((select sum(total) from period_orders),0),
  'late_orders',(select count(*) from period_orders where due_at is not null and finished>due_at),
  'dated_orders',(select count(*) from period_orders where due_at is not null),
  'clients',coalesce((select jsonb_agg(to_jsonb(c) order by revenue desc,id) from clients_report c),'[]'::jsonb),
  'services',coalesce((select jsonb_agg(to_jsonb(s) order by title) from services_report s),'[]'::jsonb),
  'masters',coalesce((select jsonb_agg(to_jsonb(m) order by revenue desc,staff_id) from masters m),'[]'::jsonb),
  'demand',coalesce((select jsonb_agg(to_jsonb(d) order by weekday,booking_hour) from demand d),'[]'::jsonb),
  'months',coalesce((select jsonb_agg(to_jsonb(m) order by month) from months m),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.business_analytics(uuid,date,date) from public,anon;
grant execute on function public.business_analytics(uuid,date,date) to authenticated;
