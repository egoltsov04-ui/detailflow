begin;
alter table public.work_order_jobs add column if not exists paint_readings jsonb not null default '[]';
update storage.buckets set file_size_limit=52428800,allowed_mime_types=array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'] where id='job-photos';

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
 if payload->>'action'='media' then
  if payload->>'phase' is null or payload->>'phase' not in ('before','after') or jsonb_array_length(j.attachments)>=40 then raise exception 'Перевірте етап і ліміт: 40 файлів на роботу';end if;
  if split_part(coalesce(payload->>'path',''), '/',1)<>j.tenant_id::text or split_part(payload->>'path','/',2)<>j.id::text or array_length(string_to_array(payload->>'path','/'),1)<>3 then raise exception 'Невірний шлях файлу';end if;
  select * into obj from storage.objects where bucket_id='job-photos' and name=payload->>'path' and owner_id=auth.uid()::text;
  if not found then raise exception 'Спочатку завантажте файл';end if;
  mime=obj.metadata->>'mimetype';bytes=(obj.metadata->>'size')::bigint;
  if mime is null or bytes is null or bytes<=0 or mime not in ('image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime') or bytes>(case when mime like 'image/%' then 8388608 else 52428800 end) then raise exception 'Фото до 8 МБ, відео до 50 МБ';end if;
  entry=jsonb_build_object('path',obj.name,'name',left(coalesce(payload->>'name',''),120),'phase',payload->>'phase','mime',mime,'size',bytes,'created_at',now(),'actor_id',auth.uid(),'staff_id',j.staff_id,'staff_name',(select full_name from staff_profiles where id=j.staff_id),'client_id',o.client_id,'client_name',(select full_name from clients where id=o.client_id),'vehicle',o.vehicle_label,'job_title',j.title);
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
 insert into work_job_events(tenant_id,job_id,actor_id,event,detail) values(j.tenant_id,j.id,auth.uid(),case when payload->>'action'='media' then 'media' else 'paint' end,payload);
end $$;
revoke all on function public.save_job_evidence(uuid,integer,jsonb) from public,anon;
grant execute on function public.save_job_evidence(uuid,integer,jsonb) to authenticated;

create or replace function public.job_media_archive(studio uuid,query_input text default '',phase_input text default '',kind_input text default '',offset_input integer default 0)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not is_tenant_manager(studio) then raise exception 'Немає доступу';end if;
 return coalesce((select jsonb_agg(row_data) from (
  select jsonb_build_object('job_id',j.id,'order_id',o.id,'title',coalesce(a->>'job_title',j.title),'vehicle',coalesce(a->>'vehicle',o.vehicle_label),'client',coalesce(a->>'client_name',c.full_name),'staff',coalesce(a->>'staff_name',s.full_name),'media',a,'readings',j.paint_readings) row_data
  from work_order_jobs j join work_orders o on o.id=j.work_order_id and o.tenant_id=j.tenant_id
  left join clients c on c.id=o.client_id left join staff_profiles s on s.id=j.staff_id
  cross join lateral jsonb_array_elements(j.attachments) a
  where j.tenant_id=studio and (phase_input='' or coalesce(a->>'phase','legacy')=phase_input)
   and (kind_input='' or case when coalesce(a->>'mime','image/jpeg') like 'video/%' then 'video' else 'image' end=kind_input)
   and (coalesce(query_input,'')='' or concat_ws(' ',o.id::text,coalesce(a->>'job_title',j.title),coalesce(a->>'vehicle',o.vehicle_label),coalesce(a->>'client_name',c.full_name),coalesce(a->>'staff_name',s.full_name)) ilike '%'||left(query_input,200)||'%')
  order by coalesce(a->>'created_at',j.created_at::text) desc,j.id,a->>'path' limit 51 offset greatest(0,offset_input)
 ) rows),'[]');
end $$;
revoke all on function public.job_media_archive(uuid,text,text,text,integer) from public,anon;
grant execute on function public.job_media_archive(uuid,text,text,text,integer) to authenticated;

create or replace function public.protect_job_evidence() returns trigger language plpgsql set search_path=public as $$
begin
 if jsonb_array_length(old.attachments)>0 or jsonb_array_length(old.paint_readings)>0 then raise exception 'Робота має збережені матеріали. Збережіть її в історії';end if;
 return old;
end $$;
drop trigger if exists protect_job_evidence on public.work_order_jobs;
create trigger protect_job_evidence before delete on public.work_order_jobs for each row execute function public.protect_job_evidence();
commit;
