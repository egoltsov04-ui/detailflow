-- anon and authenticated keep only what PostgREST uses (select, insert, update, delete, limited by RLS).
-- TRUNCATE skips RLS, TRIGGER and REFERENCES are never needed by app users: take them away, also for future tables.
begin;
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke truncate, trigger, references on tables from anon, authenticated;
do $$begin
 if exists(select 1 from pg_roles where rolname='supabase_admin') then
 execute 'alter default privileges for role supabase_admin in schema public revoke truncate, trigger, references on tables from anon, authenticated';
 end if;
exception when insufficient_privilege then raise notice 'default privileges of supabase_admin left as is';
end$$;
commit;
