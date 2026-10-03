begin;
-- Subscription data is for active studio managers, not the master's workspace.
drop policy if exists "members read subscriptions" on public.subscriptions;
drop policy if exists "managers read subscriptions" on public.subscriptions;
create policy "managers read subscriptions" on public.subscriptions for select using(is_tenant_manager(tenant_id));
-- Billing access is independent of permission to view salaries and studio cash.
do $$ declare p record;begin
 for p in select policyname from pg_policies where schemaname='public' and tablename='payment_orders' loop
  execute format('drop policy %I on public.payment_orders',p.policyname);
 end loop;
end $$;
create policy "managers read billing" on public.payment_orders for select using(is_tenant_manager(tenant_id));
revoke insert,update,delete on public.payment_orders,public.subscriptions from authenticated,anon;
revoke select on public.payment_orders from authenticated;
grant select(id,tenant_id,plan,amount,status,created_at,paid_at) on public.payment_orders to authenticated;
revoke execute on function public.subscription_allows_new_work(uuid) from authenticated;

create or replace function public.plan_staff_limit(plan_input text) returns integer
language plpgsql immutable set search_path=public as $$begin
 case plan_input when 'start' then return 3;when 'studio' then return 10;when 'pro' then return null;
 else raise exception 'Невідомий тариф';end case;
end $$;
revoke all on function public.plan_staff_limit(text) from public,anon,authenticated;

create or replace function public.guard_subscription_capacity() returns trigger
language plpgsql security definer set search_path=public as $$
declare sub subscriptions;maximum integer;
begin
 if tg_table_name='staff_profiles' then
  if not new.active then return new;end if;
  if tg_op='UPDATE' then if old.active and new.tenant_id=old.tenant_id then return new;end if;end if;
 end if;
 perform 1 from tenants where id=new.tenant_id for update;
 select * into sub from subscriptions where tenant_id=new.tenant_id;
 if not subscription_allows_new_work(new.tenant_id) then raise exception 'Період доступу завершено. Власник або адміністратор має продовжити тариф';end if;
 if tg_table_name='staff_profiles' then
  maximum=plan_staff_limit(sub.plan);
  if maximum is not null and (select count(*) from staff_profiles where tenant_id=new.tenant_id and active and id<>new.id)>=maximum then raise exception 'Досягнуто ліміт активних майстрів тарифу. Деактивуйте зайві профілі або оберіть більший тариф';end if;
 end if;
 return new;
end $$;
drop trigger if exists subscription_capacity on public.staff_profiles;
create trigger subscription_capacity before insert or update of active,tenant_id on public.staff_profiles for each row execute function public.guard_subscription_capacity();

-- A downgrade cannot leave more active masters than the newly advertised limit.
create or replace function public.guard_subscription_plan() returns trigger
language plpgsql security definer set search_path=public as $$
declare maximum integer;used integer;begin
 if tg_op='UPDATE' then
  if new.tenant_id is distinct from old.tenant_id then raise exception 'Не можна перенести підписку до іншої студії';end if;
  if new.plan=old.plan then return new;end if;
 end if;
 perform 1 from tenants where id=new.tenant_id for update;
 maximum=plan_staff_limit(new.plan);
 select count(*) into used from staff_profiles where tenant_id=new.tenant_id and active;
 if maximum is not null and used>maximum then raise exception 'Тариф допускає % активних майстрів, зараз %. Спочатку деактивуйте зайві профілі або оберіть більший тариф',maximum,used;end if;
 return new;
end $$;
drop trigger if exists subscription_plan_limit on public.subscriptions;
create trigger subscription_plan_limit before insert or update of plan,tenant_id on public.subscriptions for each row execute function public.guard_subscription_plan();
revoke all on function public.guard_subscription_plan() from public,anon,authenticated;

-- Minimized snapshot: managers need usage, not access to protected salary columns.
create or replace function public.get_studio_billing(studio uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$begin
 if not is_tenant_manager(studio) then raise exception 'Тариф доступний власнику та адміністратору студії';end if;
 return jsonb_build_object('subscription',(select jsonb_build_object('plan',s.plan,'status',s.status,'trial_ends_at',s.trial_ends_at,'current_period_end',s.current_period_end,'staff_limit',plan_staff_limit(s.plan)) from subscriptions s where s.tenant_id=studio),
 'staff_count',(select count(*) from staff_profiles where tenant_id=studio and active),
 'orders',coalesce((select jsonb_agg(x) from(select id,plan,amount,status,created_at,paid_at from payment_orders where tenant_id=studio order by created_at desc limit 30)x),'[]'));
end $$;
revoke all on function public.get_studio_billing(uuid) from public,anon;
grant execute on function public.get_studio_billing(uuid) to authenticated;
create or replace function public.support_set_subscription(studio uuid,plan_input text,status_input text,end_input timestamptz,note_input text) returns void language plpgsql security definer set search_path=public as $$
declare prior jsonb;begin
 if not is_support_user() then raise exception 'Потрібні права підтримки';end if;
 if plan_input is null or status_input is null or note_input is null or plan_input not in ('start','studio','pro') or status_input not in ('trialing','active','past_due','cancelled') or length(trim(note_input))<5 or length(note_input)>2000 then raise exception 'Оберіть тариф, статус та вкажіть причину зміни';end if;
 if status_input in ('active','trialing') and (end_input is null or end_input<=now() or end_input>now()+interval '2 years') then raise exception 'Вкажіть майбутню дату завершення, не більше двох років';end if;
 perform 1 from tenants where id=studio for update;
 select to_jsonb(s) into prior from subscriptions s where tenant_id=studio for update;
 if prior is null then raise exception 'Підписку не знайдено';end if;
 update subscriptions set plan=plan_input,status=status_input,trial_ends_at=case when status_input='trialing' then end_input else trial_ends_at end,current_period_end=case when status_input='active' then end_input else current_period_end end,updated_at=now() where tenant_id=studio;
 insert into audit_logs(tenant_id,actor_id,entity_type,entity_id,action,before_data,after_data) values(studio,auth.uid(),'subscriptions', (prior->>'id')::uuid,'support_adjustment',prior,jsonb_build_object('plan',plan_input,'status',status_input,'end',end_input,'reason',trim(note_input)));
end$$;
notify pgrst,'reload schema';
commit;
