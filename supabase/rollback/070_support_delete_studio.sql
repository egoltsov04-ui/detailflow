-- Rollback of 070: remove studio deletion and restore the guards and the audit trigger as in 067-069.
-- deleted_studios is dropped with its rows: copy them first if any studio was deleted.
begin;
drop function if exists public.support_delete_studio(uuid,text);
drop function if exists public.support_studio_deletion_preview(uuid);
create or replace function public.audit_row_change() returns trigger language plpgsql security definer set search_path=public as $$
declare before_row jsonb;after_row jsonb;row_data jsonb;
begin
 if tg_op<>'INSERT' then before_row=to_jsonb(old);end if;
 if tg_op<>'DELETE' then after_row=to_jsonb(new);end if;
 if tg_op='UPDATE' and before_row=after_row then return new;end if;
 row_data=coalesce(after_row,before_row);
 insert into audit_logs(tenant_id,actor_id,entity_type,entity_id,action,before_data,after_data)
 values(coalesce(row_data->>'tenant_id',case when tg_table_name='tenants' then row_data->>'id' end)::uuid,auth.uid(),tg_table_name,coalesce(row_data->>'id',row_data->>'user_id')::uuid,lower(tg_op),before_row,after_row);
 if tg_op='DELETE' then return old;end if;return new;
end$$;
create or replace function public.guard_owner_membership() returns trigger language plpgsql as $$begin
 if auth.uid() is not null and old.role='owner' then raise exception 'Передача прав власника потребує окремої процедури'; end if;
 if tg_op='DELETE' then return old;end if;return new;end$$;
create or replace function public.protect_job_evidence() returns trigger language plpgsql set search_path=public as $$
begin
 if jsonb_array_length(old.attachments)>0 or jsonb_array_length(old.paint_readings)>0 then raise exception 'Робота має збережені матеріали. Збережіть її в історії';end if;
 return old;
end $$;
create or replace function public.guard_accrued_order_delete() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.approved_at is not null or exists(select 1 from staff_earnings where work_order_id=old.id) or exists(select 1 from work_order_jobs where work_order_id=old.id and (worked_seconds>0 or status not in ('new','assigned'))) then raise exception 'Замовлення з виконаною роботою зберігається в історії'; end if;
 return old;
end $$;
create or replace function public.guard_plan_module() returns trigger language plpgsql security definer set search_path=public as $$declare studio uuid;begin
 studio=case when tg_op='DELETE' then old.tenant_id else new.tenant_id end;perform require_plan_feature(studio,tg_argv[0]);
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create or replace function public.guard_payout_cash() returns trigger language plpgsql as $$ begin
 if old.payout_id is not null then raise exception 'Виплата зарплати зберігається в історії'; end if; return coalesce(new,old); end $$;
drop function if exists public.deleting_studio(uuid);
drop table if exists public.deleted_studios;
notify pgrst, 'reload schema';
commit;
