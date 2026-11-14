-- Support can delete a whole studio from /admin (api/support/delete-studio.ts). One transaction removes every row
-- of the studio; the guards that keep history (accrued orders, job evidence, owner, payouts, plan modules) let rows
-- through only while this function deletes that one studio. Files and accounts are removed by the API afterwards.
begin;

-- A deleted studio leaves one line here: its own audit log goes with it.
create table if not exists public.deleted_studios(
 id uuid primary key default gen_random_uuid(),
 studio_id uuid not null,
 studio_name text not null,
 deleted_by uuid,
 deleted_at timestamptz not null default now(),
 counts jsonb not null default '{}'
);
alter table public.deleted_studios enable row level security;
revoke all on public.deleted_studios from public, anon, authenticated;
drop policy if exists "support reads deleted studios" on public.deleted_studios;
create policy "support reads deleted studios" on public.deleted_studios for select to authenticated using (is_support_user());
grant select on public.deleted_studios to authenticated;

-- True only inside support_delete_studio for that studio. set_config is not reachable through the API.
create or replace function public.deleting_studio(studio uuid) returns boolean language sql stable set search_path=public as $$
 select studio is not null and current_setting('detailflow.deleting_studio',true)=studio::text
$$;

create or replace function public.audit_row_change() returns trigger language plpgsql security definer set search_path=public as $$
declare before_row jsonb;after_row jsonb;row_data jsonb;studio uuid;
begin
 if tg_op<>'INSERT' then before_row=to_jsonb(old);end if;
 if tg_op<>'DELETE' then after_row=to_jsonb(new);end if;
 if tg_op='UPDATE' and before_row=after_row then return new;end if;
 row_data=coalesce(after_row,before_row);
 studio=coalesce(row_data->>'tenant_id',case when tg_table_name='tenants' then row_data->>'id' end)::uuid;
 -- A studio being deleted (or already gone) has no log left to write to.
 if deleting_studio(studio) or (studio is not null and not exists(select 1 from tenants where id=studio)) then
  if tg_op='DELETE' then return old;end if;return new;
 end if;
 insert into audit_logs(tenant_id,actor_id,entity_type,entity_id,action,before_data,after_data)
 values(studio,auth.uid(),tg_table_name,coalesce(row_data->>'id',row_data->>'user_id')::uuid,lower(tg_op),before_row,after_row);
 if tg_op='DELETE' then return old;end if;return new;
end$$;

create or replace function public.guard_owner_membership() returns trigger language plpgsql as $$begin
 if tg_op='DELETE' and deleting_studio(old.tenant_id) then return old;end if;
 if auth.uid() is not null and old.role='owner' then raise exception 'Передача прав власника потребує окремої процедури'; end if;
 if tg_op='DELETE' then return old;end if;return new;end$$;

create or replace function public.protect_job_evidence() returns trigger language plpgsql set search_path=public as $$
begin
 if deleting_studio(old.tenant_id) then return old;end if;
 if jsonb_array_length(old.attachments)>0 or jsonb_array_length(old.paint_readings)>0 then raise exception 'Робота має збережені матеріали. Збережіть її в історії';end if;
 return old;
end $$;

create or replace function public.guard_accrued_order_delete() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if deleting_studio(old.tenant_id) then return old;end if;
 if old.approved_at is not null or exists(select 1 from staff_earnings where work_order_id=old.id) or exists(select 1 from work_order_jobs where work_order_id=old.id and (worked_seconds>0 or status not in ('new','assigned'))) then raise exception 'Замовлення з виконаною роботою зберігається в історії'; end if;
 return old;
end $$;

create or replace function public.guard_plan_module() returns trigger language plpgsql security definer set search_path=public as $$declare studio uuid;begin
 studio=case when tg_op='DELETE' then old.tenant_id else new.tenant_id end;
 if tg_op='DELETE' and deleting_studio(studio) then return old;end if;
 perform require_plan_feature(studio,tg_argv[0]);
 if tg_op='DELETE' then return old;end if;return new;
end $$;

create or replace function public.guard_payout_cash() returns trigger language plpgsql as $$ begin
 if tg_op='DELETE' and deleting_studio(old.tenant_id) then return old;end if;
 if old.payout_id is not null then raise exception 'Виплата зарплати зберігається в історії'; end if; return coalesce(new,old); end $$;

-- What a deletion would remove: shown in the confirmation dialog.
create or replace function public.support_studio_deletion_preview(studio uuid) returns jsonb language plpgsql stable security definer set search_path=public,storage as $$
begin
 if not coalesce(is_support_user(),false) then raise exception 'Потрібні права підтримки' using errcode='42501';end if;
 if not exists(select 1 from tenants where id=studio) then raise exception 'Студію не знайдено';end if;
 return jsonb_build_object(
  'name',(select name from tenants where id=studio),
  'orders',(select count(*) from work_orders where tenant_id=studio),
  'clients',(select count(*) from clients where tenant_id=studio),
  'photos',(select count(*) from storage.objects where bucket_id='job-photos' and name like studio::text||'/%'),
  'accounts',(select count(*) from tenant_memberships m where m.tenant_id=studio and not exists(select 1 from tenant_memberships o where o.user_id=m.user_id and o.tenant_id<>studio)),
  'support',exists(select 1 from tenant_memberships where tenant_id=studio and role='super_admin'));
end $$;

create or replace function public.support_delete_studio(studio uuid, confirm_name text) returns jsonb language plpgsql security definer set search_path=public,storage as $$
declare studio_name text; users uuid[]; files text[]; counts jsonb; remaining text[]; next text[]; item text; done jsonb='{}'; n bigint;
begin
 perform require_support_write();
 select name into studio_name from tenants where id=studio for update;
 if studio_name is null then raise exception 'Студію не знайдено';end if;
 if trim(coalesce(confirm_name,''))<>studio_name then raise exception 'Назва студії не збігається';end if;
 if exists(select 1 from tenant_memberships where tenant_id=studio and role='super_admin') then raise exception 'Службову студію підтримки видалити не можна';end if;
 -- Accounts that belong only to this studio, and its photos: the API removes them after the commit.
 select coalesce(array_agg(distinct m.user_id),'{}') into users from tenant_memberships m where m.tenant_id=studio and m.user_id is not null and not exists(select 1 from tenant_memberships o where o.user_id=m.user_id and o.tenant_id<>studio);
 select coalesce(array_agg(name),'{}') into files from storage.objects where bucket_id='job-photos' and name like studio::text||'/%';
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
 insert into deleted_studios(studio_id,studio_name,deleted_by,counts) values(studio,studio_name,auth.uid(),done);
 return jsonb_build_object('name',studio_name,'users',to_jsonb(users),'files',to_jsonb(files),'counts',done);
end $$;

revoke all on function public.support_studio_deletion_preview(uuid) from public, anon;
revoke all on function public.support_delete_studio(uuid,text) from public, anon;
grant execute on function public.support_studio_deletion_preview(uuid) to authenticated;
grant execute on function public.support_delete_studio(uuid,text) to authenticated;
notify pgrst, 'reload schema';
commit;
