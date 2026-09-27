-- Run in Supabase SQL Editor after 031_support_applications.sql.
-- First create/invite the service account in Authentication > Users.
-- Replace the email below with the intended service account.
begin;
do $$
declare support_email text := 'support@example.com'; account_id uuid; service_tenant uuid;
begin
 select id into account_id from auth.users where lower(email)=lower(support_email);
 if account_id is null then raise exception 'Спочатку створіть або запросіть службовий акаунт у Authentication > Users'; end if;
 if exists(select 1 from public.tenant_memberships where user_id=account_id and role='super_admin') then return; end if;
 if exists(select 1 from public.tenant_memberships where user_id=account_id) then raise exception 'Використайте окремий акаунт: цей email уже має роль у студії'; end if;
 if to_regprocedure('public.support_list_applications()') is null then raise exception 'Спочатку встановіть міграцію 031'; end if;
 service_tenant=gen_random_uuid();
 insert into public.tenants(id,name,slug) values(service_tenant,'Detailflow Support','support-'||replace(service_tenant::text,'-',''));
 insert into public.tenant_memberships(tenant_id,user_id,role) values(service_tenant,account_id,'super_admin');
end;
$$;
commit;
