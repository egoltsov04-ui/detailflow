import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile,readdir} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist'
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8')
test('platform migrations, billing idempotence, administrator permissions and specialization',async t=>{
 const db=new PGlite({extensions:{btree_gist}});t.after(()=>db.close())
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',email text,email_confirmed_at timestamptz,encrypted_password text,last_sign_in_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text);alter table storage.objects enable row level security;
 grant usage on schema public,auth,storage to authenticated,anon,service_role;`)
 await db.exec((await read('supabase/schema.sql')).replace('create extension if not exists pgcrypto;',''))
 for(const f of (await readdir(new URL('../supabase/migrations/',import.meta.url))).sort()){
  if(f.startsWith('013_')||f.startsWith('029_')||f.startsWith('030_'))continue
  if(f.startsWith('033_'))await db.exec('grant select,insert,update,delete on all tables in schema public to authenticated;')
  try{await db.exec(await read(f.startsWith('028_')?'supabase/deploy/workflow_028_030.sql':'supabase/migrations/'+f))}catch(e){throw new Error(f+': '+e.message)}
 }
 // New migrations must survive a repeated SQL Editor run.
 for(const f of ['033_staff_specializations.sql','034_subscription_lifecycle.sql','035_studio_administrators.sql','036_receipts_crm.sql','037_operational_permissions.sql','038_manual_booking.sql','039_operations.sql'])await db.exec(await read('supabase/migrations/'+f))
 await db.exec(await read('supabase/deploy/platform_033_039.sql'))
 const ids=Array.from({length:10},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)
 const [owner,admin,master,studio,staff,service,otherService,client,appointment,otherStudio]=ids
 await db.query('insert into auth.users(id) values($1),($2),($3)',[owner,admin,master])
 await db.query("insert into tenants(id,name,slug) values($1,'Test','test'),($2,'Other','other')",[studio,otherStudio])
 await db.query("insert into tenant_memberships(tenant_id,user_id,role) values($1,$2,'owner'),($1,$3,'admin'),($1,$4,'master')",[studio,owner,admin,master])
 await db.query("insert into subscriptions(tenant_id,plan,status,trial_ends_at) values($1,'start','trialing',now()+interval '14 days')",[studio])
 await db.query("insert into staff_profiles(id,tenant_id,user_id,full_name,compensation_percent) values($1,$2,$3,'Master',30)",[staff,studio,master])
 await db.query("insert into services(id,tenant_id,name,category,price,duration_minutes) values($1,$3,'Wash','Wash',100,60),($2,$3,'Polish','Polish',200,60)",[service,otherService,studio])
 await db.query("insert into clients(id,tenant_id,full_name,phone) values($1,$2,'Client','1234567890')",[client,studio])
 const login=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated')}
 await login(owner)
 await db.query('select set_staff_services($1,false,$2::uuid[])',[staff,[service]])
 assert.equal((await db.query('select staff_can_perform($1,$2) ok',[staff,otherService])).rows[0].ok,false)
 await db.query("insert into appointments(id,tenant_id,client_id,staff_id,starts_at,ends_at) values($1,$2,$3,$4,now()+interval '1 day',now()+interval '1 day 1 hour')",[appointment,studio,client,staff])
 await assert.rejects(db.query("insert into appointment_services(appointment_id,service_id,service_name,unit_price,duration_minutes) values($1,$2,'Polish',200,60)",[appointment,otherService]),/не виконує/)
 await db.query("insert into appointment_services(appointment_id,service_id,service_name,unit_price,duration_minutes) values($1,$2,'Wash',100,60)",[appointment,service])
 // Manual bookings use saved variant values and are repeatable without duplicate clients.
 await db.query('update services set variants=$1 where id=$2',[[{id:'xl',name:'XL',price:150,duration_minutes:90}],service])
 const manual={client:'Manual client',phone:'+380991234567',vehicle:'Audi A4 AA 9999 AA',service:'Wash',variant_id:'xl',date:'2026-10-04',time:'11:00',expected_price:150,expected_minutes:90}
 const mid='20000000-0000-4000-8000-000000000001'
 const made=(await db.query('select create_manual_booking($1,$2,$3) data',[studio,mid,manual])).rows[0].data
 assert.equal((await db.query('select create_manual_booking($1,$2,$3) data',[studio,mid,manual])).rows[0].data.id,made.id)
 const booked=(await db.query('select starts_at,ends_at,staff_id from appointments where id=$1',[made.id])).rows[0]
 assert.equal(booked.staff_id,null);assert.equal(new Date(booked.ends_at)-new Date(booked.starts_at),90*60000)
 assert.equal(Number((await db.query('select unit_price from appointment_services where appointment_id=$1',[made.id])).rows[0].unit_price),150)
 const countBefore=(await db.query('select count(*)::int n from clients')).rows[0].n
 await assert.rejects(db.query('select create_manual_booking($1,$2,$3)',[studio,'20000000-0000-4000-8000-000000000002',{...manual,phone:'+380991234568',expected_price:1}]),/Ціна/)
 assert.equal((await db.query('select count(*)::int n from clients')).rows[0].n,countBefore)
 await login(admin)
 assert.equal((await db.query('select can_view_finance($1) ok',[studio])).rows[0].ok,false)
 assert.equal((await db.query('select resolve_my_access() access')).rows[0].access.role,'admin')
 await assert.rejects(db.query('select compensation_percent from staff_profiles'),/permission denied/)
 const team=(await db.query('select get_team_profiles($1) data',[studio])).rows[0].data
 assert.equal('compensation_percent' in team[0],false)
 assert.equal((await db.query("update tenant_memberships set finance_access=true where user_id=$1 returning user_id",[admin])).rows.length,0)
 await assert.rejects(db.query("insert into expenses(tenant_id,expense_date,category,title,amount,payment_method) values($1,current_date,'Test','Test',1,'cash')",[studio]),/row-level security/)
 const snapshot=(await db.query('select get_workflow_snapshot($1) data',[studio])).rows[0].data
 assert.equal(snapshot.jobs.length,2);assert.equal(snapshot.jobs[0].can_view_pay,false);assert.equal('rate' in snapshot.jobs[0],false)
 await assert.rejects(db.query('select get_workflow_snapshot($1)',[otherStudio]),/Немає доступу/)
 await assert.rejects(db.query('select apply_subscription_payment($1,690,\'UAH\',\'Approved\')',['fake']),/permission denied/)
 await assert.rejects(db.query('select compensation_percent from work_orders'),/permission denied/)
 const orderData=(await db.query('select get_studio_orders($1) data',[studio])).rows[0].data
 assert.equal('compensation_percent' in orderData[0],false)
 await assert.rejects(db.query("insert into staff_profiles(tenant_id,full_name,compensation_percent) values($1,'Injected rate',99)",[studio]),/Немає прав/)
 // CRM saves client and several cars atomically and rejects cross-tenant edits.
 const card={name:'Updated client',phone:'+380931234567',email:'client@example.com',notes:'Regular visitor',tags:['VIP'],vehicles:[{make:'BMW',model:'X5',plate:'AA1234AA',year:'2022'},{make:'Tesla',model:'3',plate:'AA5678AA',year:'2023'}]}
 await db.query('select save_client_card($1,$2,$3)',[studio,client,card])
 assert.equal((await db.query('select count(*)::int n from vehicles where client_id=$1',[client])).rows[0].n,2)
 await assert.rejects(db.query('select save_client_card($1,$2,$3)',[otherStudio,client,card]),/Немає доступу/)
 // The operational administrator can collect payment without reading the finance journal.
 const oid=orderData.find(o=>o.appointment_id===appointment).id,paymentId='10000000-0000-4000-8000-000000000001'
 await db.query("select record_order_payment($1,20,'card',current_date,$2)",[oid,paymentId])
 await db.query("select record_order_payment($1,20,'card',current_date,$2)",[oid,paymentId])
 assert.equal(Number((await db.query('select deposit from work_orders where id=$1',[oid])).rows[0].deposit),20)
 assert.equal((await db.query('select count(*)::int n from cash_transactions')).rows[0].n,0)
 assert.equal((await db.query('select count(*)::int n from audit_logs')).rows[0].n,0)
 await assert.rejects(db.query("select record_order_payment($1,21,'card',current_date,$2)",[oid,paymentId]),/вже використаний/)
 await assert.rejects(db.query('select issue_order_receipt($1,0)',[oid]),/підтвердьте/)
 await db.query('select save_work_job($1,$2,$3)',[oid,{id:snapshot.jobs.find(j=>j.work_order_id===oid).id,title:'Wash',staff_id:staff,service_id:service,price:100,pay_mode:'auto',checklist:[{title:'Clean car'}]},snapshot.jobs.find(j=>j.work_order_id===oid).version])
 await login(master)
 await db.query("select manage_master_shift($1,'start')",[staff])
 const act=async(action,payload={})=>{const j=(await db.query('select get_workflow_snapshot($1) data',[studio])).rows[0].data.jobs.find(j=>j.work_order_id===oid);await db.query('select act_work_job($1,$2,$4,$3)',[j.id,action,j.version,payload]);return j}
 await act('start')
 const current=(await db.query('select get_workflow_snapshot($1) data',[studio])).rows[0].data.jobs[0]
 for(const c of current.checklist)await act('check',{item_id:c.id,done:true})
 await act('submit')
 await login(admin);await act('approve',{quality:true,defects:true})
 const receipt=(await db.query('select issue_order_receipt($1,10) data',[oid])).rows[0].data
 assert.equal(Number(receipt.total),90)
 assert.equal((await db.query('select issue_order_receipt($1,0) data',[oid])).rows[0].data.id,receipt.id)
 await assert.rejects(db.query("select record_order_payment($1,71,'card',current_date,'10000000-0000-4000-8000-000000000002')",[oid]),/залишок/)
 await db.query("select record_order_payment($1,70,'cash',current_date,'10000000-0000-4000-8000-000000000002')",[oid])
 assert.equal(Number((await db.query('select deposit from work_orders where id=$1',[oid])).rows[0].deposit),90)
 await login(owner)
 assert.equal((await db.query('select count(*)::int n from cash_transactions')).rows[0].n,2)
 await db.query('update tenant_memberships set finance_access=true where tenant_id=$1 and user_id=$2',[studio,admin])
 await login(admin);assert.equal((await db.query('select can_view_finance($1) ok',[studio])).rows[0].ok,true)
 await login(owner);await db.query('update tenant_memberships set active=false where user_id=$1',[admin])
 await login(admin);assert.equal((await db.query('select resolve_my_access() access')).rows[0].access.role,'blocked')
 await db.exec("reset role;select set_config('request.jwt.claim.sub','',false)")
 await db.query("insert into payment_orders(tenant_id,plan,amount,order_reference) values($1,'studio',1490,'TEST-1')",[studio])
 await assert.rejects(db.query("select apply_subscription_payment('TEST-1',1,'UAH','Approved')"),/does not match/)
 await db.exec("select apply_subscription_payment('TEST-1',1490,'UAH','Approved')")
 const end=(await db.query('select current_period_end from subscriptions where tenant_id=$1',[studio])).rows[0].current_period_end
 await db.exec("select apply_subscription_payment('TEST-1',1490,'UAH','Approved');select apply_subscription_payment('TEST-1',1490,'UAH','Declined')")
 assert.equal(String((await db.query('select current_period_end from subscriptions where tenant_id=$1',[studio])).rows[0].current_period_end),String(end))
 await db.query("update subscriptions set current_period_end=now()-interval '1 day' where tenant_id=$1",[studio])
 await assert.rejects(db.query("insert into appointments(tenant_id,client_id,starts_at,ends_at) values($1,$2,now()+interval '2 days',now()+interval '2 days 1 hour')",[studio,client]),/Період доступу/)
})
