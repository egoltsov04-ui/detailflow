-- Master account activation and payroll cash-flow.
-- Run this file in Supabase SQL Editor after migrations 001–020.

alter table public.staff_profiles add column if not exists invite_code text;
update public.staff_profiles set invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) where invite_code is null and user_id is null;
create unique index if not exists staff_profiles_invite_code_unique on public.staff_profiles (invite_code) where invite_code is not null;

create or replace function public.is_own_staff_profile(target_staff uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.staff_profiles where id = target_staff and user_id = auth.uid() and active = true); $$;

create or replace function public.claim_staff_invite(invite_code_input text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare target public.staff_profiles;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into target from public.staff_profiles where active = true and user_id is null and upper(invite_code) = upper(trim(invite_code_input)) for update;
  if target.id is null then raise exception 'Invalid, used or blocked activation code'; end if;
  update public.staff_profiles set user_id = auth.uid(), invite_code = null, updated_at = now() where id = target.id;
  insert into public.tenant_memberships (tenant_id, user_id, role) values (target.tenant_id, auth.uid(), 'master') on conflict (tenant_id, user_id) do nothing;
  return target.id;
end;
$$;
grant execute on function public.claim_staff_invite(text) to authenticated;

-- Each approved work order creates exactly one salary expense in Finance.
alter table public.cash_transactions add column if not exists earning_id uuid references public.staff_earnings(id) on delete cascade;
create unique index if not exists cash_transactions_earning_id_unique on public.cash_transactions (earning_id) where earning_id is not null;

create or replace function public.approve_work_order(target_work_order_id uuid, reviewer_note text default null)
returns public.staff_earnings language plpgsql security definer set search_path = public
as $$
declare target public.work_orders; payout numeric(12,2); result public.staff_earnings; master_name text;
begin
  select * into target from public.work_orders where id = target_work_order_id for update;
  if target.id is null then raise exception 'Work order not found'; end if;
  if not public.is_tenant_manager(target.tenant_id) then raise exception 'Manager access required'; end if;
  if target.staff_id is null then raise exception 'Assign a master before approval'; end if;
  if target.status <> 'review' then raise exception 'Only work orders submitted for review can be approved'; end if;
  payout := coalesce(target.compensation_fixed, round(target.total * coalesce(target.compensation_percent, 0) / 100, 2));
  update public.work_orders set status = 'ready', reviewed_at = now(), reviewed_by = auth.uid(), review_note = reviewer_note, approved_at = now(), updated_at = now() where id = target.id;
  insert into public.staff_earnings (tenant_id, staff_id, work_order_id, amount, calculation, approved_by, note)
  values (target.tenant_id, target.staff_id, target.id, payout, jsonb_build_object('order_total', target.total, 'percent', target.compensation_percent, 'fixed_amount', target.compensation_fixed), auth.uid(), reviewer_note)
  on conflict (work_order_id) do update set note = excluded.note returning * into result;
  select full_name into master_name from public.staff_profiles where id = target.staff_id;
  insert into public.cash_transactions (tenant_id, earning_id, transaction_date, direction, amount, payment_method, category, title, note, created_by)
  values (target.tenant_id, result.id, current_date, 'expense', payout, 'cash', 'Зарплата майстрів', 'Нарахування: ' || coalesce(master_name, 'майстер'), 'За замовлення «' || target.title || '»', auth.uid())
  on conflict (earning_id) where earning_id is not null do nothing;
  return result;
end;
$$;
