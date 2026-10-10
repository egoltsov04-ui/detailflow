-- Subscription recovery and bounded attendance. No unrelated schema changes.
begin;
create or replace function public.support_set_subscription(studio uuid,plan_input text,status_input text,end_input timestamptz,note_input text) returns void language plpgsql security definer set search_path=public as $$
declare prior jsonb;subscription_id uuid;begin
 if not is_support_user() then raise exception 'Потрібні права підтримки';end if;
 if plan_input is null or status_input is null or note_input is null or plan_input not in ('start','studio','pro') or status_input not in ('trialing','active','past_due','cancelled') or length(trim(note_input))<5 or length(note_input)>2000 then raise exception 'Оберіть тариф, статус та вкажіть причину зміни';end if;
 if status_input in ('active','trialing') and (end_input is null or end_input<=now() or end_input>now()+interval '2 years') then raise exception 'Вкажіть майбутню дату завершення, не більше двох років';end if;
 perform 1 from tenants where id=studio for update;
 if not found then raise exception 'Студію не знайдено';end if;
 select to_jsonb(s) into prior from subscriptions s where tenant_id=studio for update;
 insert into subscriptions(tenant_id,plan,status,trial_ends_at,current_period_end)
 values(studio,plan_input,status_input,case when status_input='trialing' then end_input end,case when status_input='active' then end_input end)
 on conflict(tenant_id) do update set plan=excluded.plan,status=excluded.status,
 trial_ends_at=case when excluded.status='trialing' then excluded.trial_ends_at else subscriptions.trial_ends_at end,
 current_period_end=case when excluded.status='active' then excluded.current_period_end else subscriptions.current_period_end end,updated_at=now()
 returning id into subscription_id;
 insert into audit_logs(tenant_id,actor_id,entity_type,entity_id,action,before_data,after_data) values(studio,auth.uid(),'subscriptions', subscription_id,'support_adjustment',prior,jsonb_build_object('plan',plan_input,'status',status_input,'end',end_input,'reason',trim(note_input)));
end$$;

alter table tenants add column if not exists shift_max_hours integer not null default 16 check(shift_max_hours between 1 and 24);
alter table tenants add column if not exists break_max_minutes integer not null default 120 check(break_max_minutes between 15 and 480);
alter table tenants add column if not exists shift_close_time time;
alter table staff_shifts add column if not exists auto_closed_reason text;
alter table staff_shifts add column if not exists auto_closed_at timestamptz;

create or replace function public.save_shift_limits(studio uuid,hours_input integer,break_input integer,close_input time default null) returns void language plpgsql security definer set search_path=public as $$begin
 if not is_tenant_manager(studio) then raise exception 'Немає доступу';end if;
 if hours_input is null or hours_input not between 1 and 24 or break_input is null or break_input not between 15 and 480 then raise exception 'Перевірте ліміти зміни та перерви';end if;
 update tenants set shift_max_hours=hours_input,break_max_minutes=break_input,shift_close_time=close_input where id=studio;
end$$;
create or replace function public.close_overdue_shifts(studio uuid default null) returns integer language plpgsql security definer set search_path=public as $$
declare r record;j record;deadline timestamptz;day_end timestamptz;reason text;closed integer:=0;role_value text;
begin
 role_value=coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','');
 if studio is null then
  if role_value<>'service_role' then raise exception 'Немає доступу';end if;
 elsif not is_tenant_manager(studio) and not exists(select 1 from staff_profiles where tenant_id=studio and is_own_staff_profile(id)) then raise exception 'Немає доступу';end if;
 for r in select sh.*,t.shift_max_hours,t.break_max_minutes,t.shift_close_time,t.timezone from staff_shifts sh join tenants t on t.id=sh.tenant_id where sh.ended_at is null and (studio is null or sh.tenant_id=studio) for update of sh skip locked loop
  deadline=r.started_at+make_interval(hours=>r.shift_max_hours);reason='shift_limit';
  if r.paused_at is not null and r.paused_at+make_interval(mins=>r.break_max_minutes)<deadline then deadline=r.paused_at+make_interval(mins=>r.break_max_minutes);reason='break_limit';end if;
  if r.shift_close_time is not null then
   day_end=((r.started_at at time zone r.timezone)::date+r.shift_close_time) at time zone r.timezone;
   if day_end<=r.started_at then day_end=(((r.started_at at time zone r.timezone)::date+1)+r.shift_close_time) at time zone r.timezone;end if;
   if day_end<deadline then deadline=day_end;reason='studio_closed';end if;
  end if;
  if deadline>now() then continue;end if;
  for j in update work_order_jobs set worked_seconds=worked_seconds+greatest(0,floor(extract(epoch from deadline-running_since)))::integer,running_since=null,status='waiting',version=version+1,updated_at=now() where staff_id=r.staff_id and running_since is not null returning id,tenant_id loop
   insert into work_job_events(tenant_id,job_id,actor_id,event,detail) values(j.tenant_id,j.id,null,'pause',jsonb_build_object('automatic',true,'reason',reason,'ended_at',deadline));
  end loop;
  update staff_shifts set ended_at=deadline,paused_at=null,
   pause_seconds=pause_seconds+case when r.paused_at is null then 0 else greatest(0,floor(extract(epoch from deadline-r.paused_at)))::integer end,
   breaks=case when r.paused_at is null then breaks else breaks||jsonb_build_array(jsonb_build_object('from',r.paused_at,'to',deadline)) end,
   auto_closed_reason=reason,auto_closed_at=now() where id=r.id;
  closed=closed+1;
 end loop;
 return closed;
end$$;
revoke all on function public.save_shift_limits(uuid,integer,integer,time),public.close_overdue_shifts(uuid) from public,anon;
grant execute on function public.save_shift_limits(uuid,integer,integer,time) to authenticated;
grant execute on function public.close_overdue_shifts(uuid) to authenticated,service_role;

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
 insert into appointments(tenant_id,client_id,vehicle_id,staff_id,starts_at,ends_at,status,source,manual_request_id,notes)
 values(studio,cid,vid,sid,start_time,start_time+make_interval(mins=>minutes_value),'confirmed','admin',request_input,nullif('Джерело: '||left(nullif(trim(booking->>'lead_source'),''),100),'')) returning id into aid;
 insert into appointment_services(appointment_id,service_id,service_name,unit_price,duration_minutes) values(aid,s.id,name_value,price_value,minutes_value);
 return jsonb_build_object('id',aid,'client_id',cid);
end$$;
revoke all on function public.create_manual_booking(uuid,uuid,jsonb) from public,anon;
grant execute on function public.create_manual_booking(uuid,uuid,jsonb) to authenticated;

notify pgrst,'reload schema';
commit;
