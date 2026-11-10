-- Rollback of 068: give back the Supabase default table privileges.
begin;
grant truncate, trigger, references on all tables in schema public to anon, authenticated;
alter default privileges for role postgres in schema public grant truncate, trigger, references on tables to anon, authenticated;
do $$begin
 if exists(select 1 from pg_roles where rolname='supabase_admin') then
 execute 'alter default privileges for role supabase_admin in schema public grant truncate, trigger, references on tables to anon, authenticated';
 end if;
exception when insufficient_privilege then raise notice 'default privileges of supabase_admin left as is';
end$$;
commit;
