-- Apply after 027. New work is managed through RPCs; legacy payroll is preserved.
begin;
create table public.work_order_jobs (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
 work_order_id uuid not null references public.work_orders(id) on delete cascade,
 service_id uuid references public.services(id), staff_id uuid references public.staff_profiles(id),
 title text not null check(length(trim(title)) between 1 and 180), stage text not null default 'Виконання',
 status text not null default 'new' check(status in ('new','assigned','in_progress','waiting','review','approved')),
 position integer not null default 0 check(position>=0),
 price numeric(12,2) not null default 0 check(price>=0),
 pay_mode text not null default 'percent' check(pay_mode in ('percent','fixed','hourly')),
 rate numeric(12,2) not null default 0 check(rate>=0),
 checklist jsonb not null default '[]', attachments jsonb not null default '[]', note text not null default '', review_note text not null default '',
 worked_seconds integer not null default 0 check(worked_seconds>=0), running_since timestamptz,
 submitted_at timestamptz, approved_at timestamptz, approved_by uuid references public.profiles(id),
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(pay_mode<>'percent' or rate<=100), check(jsonb_typeof(checklist)='array'),check(jsonb_typeof(attachments)='array'),check(length(stage)<=100)
);
create index jobs_order_idx on public.work_order_jobs(work_order_id);
create index jobs_staff_idx on public.work_order_jobs(tenant_id,staff_id,status);
create unique index jobs_one_running on public.work_order_jobs(staff_id) where running_since is not null;
create table public.work_job_events (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, job_id uuid not null references public.work_order_jobs(id) on delete cascade,
 actor_id uuid, event text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
alter table public.staff_earnings drop constraint if exists staff_earnings_work_order_id_key;
alter table public.staff_earnings add column job_id uuid unique references public.work_order_jobs(id), add column paid_amount numeric(12,2) not null default 0 check(paid_amount>=0);
create unique index earnings_legacy_order on public.staff_earnings(work_order_id) where job_id is null;
update public.staff_earnings set paid_amount=amount where status='paid';
create table public.staff_payouts (
 id uuid primary key, tenant_id uuid not null, earning_id uuid not null references public.staff_earnings(id),
 amount numeric(12,2) not null check(amount>0), method public.payment_method not null, note text not null default '',
 created_at timestamptz not null default now(), created_by uuid not null
);
alter table public.cash_transactions add column payout_id uuid unique references public.staff_payouts(id), add column is_accrual boolean not null default false;
-- These entries were generated at approval, not at an actual payout. Keep them for audit.
update public.cash_transactions set is_accrual=true where earning_id is not null and title like 'Нарахування:%';
alter table public.staff_shifts add column paused_at timestamptz, add column pause_seconds integer not null default 0, add column breaks jsonb not null default '[]';

create function public.can_access_job(target uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from work_order_jobs j where j.id=target and (is_tenant_manager(j.tenant_id) or is_own_staff_profile(j.staff_id)))
$$;
create function public.can_read_job_order(target uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from work_order_jobs j where j.work_order_id=target and is_own_staff_profile(j.staff_id))
$$;
alter table public.work_order_jobs enable row level security;
alter table public.work_job_events enable row level security;
alter table public.staff_payouts enable row level security;
create policy "read permitted jobs" on public.work_order_jobs for select using(public.can_access_job(id));
create policy "read permitted job events" on public.work_job_events for select using(public.can_access_job(job_id));
create policy "read permitted payouts" on public.staff_payouts for select using(public.is_tenant_manager(tenant_id) or exists(select 1 from public.staff_earnings e where e.id=earning_id and public.is_own_staff_profile(e.staff_id)));
create policy "master reads job vehicle" on public.work_orders for select using(public.can_read_job_order(id));
revoke insert,update,delete on public.work_order_jobs,public.work_job_events,public.staff_payouts from authenticated,anon;
grant select on public.work_order_jobs,public.work_job_events,public.staff_payouts to authenticated;
-- Earnings and attendance have controlled write paths as well.
drop policy if exists "managers access earnings" on public.staff_earnings;
create policy "managers read earnings" on public.staff_earnings for select using(public.is_tenant_manager(tenant_id));
drop policy if exists "members access staff shifts" on public.staff_shifts;
create policy "read attendance" on public.staff_shifts for select using(public.is_tenant_manager(tenant_id) or public.is_own_staff_profile(staff_id));

create function public.job_rate(target_staff uuid,target_service uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare s staff_profiles; r staff_service_compensation;
begin
 select * into s from staff_profiles where id=target_staff and active;
 select * into r from staff_service_compensation where staff_id=s.id and service_id=target_service and tenant_id=s.tenant_id;
 if r.fixed_amount is not null then return jsonb_build_object('mode','fixed','rate',r.fixed_amount); end if;
 if r.percent is not null then return jsonb_build_object('mode','percent','rate',r.percent); end if;
 if s.compensation_percent is not null then return jsonb_build_object('mode','percent','rate',s.compensation_percent); end if;
 if s.hourly_rate>0 then return jsonb_build_object('mode','hourly','rate',s.hourly_rate); end if;
 return jsonb_build_object('mode','percent','rate',0);
end $$;

-- All existing records retain the agreed amounts; no past earnings are recalculated.
insert into public.work_order_jobs(tenant_id,work_order_id,staff_id,title,status,price,pay_mode,rate,checklist,approved_at,approved_by,submitted_at,review_note)
select tenant_id,id,staff_id,title,case when status in ('ready','issued') then 'approved' when status='cancelled' then 'new' when status='in_progress' then 'waiting' else status end,total,
 case when compensation_fixed is not null then 'fixed' else 'percent' end,coalesce(compensation_fixed,compensation_percent,0),
 checklist,approved_at,reviewed_by,submitted_for_review_at,case when status='in_progress' then concat_ws(' ',nullif(review_note,''),'Роботу перенесено. Продовжіть її, щоб розпочати облік активного часу.') else coalesce(review_note,'') end from public.work_orders;
update public.staff_earnings e set job_id=j.id from public.work_order_jobs j where j.work_order_id=e.work_order_id;

-- Legacy write guard is retained for old clients; child jobs exclusively control parent workflow.
alter function public.guard_work_order_update() rename to guard_work_order_update_legacy;
create function public.guard_work_order_update() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.tenant_id is distinct from old.tenant_id then raise exception 'Не можна змінити студію'; end if;
 if exists(select 1 from work_order_jobs where work_order_id=old.id) then
   if pg_trigger_depth()>1 then return new; end if;
   if not is_tenant_manager(old.tenant_id) then raise exception 'Використайте картку призначеної роботи'; end if;
   if new.staff_id is distinct from old.staff_id or new.total is distinct from old.total or new.checklist is distinct from old.checklist or new.approved_at is distinct from old.approved_at then raise exception 'Редагуйте роботи всередині замовлення'; end if;
   if new.status is distinct from old.status and not (old.status='ready' and new.status='issued') then raise exception 'Статус визначається виконанням робіт'; end if;
 end if;
 return new;
end $$;
drop trigger work_orders_guard_update on public.work_orders;
create trigger work_orders_guard_update before update on public.work_orders for each row execute function public.guard_work_order_update();

create function public.sync_job_order() returns trigger language plpgsql security definer set search_path=public as $$
declare oid uuid:=coalesce(new.work_order_id,old.work_order_id); next_status text; amount numeric;
begin
 select sum(price),case when bool_and(status='approved') then 'ready' when bool_or(status='review') then 'review'
 when bool_or(status='in_progress') then 'in_progress' when bool_or(status='waiting') then 'waiting'
 when bool_or(staff_id is null) then 'new' else 'assigned' end into amount,next_status from work_order_jobs where work_order_id=oid;
 update work_orders set total=coalesce(amount,0),status=case when status in ('issued','cancelled') then status else coalesce(next_status,'new') end,
 staff_id=(select staff_id from work_order_jobs where work_order_id=oid order by created_at,id limit 1),
 updated_at=now(),approved_at=case when next_status='ready' then coalesce(approved_at,now()) else approved_at end where id=oid;
 return coalesce(new,old);
end $$;
create trigger jobs_sync_parent after insert or update or delete on public.work_order_jobs for each row execute function public.sync_job_order();

create function public.seed_order_job() returns trigger language plpgsql security definer set search_path=public as $$
declare r jsonb;
begin
 r:=job_rate(new.staff_id,null);
 insert into work_order_jobs(tenant_id,work_order_id,staff_id,title,status,price,pay_mode,rate,checklist)
 values(new.tenant_id,new.id,new.staff_id,new.title,case when new.staff_id is null then 'new' else 'assigned' end,new.total,
 case when new.compensation_fixed is not null then 'fixed' when new.compensation_percent is not null then 'percent' else r->>'mode' end,
 coalesce(new.compensation_fixed,new.compensation_percent,(r->>'rate')::numeric),new.checklist);
 return new;
end $$;
create trigger orders_seed_job after insert on public.work_orders for each row execute function public.seed_order_job();

create function public.save_work_job(order_id uuid, job_input jsonb, expected_version integer default null) returns uuid language plpgsql security definer set search_path=public as $$
declare o work_orders; j work_order_jobs; sid uuid:=nullif(job_input->>'staff_id','')::uuid; svc uuid:=nullif(job_input->>'service_id','')::uuid; r jsonb; jid uuid:=nullif(job_input->>'id','')::uuid; checks jsonb:=job_input->'checklist'; pos integer:=coalesce((job_input->>'position')::integer,0);
begin
 select * into o from work_orders where id=order_id for update;
 if o.id is null or not is_tenant_manager(o.tenant_id) then raise exception 'Немає доступу'; end if;
 if o.status in ('ready','issued','cancelled') then raise exception 'Замовлення вже закрите'; end if;
 if sid is not null and not exists(select 1 from staff_profiles where id=sid and tenant_id=o.tenant_id and active) then raise exception 'Майстер недоступний'; end if;
 if svc is not null and not exists(select 1 from services where id=svc and tenant_id=o.tenant_id and active) then raise exception 'Послуга недоступна'; end if;
 if jsonb_typeof(checks) is distinct from 'array' or jsonb_array_length(checks)=0 or jsonb_array_length(checks)>100 then raise exception 'Додайте від 1 до 100 завдань'; end if;
 if exists(select 1 from jsonb_array_elements(checks) v where length(trim(coalesce(v->>'title','')))=0 or length(v->>'title')>300) then raise exception 'Заповніть назви завдань'; end if;
 select jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'title',v->>'title','done',false)) into checks from jsonb_array_elements(checks) v;
 if jid is not null then
 select * into j from work_order_jobs where id=jid and work_order_id=o.id for update;
 if j.id is null or j.version is distinct from expected_version then raise exception 'Дані змінилися. Оновіть картку'; end if;
 if j.status not in ('new','assigned') or j.worked_seconds>0 then raise exception 'Умови роботи вже зафіксовані'; end if;
 end if;
 r:=job_rate(sid,svc);
 if job_input->>'pay_mode' in ('percent','fixed','hourly') then r:=jsonb_build_object('mode',job_input->>'pay_mode','rate',(job_input->>'rate')::numeric); end if;
 if jid is null then
 insert into work_order_jobs(tenant_id,work_order_id,staff_id,service_id,title,stage,position,price,pay_mode,rate,checklist,status)
 values(o.tenant_id,o.id,sid,svc,trim(job_input->>'title'),coalesce(nullif(job_input->>'stage',''),'Виконання'),pos,(job_input->>'price')::numeric,r->>'mode',(r->>'rate')::numeric,checks,case when sid is null then 'new' else 'assigned' end) returning id into jid;
 else
 update work_order_jobs set staff_id=sid,service_id=svc,title=trim(job_input->>'title'),stage=coalesce(nullif(job_input->>'stage',''),'Виконання'),position=pos,price=(job_input->>'price')::numeric,pay_mode=r->>'mode',rate=(r->>'rate')::numeric,checklist=checks,status=case when sid is null then 'new' else 'assigned' end,version=version+1,updated_at=now() where id=jid;
 end if;
 insert into work_job_events(tenant_id,job_id,actor_id,event,detail) values(o.tenant_id,jid,auth.uid(),'assigned',jsonb_build_object('staff_id',sid,'pay',r));
 return jid;
end $$;

create function public.act_work_job(job_id_input uuid,action_input text,payload jsonb default '{}',expected_version integer default null) returns void language plpgsql security definer set search_path=public as $$
declare j work_order_jobs; manager boolean; seconds integer; payout numeric; checks jsonb;
begin
 -- Serialize all jobs on one car first, then the job (consistent with editor locks).
 perform 1 from work_orders where id=(select work_order_id from work_order_jobs where id=job_id_input) for update;
 select * into j from work_order_jobs where id=job_id_input for update;
 if j.id is null or not can_access_job(j.id) then raise exception 'Немає доступу'; end if;
 manager:=is_tenant_manager(j.tenant_id);
 -- Serialize start with attendance transitions and starting a second car.
 perform 1 from staff_profiles where id=j.staff_id for update;
 if action_input='approve' and j.status='approved' then return; end if;
 if j.version is distinct from expected_version then raise exception 'Дані змінилися. Оновіть картку й повторіть дію'; end if;
 if j.status='approved' then raise exception 'Роботу вже підтверджено'; end if;
 if exists(select 1 from work_orders where id=j.work_order_id and status in ('issued','cancelled')) then raise exception 'Замовлення закрите'; end if;
 seconds:=j.worked_seconds+case when j.running_since is null then 0 else greatest(0,floor(extract(epoch from now()-j.running_since))::integer) end;
 if action_input in ('start','check','submit') then
   if j.staff_id is null or not exists(select 1 from staff_shifts where staff_id=j.staff_id and ended_at is null and paused_at is null) then raise exception 'Майстер має почати зміну та завершити перерву'; end if;
 end if;
 if action_input='start' then
   if j.status not in ('assigned','waiting') then raise exception 'Роботу неможливо розпочати'; end if;
   if exists(select 1 from work_order_jobs where work_order_id=j.work_order_id and position<j.position and status<>'approved') then raise exception 'Попередній етап має пройти перевірку'; end if;
   if exists(select 1 from work_order_jobs where staff_id=j.staff_id and running_since is not null) then raise exception 'Призупиніть іншу активну роботу'; end if;
   update work_order_jobs set status='in_progress',running_since=now() where id=j.id;
 elsif action_input='pause' then
   if j.status<>'in_progress' then raise exception 'Робота не виконується'; end if;
   update work_order_jobs set status='waiting',worked_seconds=seconds,running_since=null where id=j.id;
 elsif action_input='check' then
   if j.status<>'in_progress' then raise exception 'Спочатку почніть роботу'; end if;
   if not exists(select 1 from jsonb_array_elements(j.checklist) v where v->>'id'=payload->>'item_id') or jsonb_typeof(payload->'done') is distinct from 'boolean' then raise exception 'Невірний пункт'; end if;
   select jsonb_agg(case when v->>'id'=payload->>'item_id' then jsonb_set(v,'{done}',payload->'done') else v end order by n) into checks from jsonb_array_elements(j.checklist) with ordinality x(v,n);
   update work_order_jobs set checklist=checks where id=j.id;
 elsif action_input='submit' then
   if j.status not in ('in_progress','waiting') or jsonb_array_length(j.checklist)=0 or exists(select 1 from jsonb_array_elements(j.checklist) v where v->'done' is distinct from 'true'::jsonb) then raise exception 'Виконайте весь чек-лист'; end if;
   update work_order_jobs set status='review',worked_seconds=seconds,running_since=null,submitted_at=now() where id=j.id;
 elsif action_input='return' then
   if not manager or j.status<>'review' or length(trim(coalesce(payload->>'note','')))<3 then raise exception 'Вкажіть причину повернення'; end if;
   update work_order_jobs set status='waiting',review_note=trim(payload->>'note'),checklist=(select jsonb_agg(jsonb_set(v,'{done}','false')) from jsonb_array_elements(j.checklist) v) where id=j.id;
 elsif action_input='approve' then
   if not manager or j.status<>'review' or payload->'quality' is distinct from 'true'::jsonb or payload->'defects' is distinct from 'true'::jsonb then raise exception 'Перевірте якість і відсутність дефектів'; end if;
   payout:=round(case j.pay_mode when 'fixed' then j.rate when 'hourly' then j.rate*j.worked_seconds/3600 else j.price*j.rate/100 end,2);
   insert into staff_earnings(tenant_id,staff_id,work_order_id,job_id,amount,calculation,approved_by,note)
   values(j.tenant_id,j.staff_id,j.work_order_id,j.id,payout,jsonb_build_object('title',j.title,'price',j.price,'mode',j.pay_mode,'rate',j.rate,'seconds',j.worked_seconds),auth.uid(),payload->>'note');
   update work_order_jobs set status='approved',approved_at=now(),approved_by=auth.uid(),review_note=coalesce(payload->>'note','') where id=j.id;
 elsif action_input='note' then
   if j.status='review' or length(coalesce(payload->>'note',''))>4000 then raise exception 'Примітка недоступна'; end if;
   update work_order_jobs set note=coalesce(payload->>'note','') where id=j.id;
 elsif action_input='photo' then
   if j.status='review' or jsonb_array_length(j.attachments)>=12 or coalesce(payload->>'path','') not like j.tenant_id::text||'/'||j.id::text||'/%' then raise exception 'Фото недоступне'; end if;
   if not exists(select 1 from storage.objects where bucket_id='job-photos' and name=payload->>'path') then raise exception 'Спочатку завантажте фото'; end if;
   if exists(select 1 from jsonb_array_elements(j.attachments) a where a->>'path'=payload->>'path') then return; end if;
   update work_order_jobs set attachments=attachments||jsonb_build_array(jsonb_build_object('path',payload->>'path','name',left(payload->>'name',120))) where id=j.id;
 elsif action_input='delete' then
   if not manager or j.status not in ('new','assigned') or j.worked_seconds>0 or (select count(*) from work_order_jobs where work_order_id=j.work_order_id)<2 then raise exception 'Не можна видалити цю роботу'; end if;
   delete from work_order_jobs where id=j.id; return;
 else raise exception 'Невідома дія'; end if;
 update work_order_jobs set version=version+1,updated_at=now() where id=j.id;
 insert into work_job_events(tenant_id,job_id,actor_id,event,detail) values(j.tenant_id,j.id,auth.uid(),action_input,payload);
end $$;

create function public.manage_master_shift(staff_id_input uuid,action_input text) returns void language plpgsql security definer set search_path=public as $$
declare s staff_profiles; sh staff_shifts;
begin
 select * into s from staff_profiles where id=staff_id_input and active for update;
 if s.id is null or not is_own_staff_profile(s.id) then raise exception 'Зміну відмічає майстер зі свого акаунта'; end if;
 select * into sh from staff_shifts where staff_id=s.id and ended_at is null for update;
 if action_input='start' then
   if sh.id is null then insert into staff_shifts(tenant_id,staff_id) values(s.tenant_id,s.id); end if;
 elsif action_input in ('pause','end') then
   if sh.id is null then raise exception 'Зміна не розпочата'; end if;
   -- Consistent order: callers pause their running job before taking a break.
   if exists(select 1 from work_order_jobs where staff_id=s.id and running_since is not null) then raise exception 'Спочатку призупиніть поточну роботу'; end if;
   if action_input='pause' and sh.paused_at is null then update staff_shifts set paused_at=now() where id=sh.id; end if;
   if action_input='end' then update staff_shifts set ended_at=now(),paused_at=null,pause_seconds=pause_seconds+case when sh.paused_at is null then 0 else floor(extract(epoch from now()-sh.paused_at))::integer end,breaks=case when sh.paused_at is null then breaks else breaks||jsonb_build_array(jsonb_build_object('from',sh.paused_at,'to',now())) end where id=sh.id; end if;
 elsif action_input='resume' then
   if sh.paused_at is null then raise exception 'Перерву не розпочато'; end if;
   update staff_shifts set pause_seconds=pause_seconds+extract(epoch from now()-paused_at)::integer,breaks=breaks||jsonb_build_array(jsonb_build_object('from',paused_at,'to',now())),paused_at=null where id=sh.id;
 else raise exception 'Невідома дія'; end if;
end $$;

create function public.record_staff_payout(earning_id_input uuid,amount_input numeric,method_input public.payment_method,request_id uuid,note_input text default '') returns void language plpgsql security definer set search_path=public as $$
declare e staff_earnings; prior staff_payouts;
begin
 select * into e from staff_earnings where id=earning_id_input for update;
 if e.id is null or not is_tenant_manager(e.tenant_id) then raise exception 'Немає доступу'; end if;
 select * into prior from staff_payouts where id=request_id;
 if prior.id is not null then
 if prior.earning_id<>e.id or prior.amount<>amount_input or prior.method<>method_input then raise exception 'Ключ виплати вже використано'; end if; return; end if;
 if e.status='void' or amount_input is null or amount_input<=0 or amount_input<>round(amount_input,2) or amount_input>e.amount-e.paid_amount then raise exception 'Сума перевищує залишок або некоректна'; end if;
 insert into staff_payouts(id,tenant_id,earning_id,amount,method,note,created_by) values(request_id,e.tenant_id,e.id,amount_input,method_input,note_input,auth.uid());
 update staff_earnings set paid_amount=paid_amount+amount_input,status=case when paid_amount+amount_input=amount then 'paid' else 'accrued' end,paid_at=case when paid_amount+amount_input=amount then now() else paid_at end where id=e.id;
 insert into cash_transactions(tenant_id,payout_id,direction,amount,payment_method,category,title,note,created_by) values(e.tenant_id,request_id,'expense',amount_input,method_input,'Зарплата майстрів','Виплата за роботу',note_input,auth.uid());
end $$;
-- Immutable payout journal entries cannot be edited/deleted through the generic cash screen.
create function public.guard_payout_cash() returns trigger language plpgsql as $$ begin
 if old.payout_id is not null then raise exception 'Виплата зарплати зберігається в історії'; end if; return coalesce(new,old); end $$;
create trigger guard_payout_cash before update or delete on public.cash_transactions for each row execute function public.guard_payout_cash();

-- Old UI cannot approve an entire car and pay the same jobs again.
create or replace function public.approve_work_order(target_work_order_id uuid,reviewer_note text default null) returns public.staff_earnings language plpgsql security definer set search_path=public as $$
begin raise exception 'Відкрийте роботи замовлення та перевірте кожну окремо'; end $$;
revoke all on function public.job_rate(uuid,uuid),public.sync_job_order(),public.seed_order_job() from public,anon,authenticated;
revoke all on function public.save_work_job(uuid,jsonb,integer),public.act_work_job(uuid,text,jsonb,integer),public.manage_master_shift(uuid,text),public.record_staff_payout(uuid,numeric,public.payment_method,uuid,text) from public,anon;
grant execute on function public.save_work_job(uuid,jsonb,integer),public.act_work_job(uuid,text,jsonb,integer),public.manage_master_shift(uuid,text),public.record_staff_payout(uuid,numeric,public.payment_method,uuid,text) to authenticated;
grant execute on function public.can_access_job(uuid),public.can_read_job_order(uuid) to authenticated;
commit;
