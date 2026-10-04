import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile,readdir} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist'
import {extendAccess,managerLink} from '../src/lib/manualBilling.ts'
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8')
test('manual extension preserves days and clamps short months',()=>{
 assert.equal(extendAccess('2027-01-31',1,'2026-10-03'),'2027-02-28')
 assert.equal(extendAccess('2026-09-27',1,'2026-10-03'),'2026-11-03')
 assert.equal(extendAccess('',3,'2026-10-03'),'2027-01-03')
 assert.equal(managerLink('javascript:alert(1)',''), '')
 assert.equal(managerLink('@detailflow_test','Start 1'), 'https://t.me/detailflow_test?text=Start%201')
})
test('catalog orders are atomic, preserve service pay rates, variants, deposits and request identity',async t=>{
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

 await db.exec(await read('supabase/migrations/045_catalog_orders.sql'))
 const [owner,master,studio,staff,service,other,client]=Array.from({length:7},(_,i)=>`40000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)
 await db.query('insert into auth.users(id) values($1),($2)',[owner,master])
 await db.query("insert into tenants(id,name,slug) values($1,'Test','test')",[studio])
 await db.query("insert into tenant_memberships(tenant_id,user_id,role) values($1,$2,'owner'),($1,$3,'master')",[studio,owner,master])
 await db.query("insert into subscriptions(tenant_id,plan,status,trial_ends_at) values($1,'start','trialing',now()+interval '14 days')",[studio])
 await db.query("insert into staff_profiles(id,tenant_id,user_id,full_name,compensation_percent) values($1,$2,$3,'Master',30)",[staff,studio,master])
 await db.query("insert into services(id,tenant_id,name,category,price,duration_minutes,variants) values($1,$3,'Wash','Wash',100,60,'[{\"id\":\"xl\",\"name\":\"XL\",\"price\":150,\"duration_minutes\":90}]'),($2,$3,'Polish','Polish',200,60,'[]')",[service,other,studio])
 await db.query("insert into clients(id,tenant_id,full_name) values($1,$2,'Client')",[client,studio])
 const login=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated')}
 await login(owner)
 const order={client_id:client,staff_id:staff,deposit:300,services:[{service_id:service,variant_id:'xl',expected_price:150},{service_id:other,expected_price:200}]},request='50000000-0000-4000-8000-000000000001'
 const make=(id,payload=order)=>db.query('select create_catalog_order($1,$2,$3::jsonb) data',[studio,id,payload])
 const made=(await make(request)).rows[0].data
 assert.equal((await make(request)).rows[0].data.id,made.id)
 await db.exec('reset role')
 const jobs=(await db.query('select service_id,price,rate,title from work_order_jobs where work_order_id=$1 order by price',[request])).rows
 assert.equal(jobs.length,2);assert.equal(jobs[0].service_id,service);assert.equal(jobs[0].title,'Wash · XL');assert.equal(Number(jobs[0].price),150);assert.equal(Number(jobs[0].rate),30)
 const saved=(await db.query('select total,deposit from work_orders where id=$1',[request])).rows[0]
 assert.equal(Number(saved.total),350);assert.equal(Number(saved.deposit),300)
 // Plans capture the chosen variant, not the service's base duration.
 assert.deepEqual((await db.query('select planned_minutes from work_order_jobs where work_order_id=$1 order by price',[request])).rows.map(j=>j.planned_minutes),[90,60])
 await db.exec(await read('supabase/migrations/050_phase_two_completion.sql'))
 await login(owner)
 const job=(await db.query('select get_workflow_snapshot($1) data',[studio])).rows[0].data.jobs[0]
 await db.query('select save_work_job($1,$2::jsonb,$3)',[request,{id:job.id,title:job.title,service_id:job.service_id,staff_id:staff,price:job.price,pay_mode:'auto',checklist:[{title:'Check'}],planned_minutes:75},job.version])
 const updated=(await db.query('select get_workflow_snapshot($1) data',[studio])).rows[0].data.jobs.find(j=>j.id===job.id)
 assert.equal(updated.planned_minutes,75)
 // Evidence is attached by the assigned master and remains private to this studio.
 await db.exec('reset role; alter table storage.objects add column if not exists metadata jsonb;')
 const mediaPath=`${studio}/${job.id}/test.mp4`
 await db.query("insert into storage.objects(bucket_id,name,owner_id,metadata) values('job-photos',$1,$2,'{\"mimetype\":\"video/mp4\",\"size\":1024}')",[mediaPath,master])
 await db.exec(await read('supabase/migrations/051_job_evidence.sql'))
 await login(master)
 await assert.rejects(db.query('select save_job_evidence($1,$2,$3)',[job.id,updated.version,{action:'media',path:mediaPath,name:'Before.mp4',phase:'invalid'}]),/етап/)
 await assert.rejects(db.query('select save_job_evidence($1,$2,$3)',[job.id,updated.version,{action:'media',path:'wrong/'+job.id+'/test.mp4',name:'Before.mp4',phase:'before'}]),/шлях/)
 await db.query('select save_job_evidence($1,$2,$3)',[job.id,updated.version,{action:'media',path:mediaPath,name:'Before.mp4',phase:'before'}])
 // Retrying the same upload does not create a duplicate even with the old version.
 await db.query('select save_job_evidence($1,$2,$3)',[job.id,updated.version,{action:'media',path:mediaPath,name:'Before.mp4',phase:'before'}])
 const evidence=(await db.query('select get_workflow_snapshot($1) data',[studio])).rows[0].data.jobs.find(j=>j.id===job.id)
 assert.equal(evidence.attachments.length,1);assert.equal(evidence.attachments[0].mime,'video/mp4');assert.equal(evidence.attachments[0].staff_name,'Master')
 await assert.rejects(db.query('select job_media_archive($1)',[studio]),/доступу/)
 await assert.rejects(db.query('select save_job_evidence($1,$2,$3)',[job.id,evidence.version,{action:'paint',readings:[{panel:'Hood',before:-1,after:null}]}]),/Заміри/)
 await db.query('select save_job_evidence($1,$2,$3)',[job.id,evidence.version,{action:'paint',readings:[{panel:'Hood',before:140.5,after:135}]}])
 await login(owner)
 const archive=(await db.query("select job_media_archive($1,'Master','before','video') data",[studio])).rows[0].data
 assert.equal(archive.length,1);assert.equal(archive[0].readings[0].before,140.5);assert.equal(archive[0].order_id,request)
 assert.deepEqual((await db.query("select job_media_archive($1,'','after','video') data",[studio])).rows[0].data,[])
 await login('40000000-0000-4000-8000-000000000099')
 await assert.rejects(db.query('select job_media_archive($1)',[studio]),/доступу/)
 await assert.rejects(db.query('select save_job_evidence($1,$2,$3)',[job.id,evidence.version+1,{action:'paint',readings:[]}]),/доступу/)
 await db.exec('reset role')
 await assert.rejects(db.query('delete from work_order_jobs where id=$1',[job.id]),/матеріали/)
 await login(owner)
 await assert.rejects(db.query('select save_work_job($1,$2::jsonb,$3)',[request,{id:job.id,planned_minutes:-1},updated.version]),/План|хвилин/)
 await login(master)
 await assert.rejects(db.query("select business_analytics_v2($1,'2026-01-01','2026-12-31')",[studio]),/Access denied/)
 await login(owner)
 const emptyReport=(await db.query("select business_analytics_v2($1,'2026-01-01','2026-12-31') data",[studio])).rows[0].data
 assert.equal(emptyReport.orders,0)
 await login(owner)
 const second='50000000-0000-4000-8000-000000000002'
 await assert.rejects(make(second,{...order,services:[{service_id:service,variant_id:'xl',expected_price:1}]}),/Ціна/)
 assert.equal((await db.query('select count(*)::int n from work_orders where id=$1',[second])).rows[0].n,0)
 await login(master);await assert.rejects(make(second),/доступу/)
 await db.exec('reset role;set session_replication_role=replica')
 await db.query("update work_order_jobs set status='approved',approved_at='2026-10-02T12:00Z',worked_seconds=3600 where work_order_id=$1",[request])
 await db.query("update work_orders set status='ready',approved_at='2026-10-02T12:00Z' where id=$1",[request])
 await db.query("insert into work_orders(id,tenant_id,client_id,title,status,total,status_changed_at) values($1,$2,$3,'Cancelled','cancelled',100,'2026-10-03T12:00Z')",[second,studio,client])
 await db.query("insert into work_order_jobs(tenant_id,work_order_id,staff_id,title,price) values($1,$2,$3,'Cancelled A',100),($1,$2,$3,'Cancelled B',100)",[studio,second,staff])
 await db.exec('set session_replication_role=origin');await login(owner)
 await assert.rejects(db.query('select save_job_evidence($1,$2,$3)',[job.id,evidence.version+1,{action:'paint',readings:[]}]),/перевірку/)
 const comparison=(await db.query("select business_analytics_v2($1,'2026-10-01','2026-10-31') data",[studio])).rows[0].data
 assert.equal(comparison.masters[0].orders,1);assert.equal(comparison.masters[0].average_order,350);assert.equal(comparison.masters[0].cancelled_orders,1)
 // Large report: every visit contributes, beyond PostgREST's default row limit.
 await db.exec('reset role;set session_replication_role=replica')
 await db.query("insert into work_orders(tenant_id,client_id,title,status,total,approved_at) select $1,$2,'Volume test','ready',10,'2026-10-04T12:00Z' from generate_series(1,10000)",[studio,client])
 await db.exec('set session_replication_role=origin');await login(owner)
 const reportStarted=performance.now(),large=(await db.query("select business_analytics_v2($1,'2026-10-01','2026-10-31') data",[studio])).rows[0].data
 assert.equal(large.orders,10001);assert.equal(large.revenue,100350);assert.equal(large.clients[0].visits,10001)
 console.log('10,000-order report:',Math.round(performance.now()-reportStarted),'ms')
 await db.exec('reset role');await db.query("update subscriptions set trial_ends_at=now()-interval '1 day' where tenant_id=$1",[studio]);await login(owner)
 await assert.rejects(make('50000000-0000-4000-8000-000000000003'),/Період доступу/)
})
