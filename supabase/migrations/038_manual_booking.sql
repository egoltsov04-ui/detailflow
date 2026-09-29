begin;
alter table public.appointments add column if not exists manual_request_id uuid;
create unique index if not exists appointments_manual_request on public.appointments(manual_request_id) where manual_request_id is not null;
create or replace function public.create_manual_booking(studio uuid,request_input uuid,booking jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare s services;v jsonb;cid uuid;vid uuid;sid uuid;aid uuid;start_time timestamptz;zone text;wall timestamp;price_value numeric;minutes_value integer;name_value text;phone_value text;car_value text;
begin
 if not is_tenant_manager(studio) then raise exception 'Немає доступу';end if;
 if request_input is null then raise exception 'Відсутній ідентифікатор запису';end if;
 -- Serialize duplicate requests and capacity checks for this studio.
 select timezone into zone from tenants where id=studio for update;
 select id,client_id into aid,cid from appointments where tenant_id=studio and manual_request_id=request_input;
 if aid is not null then return jsonb_build_object('id',aid,'client_id',cid);end if;
 select * into s from services where tenant_id=studio and name=booking->>'service' and active for share;
 if s.id is null then raise exception 'Послуга недоступна. Оновіть каталог';end if;
 price_value=s.price;minutes_value=s.duration_minutes;name_value=s.name;
 if jsonb_array_length(s.variants)>0 then
  select value into v from jsonb_array_elements(s.variants) where value->>'id'=booking->>'variant_id';
  if v is null then raise exception 'Оберіть актуальний варіант послуги';end if;
  price_value=(v->>'price')::numeric;minutes_value=(v->>'duration_minutes')::integer;name_value=s.name||' · '||(v->>'name');
 elsif coalesce(booking->>'variant_id','')<>'' then raise exception 'Варіант більше недоступний';end if;
 if price_value is distinct from (booking->>'expected_price')::numeric or minutes_value is distinct from (booking->>'expected_minutes')::integer then raise exception 'Ціна або тривалість змінилася. Оновіть каталог і перевірте запис';end if;
 sid=nullif(booking->>'staff_id','')::uuid;
 if sid is not null and not staff_can_perform(sid,s.id) then raise exception 'Майстер не виконує цю послугу';end if;
 wall=((booking->>'date')||' '||(booking->>'time'))::timestamp;
 start_time=wall at time zone coalesce(zone,'Europe/Kyiv');
 if start_time at time zone coalesce(zone,'Europe/Kyiv')<>wall then raise exception 'Час пропущено через перехід на літній час';end if;
 if length(trim(coalesce(booking->>'client','')))<2 then raise exception 'Вкажіть ім’я клієнта';end if;
 cid=nullif(booking->>'client_id','')::uuid;
 phone_value=nullif(regexp_replace(coalesce(booking->>'phone',''),'[^0-9]','','g'),'');
 if phone_value is not null and length(phone_value) not between 10 and 15 then raise exception 'Вкажіть телефон із кодом країни';end if;
 if cid is not null then
  perform 1 from clients where id=cid and tenant_id=studio;if not found then raise exception 'Клієнта не знайдено';end if;
 elsif phone_value is not null then
  select id into cid from clients where tenant_id=studio and regexp_replace(phone,'[^0-9]','','g')=phone_value order by created_at limit 1;
 end if;
 if cid is null then insert into clients(tenant_id,full_name,phone) values(studio,left(trim(booking->>'client'),120),case when phone_value is not null then '+'||phone_value end) returning id into cid;end if;
 car_value=nullif(trim(booking->>'vehicle'),'');
 if car_value is not null then
  select id into vid from vehicles where tenant_id=studio and client_id=cid and (notes=car_value or concat_ws(' ',nullif(make,''),nullif(model,''),nullif(plate_number,''))=car_value) limit 1;
  if vid is null then insert into vehicles(tenant_id,client_id,notes) values(studio,cid,left(car_value,2000)) returning id into vid;end if;
 end if;
 insert into appointments(tenant_id,client_id,vehicle_id,staff_id,starts_at,ends_at,status,source,manual_request_id)
 values(studio,cid,vid,sid,start_time,start_time+make_interval(mins=>minutes_value),'confirmed','admin',request_input) returning id into aid;
 insert into appointment_services(appointment_id,service_id,service_name,unit_price,duration_minutes) values(aid,s.id,name_value,price_value,minutes_value);
 return jsonb_build_object('id',aid,'client_id',cid);
end$$;
revoke all on function public.create_manual_booking(uuid,uuid,jsonb) from public,anon;
grant execute on function public.create_manual_booking(uuid,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
