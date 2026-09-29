begin;
-- Audit snapshots may contain salary and client data. Team-wide read access is unsafe.
drop policy if exists "members read audit logs" on public.audit_logs;
drop policy if exists "owner reads audit logs" on public.audit_logs;
create policy "owner reads audit logs" on public.audit_logs for select using(is_tenant_owner(tenant_id));
revoke insert,update,delete on public.audit_logs from authenticated,anon;
create index if not exists audit_logs_tenant_created on public.audit_logs(tenant_id,created_at desc);
create or replace function public.audit_row_change() returns trigger language plpgsql security definer set search_path=public as $$
declare before_row jsonb;after_row jsonb;row_data jsonb;
begin
 if tg_op<>'INSERT' then before_row=to_jsonb(old);end if;
 if tg_op<>'DELETE' then after_row=to_jsonb(new);end if;
 if tg_op='UPDATE' and before_row=after_row then return new;end if;
 row_data=coalesce(after_row,before_row);
 insert into audit_logs(tenant_id,actor_id,entity_type,entity_id,action,before_data,after_data)
 values((row_data->>'tenant_id')::uuid,auth.uid(),tg_table_name,coalesce(row_data->>'id',row_data->>'user_id')::uuid,lower(tg_op),before_row,after_row);
 if tg_op='DELETE' then return old;end if;return new;
end$$;
do $$declare tab text;begin
 foreach tab in array array['clients','vehicles','staff_profiles','tenant_memberships','subscriptions','cash_transactions','staff_earnings','staff_payouts','order_receipts','order_payments','work_orders'] loop
  execute format('drop trigger if exists platform_audit on public.%I',tab);
  execute format('create trigger platform_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()',tab);
 end loop;
end$$;
-- Directly created orders are subject to the same subscription term as calendar bookings.
drop trigger if exists subscription_capacity on public.work_orders;
create trigger subscription_capacity before insert on public.work_orders for each row execute function public.guard_subscription_capacity();
create or replace function public.platform_readiness() returns boolean language sql stable security definer set search_path=public as $$
 select to_regprocedure('public.create_manual_booking(uuid,uuid,jsonb)') is not null
 and to_regprocedure('public.get_studio_orders(uuid)') is not null
 and to_regprocedure('public.apply_subscription_payment(text,numeric,text,text)') is not null
 and to_regclass('public.order_receipts') is not null
 and exists(select 1 from pg_trigger where tgname='platform_audit' and tgrelid='public.tenant_memberships'::regclass);
$$;
revoke all on function public.platform_readiness() from public,anon,authenticated;
grant execute on function public.platform_readiness() to service_role;
notify pgrst,'reload schema';
commit;
