import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile,readdir} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist'
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8')
test('subscription upsert and shift limits: permissions, idempotence and bounded work time',async t=>{
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


 await db.exec(await read('supabase/migrations/055_ui_workflow_repairs.sql'))
 const ids=Array.from({length:7},(_,i)=>`90000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`),[support,owner,master,studio,staff,client,order]=ids
 await db.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,'support@example.com',now(),'{}'),($2,'owner@example.com',now(),'{\"requested_role\":\"owner\",\"studio_name\":\"New Studio\",\"phone\":\"+380000000000\",\"messenger\":\"Telegram\",\"contact\":\"@test\"}'),($3,'master@example.com',now(),'{}')",[support,owner,master])
 await db.query("insert into tenants(id,name,slug) values($1,'Support','support-fixture')",[studio])
 await db.query("insert into tenant_memberships(tenant_id,user_id,role) values($1,$2,'super_admin')",[studio,support])
 const login=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated')}
 await login(support)
 const request=(await db.query("select id from support_list_applications() where studio_name='New Studio'")).rows[0].id
 const target=(await db.query('select support_review_application($1,true) id',[request])).rows[0].id
 await db.exec('reset role');await db.query('delete from subscriptions where tenant_id=$1',[target]);await login(support)
 await db.query("select support_set_subscription($1,'studio','active',now()+interval '1 month','Verified manual payment')",[target])
 await db.query("select support_set_subscription($1,'pro','active',now()+interval '2 months','Updated plan after payment')",[target])
 await db.exec('reset role')
 assert.equal((await db.query('select count(*)::int n from subscriptions where tenant_id=$1',[target])).rows[0].n,1)
 assert.equal((await db.query('select plan from subscriptions where tenant_id=$1',[target])).rows[0].plan,'pro')
 assert.equal((await db.query("select count(*)::int n from audit_logs where tenant_id=$1 and action='support_adjustment'",[target])).rows[0].n,2)
 await db.query("insert into tenant_memberships(tenant_id,user_id,role) values($1,$2,'master')",[target,master])
 await db.query("insert into staff_profiles(id,tenant_id,user_id,full_name) values($1,$2,$3,'Master')",[staff,target,master])
 await db.query("insert into clients(id,tenant_id,full_name) values($1,$2,'Client')",[client,target])
 await db.query("insert into work_orders(id,tenant_id,client_id,title) values($1,$2,$3,'Test work')",[order,target,client])
 await login(master)
 await assert.rejects(db.query("select support_set_subscription($1,'pro','active',now()+interval '1 month','Unauthorized extension')",[target]),/підтримки/)
 await assert.rejects(db.query('select save_shift_limits($1,8,60,null)',[target]),/доступу/)
 await assert.rejects(db.query('select close_overdue_shifts(null)'),/доступу/)
 await login(owner);await db.query('select save_shift_limits($1,8,60,null)',[target])
 await db.exec('reset role')
 await db.query("insert into staff_shifts(tenant_id,staff_id,started_at) values($1,$2,now()-interval '10 hours')",[target,staff])
 await db.query("insert into work_order_jobs(tenant_id,work_order_id,staff_id,title,status,running_since,worked_seconds) values($1,$2,$3,'Timed job','in_progress',now()-interval '9 hours',60)",[target,order,staff])
 await login(owner)
 assert.equal((await db.query('select close_overdue_shifts($1) n',[target])).rows[0].n,1)
 assert.equal((await db.query('select close_overdue_shifts($1) n',[target])).rows[0].n,0)
 await db.exec('reset role')
 const result=(await db.query("select * from work_order_jobs where work_order_id=$1 and title='Timed job'",[order])).rows[0]
 assert.equal(result.status,'waiting');assert.equal(result.running_since,null);assert.ok(Math.abs(result.worked_seconds-(7*3600+60))<3)
 assert.equal((await db.query('select auto_closed_reason from staff_shifts where staff_id=$1',[staff])).rows[0].auto_closed_reason,'shift_limit')
 await db.query("insert into staff_shifts(tenant_id,staff_id,started_at,paused_at) values($1,$2,now()-interval '4 hours',now()-interval '2 hours')",[target,staff])
 await login(master);assert.equal((await db.query('select close_overdue_shifts($1) n',[target])).rows[0].n,1)
 await db.exec('reset role')
 const paused=(await db.query("select * from staff_shifts where auto_closed_reason='break_limit'")).rows[0]
 assert.ok(Math.abs(paused.pause_seconds-3600)<3);assert.equal(paused.paused_at,null);assert.equal(paused.breaks.length,1)
 // A configured studio closing time takes priority; the service cron may close all studios.
 await db.query("update tenants set timezone='UTC',shift_max_hours=24,shift_close_time=((now() at time zone 'UTC')-interval '30 minutes')::time where id=$1",[target])
 await db.query("insert into staff_shifts(tenant_id,staff_id,started_at) values($1,$2,now()-interval '2 hours')",[target,staff])
 await db.exec("select set_config('request.jwt.claim.role','service_role',false);set role service_role")
 assert.equal((await db.query('select close_overdue_shifts(null) n')).rows[0].n,1)
 await db.exec('reset role')
 assert.equal((await db.query("select count(*)::int n from staff_shifts where staff_id=$1 and auto_closed_reason='studio_closed' and auto_closed_at is not null",[staff])).rows[0].n,1)
 assert.equal((await db.query('select count(*)::int n from staff_earnings')).rows[0].n,0)
})
