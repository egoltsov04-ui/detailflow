begin;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. These
-- callable helpers either expose membership booleans or perform authenticated
-- invitation/workflow operations, so anonymous clients must not invoke them.
revoke all on function public.is_own_staff_profile(uuid) from public, anon;
revoke all on function public.is_tenant_member(uuid) from public, anon;
revoke all on function public.is_tenant_manager(uuid) from public, anon;
revoke all on function public.claim_staff_invite(text) from public, anon;
revoke all on function public.approve_work_order(uuid, text) from public, anon;

-- Preserve the intended application and trusted server access.
grant execute on function public.is_own_staff_profile(uuid),
  public.is_tenant_member(uuid),
  public.is_tenant_manager(uuid)
  to authenticated, service_role;
grant execute on function public.claim_staff_invite(text)
  to authenticated, service_role;
grant execute on function public.approve_work_order(uuid, text)
  to authenticated, service_role;

commit;
