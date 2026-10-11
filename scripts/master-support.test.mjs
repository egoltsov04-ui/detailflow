import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile,readdir} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist'
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8')
test('support workspace: MFA, expiration, reauth, payments, idempotence, internal studios and applications',async t=>{
 const db=new PGlite({extensions:{btree_gist}});t.after(()=>db.close())
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',email text,email_confirmed_at timestamptz,encrypted_password text,last_sign_in_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text,metadata jsonb);alter table storage.objects enable row level security;
 grant usage on schema public,auth,storage to authenticated,anon,service_role;`)
 await db.exec((await read('supabase/schema.sql')).replace('create extension if not exists pgcrypto;',''))
 for(const f of (await readdir(new URL('../supabase/migrations/',import.meta.url))).sort()){
  if(parseInt(f)>58)continue
  if(f.startsWith('013_')||f.startsWith('029_')||f.startsWith('030_'))continue
  if(f.startsWith('033_'))await db.exec('grant select,insert,update,delete on all tables in schema public to authenticated;')
  try{await db.exec(await read(f.startsWith('028_')?'supabase/deploy/workflow_028_030.sql':'supabase/migrations/'+f))}catch(e){throw new Error(f+': '+e.message)}
 }



 await db.exec(await read('supabase/migrations/056_master_workspace.sql'))
 await db.exec(await read('supabase/migrations/057_support_workspace.sql'))
 const [support,owner,master,studio,target]=Array.from({length:5},(_,i)=>`91000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)
 await db.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,'support@example.com',now(),'{}'),($2,'owner@example.com',now(),'{\"requested_role\":\"owner\",\"studio_name\":\"Client Studio\",\"phone\":\"+380000000000\",\"messenger\":\"Telegram\",\"contact\":\"@test\"}'),($3,'master@example.com',now(),'{}')",[support,owner,master])
 await db.query("insert into tenants(id,name,slug,is_internal) values($1,'Detailflow Support','internal',true),($2,'Missing subscription','client',false)",[studio,target])
 await db.query("insert into tenant_memberships(tenant_id,user_id,role) values($1,$2,'super_admin')",[studio,support])
 const login=async(id,aal='aal2',age=0)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({aal,amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)-age}]})]);await db.exec('set role authenticated')}
 await login(support,'aal1');await assert.rejects(db.query('select support_studios_page()'),/підтримки/)
 await login(support,'aal2',1900);await assert.rejects(db.query('select support_studios_page()'),/підтримки/)
 await login(support,'aal2',400);await assert.rejects(db.query("select support_set_subscription($1,'start','active',now()+interval '1 month','Reason given')",[target]),/пароль/)
 await login(master);await assert.rejects(db.query('select support_studios_page()'),/підтримки/)
 await login(support)
 let page=(await db.query('select support_studios_page() data')).rows[0].data
 assert.equal(page.total,1);assert.equal(page.rows[0].id,target)
 const request=(await db.query('select support_applications_queue() data')).rows[0].data[0].id
 await db.query("select support_contact_application($1,'Contacted in Telegram')",[request])
 assert.equal((await db.query('select support_applications_queue() data')).rows[0].data[0].status,'contacted')
 const activated=(await db.query("select support_review_application($1,true,'Verified details') id",[request])).rows[0].id
 assert.ok(activated)
 const payment='92000000-0000-4000-8000-000000000001'
 await assert.rejects(db.query("select support_add_payment($1,$2,0,'card',current_date,1,'')",[target,payment]),/суму/)
 await db.query("select support_add_payment($1,$2,690,'transfer',current_date,1,'Paid via manager')",[target,payment])
 await db.query("select support_add_payment($1,$2,690,'transfer',current_date,1,'Paid via manager')",[target,payment])
 assert.equal((await db.query('select count(*)::int n from payments')).rows[0].n,1)
 const timeline=(await db.query('select support_studio_timeline($1) data',[target])).rows[0].data
 assert.equal(timeline.filter(r=>r.kind==='payment').length,1);assert.equal(timeline.filter(r=>r.kind==='change').length,1)
 await assert.rejects(db.query("select support_add_payment($1,$2,1490,'card',current_date,1,'')",[target,payment]),/вже використано/)
 await assert.rejects(db.query("select support_add_payment($1,gen_random_uuid(),690,'card',current_date,1,'')",[studio]),/не знайдено/)
 const summary=(await db.query("select support_platform_summary(current_date-1,current_date) data")).rows[0].data
 assert.equal(summary.paid_by_plan.start,1);assert.equal(summary.trial,1)
 const paid=(await db.query("select support_studios_page('',0,'active','name',false) data")).rows[0].data
 assert.equal(paid.total,1);assert.equal(paid.rows[0].id,target)
 await login(master);assert.equal((await db.query('select count(*)::int n from payments')).rows[0].n,0)
 await db.exec('reset role')
 assert.equal((await db.query("select count(*)::int n from audit_logs where entity_type='studio_access_requests'")).rows[0].n,2)
 // The same order clock feeds bay cards and the master. Return reasons survive
 // restart, then clear only after resubmission. Evidence edits are versioned.
 const [staff,client,order]=Array.from({length:3},(_,i)=>`93000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)
 await db.query("insert into tenant_memberships(tenant_id,user_id,role) values($1,$2,'master')",[activated,master])
 await db.query("insert into staff_profiles(id,tenant_id,user_id,full_name) values($1,$2,$3,'Master')",[staff,activated,master])
 await db.query("insert into clients(id,tenant_id,full_name) values($1,$2,'Client')",[client,activated])
 await db.query("insert into work_orders(id,tenant_id,client_id,staff_id,title,planned_duration_minutes) values($1,$2,$3,$4,'Polish',120)",[order,activated,client,staff])
 const job=(await db.query('select id from work_order_jobs where work_order_id=$1',[order])).rows[0].id
 await db.query("update work_order_jobs set status='assigned',staff_id=$2,planned_minutes=120,checklist='[{\"id\":\"check\",\"title\":\"Polish\",\"done\":false}]' where id=$1",[job,staff])
 await db.query('insert into staff_shifts(tenant_id,staff_id) values($1,$2)',[activated,staff])
 const act=async(action,payload={})=>{await db.exec('reset role');const version=(await db.query('select version from work_order_jobs where id=$1',[job])).rows[0].version;await login(['return','approve'].includes(action)?owner:master);await db.query('select act_work_job($1,$2,$3,$4)',[job,action,JSON.stringify(payload),version])}
 await act('start');await db.exec('reset role');const started=(await db.query('select started_at from work_orders where id=$1',[order])).rows[0].started_at;assert.ok(started)
 await act('check',{item_id:'check',done:true});await act('submit');await act('return',{note:'Polish bonnet again'})
 await act('start');await db.exec('reset role');assert.equal((await db.query('select review_note from work_order_jobs where id=$1',[job])).rows[0].review_note,'Polish bonnet again')
 const oldPath=`${activated}/${job}/old.jpg`,newPath=`${activated}/${job}/new.jpg`
 await db.query("insert into storage.objects(bucket_id,name,owner_id,metadata) values('job-photos',$1,$3,'{\"mimetype\":\"image/jpeg\",\"size\":100}'),('job-photos',$2,$3,'{\"mimetype\":\"image/jpeg\",\"size\":100}')",[oldPath,newPath,master])
 const evidence=async(payload)=>{await db.exec('reset role');const version=(await db.query('select version from work_order_jobs where id=$1',[job])).rows[0].version;await login(master);await db.query('select save_job_evidence($1,$2,$3)',[job,version,JSON.stringify(payload)])}
 await evidence({action:'media',path:oldPath,name:'before.jpg',phase:'before'});await evidence({action:'media',path:newPath,name:'replacement.jpg',phase:'before',replace_path:oldPath})
 await db.exec('reset role');let attachments=(await db.query('select attachments from work_order_jobs where id=$1',[job])).rows[0].attachments;assert.equal(attachments.length,1);assert.equal(attachments[0].path,newPath)
 await evidence({action:'remove',path:newPath});await db.exec('reset role');assert.equal((await db.query('select attachments from work_order_jobs where id=$1',[job])).rows[0].attachments.length,0)
 await act('check',{item_id:'check',done:true});await act('submit');await db.exec('reset role');assert.equal((await db.query('select review_note from work_order_jobs where id=$1',[job])).rows[0].review_note,'');assert.equal(String((await db.query('select started_at from work_orders where id=$1',[order])).rows[0].started_at),String(started))
 await assert.rejects(evidence({action:'media',path:newPath,name:'late.jpg',phase:'after'}),/перевірку/)

})
