-- Support downloads all data of one studio (the privacy policy promises an export before deletion).
-- Support rights, 2FA and a fresh password are required; every export is written to the studio's audit log.
-- json, not jsonb: rows keep the column order of their tables, so the spreadsheet columns read naturally.
begin;
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
revoke all on function public.support_export_studio(uuid) from public, anon;
grant execute on function public.support_export_studio(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
