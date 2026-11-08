begin;
-- Telegram notifications through the bot. Staff link their account from the app with a one-time link (15 minutes).
-- A client subscribes to one online booking from the success screen. The bot only notifies; nothing is changed through it.
create table if not exists public.telegram_chats(
 id uuid primary key default gen_random_uuid(),
 chat_id bigint not null,
 user_id uuid unique references profiles(id) on delete cascade,
 appointment_id uuid unique references appointments(id) on delete cascade,
 locale text not null default 'uk' check(locale in ('uk','en')),
 created_at timestamptz not null default now(),
 check(num_nonnulls(user_id,appointment_id)=1));
create index if not exists telegram_chats_chat on public.telegram_chats(chat_id);
create table if not exists public.telegram_link_tokens(
 token text primary key check(token ~ '^[a-f0-9]{32}$'),
 user_id uuid unique references profiles(id) on delete cascade,
 appointment_id uuid unique references appointments(id) on delete cascade,
 expires_at timestamptz not null,
 check(num_nonnulls(user_id,appointment_id)=1));
alter table public.telegram_chats enable row level security;
alter table public.telegram_link_tokens enable row level security;
revoke all on public.telegram_chats,public.telegram_link_tokens from anon,authenticated;
grant select,insert,update,delete on public.telegram_chats,public.telegram_link_tokens to service_role;

alter table public.notification_jobs drop constraint if exists notification_jobs_channel_check;
alter table public.notification_jobs add constraint notification_jobs_channel_check check(channel in ('email','push','telegram'));

-- Staff: a one-time link from the app, the linked state and unlinking.
create or replace function public.create_my_telegram_link() returns text language plpgsql security definer set search_path=public as $$
declare token_value text:=replace(gen_random_uuid()::text,'-','');begin
 if auth.uid() is null or not exists(select 1 from tenant_memberships where user_id=auth.uid() and active and role in ('owner','admin','master')) then raise exception 'Потрібен активний акаунт студії';end if;
 insert into telegram_link_tokens(token,user_id,expires_at) values(token_value,auth.uid(),now()+interval '15 minutes')
 on conflict(user_id) do update set token=excluded.token,expires_at=excluded.expires_at;
 return token_value;
end$$;
create or replace function public.my_telegram_linked() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from telegram_chats where user_id=auth.uid())$$;
create or replace function public.unlink_my_telegram() returns void language sql security definer set search_path=public as $$delete from telegram_chats where user_id=auth.uid()$$;

-- Webhook (service role): /start <token> links the chat, /stop or a blocked bot removes every link of the chat.
create or replace function public.telegram_bind(token_input text,chat_input bigint,locale_input text default 'uk') returns jsonb language plpgsql security definer set search_path=public as $$
declare t telegram_link_tokens;studio text;loc text:=case when locale_input='en' then 'en' else 'uk' end;begin
 delete from telegram_link_tokens where token=token_input returning * into t;
 if t.token is null or t.expires_at<=now() then return jsonb_build_object('status','invalid');end if;
 if t.user_id is not null then
  insert into telegram_chats(chat_id,user_id,locale) values(chat_input,t.user_id,loc) on conflict(user_id) do update set chat_id=excluded.chat_id,locale=excluded.locale,created_at=now();
  return jsonb_build_object('status','staff');
 end if;
 insert into telegram_chats(chat_id,appointment_id,locale) values(chat_input,t.appointment_id,loc) on conflict(appointment_id) do update set chat_id=excluded.chat_id,locale=excluded.locale,created_at=now();
 select tn.name into studio from appointments a join tenants tn on tn.id=a.tenant_id where a.id=t.appointment_id;
 return jsonb_build_object('status','client','studio',studio);
end$$;
create or replace function public.telegram_unbind(chat_input bigint) returns integer language plpgsql security definer set search_path=public as $$
declare n integer;begin delete from telegram_chats where chat_id=chat_input;get diagnostics n=row_count;return n;end$$;

-- Staff jobs carry no chat id: the delivery looks the chat up, so unlinking stops what is already queued.
create or replace function public.enqueue_staff_telegram(studio uuid,recipients uuid[],kind_value text,key_value text) returns void language sql security definer set search_path=public as $$
 insert into notification_jobs(tenant_id,dedupe_key,channel,kind,payload,recipient_user_id,expires_at)
 select studio,'tg:'||key_value||':'||c.user_id,'telegram',kind_value,'{}'::jsonb,c.user_id,now()+interval '1 day' from telegram_chats c where c.user_id=any(recipients)
 on conflict(dedupe_key) do nothing$$;

-- Same as 056, plus the Telegram copy.
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
 perform enqueue_staff_telegram(new.tenant_id,recipients,kind_value,'work:'||new.id||':'||new.version);
 return new;
end$$;

-- Same as 063, plus the Telegram copy.
create or replace function public.notify_shift_request() returns trigger language plpgsql security definer set search_path=public as $$
declare recipients uuid[];kind_value text;begin
 if new.status='pending' then
  kind_value='shift_requested';select array_agg(user_id) into recipients from tenant_memberships where tenant_id=new.tenant_id and active and role in ('owner','admin');
 else
  kind_value='shift_rejected';select array_agg(user_id) into recipients from staff_profiles where id=new.staff_id and active;
 end if;
 insert into notification_jobs(tenant_id,dedupe_key,channel,kind,payload,recipient_user_id,expires_at)
 select new.tenant_id,'shift:'||new.id||':'||new.status||':'||extract(epoch from new.requested_at)||':'||p.id,'push',kind_value,jsonb_build_object('subscription_id',p.id),p.user_id,now()+interval '1 day' from push_subscriptions p where p.user_id=any(recipients) on conflict(dedupe_key) do nothing;
 perform enqueue_staff_telegram(new.tenant_id,recipients,kind_value,'shift:'||new.id||':'||new.status||':'||extract(epoch from new.requested_at));
 return new;
end$$;

-- New online request: owners and admins. Confirmed or cancelled request: the client who subscribed to it.
create or replace function public.notify_booking_change() returns trigger language plpgsql security definer set search_path=public as $$
declare recipients uuid[];begin
 if tg_op='INSERT' then
  if new.source='public' and new.status='pending' then
   select array_agg(user_id) into recipients from tenant_memberships where tenant_id=new.tenant_id and active and role in ('owner','admin');
   perform enqueue_staff_telegram(new.tenant_id,recipients,'booking_request','booking:'||new.id);
  end if;
 elsif old.status='pending' and new.status in ('confirmed','cancelled') then
  insert into notification_jobs(tenant_id,dedupe_key,channel,kind,payload,expires_at)
  select new.tenant_id,'tg:booking:'||new.id||':'||new.status,'telegram','booking_'||new.status,jsonb_build_object('appointment_id',new.id),now()+interval '1 day'
  from telegram_chats c where c.appointment_id=new.id on conflict(dedupe_key) do nothing;
 end if;
 return new;
end$$;
drop trigger if exists booking_telegram_notifications on public.appointments;
create trigger booking_telegram_notifications after insert or update of status on public.appointments for each row execute function public.notify_booking_change();

-- Called by /api/send-reminders: reminders 24 and 2 hours before a confirmed visit, by the studio's reminder settings.
-- Client links end a day after the visit; unused link tokens are removed once expired.
create or replace function public.enqueue_telegram_reminders() returns void language plpgsql security definer set search_path=public as $$begin
 delete from telegram_chats c using appointments a where a.id=c.appointment_id and a.starts_at<now()-interval '1 day';
 delete from telegram_link_tokens where expires_at<now();
 insert into notification_jobs(tenant_id,dedupe_key,channel,kind,payload,next_attempt_at,expires_at)
 select a.tenant_id,'tg:visit:'||a.id||':'||h.hours||':'||a.starts_at::text,'telegram','visit_'||h.hours,jsonb_build_object('appointment_id',a.id,'starts_at',a.starts_at),a.starts_at-make_interval(hours=>h.hours),a.starts_at-case when h.hours=24 then interval '2 hours' else interval '15 minutes' end
 from telegram_chats c join appointments a on a.id=c.appointment_id join reminder_settings r on r.tenant_id=a.tenant_id cross join(values(24),(2))h(hours)
 where a.status='confirmed' and ((h.hours=24 and r.reminder_24h_enabled) or (h.hours=2 and r.reminder_2h_enabled))
 and a.starts_at-make_interval(hours=>h.hours)<=now() and a.starts_at-case when h.hours=24 then interval '2 hours' else interval '15 minutes' end>now()
 on conflict(dedupe_key) do nothing;
end$$;

revoke all on function public.create_my_telegram_link(),public.my_telegram_linked(),public.unlink_my_telegram() from public,anon;
grant execute on function public.create_my_telegram_link(),public.my_telegram_linked(),public.unlink_my_telegram() to authenticated,service_role;
revoke all on function public.telegram_bind(text,bigint,text),public.telegram_unbind(bigint),public.enqueue_staff_telegram(uuid,uuid[],text,text),public.enqueue_telegram_reminders(),public.notify_booking_change(),public.notify_work_change(),public.notify_shift_request() from public,anon,authenticated;
grant execute on function public.telegram_bind(text,bigint,text),public.telegram_unbind(bigint),public.enqueue_telegram_reminders() to service_role;
notify pgrst,'reload schema';
commit;
