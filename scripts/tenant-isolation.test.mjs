import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile,readdir} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist'
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8')
const id=n=>`a0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const A=id(1),B=id(2),OWNER=id(11),ADMIN=id(12),ADMIN_FIN=id(13),MASTER=id(14),MASTER2=id(15),OWNER_B=id(21)

// Full schema from every migration, with Supabase's default table grants, so RLS is the only barrier.
async function schema(){
 const db=new PGlite({extensions:{btree_gist}})
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',email text,email_confirmed_at timestamptz,encrypted_password text,last_sign_in_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text,metadata jsonb);alter table storage.objects enable row level security;
 grant usage on schema public,auth,storage to authenticated,anon,service_role;`)
 await db.exec((await read('supabase/schema.sql')).replace('create extension if not exists pgcrypto;',''))
 for(const f of (await readdir(new URL('../supabase/migrations/',import.meta.url))).sort()){
  if(f.startsWith('029_')||f.startsWith('030_'))continue
  if(f.startsWith('033_'))await db.exec('grant select,insert,update,delete on all tables in schema public to authenticated,anon;')
  try{await db.exec(await read(f.startsWith('028_')?'supabase/deploy/workflow_028_030.sql':'supabase/migrations/'+f))}catch(e){throw new Error(f+': '+e.message)}
 }
 return db
}

async function seed(db){
 await db.exec(`set session_replication_role=replica;
 insert into auth.users(id,email,email_confirmed_at) values('${OWNER}','o@a.test',now()),('${ADMIN}','ad@a.test',now()),('${ADMIN_FIN}','af@a.test',now()),('${MASTER}','m@a.test',now()),('${MASTER2}','m2@a.test',now()),('${OWNER_B}','o@b.test',now());
 insert into profiles(id,full_name) select id,email from auth.users;
 insert into tenants(id,name,slug) values('${A}','A','studio-aaa'),('${B}','B','studio-bbb');
 insert into tenant_memberships(tenant_id,user_id,role,active,finance_access) values('${A}','${OWNER}','owner',true,true),('${A}','${ADMIN}','admin',true,false),('${A}','${ADMIN_FIN}','admin',true,true),('${A}','${MASTER}','master',true,false),('${A}','${MASTER2}','master',true,false),('${B}','${OWNER_B}','owner',true,true);
 insert into subscriptions(tenant_id,plan,status,current_period_end) values('${A}','pro','active',now()+interval '30 days'),('${B}','pro','active',now()+interval '30 days');
 insert into staff_profiles(id,tenant_id,user_id,full_name,active,compensation_percent,hourly_rate) values('${id(31)}','${A}','${MASTER}','Master',true,30,200),('${id(32)}','${A}','${MASTER2}','Master2',true,25,150);
 insert into clients(id,tenant_id,full_name,phone) values('${id(41)}','${A}','Client A','+380501112233'),('${id(42)}','${B}','Client B','+380509998877');
 insert into work_orders(id,tenant_id,client_id,staff_id,title,total,status) values('${id(51)}','${A}','${id(41)}','${id(31)}','Order mine',1000,'new');
 insert into work_order_jobs(id,tenant_id,work_order_id,staff_id,title,status,price) values('${id(71)}','${A}','${id(51)}','${id(31)}','Job mine','assigned',1000);
 insert into services(id,tenant_id,name,category,price,duration_minutes) values('${id(65)}','${A}','Wash','Мийка',500,60);
 insert into inventory_items(id,tenant_id,name,quantity,last_unit_cost) values('${id(61)}','${A}','Shampoo',10,100);
 insert into leads(id,tenant_id,title,phone,staff_id) values('${id(62)}','${A}','Lead mine','+380671234567','${id(31)}'),('${id(66)}','${A}','Lead other','+380671234568','${id(32)}');
 insert into tasks(id,tenant_id,title,staff_id) values('${id(63)}','${A}','Task mine','${id(31)}'),('${id(67)}','${A}','Task other','${id(32)}');
 insert into service_packages(id,tenant_id,name,price) values('${id(64)}','${A}','Pack',5000);
 insert into reminder_settings(tenant_id) values('${A}');
 insert into expenses(tenant_id,category,title,amount) values('${A}','Rent','Rent',10000);
 set session_replication_role=origin;`)
}

test('studios are isolated and in-studio roles only change what they own',async t=>{
 const db=await schema();t.after(()=>db.close());await seed(db)
 const q=async(s,p)=>(await db.query(s,p)).rows
 async function as(user,fn){
  await db.exec(`reset role;select set_config('request.jwt.claim.sub','${user}',false);select set_config('request.jwt.claims','{"sub":"${user}","role":"authenticated","aal":"aal1"}',false);set role authenticated;`)
  try{return await fn()}finally{await db.exec('reset role')}
 }
 // Runs a statement and rolls it back; returns affected rows or the error.
 async function attempt(user,sql){
  await db.exec('begin')
  try{return await as(user,async()=>{await db.exec('savepoint attempt');try{const r=await db.query(sql);return {rows:r.rows.length||r.affectedRows||0}}catch(e){await db.exec('rollback to savepoint attempt');return {error:e.message}}})}
  finally{await db.exec('rollback')}
 }
 const denied=r=>!!r.error||r.rows===0

 // Another studio sees and changes nothing
 for(const table of ['clients','work_orders','staff_profiles','inventory_items','leads','tasks','service_packages','reminder_settings','expenses','subscriptions','tenant_memberships','audit_logs']){
  const rows=await as(OWNER_B,()=>q(`select count(*)::int n from ${table} where tenant_id=$1`,[A]))
  assert.equal(rows[0].n,0,`${table} leaks to another studio`)
 }
 assert.ok(denied(await attempt(OWNER_B,`insert into clients(tenant_id,full_name) values('${A}','x')`)))
 assert.ok(denied(await attempt(OWNER_B,`update clients set full_name='x' where id='${id(41)}'`)))
 assert.ok(denied(await attempt(OWNER_B,`update clients set tenant_id='${A}' where id='${id(42)}'`)))

 // A master cannot change stock, packages, leads, tasks or reminder settings
 for(const sql of [
  `delete from inventory_items where id='${id(61)}'`,
  `update inventory_items set quantity=0,last_unit_cost=1 where id='${id(61)}'`,
  `insert into inventory_movements(tenant_id,inventory_item_id,movement_type,quantity) values('${A}','${id(61)}','adjustment',-5)`,
  `update service_packages set price=1 where id='${id(64)}'`,
  `delete from leads where tenant_id='${A}'`,
  `update leads set status='lost' where id='${id(62)}'`,
  `delete from tasks where tenant_id='${A}'`,
  `delete from reminder_settings where tenant_id='${A}'`,
  `update work_orders set total=1 where id='${id(51)}'`,
 ])assert.ok(denied(await attempt(MASTER,sql)),'master allowed: '+sql)
 // ...and reads only their own leads and tasks
 assert.deepEqual((await as(MASTER,()=>q('select title from leads'))).map(r=>r.title),['Lead mine'])
 assert.deepEqual((await as(MASTER,()=>q('select title from tasks'))).map(r=>r.title),['Task mine'])
 assert.equal((await as(MASTER,()=>q('select count(*)::int n from inventory_items')))[0].n,0)
 assert.equal((await as(MASTER,()=>q('select count(*)::int n from service_packages')))[0].n,1)

 // Managers keep their working rights
 for(const sql of [
  `update inventory_items set quantity=9 where id='${id(61)}'`,
  `insert into inventory_movements(tenant_id,inventory_item_id,movement_type,quantity) values('${A}','${id(61)}','write_off',-1)`,
  `update service_packages set price=4500 where id='${id(64)}'`,
  `update leads set status='lost' where id='${id(66)}'`,
  `delete from tasks where id='${id(67)}'`,
  `update reminder_settings set email_enabled=true where tenant_id='${A}'`,
 ])assert.equal((await attempt(ADMIN,sql)).rows,1,'admin blocked: '+sql)

 // Base rates: hidden from direct reads, shown by get_team_profiles only with finance access
 assert.match((await attempt(ADMIN,'select hourly_rate from staff_profiles')).error||'',/permission denied/)
 assert.match((await attempt(ADMIN_FIN,'select compensation_percent from staff_profiles')).error||'',/permission denied/)
 assert.equal((await attempt(ADMIN,'select id,full_name,active from staff_profiles')).rows,2)
 const team=async user=>(await as(user,()=>q('select get_team_profiles($1) p',[A])))[0].p
 assert.equal((await team(ADMIN)).some(p=>'hourly_rate' in p),false)
 assert.equal((await team(ADMIN_FIN)).every(p=>'hourly_rate' in p),true)
 assert.ok(denied(await attempt(ADMIN,`update staff_profiles set hourly_rate=999 where id='${id(31)}'`)))
 assert.ok(denied(await attempt(ADMIN,`update tenant_memberships set finance_access=true where user_id=auth.uid()`)))

 // Only the platform marks a studio as internal
 assert.match((await attempt(OWNER,`update tenants set is_internal=true where id='${A}'`)).error||'',/лише платформа/)
 await db.exec(`update tenants set is_internal=false where id='${A}'`)

 // Price, stock and studio-setting changes are audited with the actor
 await as(OWNER,async()=>{
  await db.query(`update services set price=600 where id='${id(65)}'`)
  await db.query(`update inventory_items set quantity=8 where id='${id(61)}'`)
  await db.query(`update tenants set name='A renamed' where id='${A}'`)
 })
 const audit=await q(`select entity_type,actor_id from audit_logs where tenant_id=$1 and entity_type in ('services','inventory_items','tenants') order by entity_type`,[A])
 assert.deepEqual(audit.map(r=>r.entity_type),['inventory_items','services','tenants'])
 assert.ok(audit.every(r=>r.actor_id===OWNER))
})

test('a master shift starts only after an owner or admin confirms it',async t=>{
 const db=await schema();t.after(()=>db.close());await seed(db)
 const q=async(s,p)=>(await db.query(s,p)).rows
 async function as(user,fn){
  await db.exec(`reset role;select set_config('request.jwt.claim.sub','${user}',false);select set_config('request.jwt.claims','{"sub":"${user}","role":"authenticated","aal":"aal1"}',false);set role authenticated;`)
  try{return await fn()}finally{await db.exec('reset role')}
 }
 const fails=async(user,sql)=>{try{await as(user,()=>db.query(sql));return false}catch{return true}}
 const M=id(31),open=async()=>(await q(`select count(*)::int n from staff_shifts where staff_id=$1 and ended_at is null`,[M]))[0].n
 await as(MASTER,()=>db.query(`select manage_master_shift('${M}','start')`))
 assert.equal(await open(),0,'start must wait for confirmation')
 const [req]=await q(`select id,status from shift_requests where staff_id=$1`,[M]);assert.equal(req.status,'pending')
 assert.ok(await fails(MASTER,`select decide_shift_request('${req.id}',true)`),'master confirms own shift')
 assert.ok(await fails(OWNER_B,`select decide_shift_request('${req.id}',true)`),'another studio confirms')
 await as(ADMIN,()=>db.query(`select decide_shift_request('${req.id}',false,'Ще не на місці')`))
 assert.equal((await as(MASTER,()=>q(`select reason from shift_requests where staff_id=$1`,[M])))[0].reason,'Ще не на місці')
 assert.equal(await open(),0)
 await db.exec(`update shift_requests set requested_at=now()-interval '2 hours' where staff_id='${M}'`)
 await as(MASTER,()=>db.query(`select manage_master_shift('${M}','start')`))
 const [again]=await q(`select id,status from shift_requests where staff_id=$1`,[M]);assert.equal(again.status,'pending')
 await db.exec(`update shift_requests set requested_at=now()-interval '2 hours' where staff_id='${M}'`)
 await as(OWNER,()=>db.query(`select decide_shift_request('${again.id}',true)`))
 const [shift]=await q(`select started_at>now()-interval '1 minute' fresh from staff_shifts where staff_id=$1 and ended_at is null`,[M])
 assert.ok(shift?.fresh,'shift counts from the confirmation, not the request')
 assert.equal((await q(`select count(*)::int n from shift_requests where staff_id=$1`,[M]))[0].n,0)
 // with the setting off the master starts immediately
 await db.exec(`update staff_shifts set ended_at=now()+interval '1 second' where staff_id='${M}';update tenants set shift_approval=false where id='${A}'`)
 await as(MASTER,()=>db.query(`select manage_master_shift('${M}','start')`))
 assert.equal(await open(),1)
})

test('a studio approved by support gets a 5-day trial (migration 064)',async t=>{
 const db=await schema();t.after(()=>db.close())
 const [fn]=(await db.query("select prosrc from pg_proc where proname='support_review_application'")).rows
 assert.match(fn.prosrc,/now\(\)\+interval '5 days'/)
 assert.doesNotMatch(fn.prosrc,/14 days/)
 // migration 065: the database plan limits match src/lib/plans.ts
 const {subscriptionPlans}=await import('../src/lib/plans.ts')
 const [{cfg}]=(await db.query('select plan_configuration() cfg')).rows
 for(const p of subscriptionPlans){const d=cfg.find(x=>x.id===p.id);assert.deepEqual([d.price,d.staffLimit,d.adminLimit],[p.price,p.staffLimit,p.adminLimit],p.id)}
})

test('promo codes: support creates them, signup stores the code, approval applies it once (migration 066)',async t=>{
 const db=await schema();t.after(()=>db.close())
 const q=async(s,p)=>(await db.query(s,p)).rows
 const SUPPORT=id(81),SERVICE=id(82),OWNER1=id(83),OWNER2=id(84)
 await db.exec(`set session_replication_role=replica;insert into auth.users(id,email,email_confirmed_at) values('${SUPPORT}','s@x.test',now());insert into profiles(id,full_name) values('${SUPPORT}','Support');insert into tenants(id,name,slug,is_internal) values('${SERVICE}','Detailflow Support','support-x',true);insert into tenant_memberships(tenant_id,user_id,role,active) values('${SERVICE}','${SUPPORT}','super_admin',true);set session_replication_role=default;`)
 const claims=(user,extra={})=>JSON.stringify({sub:user,role:'authenticated',aal:'aal2',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)}],...extra})
 async function as(user,fn,aal2=true){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${user}',false);select set_config('request.jwt.claims','${aal2?claims(user):JSON.stringify({sub:user,role:'authenticated',aal:'aal1'})}',false);set role ${user?'authenticated':'anon'};`);try{return await fn()}finally{await db.exec('reset role')}}
 const save=(code,kind,value,max=null)=>as(SUPPORT,()=>q(`select support_save_promo_code(null,$1,$2,$3,current_date+30,$4,true,'test') id`,[code,kind,value,max]))
 const [{id:days}]=await save('extra7','trial_days',7);const [{id:half}]=await save('HALF50','percent',50,1)
 assert.deepEqual((await as(null,()=>q("select check_promo_code(' extra7 ') r")))[0].r,{valid:true,kind:'trial_days',value:7})
 assert.deepEqual((await as(null,()=>q("select check_promo_code('NOPE') r")))[0].r,{valid:false})
 await assert.rejects(as(null,()=>q('select * from promo_codes')),/permission denied/)
 await assert.rejects(as(OWNER,()=>q(`select support_save_promo_code(null,'HACK','percent',100,null,null,true,'')`)),/Потрібні права/)
 for(const [user,code,email] of [[OWNER1,'extra7','a@x.test'],[OWNER2,'half50','b@x.test']])
  await db.query(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3)`,[user,email,JSON.stringify({requested_role:'owner',studio_name:'S '+code,selected_plan:'studio',promo_code:code})])
 const reqs=await q(`select id,user_id,promo_code from studio_access_requests where user_id in ($1,$2) order by promo_code`,[OWNER1,OWNER2])
 assert.deepEqual(reqs.map(r=>r.promo_code),['EXTRA7','HALF50'])
 const approve=req=>as(SUPPORT,()=>q(`select support_review_application($1,true,'ok') id`,[req]))
 const [{id:s1}]=await approve(reqs.find(r=>r.user_id===OWNER1).id),[{id:s2}]=await approve(reqs.find(r=>r.user_id===OWNER2).id)
 assert.equal((await q(`select round(extract(epoch from trial_ends_at-now())/86400) d from subscriptions where tenant_id=$1`,[s1]))[0].d,'12')
 assert.equal(Number((await q(`select price_override from subscriptions where tenant_id=$1`,[s2]))[0].price_override),295)
 assert.deepEqual((await q(`select code,uses from promo_codes order by code`)).map(r=>[r.code,r.uses]),[['EXTRA7',1],['HALF50',1]])
 // HALF50 allowed one use: it is now spent, and a used code keeps its kind and value
 assert.deepEqual((await as(null,()=>q("select check_promo_code('HALF50') r")))[0].r,{valid:false})
 await assert.rejects(as(SUPPORT,()=>q(`select support_save_promo_code($1,'HALF50','percent',90,null,null,true,'')`,[half])),/уже використано/)
})

test('Telegram: one-time links, chats hidden from the app, jobs for staff and the subscribed client (migration 067)',async t=>{
 const db=await schema();t.after(()=>db.close());await seed(db)
 const q=async(s,p)=>(await db.query(s,p)).rows
 async function as(user,fn){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${user||''}',false);select set_config('request.jwt.claims','${JSON.stringify({sub:user,role:user?'authenticated':'anon'})}',false);set role ${user?'authenticated':'anon'};`);try{return await fn()}finally{await db.exec('reset role')}}
 for(const fn of ['telegram_bind(text,bigint,text)','telegram_unbind(bigint)','enqueue_telegram_reminders()'])
  for(const role of ['anon','authenticated'])assert.equal((await q(`select has_function_privilege('${role}','public.${fn}','EXECUTE') ok`))[0].ok,false,`${role} must not run ${fn}`)
 await assert.rejects(as(null,()=>q('select create_my_telegram_link()')),/permission denied|Потрібен/)
 await assert.rejects(as(OWNER,()=>q('select * from telegram_chats')),/permission denied/)
 await assert.rejects(as(OWNER,()=>q('select * from telegram_link_tokens')),/permission denied/)
 // staff: link, a second link replaces the first, a used link is spent
 const link=async user=>(await as(user,()=>q('select create_my_telegram_link() t')))[0].t
 const old=await link(MASTER),token=await link(MASTER)
 assert.match(token,/^[a-f0-9]{32}$/)
 assert.equal((await q(`select telegram_bind($1,100,'uk') r`,[old]))[0].r.status,'invalid')
 assert.equal((await q(`select telegram_bind($1,100,'uk') r`,[token]))[0].r.status,'staff')
 assert.equal((await q(`select telegram_bind($1,100,'uk') r`,[token]))[0].r.status,'invalid')
 assert.equal((await q(`select telegram_bind($1,200,'en') r`,[await link(OWNER)]))[0].r.status,'staff')
 assert.equal((await as(MASTER,()=>q('select my_telegram_linked() v')))[0].v,true)
 assert.equal((await as(ADMIN,()=>q('select my_telegram_linked() v')))[0].v,false)
 const late=await link(ADMIN);await db.query(`update telegram_link_tokens set expires_at=now()-interval '1 minute' where token=$1`,[late])
 assert.equal((await q(`select telegram_bind($1,300,'uk') r`,[late]))[0].r.status,'invalid')
 // work assigned to the master and a new online request for owner/admins go to linked chats only
 await db.query(`update work_order_jobs set status='review' where id=$1`,[id(71)]);await db.query(`update work_order_jobs set status='assigned' where id=$1`,[id(71)])
 const appt=id(91),starts="now()+interval '90 minutes'"
 await db.exec(`insert into appointments(id,tenant_id,client_id,starts_at,ends_at,status,source) values('${appt}','${A}','${id(41)}',${starts},${starts}+interval '1 hour','pending','public')`)
 const jobs=await q(`select kind,recipient_user_id u from notification_jobs where channel='telegram' order by kind,recipient_user_id`)
 assert.deepEqual(jobs.map(j=>[j.kind,j.u]),[['booking_request',OWNER],['work_assigned',MASTER],['work_review',OWNER]])
 // client: subscribes to this booking, gets the confirmation and the 2-hour reminder
 await db.query(`insert into telegram_link_tokens(token,appointment_id,expires_at) values($1,$2,now()+interval '1 hour')`,['c'.repeat(32),appt])
 assert.deepEqual((await q(`select telegram_bind($1,555,'uk') r`,['c'.repeat(32)]))[0].r,{status:'client',studio:'A'})
 await db.query(`update reminder_settings set reminder_2h_enabled=true where tenant_id=$1`,[A])
 await db.query(`update appointments set status='confirmed' where id=$1`,[appt])
 await q('select enqueue_telegram_reminders()');await q('select enqueue_telegram_reminders()')
 assert.deepEqual((await q(`select kind from notification_jobs where channel='telegram' and recipient_user_id is null order by kind`)).map(r=>r.kind),['booking_confirmed','visit_2'])
 // /stop removes every link of the chat; unlinking in the app removes the staff link
 assert.equal((await q('select telegram_unbind(555) n'))[0].n,1)
 await as(MASTER,()=>q('select unlink_my_telegram()'));assert.equal((await as(MASTER,()=>q('select my_telegram_linked() v')))[0].v,false)
})
