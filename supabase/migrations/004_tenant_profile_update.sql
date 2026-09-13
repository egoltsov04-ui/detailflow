create policy "managers update tenant"
on public.tenants
for update
using (public.is_tenant_manager(id))
with check (public.is_tenant_manager(id));
