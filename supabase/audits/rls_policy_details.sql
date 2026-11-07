-- Read-only follow-up to rls_inventory.sql. Reports policy expressions and
-- direct table grants for API roles; it does not modify database state.

-- 1. RLS policy rules, including the actual tenant predicates.
select
  schemaname as schema_name,
  tablename as relation_name,
  policyname,
  roles,
  cmd,
  qual as using_expression,
  with_check as check_expression
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- 2. Direct table privileges granted to client/server API roles.
select
  table_schema as schema_name,
  table_name as relation_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema in ('public', 'storage')
  and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
order by table_schema, table_name, grantee, privilege_type;

-- 3. SECURITY DEFINER functions and whether API roles can execute them.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by p.proname, arguments;
