-- Security audit 2026-11-06: tighten in-studio permissions and extend the audit log.
-- 1. Masters keep read access they need, but only owners/admins change stock, packages, leads, tasks and reminder settings.
-- 2. Base staff rates are no longer readable straight from staff_profiles; get_team_profiles() already hides them without finance access.
-- 3. Only the server (no signed-in user) can mark a studio as internal.
-- 4. Price, stock, sales, receipt, invoice and studio-setting changes are written to audit_logs.
begin;

-- 1. Write access for managers only
drop policy if exists "members access inventory" on public.inventory_items;
drop policy if exists "managers manage inventory" on public.inventory_items;
create policy "managers manage inventory" on public.inventory_items for all
  using (public.is_tenant_manager(tenant_id)) with check (public.is_tenant_manager(tenant_id));

drop policy if exists "members access inventory movements" on public.inventory_movements;
drop policy if exists "managers manage inventory movements" on public.inventory_movements;
create policy "managers manage inventory movements" on public.inventory_movements for all
  using (public.is_tenant_manager(tenant_id)) with check (public.is_tenant_manager(tenant_id));

drop policy if exists "members access service packages" on public.service_packages;
drop policy if exists "members read service packages" on public.service_packages;
drop policy if exists "managers manage service packages" on public.service_packages;
create policy "members read service packages" on public.service_packages for select
  using (public.is_tenant_member(tenant_id));
create policy "managers manage service packages" on public.service_packages for all
  using (public.is_tenant_manager(tenant_id)) with check (public.is_tenant_manager(tenant_id));

drop policy if exists "members access leads" on public.leads;
drop policy if exists "masters read own leads" on public.leads;
drop policy if exists "managers manage leads" on public.leads;
create policy "masters read own leads" on public.leads for select
  using (staff_id is not null and public.is_own_staff_profile(staff_id));
create policy "managers manage leads" on public.leads for all
  using (public.is_tenant_manager(tenant_id)) with check (public.is_tenant_manager(tenant_id));

drop policy if exists "members access tasks" on public.tasks;
drop policy if exists "masters read own tasks" on public.tasks;
drop policy if exists "managers manage tasks" on public.tasks;
create policy "masters read own tasks" on public.tasks for select
  using (staff_id is not null and public.is_own_staff_profile(staff_id));
create policy "managers manage tasks" on public.tasks for all
  using (public.is_tenant_manager(tenant_id)) with check (public.is_tenant_manager(tenant_id));

drop policy if exists "members access settings" on public.reminder_settings;
drop policy if exists "members read settings" on public.reminder_settings;
drop policy if exists "managers manage settings" on public.reminder_settings;
create policy "members read settings" on public.reminder_settings for select
  using (public.is_tenant_member(tenant_id));
create policy "managers manage settings" on public.reminder_settings for all
  using (public.is_tenant_manager(tenant_id)) with check (public.is_tenant_manager(tenant_id));

-- 2. Hide base rates from direct table reads (writes and RPCs are unchanged)
revoke select on public.staff_profiles from anon, authenticated;
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ',' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'staff_profiles'
    and column_name not in ('compensation_percent', 'hourly_rate');
  execute format('grant select (%s) on public.staff_profiles to authenticated', cols);
end$$;

-- 3. is_internal is a platform flag, not a studio setting
create or replace function public.guard_tenant_internal_flag() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_internal is distinct from old.is_internal and auth.uid() is not null then
    raise exception 'Службовий статус студії змінює лише платформа' using errcode = '42501';
  end if;
  return new;
end$$;
revoke all on function public.guard_tenant_internal_flag() from public, anon, authenticated;
drop trigger if exists guard_internal_flag on public.tenants;
create trigger guard_internal_flag before update of is_internal on public.tenants
  for each row execute function public.guard_tenant_internal_flag();

-- 4. Audit log: tenants rows carry their studio in id
create or replace function public.audit_row_change() returns trigger language plpgsql security definer set search_path=public as $$
declare before_row jsonb;after_row jsonb;row_data jsonb;
begin
 if tg_op<>'INSERT' then before_row=to_jsonb(old);end if;
 if tg_op<>'DELETE' then after_row=to_jsonb(new);end if;
 if tg_op='UPDATE' and before_row=after_row then return new;end if;
 row_data=coalesce(after_row,before_row);
 insert into audit_logs(tenant_id,actor_id,entity_type,entity_id,action,before_data,after_data)
 values(coalesce(row_data->>'tenant_id',case when tg_table_name='tenants' then row_data->>'id' end)::uuid,auth.uid(),tg_table_name,coalesce(row_data->>'id',row_data->>'user_id')::uuid,lower(tg_op),before_row,after_row);
 if tg_op='DELETE' then return old;end if;return new;
end$$;

do $$declare tab text;begin
 foreach tab in array array['services','service_packages','inventory_items','inventory_movements','receipts','sales','invoices'] loop
  execute format('drop trigger if exists platform_audit on public.%I',tab);
  execute format('create trigger platform_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()',tab);
 end loop;
end$$;
-- Studio rows: updates only, so deleting a studio is not blocked by its own audit entry.
drop trigger if exists platform_audit on public.tenants;
create trigger platform_audit after update on public.tenants for each row execute function public.audit_row_change();

notify pgrst, 'reload schema';
commit;
