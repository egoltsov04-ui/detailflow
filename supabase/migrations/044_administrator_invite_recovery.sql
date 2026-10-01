begin;
create table if not exists public.administrator_invitations(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references tenants(id) on delete cascade,email text not null unique,full_name text not null,user_id uuid references profiles(id) on delete set null,created_by uuid references profiles(id),created_at timestamptz not null default now(),accepted_at timestamptz);
alter table administrator_invitations enable row level security;
revoke all on administrator_invitations from anon,authenticated;
create or replace function public.reserve_administrator_invitation(studio uuid,owner_input uuid,email_input text,name_input text) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid;inv administrator_invitations;begin
 if not exists(select 1 from tenant_memberships where tenant_id=studio and user_id=owner_input and role='owner' and active) then raise exception 'Потрібні права власника';end if;
 if email_input<>lower(trim(email_input)) or email_input!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(name_input)<2 then raise exception 'Перевірте ім’я та email';end if;
 perform pg_advisory_xact_lock(hashtextextended(email_input,0));
 select id into uid from auth.users where lower(email)=email_input;
 if exists(select 1 from tenant_memberships where user_id=uid and (tenant_id<>studio or role<>'admin')) or exists(select 1 from staff_profiles where user_id=uid) then raise exception 'Email уже має іншу робочу роль';end if;
 select * into inv from administrator_invitations where email=email_input for update;
 if inv.id is not null and inv.tenant_id<>studio then raise exception 'Для цього email уже є запрошення до іншої студії';end if;
 if inv.id is null then insert into administrator_invitations(tenant_id,email,full_name,user_id,created_by) values(studio,email_input,name_input,uid,owner_input) returning * into inv;
 else update administrator_invitations set full_name=name_input,user_id=coalesce(uid,user_id) where id=inv.id returning * into inv;end if;
 return jsonb_build_object('id',inv.id,'user_id',uid);
end$$;
create or replace function public.attach_administrator_invitation(invite_input uuid,user_input uuid) returns void language plpgsql security definer set search_path=public as $$
declare inv administrator_invitations;begin
 select * into inv from administrator_invitations where id=invite_input for update;
 if inv.id is null or not exists(select 1 from auth.users where id=user_input and lower(email)=inv.email) then raise exception 'Запрошення не відповідає акаунту';end if;
 if exists(select 1 from tenant_memberships where user_id=user_input and (tenant_id<>inv.tenant_id or role<>'admin')) or exists(select 1 from staff_profiles where user_id=user_input) then raise exception 'Акаунт має іншу робочу роль';end if;
 insert into tenant_memberships(tenant_id,user_id,role,active,finance_access) values(inv.tenant_id,user_input,'admin',true,false) on conflict(tenant_id,user_id) do nothing;
 update administrator_invitations set user_id=user_input where id=inv.id;
end$$;
revoke all on function public.reserve_administrator_invitation(uuid,uuid,text,text),public.attach_administrator_invitation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_administrator_invitation(uuid,uuid,text,text),public.attach_administrator_invitation(uuid,uuid) to service_role;
do $$begin if to_regprocedure('public.resolve_my_access_before_invite_recovery()') is null then alter function public.resolve_my_access() rename to resolve_my_access_before_invite_recovery;end if;end$$;
revoke all on function public.resolve_my_access_before_invite_recovery() from public,anon,authenticated;
create or replace function public.resolve_my_access() returns jsonb language plpgsql security definer set search_path=public as $$
declare inv uuid;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select i.id into inv from administrator_invitations i join auth.users u on lower(u.email)=i.email where u.id=auth.uid() and u.email_confirmed_at is not null and i.accepted_at is null;
 if inv is not null then perform attach_administrator_invitation(inv,auth.uid());update administrator_invitations set accepted_at=now() where id=inv;end if;
 return resolve_my_access_before_invite_recovery();
end$$;
revoke all on function public.resolve_my_access() from public,anon;
grant execute on function public.resolve_my_access() to authenticated;
create or replace function public.platform_readiness() returns boolean language sql stable security definer set search_path=public as $$
 select to_regprocedure('public.create_manual_booking(uuid,uuid,jsonb)') is not null
 and to_regprocedure('public.get_studio_orders(uuid)') is not null
 and to_regprocedure('public.apply_subscription_payment(text,numeric,text,text)') is not null
 and to_regprocedure('public.staff_calendar(uuid,date,date)') is not null
 and to_regprocedure('public.studio_setup(uuid,jsonb,boolean)') is not null
 and to_regprocedure('public.register_push_subscription(uuid,text,jsonb,text)') is not null
 and to_regclass('public.notification_jobs') is not null
 and to_regclass('public.administrator_invitations') is not null
 and to_regclass('public.order_receipts') is not null
 and exists(select 1 from pg_trigger where tgname='platform_audit' and tgrelid='public.tenant_memberships'::regclass);
$$;
revoke all on function public.platform_readiness() from public,anon,authenticated;
grant execute on function public.platform_readiness() to service_role;
notify pgrst,'reload schema';
commit;
