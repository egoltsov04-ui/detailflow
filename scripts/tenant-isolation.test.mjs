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
