-- Rollback for 062_role_and_audit_hardening.sql. Restores the 061 state. Audit rows already written are kept.
begin;

do $$declare tab text;begin
 foreach tab in array array['services','service_packages','inventory_items','inventory_movements','receipts','sales','invoices','tenants'] loop
  execute format('drop trigger if exists platform_audit on public.%I',tab);
 end loop;
end$$;

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

drop trigger if exists guard_internal_flag on public.tenants;
drop function if exists public.guard_tenant_internal_flag();

grant select on public.staff_profiles to anon, authenticated;

drop policy if exists "managers manage inventory" on public.inventory_items;
create policy "members access inventory" on public.inventory_items for all
  using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

drop policy if exists "managers manage inventory movements" on public.inventory_movements;
create policy "members access inventory movements" on public.inventory_movements for all
  using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

drop policy if exists "members read service packages" on public.service_packages;
drop policy if exists "managers manage service packages" on public.service_packages;
create policy "members access service packages" on public.service_packages for all
  using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

drop policy if exists "masters read own leads" on public.leads;
drop policy if exists "managers manage leads" on public.leads;
create policy "members access leads" on public.leads for all
  using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

drop policy if exists "masters read own tasks" on public.tasks;
drop policy if exists "managers manage tasks" on public.tasks;
create policy "members access tasks" on public.tasks for all
  using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

drop policy if exists "members read settings" on public.reminder_settings;
drop policy if exists "managers manage settings" on public.reminder_settings;
create policy "members access settings" on public.reminder_settings for all
  using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_manager(tenant_id));

notify pgrst, 'reload schema';
commit;
