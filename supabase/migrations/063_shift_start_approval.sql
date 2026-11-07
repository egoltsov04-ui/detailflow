-- A master's shift starts only after an owner or admin confirms it; the shift counts from the confirmation.
-- Requests live in their own table so every report that sums staff_shifts stays unchanged.
-- Owners and admins starting their own shift, and studios with the setting off, start immediately as before.
begin;

alter table public.tenants add column if not exists shift_approval boolean not null default true;

create table if not exists public.shift_requests(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 staff_id uuid not null references public.staff_profiles(id) on delete cascade,
 requested_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','rejected')),
 reason text check(char_length(reason)<=300),
 decided_at timestamptz,
 decided_by uuid references public.profiles(id) on delete set null
);
-- one row per master: a new request replaces the previous rejection
create unique index if not exists shift_requests_one_per_staff on public.shift_requests(staff_id);
alter table public.shift_requests enable row level security;
revoke all on public.shift_requests from anon,authenticated;
grant select on public.shift_requests to authenticated;
drop policy if exists "read shift requests" on public.shift_requests;
create policy "read shift requests" on public.shift_requests for select using(public.is_tenant_manager(tenant_id) or public.is_own_staff_profile(staff_id));
drop trigger if exists plan_module_guard on public.shift_requests;
create trigger plan_module_guard before insert or update or delete on public.shift_requests for each row execute function public.guard_plan_module('team_module');

create or replace function public.manage_master_shift(staff_id_input uuid,action_input text) returns void language plpgsql security definer set search_path=public as $$
declare s staff_profiles; sh staff_shifts;
begin
 select * into s from staff_profiles where id=staff_id_input and active for update;
 if s.id is null or not is_own_staff_profile(s.id) then raise exception 'Зміну відмічає майстер зі свого акаунта'; end if;
 select * into sh from staff_shifts where staff_id=s.id and ended_at is null for update;
 if action_input='start' then
   if sh.id is null then
     if (select shift_approval from tenants where id=s.tenant_id) and not is_tenant_manager(s.tenant_id) then
       insert into shift_requests(tenant_id,staff_id) values(s.tenant_id,s.id)
       on conflict(staff_id) do update set requested_at=now(),status='pending',reason=null,decided_at=null,decided_by=null where shift_requests.status='rejected';
     else
       insert into staff_shifts(tenant_id,staff_id) values(s.tenant_id,s.id);
       delete from shift_requests where staff_id=s.id;
     end if;
   end if;
 elsif action_input='cancel_request' then
   delete from shift_requests where staff_id=s.id;
 elsif action_input in ('pause','end') then
   if sh.id is null then raise exception 'Зміна не розпочата'; end if;
   -- Consistent order: callers pause their running job before taking a break.
   if exists(select 1 from work_order_jobs where staff_id=s.id and running_since is not null) then raise exception 'Спочатку призупиніть поточну роботу'; end if;
   if action_input='pause' and sh.paused_at is null then update staff_shifts set paused_at=now() where id=sh.id; end if;
   if action_input='end' then update staff_shifts set ended_at=now(),paused_at=null,pause_seconds=pause_seconds+case when sh.paused_at is null then 0 else floor(extract(epoch from now()-sh.paused_at))::integer end,breaks=case when sh.paused_at is null then breaks else breaks||jsonb_build_array(jsonb_build_object('from',sh.paused_at,'to',now())) end where id=sh.id; end if;
 elsif action_input='resume' then
   if sh.paused_at is null then raise exception 'Перерву не розпочато'; end if;
   update staff_shifts set pause_seconds=pause_seconds+extract(epoch from now()-paused_at)::integer,breaks=breaks||jsonb_build_array(jsonb_build_object('from',paused_at,'to',now())),paused_at=null where id=sh.id;
 else raise exception 'Невідома дія'; end if;
end $$;

create or replace function public.decide_shift_request(request_id uuid,approve boolean,reason_input text default null) returns void language plpgsql security definer set search_path=public as $$
declare r shift_requests;
begin
 select * into r from shift_requests where id=request_id for update;
 if r.id is null or not is_tenant_manager(r.tenant_id) then raise exception 'Немає доступу'; end if;
 if is_own_staff_profile(r.staff_id) then raise exception 'Свою зміну підтверджує інший адміністратор або власник'; end if;
 if r.status<>'pending' then raise exception 'Запит уже розглянуто'; end if;
 if approve then
   delete from shift_requests where id=r.id;
   if not exists(select 1 from staff_shifts where staff_id=r.staff_id and ended_at is null) then
     insert into staff_shifts(tenant_id,staff_id) values(r.tenant_id,r.staff_id);
   end if;
 else
   update shift_requests set status='rejected',reason=nullif(btrim(reason_input),''),decided_at=now(),decided_by=auth.uid() where id=r.id;
 end if;
end $$;

drop function if exists public.save_shift_limits(uuid,integer,integer,time);
create or replace function public.save_shift_limits(studio uuid,hours_input integer,break_input integer,close_input time default null,approval_input boolean default null) returns void language plpgsql security definer set search_path=public as $$begin
 if not is_tenant_manager(studio) then raise exception 'Немає доступу';end if;
 if hours_input is null or hours_input not between 1 and 24 or break_input is null or break_input not between 15 and 480 then raise exception 'Перевірте ліміти зміни та перерви';end if;
 update tenants set shift_max_hours=hours_input,break_max_minutes=break_input,shift_close_time=close_input,shift_approval=coalesce(approval_input,shift_approval) where id=studio;
end$$;

create or replace function public.get_workflow_snapshot(studio uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$declare finance boolean:=can_view_finance(studio);begin
 if not is_tenant_member(studio) then raise exception 'Немає доступу';end if;
 return jsonb_build_object(
 'can_view_finance',finance,
 'jobs',coalesce((select jsonb_agg((case when finance or is_own_staff_profile(j.staff_id) then to_jsonb(j) else to_jsonb(j)-'rate'-'pay_mode' end)||jsonb_build_object('can_view_pay',finance or is_own_staff_profile(j.staff_id)) order by j.created_at) from work_order_jobs j where j.tenant_id=studio and can_access_job(j.id)),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(e)||jsonb_build_object('detail',case when finance or exists(select 1 from work_order_jobs j where j.id=e.job_id and is_own_staff_profile(j.staff_id)) then e.detail else e.detail-'pay'-'rate'-'pay_mode' end) order by e.created_at) from work_job_events e where e.tenant_id=studio and can_access_job(e.job_id)),'[]'),
 'shifts',coalesce((select jsonb_agg(to_jsonb(s) order by s.started_at) from staff_shifts s where s.tenant_id=studio and (is_tenant_manager(studio) or is_own_staff_profile(s.staff_id))),'[]'),
 'shift_requests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'staff_id',r.staff_id,'requested_at',r.requested_at,'status',r.status,'reason',r.reason) order by r.requested_at) from shift_requests r where r.tenant_id=studio and (is_tenant_manager(studio) or is_own_staff_profile(r.staff_id))),'[]'),
 'earnings',coalesce((select jsonb_agg(to_jsonb(e) order by e.accrued_at) from staff_earnings e where e.tenant_id=studio and (finance or is_own_staff_profile(e.staff_id))),'[]'),
 'payouts',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from staff_payouts p join staff_earnings e on e.id=p.earning_id where p.tenant_id=studio and (finance or is_own_staff_profile(e.staff_id))),'[]'),
 'services',coalesce((select jsonb_agg(to_jsonb(s)) from services s where s.tenant_id=studio and s.active),'[]'));
end$$;

-- Push owners and admins about a new request, and the master about a rejection.
create or replace function public.notify_shift_request() returns trigger language plpgsql security definer set search_path=public as $$
declare recipients uuid[];kind_value text;begin
 if new.status='pending' then
  kind_value='shift_requested';select array_agg(user_id) into recipients from tenant_memberships where tenant_id=new.tenant_id and active and role in ('owner','admin');
 else
  kind_value='shift_rejected';select array_agg(user_id) into recipients from staff_profiles where id=new.staff_id and active;
 end if;
 insert into notification_jobs(tenant_id,dedupe_key,channel,kind,payload,recipient_user_id,expires_at)
 select new.tenant_id,'shift:'||new.id||':'||new.status||':'||extract(epoch from new.requested_at)||':'||p.id,'push',kind_value,jsonb_build_object('subscription_id',p.id),p.user_id,now()+interval '1 day' from push_subscriptions p where p.user_id=any(recipients) on conflict(dedupe_key) do nothing;
 return new;
end$$;
drop trigger if exists shift_request_notifications on public.shift_requests;
create trigger shift_request_notifications after insert or update of status,requested_at on public.shift_requests for each row execute function public.notify_shift_request();

revoke all on function public.decide_shift_request(uuid,boolean,text),public.save_shift_limits(uuid,integer,integer,time,boolean),public.notify_shift_request() from public,anon;
grant execute on function public.decide_shift_request(uuid,boolean,text),public.save_shift_limits(uuid,integer,integer,time,boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
