begin;
create or replace function public.save_job_evidence(job_input uuid,version_input integer,payload jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare j work_order_jobs;o work_orders;item jsonb;obj storage.objects;mime text;bytes bigint;entry jsonb;
begin
 perform 1 from work_orders where id=(select work_order_id from work_order_jobs where id=job_input) for update;
 select * into j from work_order_jobs where id=job_input for update;
 if j.id is null or not can_access_job(j.id) then raise exception 'Немає доступу';end if;
 select * into o from work_orders where id=j.work_order_id;
 if j.status in ('review','approved') or o.status in ('issued','cancelled') then raise exception 'Матеріали вже передано на перевірку';end if;
 if payload->>'action'='media' and exists(select 1 from jsonb_array_elements(j.attachments) a where a->>'path'=payload->>'path') then return;end if;
 if j.version is distinct from version_input then raise exception 'Дані змінилися. Оновіть картку й повторіть дію';end if;
 if payload->>'action'='remove' then
  if not exists(select 1 from jsonb_array_elements(j.attachments) a where a->>'path'=payload->>'path') then raise exception 'Файл не знайдено';end if;
  update work_order_jobs set attachments=(select coalesce(jsonb_agg(a),'[]') from jsonb_array_elements(j.attachments) a where a->>'path'<>payload->>'path') where id=j.id;
 elsif payload->>'action'='media' then
  if payload->>'phase' is null or payload->>'phase' not in ('before','after') or (jsonb_array_length(j.attachments)>=40 and not payload ? 'replace_path') then raise exception 'Перевірте етап і ліміт: 40 файлів на роботу';end if;
  if split_part(coalesce(payload->>'path',''), '/',1)<>j.tenant_id::text or split_part(payload->>'path','/',2)<>j.id::text or array_length(string_to_array(payload->>'path','/'),1)<>3 then raise exception 'Невірний шлях файлу';end if;
  select * into obj from storage.objects where bucket_id='job-photos' and name=payload->>'path' and owner_id=auth.uid()::text;
  if not found then raise exception 'Спочатку завантажте файл';end if;
  mime=obj.metadata->>'mimetype';bytes=(obj.metadata->>'size')::bigint;
  if mime is null or bytes is null or bytes<=0 or mime not in ('image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime') or bytes>(case when mime like 'image/%' then 8388608 else 52428800 end) then raise exception 'Фото до 8 МБ, відео до 50 МБ';end if;
  entry=jsonb_build_object('path',obj.name,'name',left(coalesce(payload->>'name',''),120),'phase',payload->>'phase','mime',mime,'size',bytes,'created_at',now(),'actor_id',auth.uid(),'staff_id',j.staff_id,'staff_name',(select full_name from staff_profiles where id=j.staff_id),'client_id',o.client_id,'client_name',(select full_name from clients where id=o.client_id),'vehicle',o.vehicle_label,'job_title',j.title);
  if payload ? 'replace_path' then
   if not exists(select 1 from jsonb_array_elements(j.attachments) a where a->>'path'=payload->>'replace_path') then raise exception 'Файл не знайдено';end if;
   update work_order_jobs set attachments=(select coalesce(jsonb_agg(a),'[]') from jsonb_array_elements(j.attachments) a where a->>'path'<>payload->>'replace_path') where id=j.id;
  end if;
  update work_order_jobs set attachments=attachments||jsonb_build_array(entry) where id=j.id;
 elsif payload->>'action'='paint' then
  if jsonb_typeof(payload->'readings') is distinct from 'array' or jsonb_array_length(payload->'readings')>30 or length((payload->'readings')::text)>20000 then raise exception 'Додайте до 30 точок вимірювання';end if;
  for item in select value from jsonb_array_elements(payload->'readings') loop
   if jsonb_typeof(item->'panel') is distinct from 'string' or length(trim(coalesce(item->>'panel','')))=0 or length(item->>'panel')>100 then raise exception 'Вкажіть деталь кузова';end if;
   if (item->>'before' is null and item->>'after' is null) then raise exception 'Вкажіть хоча б один замір';end if;
   if (item->>'before' is not null and (jsonb_typeof(item->'before')<>'number' or (item->>'before')::numeric not between 0 and 5000)) or (item->>'after' is not null and (jsonb_typeof(item->'after')<>'number' or (item->>'after')::numeric not between 0 and 5000)) then raise exception 'Заміри: від 0 до 5000 мкм';end if;
  end loop;
  update work_order_jobs set paint_readings=payload->'readings' where id=j.id;
 else raise exception 'Невідома дія';end if;
 update work_order_jobs set version=version+1,updated_at=now() where id=j.id;
 insert into work_job_events(tenant_id,job_id,actor_id,event,detail) values(j.tenant_id,j.id,auth.uid(),case when payload->>'action'='media' then 'media' when payload->>'action'='remove' then 'media_removed' else 'paint' end,payload);
end $$;
revoke all on function public.save_job_evidence(uuid,integer,jsonb) from public,anon;
grant execute on function public.save_job_evidence(uuid,integer,jsonb) to authenticated;

create or replace function public.clear_resubmitted_reason() returns trigger language plpgsql set search_path=public as $$
begin
 if new.status='review' and old.status<>'review' then new.review_note='';end if;
 return new;
end $$;
drop trigger if exists clear_resubmitted_reason on public.work_order_jobs;
create trigger clear_resubmitted_reason before update on public.work_order_jobs for each row execute function public.clear_resubmitted_reason();
create or replace function public.notify_work_change() returns trigger language plpgsql security definer set search_path=public as $$
declare recipients uuid[];kind_value text;begin
 if tg_op='UPDATE' and new.status=old.status and new.staff_id is not distinct from old.staff_id then return new;end if;
 if new.status='review' then
  kind_value='work_review';select array_agg(user_id) into recipients from tenant_memberships where tenant_id=new.tenant_id and active and role in ('owner','admin');
 elsif new.staff_id is not null and (new.status in ('assigned','approved') or (new.status='waiting' and tg_op='UPDATE' and old.status='review' and nullif(new.review_note,'') is not null)) then
  kind_value=case new.status when 'approved' then 'work_approved' when 'waiting' then 'work_returned' else 'work_assigned' end;
  select array_agg(user_id) into recipients from staff_profiles where id=new.staff_id and active;
 else return new;end if;
 insert into notification_jobs(tenant_id,dedupe_key,channel,kind,payload,recipient_user_id,expires_at)
 select new.tenant_id,'work:'||new.id||':'||new.version||':'||p.id,'push',kind_value,jsonb_build_object('subscription_id',p.id,'job_id',new.id),p.user_id,now()+interval '1 day' from push_subscriptions p where p.user_id=any(recipients) on conflict(dedupe_key) do nothing;
 return new;
end$$;
drop policy if exists "remove own unsubmitted job photos" on storage.objects;
create policy "remove own unsubmitted job photos" on storage.objects for delete to authenticated using(bucket_id='job-photos' and public.can_access_job_photo(name,true) and (owner_id=auth.uid()::text or public.is_tenant_manager(split_part(name,'/',1)::uuid)) and not exists(select 1 from public.work_order_jobs j,jsonb_array_elements(j.attachments) a where a->>'path'=storage.objects.name));
notify pgrst,'reload schema';
commit;
