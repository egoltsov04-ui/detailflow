-- Rollback for 063_shift_start_approval.sql. Restores the 062 state. Pending requests are dropped; open shifts stay.
begin;
drop trigger if exists shift_request_notifications on public.shift_requests;
drop function if exists public.notify_shift_request();
drop function if exists public.decide_shift_request(uuid,boolean,text);
drop table if exists public.shift_requests;
drop function if exists public.save_shift_limits(uuid,integer,integer,time,boolean);
create function public.save_shift_limits(studio uuid,hours_input integer,break_input integer,close_input time default null) returns void language plpgsql security definer set search_path=public as $$begin
 if not is_tenant_manager(studio) then raise exception 'Немає доступу';end if;
 if hours_input is null or hours_input not between 1 and 24 or break_input is null or break_input not between 15 and 480 then raise exception 'Перевірте ліміти зміни та перерви';end if;
 update tenants set shift_max_hours=hours_input,break_max_minutes=break_input,shift_close_time=close_input where id=studio;
end$$;
revoke all on function public.save_shift_limits(uuid,integer,integer,time) from public,anon;
grant execute on function public.save_shift_limits(uuid,integer,integer,time) to authenticated;
create or replace function public.manage_master_shift(staff_id_input uuid,action_input text) returns void language plpgsql security definer set search_path=public as $$
declare s staff_profiles; sh staff_shifts;
begin
 select * into s from staff_profiles where id=staff_id_input and active for update;
 if s.id is null or not is_own_staff_profile(s.id) then raise exception 'Зміну відмічає майстер зі свого акаунта'; end if;
 select * into sh from staff_shifts where staff_id=s.id and ended_at is null for update;
 if action_input='start' then
   if sh.id is null then insert into staff_shifts(tenant_id,staff_id) values(s.tenant_id,s.id); end if;
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
create or replace function public.get_workflow_snapshot(studio uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$declare finance boolean:=can_view_finance(studio);begin
 if not is_tenant_member(studio) then raise exception 'Немає доступу';end if;
 return jsonb_build_object(
 'can_view_finance',finance,
 'jobs',coalesce((select jsonb_agg((case when finance or is_own_staff_profile(j.staff_id) then to_jsonb(j) else to_jsonb(j)-'rate'-'pay_mode' end)||jsonb_build_object('can_view_pay',finance or is_own_staff_profile(j.staff_id)) order by j.created_at) from work_order_jobs j where j.tenant_id=studio and can_access_job(j.id)),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(e)||jsonb_build_object('detail',case when finance or exists(select 1 from work_order_jobs j where j.id=e.job_id and is_own_staff_profile(j.staff_id)) then e.detail else e.detail-'pay'-'rate'-'pay_mode' end) order by e.created_at) from work_job_events e where e.tenant_id=studio and can_access_job(e.job_id)),'[]'),
 'shifts',coalesce((select jsonb_agg(to_jsonb(s) order by s.started_at) from staff_shifts s where s.tenant_id=studio and (is_tenant_manager(studio) or is_own_staff_profile(s.staff_id))),'[]'),
 'earnings',coalesce((select jsonb_agg(to_jsonb(e) order by e.accrued_at) from staff_earnings e where e.tenant_id=studio and (finance or is_own_staff_profile(e.staff_id))),'[]'),
 'payouts',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from staff_payouts p join staff_earnings e on e.id=p.earning_id where p.tenant_id=studio and (finance or is_own_staff_profile(e.staff_id))),'[]'),
 'services',coalesce((select jsonb_agg(to_jsonb(s)) from services s where s.tenant_id=studio and s.active),'[]'));
end$$;
alter table public.tenants drop column if exists shift_approval;
notify pgrst, 'reload schema';
commit;
