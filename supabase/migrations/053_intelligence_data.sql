begin;
alter table public.recommendation_feedback add column if not exists evidence_snapshot jsonb;
create or replace function public.rate_studio_recommendation(recommendation uuid,rating text) returns void
language plpgsql security definer set search_path=public as $$
declare studio uuid;evidence_input jsonb;
begin
 select tenant_id,evidence into studio,evidence_input from studio_recommendations where id=recommendation;
 if studio is null or not can_view_finance(studio) then raise exception 'Access denied' using errcode='42501';end if;
 if rating is null or rating not in ('useful','not_useful','done','none') then raise exception 'Invalid rating';end if;
 insert into recommendation_feedback(recommendation_id,tenant_id,vote,actor_id,evidence_snapshot) values(recommendation,studio,rating,auth.uid(),evidence_input)
 on conflict(recommendation_id) do update set vote=excluded.vote,actor_id=excluded.actor_id,updated_at=now(),evidence_snapshot=excluded.evidence_snapshot where recommendation_feedback.vote is distinct from excluded.vote;
end $$;
create or replace function public.studio_intelligence_data(studio uuid,from_input date,to_input date)
returns jsonb language plpgsql security definer set search_path=public as $$
declare zone text;lo timestamptz;hi timestamptz;result jsonb;
begin
 if not can_view_finance(studio) then raise exception 'Access denied' using errcode='42501';end if;
 if from_input is null or to_input is null or to_input<from_input or to_input-from_input>366 then raise exception 'Оберіть період до року';end if;
 select coalesce(timezone,'Europe/Kyiv') into zone from tenants where id=studio;
 lo=from_input::timestamp at time zone zone;hi=(to_input+1)::timestamp at time zone zone;
 if (select count(*) from work_orders where tenant_id=studio and status in ('ready','issued') and coalesce(approved_at,status_changed_at)>=now()-interval '730 days')>50000
 or (select count(*) from work_job_events where tenant_id=studio and created_at>=least(lo,now()-interval '730 days'))>200000 then raise exception 'Забагато даних для інтерактивного прогнозу';end if;
 select jsonb_build_object('as_of',now(),'timezone',zone,'from',from_input,'to',to_input,
 'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'client_id',o.client_id,'value',o.total,'at',coalesce(o.approved_at,o.status_changed_at))) from work_orders o where o.tenant_id=studio and o.status in ('ready','issued') and coalesce(o.approved_at,o.status_changed_at) between now()-interval '730 days' and now()),'[]'),
 'clients',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',full_name)) from clients where tenant_id=studio),'[]'),
 'staff',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',full_name,'active',active)) from staff_profiles where tenant_id=studio),'[]'),
 'schedules',coalesce((select jsonb_agg(to_jsonb(w)) from work_schedules w where tenant_id=studio),'[]'),
 'appointments',coalesce((select jsonb_agg(jsonb_build_object('id',id,'staff_id',staff_id,'start',starts_at,'end',ends_at,'status',status)) from appointments where tenant_id=studio and starts_at<greatest(hi,now()+interval '14 days') and ends_at>lo),'[]'),
 'shifts',coalesce((select jsonb_agg(jsonb_build_object('staff_id',staff_id,'start',started_at,'end',coalesce(ended_at,now()),'breaks',breaks||case when paused_at is not null then jsonb_build_array(jsonb_build_object('from',paused_at,'to',now())) else '[]'::jsonb end)) from staff_shifts where tenant_id=studio and started_at<hi and coalesce(ended_at,now())>lo),'[]'),
 'sessions',coalesce((with transitions as (
  select e.job_id,j.staff_id,e.event,e.created_at,lead(e.created_at) over(partition by e.job_id order by e.created_at,e.id) next_at
  from work_job_events e join work_order_jobs j on j.id=e.job_id and j.tenant_id=e.tenant_id
  where e.tenant_id=studio and e.event in ('start','pause','submit') and e.created_at<hi
 ) select jsonb_agg(jsonb_build_object('staff_id',staff_id,'start',created_at,'end',least(coalesce(next_at,now()),now()))) from transitions where event='start' and coalesce(next_at,now())>lo),'[]'),
 'services',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'price',price,'variants',variants)) from services where tenant_id=studio and active),'[]'),
 'outcomes',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'kind',r.kind,'target',r.target,'at',f.updated_at,'evidence',f.evidence_snapshot)) from recommendation_feedback f join studio_recommendations r on r.id=f.recommendation_id and r.tenant_id=f.tenant_id where f.tenant_id=studio and f.vote='done' and f.evidence_snapshot is not null),'[]')) into result;
 return result;
end $$;
revoke all on function public.studio_intelligence_data(uuid,date,date) from public,anon;
grant execute on function public.studio_intelligence_data(uuid,date,date) to authenticated;
commit;
