-- Rollback of 069: remove the server-side 8 MB photo limit.
begin;
drop trigger if exists job_photo_size_limit on storage.objects;
drop function if exists public.guard_job_photo_size();
commit;
