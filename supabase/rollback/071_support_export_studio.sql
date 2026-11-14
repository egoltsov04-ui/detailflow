-- Rollback of 071: remove the studio export.
begin;
drop function if exists public.support_export_studio(uuid);
notify pgrst, 'reload schema';
commit;
