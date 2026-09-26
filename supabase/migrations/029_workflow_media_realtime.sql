begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('job-photos','job-photos',false,8388608,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create function public.can_access_job_photo(path text,editing boolean default false) returns boolean language plpgsql stable security definer set search_path=public as $$
declare j work_order_jobs; parts text[]:=string_to_array(path,'/');
begin
 if array_length(parts,1)<>3 then return false; end if;
 select * into j from work_order_jobs where id=parts[2]::uuid and tenant_id=parts[1]::uuid;
 return j.id is not null and can_access_job(j.id) and (not editing or (j.status not in ('approved','review') and not exists(select 1 from work_orders where id=j.work_order_id and status in ('issued','cancelled'))));
exception when invalid_text_representation then return false;
end $$;
create policy "read job photos" on storage.objects for select to authenticated using(bucket_id='job-photos' and public.can_access_job_photo(name));
create policy "upload job photos" on storage.objects for insert to authenticated with check(bucket_id='job-photos' and public.can_access_job_photo(name,true));
create policy "remove own unsubmitted job photos" on storage.objects for delete to authenticated using(bucket_id='job-photos' and owner_id=auth.uid()::text and public.can_access_job_photo(name,true) and not exists(select 1 from public.work_order_jobs j,jsonb_array_elements(j.attachments) a where a->>'path'=storage.objects.name));
do $$ declare t text; begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
 foreach t in array array['work_order_jobs','work_job_events','staff_shifts','staff_earnings','staff_payouts','work_orders'] loop
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
 end loop;
 end if;
end $$;
commit;
