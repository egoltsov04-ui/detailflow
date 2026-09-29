begin;
create table if not exists public.order_receipts(
 id uuid primary key default gen_random_uuid(),number bigint generated always as identity unique,
 tenant_id uuid not null references tenants(id),work_order_id uuid not null unique references work_orders(id),
 snapshot jsonb not null,subtotal numeric(12,2) not null,discount numeric(12,2) not null default 0,
 total numeric(12,2) generated always as(subtotal-discount) stored,created_at timestamptz not null default now(),created_by uuid references profiles(id),
 check(discount>=0 and discount<=subtotal));
create table if not exists public.order_payments(
 id uuid primary key,tenant_id uuid not null references tenants(id),work_order_id uuid not null references work_orders(id),
 amount numeric(12,2) not null check(amount>0),method payment_method not null,paid_on date not null,
 note text not null default '',created_at timestamptz not null default now(),created_by uuid references profiles(id));
alter table public.order_receipts enable row level security;
alter table public.order_payments enable row level security;
drop policy if exists "managers read order receipts" on public.order_receipts;
create policy "managers read order receipts" on public.order_receipts for select using(is_tenant_manager(tenant_id));
drop policy if exists "managers read order payments" on public.order_payments;
create policy "managers read order payments" on public.order_payments for select using(is_tenant_manager(tenant_id));
grant select on public.order_receipts,public.order_payments to authenticated;
revoke insert,update,delete on public.order_receipts,public.order_payments from authenticated,anon;

create or replace function public.issue_order_receipt(order_input uuid,discount_input numeric default 0) returns jsonb language plpgsql security definer set search_path=public as $$
declare o work_orders;r order_receipts;lines jsonb;studio tenants;c clients;
begin
 select * into o from work_orders where id=order_input for update;
 if o.id is null or not is_tenant_manager(o.tenant_id) then raise exception 'Немає доступу';end if;
 select * into r from order_receipts where work_order_id=o.id;
 if r.id is not null then return to_jsonb(r);end if;
 if o.status not in ('ready','issued') then raise exception 'Спочатку підтвердьте всі роботи';end if;
 if discount_input is null or discount_input<0 or discount_input>o.total or discount_input<>round(discount_input,2) or o.deposit>o.total-discount_input then raise exception 'Знижка перевищує неоплачений залишок';end if;
 select * into studio from tenants where id=o.tenant_id;select * into c from clients where id=o.client_id;
 select jsonb_agg(jsonb_build_object('name',title,'amount',price,'staff_id',staff_id) order by position,created_at) into lines from work_order_jobs where work_order_id=o.id;
 insert into order_receipts(tenant_id,work_order_id,subtotal,discount,created_by,snapshot)
 values(o.tenant_id,o.id,o.total,discount_input,auth.uid(),jsonb_build_object('studio',studio.name,'address',studio.address,'phone',studio.phone,'client',c.full_name,'client_id',c.id,'client_phone',c.phone,'vehicle',o.vehicle_label,'order',o.title,'lines',coalesce(lines,jsonb_build_array(jsonb_build_object('name',o.title,'amount',o.total))))) returning * into r;
 return to_jsonb(r);
end$$;

create or replace function public.record_order_payment(order_input uuid,amount_input numeric,method_input payment_method,date_input date,request_input uuid,note_input text default '') returns void language plpgsql security definer set search_path=public as $$
declare o work_orders;p order_payments;net numeric;
begin
 select * into o from work_orders where id=order_input for update;
 if o.id is null or not is_tenant_manager(o.tenant_id) then raise exception 'Немає доступу';end if;
 select * into p from order_payments where id=request_input;
 if p.id is not null then
  if p.work_order_id<>o.id or p.amount<>amount_input or p.method<>method_input or p.paid_on<>date_input then raise exception 'Ідентифікатор платежу вже використаний';end if;return;
 end if;
 select total into net from order_receipts where work_order_id=o.id;net=coalesce(net,o.total);
 if o.status='cancelled' or amount_input is null or amount_input<=0 or amount_input<>round(amount_input,2) or amount_input>net-o.deposit or date_input is null or request_input is null then raise exception 'Перевірте суму та залишок оплати';end if;
 insert into order_payments(id,tenant_id,work_order_id,amount,method,paid_on,note,created_by) values(request_input,o.tenant_id,o.id,amount_input,method_input,date_input,left(coalesce(note_input,''),2000),auth.uid());
 update work_orders set deposit=deposit+amount_input where id=o.id;
 insert into cash_transactions(tenant_id,transaction_date,direction,amount,category,title,payment_method,client_id,note)
 values(o.tenant_id,date_input,'income',amount_input,'Оплата замовлення','Оплата замовлення: '||o.title,method_input,o.client_id,left(coalesce(note_input,''),2000));
end$$;

create or replace function public.save_client_card(studio uuid,client_input uuid,card jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid:=coalesce(client_input,gen_random_uuid());v jsonb;vid uuid;phone_value text;email_value text;
begin
 if not is_tenant_manager(studio) then raise exception 'Немає доступу';end if;
 if length(trim(coalesce(card->>'name','')))<2 or length(card->>'name')>120 or jsonb_typeof(card->'vehicles') is distinct from 'array' or jsonb_array_length(card->'vehicles')>50 then raise exception 'Перевірте ім’я та список авто';end if;
 phone_value=nullif(regexp_replace(coalesce(card->>'phone',''),'[^+0-9]','','g'),'');email_value=nullif(lower(trim(card->>'email')),'');
 if phone_value is not null and length(regexp_replace(phone_value,'[^0-9]','','g')) not between 10 and 15 then raise exception 'Вкажіть телефон із кодом країни';end if;
 if email_value is not null and email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Перевірте email';end if;
 if client_input is not null then
  perform 1 from clients where id=cid and tenant_id=studio for update;if not found then raise exception 'Клієнта не знайдено';end if;
  update clients set full_name=trim(card->>'name'),phone=phone_value,email=email_value,notes=left(coalesce(card->>'notes',''),4000),tags=array(select jsonb_array_elements_text(coalesce(card->'tags','[]'))) where id=cid;
 else
  insert into clients(id,tenant_id,full_name,phone,email,notes,tags) values(cid,studio,trim(card->>'name'),phone_value,email_value,left(coalesce(card->>'notes',''),4000),array(select jsonb_array_elements_text(coalesce(card->'tags','[]'))));
 end if;
 for v in select value from jsonb_array_elements(card->'vehicles') loop
  if length(trim(coalesce(v->>'make','')||coalesce(v->>'model','')||coalesce(v->>'plate','')))=0 then raise exception 'Заповніть марку, модель або номер автомобіля';end if;
  vid=nullif(v->>'id','')::uuid;
  if vid is null then
   insert into vehicles(tenant_id,client_id,make,model,plate_number,year,notes) values(studio,cid,left(v->>'make',80),left(v->>'model',80),left(upper(v->>'plate'),30),nullif(v->>'year','')::smallint,left(coalesce(v->>'notes',''),2000));
  else
   update vehicles set make=left(v->>'make',80),model=left(v->>'model',80),plate_number=left(upper(v->>'plate'),30),year=nullif(v->>'year','')::smallint,notes=left(coalesce(v->>'notes',''),2000) where id=vid and client_id=cid and tenant_id=studio;
   if not found then raise exception 'Автомобіль не належить цьому клієнту';end if;
  end if;
 end loop;
 return cid;
end$$;
revoke all on function public.issue_order_receipt(uuid,numeric),public.record_order_payment(uuid,numeric,payment_method,date,uuid,text),public.save_client_card(uuid,uuid,jsonb) from public,anon;
grant execute on function public.issue_order_receipt(uuid,numeric),public.record_order_payment(uuid,numeric,payment_method,date,uuid,text),public.save_client_card(uuid,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
