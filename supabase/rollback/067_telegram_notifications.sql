-- Rollback for 067_telegram_notifications.sql: work and shift notifications back to push only (the 056/063 versions), Telegram removed.
begin;
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
create or replace function public.notify_shift_request() returns trigger language plpgsql security definer set search_path=public as $$
declare recipients uuid[];kind_value text;begin
 if new.status='pending' then
  kind_value='shift_requested';select array_agg(user_id) into recipients from tenant_memberships where tenant_id=new.tenant_id and active and role in ('owner','admin');
 else
  kind_value='shift_rejected';select array_agg(user_id) into recipients from staff_profiles where id=new.staff_id and active;
 end if;
 insert into notification_jobs(tenant_id,dedupe_key,channel,kind,payload,recipient_user_id,expires_at)
 select new.tenant_id,'shift:'||new.id||':'||new.status||':'||extract(epoch from new.requested_at)||':'||p.id,'push',kind_value,jsonb_build_object('subscription_id',p.id),p.user_id,now()+interval '1 day' from push_subscriptions p where p.user_id=any(recipients) on conflict(dedupe_key) do nothing;
 return new;
end$$;
drop trigger if exists booking_telegram_notifications on public.appointments;
drop function if exists public.notify_booking_change(),public.enqueue_telegram_reminders(),public.enqueue_staff_telegram(uuid,uuid[],text,text),public.telegram_bind(text,bigint,text),public.telegram_unbind(bigint),public.create_my_telegram_link(),public.my_telegram_linked(),public.unlink_my_telegram();
delete from public.notification_jobs where channel='telegram';
alter table public.notification_jobs drop constraint if exists notification_jobs_channel_check;
alter table public.notification_jobs add constraint notification_jobs_channel_check check(channel in ('email','push'));
drop table if exists public.telegram_link_tokens,public.telegram_chats;
notify pgrst,'reload schema';
commit;
