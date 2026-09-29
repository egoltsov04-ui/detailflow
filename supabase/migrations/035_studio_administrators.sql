begin;
alter table public.tenant_memberships add column if not exists active boolean not null default true;
alter table public.tenant_memberships add column if not exists finance_access boolean not null default false;
create or replace function public.is_tenant_member(target_tenant uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from tenant_memberships where tenant_id=target_tenant and user_id=auth.uid() and active)$$;
create or replace function public.is_tenant_manager(target_tenant uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from tenant_memberships where tenant_id=target_tenant and user_id=auth.uid() and active and role in ('owner','admin'))$$;
create or replace function public.is_tenant_owner(target_tenant uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from tenant_memberships where tenant_id=target_tenant and user_id=auth.uid() and active and role='owner')$$;
create or replace function public.can_view_finance(target_tenant uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from tenant_memberships where tenant_id=target_tenant and user_id=auth.uid() and active and (role='owner' or (role='admin' and finance_access)))$$;
revoke all on function public.is_tenant_owner(uuid),public.can_view_finance(uuid) from public,anon;
grant execute on function public.is_tenant_owner(uuid),public.can_view_finance(uuid) to authenticated,service_role;
drop policy if exists "managers manage memberships" on public.tenant_memberships;
drop policy if exists "owners manage memberships" on public.tenant_memberships;
create policy "owners manage memberships" on public.tenant_memberships for all using(is_tenant_owner(tenant_id)) with check(is_tenant_owner(tenant_id) and role in ('admin','master'));
-- An owner account cannot be disabled or demoted through a generic membership update.
create or replace function public.guard_owner_membership() returns trigger language plpgsql as $$begin
 if auth.uid() is not null and old.role='owner' then raise exception 'Передача прав власника потребує окремої процедури'; end if;
 if tg_op='DELETE' then return old;end if;return new;end$$;
drop trigger if exists protect_owner on public.tenant_memberships;
create trigger protect_owner before update or delete on public.tenant_memberships for each row execute function public.guard_owner_membership();

create or replace function public.resolve_my_access() returns jsonb language plpgsql security definer set search_path=public as $$
declare m tenant_memberships;s staff_profiles;r text;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into m from tenant_memberships where user_id=auth.uid() and role in ('owner','admin','super_admin') order by case when role='super_admin' then 0 else 1 end,created_at limit 1;
 if m.user_id is not null then return jsonb_build_object('role',case when m.active then m.role::text else 'blocked' end,'tenant_id',case when m.active then m.tenant_id end,'finance_access',m.active and (m.role='owner' or m.finance_access),'needs_password',exists(select 1 from auth.users where id=auth.uid() and coalesce(encrypted_password,'')=''));end if;
 select * into s from staff_profiles where user_id=auth.uid();
 if s.id is not null then
  if not s.active then return jsonb_build_object('role','blocked');end if;
  return jsonb_build_object('role','master','tenant_id',s.tenant_id,'needs_password',exists(select 1 from auth.users where id=auth.uid() and coalesce(encrypted_password,'')=''));
 end if;
 select status into r from studio_access_requests where user_id=auth.uid();
 return jsonb_build_object('role',case when r is null then 'unlinked' else 'owner_request' end,'status',r);
end$$;

do $$declare t text;p record;begin
 foreach t in array array['expenses','cash_transactions','staff_service_compensation','staff_earnings','staff_payouts','payment_orders'] loop
  for p in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',p.policyname,t);end loop;
  execute format('create policy "finance access" on public.%I for all using(can_view_finance(tenant_id)) with check(can_view_finance(tenant_id))',t);
 end loop;
end$$;
create policy "master reads own earnings" on public.staff_earnings for select using(is_own_staff_profile(staff_id));
create policy "master reads own rates" on public.staff_service_compensation for select using(is_own_staff_profile(staff_id));
create policy "master reads own payouts" on public.staff_payouts for select using(exists(select 1 from staff_earnings e where e.id=earning_id and is_own_staff_profile(e.staff_id)));

create or replace function public.list_studio_administrators(studio uuid) returns jsonb language plpgsql security definer set search_path=public as $$begin
 if not is_tenant_owner(studio) then raise exception 'Потрібні права власника';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',p.full_name,'email',u.email,'active',m.active,'finance_access',m.finance_access,'registered',u.last_sign_in_at is not null)) from tenant_memberships m join profiles p on p.id=m.user_id join auth.users u on u.id=m.user_id where m.tenant_id=studio and m.role='admin'),'[]');
end$$;
revoke all on function public.list_studio_administrators(uuid) from public,anon;
grant execute on function public.list_studio_administrators(uuid) to authenticated;

-- Payroll is privileged even when invoked through a SECURITY DEFINER function.
do $$begin
 if to_regprocedure('public.record_staff_payout_internal(uuid,numeric,public.payment_method,uuid,text)') is null then
  alter function public.record_staff_payout(uuid,numeric,public.payment_method,uuid,text) rename to record_staff_payout_internal;
 end if;
end$$;
revoke all on function public.record_staff_payout_internal(uuid,numeric,public.payment_method,uuid,text) from public,anon,authenticated;
create or replace function public.record_staff_payout(earning_id_input uuid,amount_input numeric,method_input public.payment_method,request_id uuid,note_input text default '') returns void language plpgsql security definer set search_path=public as $$begin
 if not exists(select 1 from staff_earnings where id=earning_id_input and can_view_finance(tenant_id)) then raise exception 'Немає доступу до зарплат';end if;
 perform record_staff_payout_internal(earning_id_input,amount_input,method_input,request_id,note_input);
end$$;
revoke all on function public.record_staff_payout(uuid,numeric,public.payment_method,uuid,text) from public,anon;
grant execute on function public.record_staff_payout(uuid,numeric,public.payment_method,uuid,text) to authenticated;

create or replace function public.guard_compensation_edit() returns trigger language plpgsql security definer set search_path=public as $$begin
 if auth.uid() is not null and not can_view_finance(new.tenant_id) and (new.compensation_percent is distinct from old.compensation_percent or new.hourly_rate is distinct from old.hourly_rate) then raise exception 'Немає прав змінювати оплату майстра';end if;return new;
end$$;
drop trigger if exists guard_compensation_edit on public.staff_profiles;
create trigger guard_compensation_edit before update on public.staff_profiles for each row execute function public.guard_compensation_edit();

create or replace function public.get_team_profiles(studio uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$begin
 if not is_tenant_member(studio) then raise exception 'Немає доступу';end if;
 return coalesce((select jsonb_agg((case when can_view_finance(studio) or s.user_id=auth.uid() then to_jsonb(s) else to_jsonb(s)-'compensation_percent'-'hourly_rate' end)||jsonb_build_object('staff_services',coalesce((select jsonb_agg(jsonb_build_object('service_id',service_id)) from staff_services where staff_id=s.id),'[]')) order by s.created_at) from staff_profiles s where s.tenant_id=studio and s.active and (is_tenant_manager(studio) or s.user_id=auth.uid())),'[]');
end$$;
-- Row security cannot hide individual salary columns. Read them only through a checked RPC.
revoke select on public.staff_profiles from authenticated;
do $$declare cols text;begin
 select string_agg(quote_ident(column_name),',') into cols from information_schema.columns where table_schema='public' and table_name='staff_profiles' and column_name not in ('compensation_percent','hourly_rate');
 execute 'grant select ('||cols||') on public.staff_profiles to authenticated';
end$$;
create or replace function public.save_staff_base_rate(staff_input uuid,percent_input numeric,hourly_input numeric) returns jsonb language plpgsql security definer set search_path=public as $$declare p staff_profiles;begin
 select * into p from staff_profiles where id=staff_input for update;
 if p.id is null or not can_view_finance(p.tenant_id) then raise exception 'Немає доступу';end if;
 update staff_profiles set compensation_percent=percent_input,hourly_rate=hourly_input where id=p.id returning * into p;
 return to_jsonb(p);
end$$;
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
revoke select on public.work_order_jobs,public.work_job_events from authenticated;
revoke all on function public.get_team_profiles(uuid),public.save_staff_base_rate(uuid,numeric,numeric),public.get_workflow_snapshot(uuid) from public,anon;
grant execute on function public.get_team_profiles(uuid),public.save_staff_base_rate(uuid,numeric,numeric),public.get_workflow_snapshot(uuid) to authenticated;

-- Operational administrators may assign work using saved rates, but cannot override pay.
do $$begin if to_regprocedure('public.save_work_job_internal(uuid,jsonb,integer)') is null then alter function public.save_work_job(uuid,jsonb,integer) rename to save_work_job_internal;end if;end$$;
revoke all on function public.save_work_job_internal(uuid,jsonb,integer) from public,anon,authenticated;
create or replace function public.save_work_job(order_id uuid,job_input jsonb,expected_version integer default null) returns uuid language plpgsql security definer set search_path=public as $$declare studio uuid;begin
 select tenant_id into studio from work_orders where id=order_id;
 if not is_tenant_manager(studio) then raise exception 'Немає доступу';end if;
 if not can_view_finance(studio) then
  if coalesce(job_input->>'pay_mode','auto')<>'auto' then raise exception 'Оплату майстра налаштовує власник';end if;
  job_input=(job_input-'rate')||jsonb_build_object('pay_mode','auto');
 end if;
 return save_work_job_internal(order_id,job_input,expected_version);
end$$;
revoke all on function public.save_work_job(uuid,jsonb,integer) from public,anon;
grant execute on function public.save_work_job(uuid,jsonb,integer) to authenticated;
notify pgrst,'reload schema';
commit;
