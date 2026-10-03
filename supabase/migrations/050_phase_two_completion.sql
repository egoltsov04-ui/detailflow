begin;
create index if not exists work_orders_analytics_idx on public.work_orders(tenant_id,coalesce(approved_at,status_changed_at)) where status in ('ready','issued');
create index if not exists jobs_analytics_idx on public.work_order_jobs(tenant_id,approved_at) where status='approved';
create index if not exists appointments_analytics_idx on public.appointments(tenant_id,starts_at);

create or replace function public.business_analytics_v2(studio uuid,date_from date,date_to date)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;tz text;extra jsonb;
begin
 -- The original report validates both finance access and the date range.
 result=business_analytics(studio,date_from,date_to);tz=result->>'timezone';
 with approved as (
  select j.staff_id,count(distinct j.work_order_id) orders,sum(j.price)/nullif(count(distinct j.work_order_id),0) average_order
  from work_order_jobs j where j.tenant_id=studio and j.status='approved'
   and j.approved_at>=date_from::timestamp at time zone tz and j.approved_at<(date_to+1)::timestamp at time zone tz
  group by j.staff_id
 ), cancelled as (
  select j.staff_id,count(distinct o.id) cancelled_orders from work_orders o join work_order_jobs j on j.work_order_id=o.id and j.tenant_id=o.tenant_id
  where o.tenant_id=studio and o.status='cancelled' and o.status_changed_at>=date_from::timestamp at time zone tz and o.status_changed_at<(date_to+1)::timestamp at time zone tz
  group by j.staff_id
 ), ids as (select staff_id from approved union select staff_id from cancelled union select (value->>'staff_id')::uuid from jsonb_array_elements(result->'masters'))
 select coalesce(jsonb_agg(coalesce(m.value,jsonb_build_object('staff_id',ids.staff_id,'name',coalesce(s.full_name,'—'),'jobs',0,'revenue',0,'seconds',0,'timed_jobs',0,'timed_revenue',0))||jsonb_build_object('orders',coalesce(a.orders,0),'average_order',a.average_order,'cancelled_orders',coalesce(c.cancelled_orders,0)) order by coalesce((m.value->>'revenue')::numeric,0) desc,ids.staff_id),'[]') into extra
 from ids left join staff_profiles s on s.id=ids.staff_id
 left join approved a on a.staff_id is not distinct from ids.staff_id
 left join cancelled c on c.staff_id is not distinct from ids.staff_id
 left join lateral (select value from jsonb_array_elements(result->'masters') where (value->>'staff_id')::uuid is not distinct from ids.staff_id) m on true;
 return result||jsonb_build_object('masters',extra);
end $$;
revoke all on function public.business_analytics_v2(uuid,date,date) from public,anon;
grant execute on function public.business_analytics_v2(uuid,date,date) to authenticated;

-- Explicit manual estimates may be set only through the existing manager-only save RPC.
create or replace function public.snapshot_job_duration() returns trigger language plpgsql set search_path=public as $$
declare svc public.services;v jsonb;estimate integer;booking uuid;
begin
 if TG_OP='UPDATE' and new.planned_minutes is distinct from old.planned_minutes then return new;end if;
 if TG_OP='UPDATE' and new.service_id is not distinct from old.service_id and new.title is not distinct from old.title then new.planned_minutes=old.planned_minutes;return new;end if;
 new.planned_minutes=null;
 select * into svc from services where id=new.service_id and tenant_id=new.tenant_id;
 if found then
  if new.title=svc.name and jsonb_array_length(svc.variants)=0 then new.planned_minutes=svc.duration_minutes;
  else select value into v from jsonb_array_elements(svc.variants) where new.title=svc.name||' · '||(value->>'name');
   if v is not null then new.planned_minutes=(v->>'duration_minutes')::integer;end if;
  end if;
 end if;
 if new.planned_minutes is null then
  select appointment_id into booking from work_orders where id=new.work_order_id and tenant_id=new.tenant_id;
  if booking is not null then
   if not exists(select 1 from work_order_jobs where work_order_id=new.work_order_id and id is distinct from new.id) then
    select sum(duration_minutes*quantity)::integer into estimate from appointment_services where appointment_id=booking;
   else select duration_minutes*quantity into estimate from appointment_services where appointment_id=booking and service_name=new.title limit 1;end if;
   if estimate>0 then new.planned_minutes=estimate;end if;
  end if;
 end if;
 return new;
end $$;
create or replace function public.save_work_job(order_id uuid,job_input jsonb,expected_version integer default null) returns uuid language plpgsql security definer set search_path=public as $$
declare studio uuid;jid uuid;estimate integer;
begin
 select tenant_id into studio from work_orders where id=order_id;
 if not is_tenant_manager(studio) then raise exception 'Немає доступу';end if;
 if not can_view_finance(studio) then
  if coalesce(job_input->>'pay_mode','auto')<>'auto' then raise exception 'Оплату майстра налаштовує власник';end if;
  job_input=(job_input-'rate')||jsonb_build_object('pay_mode','auto');
 end if;
 if job_input ? 'planned_minutes' then
  if job_input->>'planned_minutes' is not null and (job_input->>'planned_minutes')!~'^[0-9]+$' then raise exception 'Вкажіть цілу кількість хвилин';end if;
  estimate=(job_input->>'planned_minutes')::integer;
  if estimate is not null and estimate not between 1 and 43200 then raise exception 'План має бути від 1 до 43200 хвилин';end if;
 end if;
 jid=save_work_job_internal(order_id,job_input,expected_version);
 if job_input ? 'planned_minutes' then update work_order_jobs set planned_minutes=estimate where id=jid;end if;
 return jid;
end $$;
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
  select * from completed where finished>=date_from::timestamp at time zone tz and finished<(date_to+1)::timestamp at time zone tz
 ), client_history as (
  select client_id,count(*) visits,sum(total) value,min(finished) first_visit
  from completed where finished<(date_to+1)::timestamp at time zone tz group by client_id
 ), clients_report as (
  select c.id,c.full_name name,count(*) visits,sum(o.total) revenue,h.visits lifetime_visits,h.value lifetime_value,
   (h.first_visit at time zone tz)::date < date_from as "returning"
  from period_orders o join clients c on c.id=o.client_id join client_history h on h.client_id=c.id
  group by c.id,c.full_name,h.visits,h.value,h.first_visit
 ), jobs_report as (
  select j.* from work_order_jobs j where j.tenant_id=studio and j.status='approved'
   and j.approved_at>=date_from::timestamp at time zone tz and j.approved_at<(date_to+1)::timestamp at time zone tz
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
  from appointments where tenant_id=studio and starts_at>=date_from::timestamp at time zone tz and starts_at<(date_to+1)::timestamp at time zone tz group by 1,2
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

commit;
