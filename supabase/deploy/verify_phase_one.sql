-- Read-only deployment checks. No customer details or credentials are returned.
select public.platform_readiness() as phase_one_ready;
select c.relname as table_name,c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('notification_jobs','push_subscriptions','administrator_invitations')
order by c.relname;
-- Expect phase_one_ready=true and exactly three rows with rls_enabled=true.
