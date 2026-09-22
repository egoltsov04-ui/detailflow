-- A zero percentage is valid: keep the approval and earning, but do not create an
-- invalid zero-value cash transaction (cash_transactions.amount must be positive).
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
  if payout > 0 then
    select full_name into master_name from public.staff_profiles where id = target.staff_id;
    insert into public.cash_transactions (tenant_id, earning_id, transaction_date, direction, amount, payment_method, category, title, note, created_by)
    values (target.tenant_id, result.id, current_date, 'expense', payout, 'cash', 'Зарплата майстрів', 'Нарахування: ' || coalesce(master_name, 'майстер'), 'За замовлення «' || target.title || '»', auth.uid())
    on conflict (earning_id) where earning_id is not null do nothing;
  end if;
  return result;
end;
$$;
