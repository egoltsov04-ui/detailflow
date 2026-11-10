-- Photos in job-photos: at most 8 MB on the server too (the app checks the same; videos keep the bucket limit of 50 MB).
begin;
create or replace function public.guard_job_photo_size() returns trigger language plpgsql security definer set search_path=public,storage as $$
begin
 if new.bucket_id='job-photos' and coalesce(new.metadata->>'mimetype','') like 'image/%'
  and coalesce((new.metadata->>'size')::bigint,0)>8*1024*1024 then
  raise exception 'PHOTO_TOO_LARGE' using errcode='22023';
 end if;
 return new;
end $$;
revoke all on function public.guard_job_photo_size() from public, anon, authenticated;
drop trigger if exists job_photo_size_limit on storage.objects;
create trigger job_photo_size_limit before insert or update of metadata on storage.objects for each row execute function public.guard_job_photo_size();
commit;
