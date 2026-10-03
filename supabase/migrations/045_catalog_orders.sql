begin;
-- One request creates the car order and all selected catalog jobs atomically.
create or replace function public.create_catalog_order(studio uuid, request_input uuid, order_input jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o work_orders; s services; line jsonb; variant jsonb; resolved jsonb:='[]'; entry jsonb;
 cid uuid:=(order_input->>'client_id')::uuid; sid uuid:=nullif(order_input->>'staff_id','')::uuid;
 amount numeric:=0; price_value numeric; title_value text; summary_value text; jid uuid; r jsonb;
begin
 if not is_tenant_manager(studio) then raise exception 'Немає доступу'; end if;
 if request_input is null then raise exception 'Відсутній ідентифікатор замовлення'; end if;
 perform 1 from tenants where id=studio for update;
 select * into o from work_orders where id=request_input;
 if o.id is not null then
  if o.tenant_id<>studio then raise exception 'Немає доступу'; end if;
  return jsonb_build_object('id',o.id,'created_at',o.created_at);
 end if;
 if not subscription_allows_new_work(studio) then raise exception 'Період доступу завершено. Власник має продовжити тариф'; end if;
 if not exists(select 1 from clients where id=cid and tenant_id=studio) then raise exception 'Оберіть клієнта студії'; end if;
 if sid is not null and not exists(select 1 from staff_profiles where id=sid and tenant_id=studio and active) then raise exception 'Майстер недоступний'; end if;
 if jsonb_typeof(order_input->'services') is distinct from 'array' or jsonb_array_length(order_input->'services') not between 1 and 20 then raise exception 'Оберіть від 1 до 20 послуг'; end if;
 for line in select value from jsonb_array_elements(order_input->'services') loop
  select * into s from services where id=(line->>'service_id')::uuid and tenant_id=studio and active for share;
  if s.id is null then raise exception 'Послуга недоступна. Оновіть каталог'; end if;
  price_value=s.price; title_value=s.name;
  if jsonb_array_length(s.variants)>0 then
   select value into variant from jsonb_array_elements(s.variants) where value->>'id'=line->>'variant_id';
   if variant is null then raise exception 'Оберіть актуальний варіант послуги'; end if;
   price_value=(variant->>'price')::numeric; title_value=s.name||' · '||(variant->>'name');
  elsif coalesce(line->>'variant_id','')<>'' then raise exception 'Варіант більше недоступний'; end if;
  if price_value is distinct from (line->>'expected_price')::numeric then raise exception 'Ціна змінилася. Оновіть каталог'; end if;
  if sid is not null and not staff_can_perform(sid,s.id) then raise exception 'Майстер не виконує цю послугу. Змініть виконавця або спеціалізацію'; end if;
  resolved=resolved||jsonb_build_array(jsonb_build_object('service_id',s.id,'title',title_value,'price',price_value));
  amount=amount+price_value;
 end loop;
 select string_agg(value->>'title',', ') into summary_value from jsonb_array_elements(resolved);
 if coalesce((order_input->>'deposit')::numeric,0)<0 or coalesce((order_input->>'deposit')::numeric,0)>amount then raise exception 'Перевірте передоплату'; end if;
 insert into work_orders(id,tenant_id,client_id,staff_id,title,vehicle_label,service_summary,status,total,deposit,due_at,notes,checklist,created_by)
 values(request_input,studio,cid,sid,left(summary_value,180),nullif(order_input->>'vehicle',''),summary_value,case when sid is null then 'new' else 'assigned' end,
 amount,0,nullif(order_input->>'due_at','')::timestamptz,order_input->>'notes','[]',auth.uid()) returning * into o;
 select id into jid from work_order_jobs where work_order_id=o.id limit 1;
 for entry in select value from jsonb_array_elements(resolved) loop
  r=job_rate(sid,(entry->>'service_id')::uuid);
  if jid is not null then
   update work_order_jobs set service_id=(entry->>'service_id')::uuid,title=entry->>'title',price=(entry->>'price')::numeric,pay_mode=r->>'mode',rate=(r->>'rate')::numeric,
    checklist=jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'title',entry->>'title','done',false)) where id=jid;
   jid=null;
  else
   insert into work_order_jobs(tenant_id,work_order_id,staff_id,service_id,title,status,price,pay_mode,rate,checklist)
   values(studio,o.id,sid,(entry->>'service_id')::uuid,entry->>'title',case when sid is null then 'new' else 'assigned' end,(entry->>'price')::numeric,r->>'mode',(r->>'rate')::numeric,
    jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'title',entry->>'title','done',false)));
  end if;
 end loop;
 update work_orders set deposit=coalesce((order_input->>'deposit')::numeric,0) where id=o.id;
 return jsonb_build_object('id',o.id,'created_at',o.created_at);
end $$;
revoke all on function public.create_catalog_order(uuid,uuid,jsonb) from public,anon;
grant execute on function public.create_catalog_order(uuid,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
