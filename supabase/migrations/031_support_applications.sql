-- Service accounts are provisioned by the database administrator, never by signup metadata.
begin;
alter table public.studio_access_requests add column if not exists tenant_id uuid references public.tenants(id);
alter table public.studio_access_requests add column if not exists review_note text;
alter table public.studio_access_requests add column if not exists reviewed_by uuid references public.profiles(id);

create or replace function public.is_support_user() returns boolean
language sql stable security definer set search_path=public as $$
 select auth.uid() is not null and exists(select 1 from public.tenant_memberships where user_id=auth.uid() and role='super_admin');
$$;
revoke all on function public.is_support_user() from public,anon;
grant execute on function public.is_support_user() to authenticated;

create or replace function public.protect_support_membership() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is not null then
  if (tg_op<>'DELETE' and new.role='super_admin') or (tg_op<>'INSERT' and old.role='super_admin') then
   raise exception 'Службові права змінює лише адміністратор бази';
  end if;
 end if;
 if tg_op='DELETE' then return old; end if; return new;
end;
$$;
drop trigger if exists protect_support_membership on public.tenant_memberships;
create trigger protect_support_membership before insert or update or delete on public.tenant_memberships
for each row execute function public.protect_support_membership();

-- Studio creation now requires a reviewed application.
revoke all on function public.bootstrap_tenant(text,text,text) from public,anon,authenticated;

create or replace function public.support_list_applications()
returns table(id uuid,full_name text,email text,email_confirmed boolean,studio_name text,phone text,messenger text,contact text,status text,created_at timestamptz,review_note text)
language plpgsql security definer set search_path=public as $$
begin
 if not public.is_support_user() then raise exception 'Потрібні права підтримки'; end if;
 return query select r.id,p.full_name,u.email::text,u.email_confirmed_at is not null,r.studio_name,r.phone,r.messenger,r.contact,r.status,r.created_at,r.review_note
 from public.studio_access_requests r join public.profiles p on p.id=r.user_id join auth.users u on u.id=r.user_id
 order by (r.status='pending') desc,r.created_at desc;
end;
$$;

create or replace function public.support_review_application(request_id uuid,approve boolean,note text default '') returns uuid
language plpgsql security definer set search_path=public as $$
declare application public.studio_access_requests; studio_id uuid; owner_email text;
begin
 if not public.is_support_user() then raise exception 'Потрібні права підтримки'; end if;
 select * into application from public.studio_access_requests where id=request_id for update;
 if application.id is null then raise exception 'Заявку не знайдено'; end if;
 if application.status='approved' and approve then return application.tenant_id; end if;
 if application.status<>'pending' then raise exception 'Заявку вже розглянуто'; end if;
 if not approve then
  if length(trim(note))=0 then raise exception 'Вкажіть причину відмови'; end if;
  update public.studio_access_requests set status='rejected',review_note=left(trim(note),2000),reviewed_by=auth.uid(),reviewed_at=now() where id=request_id;
  return null;
 end if;
 select email into owner_email from auth.users where id=application.user_id and email_confirmed_at is not null;
 if owner_email is null then raise exception 'Власник ще не підтвердив email'; end if;
 if exists(select 1 from public.tenant_memberships where user_id=application.user_id) then raise exception 'Акаунт уже має робочий профіль. Перевірте його перед активацією'; end if;
 studio_id=gen_random_uuid();
 insert into public.tenants(id,name,slug,phone,email) values(studio_id,application.studio_name,'studio-'||replace(studio_id::text,'-',''),application.phone,owner_email);
 insert into public.tenant_memberships(tenant_id,user_id,role) values(studio_id,application.user_id,'owner');
 insert into public.reminder_settings(tenant_id) values(studio_id);
 insert into public.subscriptions(tenant_id,plan,status,trial_ends_at) values(studio_id,'start','trialing',now()+interval '14 days');
 update public.studio_access_requests set status='approved',tenant_id=studio_id,reviewed_by=auth.uid(),review_note=left(trim(note),2000),reviewed_at=now() where id=request_id;
 return studio_id;
end;
$$;
revoke all on function public.support_list_applications() from public,anon;
revoke all on function public.support_review_application(uuid,boolean,text) from public,anon;
grant execute on function public.support_list_applications() to authenticated;
grant execute on function public.support_review_application(uuid,boolean,text) to authenticated;
notify pgrst,'reload schema';
commit;
