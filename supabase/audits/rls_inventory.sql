-- Read-only RLS inventory. Run against staging first, then production with a
-- read-only database role. This reports configuration; it does not prove that
-- policies enforce the intended tenant isolation.
select
  n.nspname as schema_name,
  c.relname as relation_name,
  c.relkind as relation_kind,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  coalesce(string_agg(p.policyname || ':' || p.cmd, ', ' order by p.policyname), '') as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname in ('public', 'storage')
  and c.relkind in ('r', 'p', 'v', 'm')
group by n.nspname, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity
order by n.nspname, c.relname;
