-- Rollback of 076: support asks for the password before every change again (30-minute session), no UTM marks, no support Telegram.
begin;
drop trigger if exists studio_application_telegram on public.studio_access_requests;
drop function if exists public.notify_support_application();
delete from public.notification_jobs where kind='studio_application';
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  if new.raw_user_meta_data ->> 'requested_role' = 'owner' then
    insert into public.studio_access_requests (user_id, studio_name, phone, messenger, contact, selected_plan, promo_code)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'studio_name', 'Нова студія'), new.raw_user_meta_data ->> 'phone', new.raw_user_meta_data ->> 'messenger', new.raw_user_meta_data ->> 'contact',case when new.raw_user_meta_data->>'selected_plan' in ('solo','studio','pro') then new.raw_user_meta_data->>'selected_plan' else 'studio' end,
      nullif(left(upper(btrim(coalesce(new.raw_user_meta_data->>'promo_code',''))),32),''));
  end if;
  return new;
end;
$$;
create or replace function public.is_support_user() returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(auth.uid() is not null and exists(select 1 from tenant_memberships where user_id=auth.uid() and role='super_admin' and active)
 and nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'aal'='aal2'
 and support_password_at()>now()-interval '30 minutes',false);
$$;
create or replace function public.require_support_write() returns void language plpgsql stable security definer set search_path=public as $$begin
 if not coalesce(is_support_user(),false) then raise exception 'Потрібні права підтримки та двофакторний вхід' using errcode='42501';end if;
 if support_password_at() is null or support_password_at()<=now()-interval '5 minutes' then raise exception 'Підтвердіть пароль повторно' using errcode='42501';end if;
end $$;
create or replace function public.support_delete_studio(studio uuid, confirm_name text) returns jsonb language plpgsql security definer set search_path=public,storage as $$
declare studio_name text; users uuid[]; files text[]; counts jsonb; paid jsonb; remaining text[]; next text[]; item text; done jsonb='{}'; n bigint;
begin
 perform require_support_write();
 select name into studio_name from tenants where id=studio for update;
 if studio_name is null then raise exception 'Студію не знайдено';end if;
 if trim(coalesce(confirm_name,''))<>studio_name then raise exception 'Назва студії не збігається';end if;
 if exists(select 1 from tenant_memberships where tenant_id=studio and role='super_admin') then raise exception 'Службову студію підтримки видалити не можна';end if;
 -- Accounts that belong only to this studio, and its photos: the API removes them after the commit.
 select coalesce(array_agg(distinct m.user_id),'{}') into users from tenant_memberships m where m.tenant_id=studio and m.user_id is not null and not exists(select 1 from tenant_memberships o where o.user_id=m.user_id and o.tenant_id<>studio);
 select coalesce(array_agg(name),'{}') into files from storage.objects where bucket_id='job-photos' and name like studio::text||'/%';
 select coalesce((select jsonb_agg(jsonb_build_object('source','manual','paid_on',p.paid_on,'amount',p.amount,'method',p.method,'months',p.months_added,'period_from',p.period_from,'period_to',p.period_to,'comment',p.comment) order by p.paid_on) from payments p where p.studio_id=studio),'[]')
  ||coalesce((select jsonb_agg(jsonb_build_object('source','wayforpay','paid_at',o.paid_at,'amount',o.amount,'currency',o.currency,'plan',o.plan,'order_reference',o.order_reference) order by o.paid_at) from payment_orders o where o.tenant_id=studio and o.status='approved'),'[]') into paid;
 perform set_config('detailflow.deleting_studio',studio::text,true);
 -- Every table that holds studio rows; children without a studio column go through their foreign keys.
 select array_agg(c.table_name||':'||c.column_name order by c.table_name) into remaining from information_schema.columns c join pg_tables t on t.schemaname='public' and t.tablename=c.table_name
  where c.table_schema='public' and c.column_name in ('tenant_id','studio_id') and c.table_name<>'deleted_studios';
 -- Delete in whatever order the foreign keys allow: a table that is still referenced waits for the next pass.
 loop
  next='{}';
  foreach item in array remaining loop
   begin
    execute format('delete from public.%I where %I=$1',split_part(item,':',1),split_part(item,':',2)) using studio;
    get diagnostics n=row_count; if n>0 then done=done||jsonb_build_object(split_part(item,':',1),n);end if;
   exception when foreign_key_violation or restrict_violation then next=next||item;
   end;
  end loop;
  exit when cardinality(next)=0;
  if cardinality(next)=cardinality(remaining) then raise exception 'Не вдалося видалити дані студії: %',array_to_string(next,', ');end if;
  remaining=next;
 end loop;
 delete from tenants where id=studio;
 insert into deleted_studios(studio_id,studio_name,deleted_by,counts,payments) values(studio,studio_name,auth.uid(),done,paid);
 return jsonb_build_object('name',studio_name,'users',to_jsonb(users),'files',to_jsonb(files),'counts',done);
end $$;
create or replace function public.create_my_telegram_link() returns text language plpgsql security definer set search_path=public as $$
declare token_value text:=replace(gen_random_uuid()::text,'-','');begin
 if auth.uid() is null or not exists(select 1 from tenant_memberships where user_id=auth.uid() and active and role in ('owner','admin','master')) then raise exception 'Потрібен активний акаунт студії';end if;
 insert into telegram_link_tokens(token,user_id,expires_at) values(token_value,auth.uid(),now()+interval '15 minutes')
 on conflict(user_id) do update set token=excluded.token,expires_at=excluded.expires_at;
 return token_value;
end$$;
create or replace function public.support_export_studio(studio uuid) returns json language plpgsql security definer set search_path=public as $$
declare sheets json[]='{}'; item text; rows json; total int=0; n int;
 -- Business data in reading order. Tokens, delivery queues and internal logs are left out.
 tables text[]=array['clients','vehicles','appointments','appointment_services:appointment_id in (select id from appointments where tenant_id=$1)',
  'work_orders','work_order_jobs','work_job_events','order_payments','order_receipts','receipts','invoices','sales','expenses','cash_transactions',
  'services','service_packages','inventory_items','inventory_movements','staff_profiles','staff_services:staff_id in (select id from staff_profiles where tenant_id=$1)',
  'staff_service_compensation','staff_earnings','staff_payouts','staff_shifts','shift_requests','work_schedules','tasks','leads','reminder_settings',
  'studio_posts:studio_id=$1','tenant_memberships','subscriptions','payments:studio_id=$1'];
begin
 perform require_support_write();
 if not exists(select 1 from tenants where id=studio) then raise exception 'Студію не знайдено';end if;
 select json_agg(t) into rows from tenants t where id=studio;
 sheets=sheets||json_build_object('name','studio','rows',rows);
 foreach item in array tables loop
  execute format('select coalesce(json_agg(t),''[]''::json), count(*) from public.%I t where %s',split_part(item,':',1),coalesce(nullif(split_part(item,':',2),''),'tenant_id=$1')) into rows,n using studio;
  sheets=sheets||json_build_object('name',split_part(item,':',1),'rows',rows);total=total+n;
 end loop;
 insert into audit_logs(tenant_id,actor_id,entity_type,entity_id,action,after_data) values(studio,auth.uid(),'tenant',studio,'export',jsonb_build_object('rows',total));
 return array_to_json(sheets);
end $$;
drop function if exists public.require_support_recent_password();
drop function if exists public.clean_utm(jsonb);
alter table public.studio_access_requests drop column if exists utm;
notify pgrst, 'reload schema';
commit;
