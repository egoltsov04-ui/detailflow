begin;
create table if not exists public.push_subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid not null references profiles(id) on delete cascade,endpoint text not null unique,keys jsonb not null,locale text not null default 'uk' check(locale in ('uk','ru','en')),created_at timestamptz not null default now());
alter table push_subscriptions enable row level security;
revoke all on push_subscriptions from anon,authenticated;
grant select,insert,update,delete on push_subscriptions to service_role;
-- Serialize registrations for both the account and endpoint. Never transfer a device
-- to a different account through an upsert race.
create or replace function public.register_push_subscription(user_input uuid,endpoint_input text,keys_input jsonb,locale_input text default 'uk') returns text language plpgsql security definer set search_path=public as $$
declare existing_user uuid;begin
 perform pg_advisory_xact_lock(hashtextextended('push-user:'||user_input,0));
 perform pg_advisory_xact_lock(hashtextextended('push-endpoint:'||endpoint_input,0));
 select user_id into existing_user from push_subscriptions where endpoint=endpoint_input;
 if existing_user is not null and existing_user<>user_input then return 'conflict';end if;
 if existing_user is null and (select count(*) from push_subscriptions where user_id=user_input)>=8 then return 'limit';end if;
 insert into push_subscriptions(user_id,endpoint,keys,locale) values(user_input,endpoint_input,keys_input,locale_input)
 on conflict(endpoint) do update set keys=excluded.keys,locale=excluded.locale where push_subscriptions.user_id=excluded.user_id;
 return 'ok';
end$$;
revoke all on function public.register_push_subscription(uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.register_push_subscription(uuid,text,jsonb,text) to service_role;
create or replace function public.notify_work_change() returns trigger language plpgsql security definer set search_path=public as $$
declare recipients uuid[];kind_value text;begin
 if tg_op='UPDATE' and new.status=old.status and new.staff_id is not distinct from old.staff_id then return new;end if;
 if new.status='review' then
  kind_value='work_review';select array_agg(user_id) into recipients from tenant_memberships where tenant_id=new.tenant_id and active and role in ('owner','admin');
 elsif new.staff_id is not null and new.status in ('assigned','approved','waiting') then
  kind_value=case new.status when 'approved' then 'work_approved' when 'waiting' then 'work_returned' else 'work_assigned' end;
  select array_agg(user_id) into recipients from staff_profiles where id=new.staff_id and active;
 else return new;end if;
 insert into notification_jobs(tenant_id,dedupe_key,channel,kind,payload,recipient_user_id,expires_at)
 select new.tenant_id,'work:'||new.id||':'||new.version||':'||p.id,'push',kind_value,jsonb_build_object('subscription_id',p.id,'job_id',new.id),p.user_id,now()+interval '1 day' from push_subscriptions p where p.user_id=any(recipients) on conflict(dedupe_key) do nothing;
 return new;
end$$;
drop trigger if exists workflow_notifications on public.work_order_jobs;
create trigger workflow_notifications after insert or update on public.work_order_jobs for each row execute function public.notify_work_change();
notify pgrst,'reload schema';
commit;
