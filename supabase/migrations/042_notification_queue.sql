begin;
alter table public.clients add column if not exists followup_enabled boolean not null default false;
alter table public.clients add column if not exists unsubscribe_token uuid not null default gen_random_uuid();
alter table public.reminder_settings add column if not exists repeat_enabled boolean not null default false;
create table if not exists public.notification_jobs(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references tenants(id) on delete cascade,
 dedupe_key text not null unique,channel text not null check(channel in ('email','push')),kind text not null,payload jsonb not null default '{}',
 recipient_user_id uuid references profiles(id) on delete cascade,status text not null default 'queued' check(status in ('queued','sending','sent','failed','uncertain','cancelled')),
 attempts integer not null default 0,next_attempt_at timestamptz not null default now(),expires_at timestamptz not null,
 claim_token uuid,locked_until timestamptz,last_error text,provider_id text,created_at timestamptz not null default now(),sent_at timestamptz);
alter table notification_jobs enable row level security;
drop policy if exists "manager reads delivery log" on notification_jobs;
create policy "manager reads delivery log" on notification_jobs for select using(is_tenant_manager(tenant_id));
grant select on notification_jobs to authenticated;
revoke insert,update,delete on notification_jobs from authenticated,anon;
create index if not exists notification_jobs_due on notification_jobs(next_attempt_at) where status in ('queued','failed');
create or replace function public.enqueue_client_reminders() returns void language plpgsql security definer set search_path=public as $$begin
 insert into notification_jobs(tenant_id,dedupe_key,channel,kind,payload,next_attempt_at,expires_at)
 select a.tenant_id,'visit:'||a.id||':'||h.hours||':'||a.starts_at::text,'email','visit_'||h.hours,jsonb_build_object('appointment_id',a.id,'starts_at',a.starts_at),a.starts_at-make_interval(hours=>h.hours),a.starts_at-case when h.hours=24 then interval '2 hours' else interval '15 minutes' end
 from appointments a join reminder_settings r on r.tenant_id=a.tenant_id cross join(values(24),(2))h(hours)
 where a.status='confirmed' and r.email_enabled and ((h.hours=24 and r.reminder_24h_enabled) or (h.hours=2 and r.reminder_2h_enabled))
 and a.starts_at-make_interval(hours=>h.hours)<=now() and a.starts_at-case when h.hours=24 then interval '2 hours' else interval '15 minutes' end>now()
 and not exists(select 1 from reminders old where old.appointment_id=a.id and old.channel='email' and old.scheduled_for=a.starts_at-make_interval(hours=>h.hours) and old.sent_at is not null)
 on conflict(dedupe_key) do nothing;
 insert into notification_jobs(tenant_id,dedupe_key,channel,kind,payload,next_attempt_at,expires_at)
 select a.tenant_id,'return:'||a.id||':'||s.id||':'||s.repeat_interval_months,'email','return_visit',jsonb_build_object('appointment_id',a.id,'service_id',s.id,'interval_months',s.repeat_interval_months),a.ends_at+make_interval(months=>s.repeat_interval_months),a.ends_at+make_interval(months=>s.repeat_interval_months)+interval '7 days'
 from appointments a join appointment_services x on x.appointment_id=a.id join services s on s.id=x.service_id join clients c on c.id=a.client_id join reminder_settings r on r.tenant_id=a.tenant_id
 where a.status='completed' and c.followup_enabled and c.email is not null and r.email_enabled and r.repeat_enabled and s.active and s.repeat_interval_months between 1 and 60
 and a.ends_at+make_interval(months=>s.repeat_interval_months) between now()-interval '7 days' and now()
 and not exists(select 1 from appointments newer join appointment_services nx on nx.appointment_id=newer.id where newer.tenant_id=a.tenant_id and newer.client_id=a.client_id and nx.service_id=s.id and newer.starts_at>a.starts_at and newer.status not in ('cancelled','no_show'))
 on conflict(dedupe_key) do nothing;
end$$;
create or replace function public.claim_notifications(channel_input text,limit_input integer default 5) returns setof notification_jobs language plpgsql security definer set search_path=public as $$begin
 update notification_jobs set status='uncertain',last_error='Delivery interrupted; verify provider before retry',claim_token=null where status='sending' and locked_until<now();
 update notification_jobs set status='cancelled',last_error='Notification expired' where status in ('queued','failed') and expires_at<=now();
 return query with candidates as(select id from notification_jobs where channel=channel_input and status in ('queued','failed') and attempts<5 and next_attempt_at<=now() and expires_at>now() order by next_attempt_at,id for update skip locked limit greatest(1,least(limit_input,20)))
 update notification_jobs j set status='sending',attempts=j.attempts+1,claim_token=gen_random_uuid(),locked_until=now()+interval '5 minutes' from candidates c where j.id=c.id returning j.*;
end$$;
create or replace function public.finish_notification(job_input uuid,token_input uuid,status_input text,error_input text default null,provider_input text default null) returns boolean language plpgsql security definer set search_path=public as $$begin
 if status_input not in ('sent','failed','uncertain','cancelled') then raise exception 'Invalid delivery status';end if;
 update notification_jobs set status=status_input,last_error=left(error_input,400),provider_id=left(provider_input,200),sent_at=case when status_input='sent' then now() else null end,next_attempt_at=now()+make_interval(mins=>least(120,5*power(2,attempts-1)::int)),claim_token=null,locked_until=null where id=job_input and claim_token=token_input and status='sending';
 return found;
end$$;
create or replace function public.retry_notification(job_input uuid) returns void language plpgsql security definer set search_path=public as $$begin
 update notification_jobs set status='queued',next_attempt_at=now(),attempts=0,last_error=null where id=job_input and is_tenant_owner(tenant_id) and status in ('failed','uncertain') and expires_at>now();
 if not found then raise exception 'Повтор недоступний: перевірте права та строк повідомлення';end if;
end$$;
revoke all on function public.enqueue_client_reminders(),public.claim_notifications(text,integer),public.finish_notification(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.enqueue_client_reminders(),public.claim_notifications(text,integer),public.finish_notification(uuid,uuid,text,text,text) to service_role;
revoke all on function public.retry_notification(uuid) from public,anon;
grant execute on function public.retry_notification(uuid) to authenticated;
create or replace function public.save_client_card(studio uuid,client_input uuid,card jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid:=coalesce(client_input,gen_random_uuid());v jsonb;vid uuid;phone_value text;email_value text;
begin
 if not is_tenant_manager(studio) then raise exception 'Немає доступу';end if;
 if length(trim(coalesce(card->>'name','')))<2 or length(card->>'name')>120 or jsonb_typeof(card->'vehicles') is distinct from 'array' or jsonb_array_length(card->'vehicles')>50 then raise exception 'Перевірте ім’я та список авто';end if;
 phone_value=nullif(regexp_replace(coalesce(card->>'phone',''),'[^+0-9]','','g'),'');email_value=nullif(lower(trim(card->>'email')),'');
 if phone_value is not null and length(regexp_replace(phone_value,'[^0-9]','','g')) not between 10 and 15 then raise exception 'Вкажіть телефон із кодом країни';end if;
 if email_value is not null and email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Перевірте email';end if;
 if client_input is not null then
  perform 1 from clients where id=cid and tenant_id=studio for update;if not found then raise exception 'Клієнта не знайдено';end if;
  update clients set full_name=trim(card->>'name'),phone=phone_value,email=email_value,notes=left(coalesce(card->>'notes',''),4000),tags=array(select jsonb_array_elements_text(coalesce(card->'tags','[]'))) where id=cid;
 else
  insert into clients(id,tenant_id,full_name,phone,email,notes,tags) values(cid,studio,trim(card->>'name'),phone_value,email_value,left(coalesce(card->>'notes',''),4000),array(select jsonb_array_elements_text(coalesce(card->'tags','[]'))));
 end if;
 for v in select value from jsonb_array_elements(card->'vehicles') loop
  if length(trim(coalesce(v->>'make','')||coalesce(v->>'model','')||coalesce(v->>'plate','')))=0 then raise exception 'Заповніть марку, модель або номер автомобіля';end if;
  vid=nullif(v->>'id','')::uuid;
  if vid is null then
   insert into vehicles(tenant_id,client_id,make,model,plate_number,year,notes) values(studio,cid,left(v->>'make',80),left(v->>'model',80),left(upper(v->>'plate'),30),nullif(v->>'year','')::smallint,left(coalesce(v->>'notes',''),2000));
  else
   update vehicles set make=left(v->>'make',80),model=left(v->>'model',80),plate_number=left(upper(v->>'plate'),30),year=nullif(v->>'year','')::smallint,notes=left(coalesce(v->>'notes',''),2000) where id=vid and client_id=cid and tenant_id=studio;
   if not found then raise exception 'Автомобіль не належить цьому клієнту';end if;
  end if;
 end loop;
 if card ? 'followupEnabled' then update clients set followup_enabled=coalesce((card->>'followupEnabled')::boolean,false) where id=cid;end if;
 return cid;
end$$;
notify pgrst,'reload schema';
commit;
