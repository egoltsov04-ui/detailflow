-- Single-result, read-only RLS review for public and storage relations.
-- Combines RLS flags, policy predicates, and direct API-role table grants.
with relations as (
  select
    n.nspname as schema_name,
    c.relname as relation_name,
    c.relkind as relation_kind,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced,
    c.oid as relation_oid
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'storage')
    and c.relkind in ('r', 'p', 'v', 'm')
), policies as (
  select
    schemaname as schema_name,
    tablename as relation_name,
    string_agg(
      format(
        '%s [%s; roles=%s; using=%s; check=%s]',
        policyname,
        cmd,
        array_to_string(roles, ','),
        coalesce(qual, '-'),
        coalesce(with_check, '-')
      ),
      E'\n' order by policyname
    ) as policy_details
  from pg_policies
  where schemaname in ('public', 'storage')
  group by schemaname, tablename
), table_grants as (
  select
    table_schema as schema_name,
    table_name as relation_name,
    string_agg(grantee || ':' || privilege_type, ', ' order by grantee, privilege_type) as api_grants
  from information_schema.table_privileges
  where table_schema in ('public', 'storage')
    and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
  group by table_schema, table_name
)
select
  r.schema_name,
  r.relation_name,
  r.relation_kind,
  r.rls_enabled,
  r.rls_forced,
  coalesce(p.policy_details, '') as policy_details,
  coalesce(g.api_grants, '') as direct_api_grants,
  array_to_string(array_remove(array[
    case when has_table_privilege('anon', r.relation_oid, 'SELECT') then 'SELECT' end,
    case when has_table_privilege('anon', r.relation_oid, 'INSERT') then 'INSERT' end,
    case when has_table_privilege('anon', r.relation_oid, 'UPDATE') then 'UPDATE' end,
    case when has_table_privilege('anon', r.relation_oid, 'DELETE') then 'DELETE' end
  ], null), ', ') as anon_effective_dml,
  array_to_string(array_remove(array[
    case when has_table_privilege('authenticated', r.relation_oid, 'SELECT') then 'SELECT' end,
    case when has_table_privilege('authenticated', r.relation_oid, 'INSERT') then 'INSERT' end,
    case when has_table_privilege('authenticated', r.relation_oid, 'UPDATE') then 'UPDATE' end,
    case when has_table_privilege('authenticated', r.relation_oid, 'DELETE') then 'DELETE' end
  ], null), ', ') as authenticated_effective_dml
from relations r
left join policies p using (schema_name, relation_name)
left join table_grants g using (schema_name, relation_name)
order by r.schema_name, r.relation_name;
