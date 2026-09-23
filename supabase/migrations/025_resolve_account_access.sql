-- Resolve roles from trusted database records, including invitations sent before
-- the invitation endpoint started creating memberships. Never trust user metadata.
create or replace function public.resolve_my_access()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare member public.tenant_memberships; staff public.staff_profiles; request_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into member from public.tenant_memberships
    where user_id = auth.uid() and role in ('owner','admin','super_admin')
    order by case when role = 'super_admin' then 0 else 1 end, created_at limit 1;
  if member.user_id is not null then
    return jsonb_build_object('role',member.role,'tenant_id',member.tenant_id);
  end if;
  select * into staff from public.staff_profiles where user_id = auth.uid() for update;
  if staff.id is not null then
    if not staff.active then return jsonb_build_object('role','blocked'); end if;
    insert into public.tenant_memberships (tenant_id,user_id,role)
      values (staff.tenant_id,auth.uid(),'master') on conflict (tenant_id,user_id) do nothing;
    return jsonb_build_object('role','master','tenant_id',staff.tenant_id,
      'needs_password', exists(select 1 from auth.users where id = auth.uid() and coalesce(encrypted_password,'') = ''));
  end if;
  select status into request_status from public.studio_access_requests where user_id = auth.uid();
  if request_status is not null then
    return jsonb_build_object('role','owner_request','status',request_status);
  end if;
  return jsonb_build_object('role','unlinked');
end;
$$;
revoke all on function public.resolve_my_access() from public, anon;
grant execute on function public.resolve_my_access() to authenticated;

-- Repair existing invitations without creating a second studio or changing roles.
insert into public.tenant_memberships (tenant_id,user_id,role)
select tenant_id,user_id,'master' from public.staff_profiles
where user_id is not null and active
on conflict (tenant_id,user_id) do nothing;

-- Masters cannot unblock themselves or change who owns a staff profile.
drop policy if exists "members access staff" on public.staff_profiles;
create policy "managers manage staff" on public.staff_profiles for all
using (public.is_tenant_manager(tenant_id)) with check (public.is_tenant_manager(tenant_id));
create policy "masters read own staff profile" on public.staff_profiles for select
using (user_id = auth.uid() and active);
