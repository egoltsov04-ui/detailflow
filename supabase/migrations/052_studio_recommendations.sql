begin;
create table if not exists public.studio_recommendations(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,
 kind text not null check(kind in ('return','timing','pricing','upsell','demand')),target text not null,
 evidence jsonb not null,score numeric not null,active boolean not null default true,
 first_seen timestamptz not null default now(),last_seen timestamptz not null default now(),
 unique(tenant_id,kind,target)
);
create table if not exists public.recommendation_feedback(
 recommendation_id uuid primary key references public.studio_recommendations(id) on delete cascade,
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 vote text not null check(vote in ('useful','not_useful','done','none')),
 actor_id uuid references auth.users(id) on delete set null,updated_at timestamptz not null default now()
);
alter table public.studio_recommendations enable row level security;
alter table public.recommendation_feedback enable row level security;
drop policy if exists recommendation_read on public.studio_recommendations;
create policy recommendation_read on public.studio_recommendations for select to authenticated using(public.can_view_finance(tenant_id));
drop policy if exists recommendation_feedback_read on public.recommendation_feedback;
create policy recommendation_feedback_read on public.recommendation_feedback for select to authenticated using(public.can_view_finance(tenant_id));
revoke all on public.studio_recommendations,public.recommendation_feedback from anon,authenticated;
grant select on public.studio_recommendations,public.recommendation_feedback to authenticated;

create or replace function public.studio_recommendation_feed(studio uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare candidates jsonb;result jsonb;readiness jsonb;
begin
 if not can_view_finance(studio) then raise exception 'Access denied' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext(studio::text));
 with completed as (
  select id,client_id,total,coalesce(approved_at,status_changed_at) finished from work_orders
  where tenant_id=studio and status in ('ready','issued') and coalesce(approved_at,status_changed_at) between now()-interval '365 days' and now()
 ), visits as (
  select client_id,finished,extract(epoch from finished-lag(finished) over(partition by client_id order by finished))/86400 gap from completed
 ), rhythms as (
  select client_id,max(finished) last_visit,count(*) visits,percentile_cont(.5) within group(order by gap) filter(where gap>=1) typical_days,count(*) filter(where gap>=1) intervals from visits group by client_id
 ), return_signals as (
  select 'return'::text kind,r.client_id::text target,75::numeric score,
   jsonb_build_object('client',c.full_name,'visits',r.visits,'typical_days',round(r.typical_days::numeric,1),'days_since',floor(extract(epoch from now()-r.last_visit)/86400)) evidence
  from rhythms r join clients c on c.id=r.client_id and c.tenant_id=studio
  where r.intervals>=2 and r.typical_days>=7 and r.last_visit<now()-make_interval(days=>ceil(r.typical_days*1.5)::int)
   and not exists(select 1 from appointments a where a.tenant_id=studio and a.client_id=r.client_id and a.starts_at>now() and a.status not in ('cancelled','no_show'))
  order by r.last_visit limit 20
 ), timed as (
  select service_id,title service,count(*) samples,avg(planned_minutes) planned,avg(worked_seconds/60.0) actual
  from work_order_jobs where tenant_id=studio and status='approved' and approved_at between now()-interval '90 days' and now()
   and service_id is not null and planned_minutes>0 and worked_seconds>0
  group by service_id,title having count(*)>=5 and avg(worked_seconds/60.0)>avg(planned_minutes)*1.2
 ), timing as (
  select 'timing'::text kind,service_id::text||':'||service target,65::numeric score,jsonb_build_object('service',service,'samples',samples,'planned',round(planned,1),'actual',round(actual,1)) evidence from timed
 ), pricing as (
  select 'pricing'::text kind,service_id::text||':'||service target,45::numeric score,jsonb_build_object('service',service,'samples',samples,'planned',round(planned,1),'actual',round(actual,1)) evidence from timed where samples>=12 and actual>planned*1.3
 ), purchased as (
  select distinct j.work_order_id,j.service_id,o.client_id from work_order_jobs j join completed o on o.id=j.work_order_id
  where j.tenant_id=studio and j.status='approved' and j.service_id is not null
 ), pairs as (
  select a.service_id base,b.service_id extra,count(distinct a.work_order_id) together,
   (select count(distinct p.work_order_id) from purchased p where p.service_id=a.service_id) base_orders
  from purchased a join purchased b on b.work_order_id=a.work_order_id and b.service_id<>a.service_id group by a.service_id,b.service_id
  having count(distinct a.work_order_id)>=5
 ), upselling as (
  select distinct on(p.client_id,pairs.extra) 'upsell'::text kind,p.client_id::text||':'||pairs.extra::text target,40::numeric score,
   jsonb_build_object('client',c.full_name,'base_service',base.name,'service',extra.name,'together',pairs.together,'base_orders',pairs.base_orders) evidence
  from pairs join purchased p on p.service_id=pairs.base join clients c on c.id=p.client_id and c.tenant_id=studio
  join services base on base.id=pairs.base and base.tenant_id=studio join services extra on extra.id=pairs.extra and extra.tenant_id=studio and extra.active
  where pairs.together::numeric/nullif(pairs.base_orders,0)>=.35
   and not exists(select 1 from purchased prior where prior.client_id=p.client_id and prior.service_id=pairs.extra)
  order by p.client_id,pairs.extra,pairs.together desc limit 20
 ), weeks as (
  select extract(isodow from a.starts_at at time zone coalesce(t.timezone,'Europe/Kyiv'))::int weekday,count(*) bookings,
   count(distinct date_trunc('week',a.starts_at at time zone coalesce(t.timezone,'Europe/Kyiv'))) weeks
  from appointments a join tenants t on t.id=a.tenant_id where a.tenant_id=studio and a.starts_at between now()-interval '90 days' and now() and a.status not in ('cancelled','no_show') group by 1
 ), demand as (
  select 'demand'::text kind,weekday::text target,35::numeric score,jsonb_build_object('weekday',weekday,'bookings',bookings,'average',round((select avg(bookings) from weeks),1),'weeks',weeks) evidence
  from weeks where weeks>=8 and (select sum(bookings) from weeks)>=40 and bookings<(select avg(bookings)*.6 from weeks)
 ) select coalesce(jsonb_agg(to_jsonb(x)),'[]') into candidates from (select * from return_signals union all select * from timing union all select * from pricing union all select * from upselling union all select * from demand) x;
 update studio_recommendations set active=false where tenant_id=studio and active;
 insert into studio_recommendations(tenant_id,kind,target,evidence,score)
 select studio,v->>'kind',v->>'target',v->'evidence',(v->>'score')::numeric from jsonb_array_elements(candidates) v
 on conflict(tenant_id,kind,target) do update set evidence=excluded.evidence,score=excluded.score,active=true,last_seen=now();
 with ratings as (
  select r.kind,count(*) samples,count(*) filter(where f.vote in ('useful','done')) positive
  from recommendation_feedback f join studio_recommendations r on r.id=f.recommendation_id and r.tenant_id=f.tenant_id
  where f.tenant_id=studio and f.vote<>'none' group by r.kind
 ), ranked as (
  select r.id,r.kind,r.evidence,r.first_seen,r.last_seen,coalesce(f.vote,'none') vote,
   coalesce(ratings.samples,0) feedback_count,r.score+case when ratings.samples>=5 then 30*((ratings.positive+3.0)/(ratings.samples+6.0)-.5) else 0 end priority
  from studio_recommendations r left join recommendation_feedback f on f.recommendation_id=r.id
  left join ratings on ratings.kind=r.kind where r.tenant_id=studio and r.active
 ) select coalesce(jsonb_agg(to_jsonb(ranked) order by priority desc,id),'[]') into result from ranked;
 select jsonb_build_object('completed_orders',count(*),'history_days',coalesce(extract(day from now()-min(coalesce(approved_at,status_changed_at)))::int,0),'generated_at',now(),'method','studio-rules-v1') into readiness
 from work_orders where tenant_id=studio and status in ('ready','issued') and coalesce(approved_at,status_changed_at) between now()-interval '365 days' and now();
 return jsonb_build_object('recommendations',result,'readiness',readiness);
end $$;

create or replace function public.rate_studio_recommendation(recommendation uuid,rating text) returns void
language plpgsql security definer set search_path=public as $$
declare studio uuid;
begin
 select tenant_id into studio from studio_recommendations where id=recommendation;
 if studio is null or not can_view_finance(studio) then raise exception 'Access denied' using errcode='42501';end if;
 if rating is null or rating not in ('useful','not_useful','done','none') then raise exception 'Invalid rating';end if;
 insert into recommendation_feedback(recommendation_id,tenant_id,vote,actor_id) values(recommendation,studio,rating,auth.uid())
 on conflict(recommendation_id) do update set vote=excluded.vote,actor_id=excluded.actor_id,updated_at=now();
end $$;
revoke all on function public.studio_recommendation_feed(uuid),public.rate_studio_recommendation(uuid,text) from public,anon;
grant execute on function public.studio_recommendation_feed(uuid),public.rate_studio_recommendation(uuid,text) to authenticated;
commit;
