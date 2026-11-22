-- A studio whose stored name has a space at the end could never be deleted: only the typed name was trimmed.
-- Both names are compared trimmed now, and a new application stores the studio name without edge spaces.
begin;
create or replace function public.support_delete_studio(studio uuid, confirm_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'storage'
AS $function$
declare studio_name text; users uuid[]; files text[]; counts jsonb; paid jsonb; remaining text[]; next text[]; item text; done jsonb='{}'; n bigint;
begin
 perform require_support_write();
 perform require_support_recent_password();
 select name into studio_name from tenants where id=studio for update;
 if studio_name is null then raise exception 'Студію не знайдено';end if;
 if trim(coalesce(confirm_name,''))<>trim(studio_name) then raise exception 'Назва студії не збігається';end if;
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
end $function$;
create or replace function public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  if new.raw_user_meta_data ->> 'requested_role' = 'owner' then
    insert into public.studio_access_requests (user_id, studio_name, phone, messenger, contact, selected_plan, promo_code, utm)
    values (new.id, coalesce(nullif(btrim(new.raw_user_meta_data ->> 'studio_name'),''), 'Нова студія'), new.raw_user_meta_data ->> 'phone', new.raw_user_meta_data ->> 'messenger', new.raw_user_meta_data ->> 'contact',case when new.raw_user_meta_data->>'selected_plan' in ('solo','studio','pro') then new.raw_user_meta_data->>'selected_plan' else 'studio' end,
      nullif(left(upper(btrim(coalesce(new.raw_user_meta_data->>'promo_code',''))),32),''),
      clean_utm(new.raw_user_meta_data->'utm'));
  end if;
  return new;
end;
$function$;
commit;
