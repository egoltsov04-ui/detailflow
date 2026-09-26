import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'

const db = new PGlite({extensions:{btree_gist}})
const sqlFile=async path=>readFile(new URL('../'+path,import.meta.url),'utf8')
test('workflow migration, tenant isolation, review, payroll and attendance',async(t)=>{
 t.after(()=>db.close())
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',email text,encrypted_password text,last_sign_in_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text);
 alter table storage.objects enable row level security;
 grant usage on schema public,auth,storage to authenticated,anon;
 grant execute on function auth.uid() to authenticated,anon;`)
 await db.exec((await sqlFile('supabase/schema.sql')).replace('create extension if not exists pgcrypto;',''))
 for(const file of (await readdir(new URL('../supabase/migrations/',import.meta.url))).sort()){
   if(file.startsWith('013_'))continue // This historical file contains a typo; 014 is its replacement.
   if(file.startsWith('028_'))await db.exec(`
     insert into auth.users(id) values('10000000-0000-4000-8000-000000000001');
     insert into tenants(id,name,slug) values('10000000-0000-4000-8000-000000000002','Legacy','legacy');
     insert into staff_profiles(id,tenant_id,full_name,compensation_percent) values('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','Legacy master',30);
     insert into clients(id,tenant_id,full_name,phone) values('10000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000002','Legacy client','+380000000000');
     insert into work_orders(id,tenant_id,client_id,staff_id,title,status,total,approved_at,compensation_fixed) values('10000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000003','Old approved work','ready',1000,now(),250);
     insert into staff_earnings(id,tenant_id,staff_id,work_order_id,amount,status) values('10000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004',250,'paid');
     insert into cash_transactions(tenant_id,direction,amount,category,title,earning_id) values('10000000-0000-4000-8000-000000000002','expense',250,'Salary','Нарахування: Old','10000000-0000-4000-8000-000000000005');
   `)
   if(file.startsWith('028_')){await db.exec(await sqlFile('supabase/deploy/workflow_028_030.sql'));break}
   try {await db.exec(await sqlFile('supabase/migrations/'+file))}catch(e){throw new Error(file+': '+e.message,{cause:e})}
 }
 const oldEarning=(await db.query("select * from staff_earnings where id='10000000-0000-4000-8000-000000000005'")).rows[0]
 assert.equal(Number(oldEarning.amount),250);assert.equal(Number(oldEarning.paid_amount),250);assert.ok(oldEarning.job_id)
 const oldJob=(await db.query('select * from work_order_jobs where id=$1',[oldEarning.job_id])).rows[0]
 assert.equal(oldJob.status,'approved');assert.equal(Number(oldJob.rate),250);assert.equal(oldJob.pay_mode,'fixed')
 const oldCash=(await db.query("select * from cash_transactions where earning_id='10000000-0000-4000-8000-000000000005'")).rows[0]
 assert.equal(oldCash.is_accrual,true);assert.equal(Number(oldCash.amount),250)
 await db.exec('grant select,insert,update,delete on all tables in schema public to authenticated;grant select,insert,delete on storage.objects to authenticated;')
 const ids=Array.from({length:12},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)
 const [owner,user,user2,other,tenant,tenant2,staff,staff2,client,order,service,secondOrder]=ids
 await db.query(`insert into auth.users(id) values($1),($2),($3),($4)`,[owner,user,user2,other])
 await db.query(`insert into tenants(id,name,slug) values($1,'Test','test'),($2,'Other','other')`,[tenant,tenant2])
 await db.query(`insert into tenant_memberships values($1,$2,'owner',now()),($1,$3,'master',now()),($1,$4,'master',now()),($5,$6,'owner',now())`,[tenant,owner,user,user2,tenant2,other])
 await db.query(`insert into staff_profiles(id,tenant_id,user_id,full_name,compensation_percent,hourly_rate) values($1,$2,$3,'Master',30,100),($4,$2,$5,'Second',null,120)`,[staff,tenant,user,staff2,user2])
 await db.query(`insert into clients(id,tenant_id,full_name,phone) values($1,$2,'Client','+380000000000')`,[client,tenant])
 await db.query(`insert into services(id,tenant_id,name,category,price,duration_minutes) values($1,$2,'Wash','Wash',1000,60)`,[service,tenant])
 await db.query('insert into staff_service_compensation(tenant_id,staff_id,service_id,percent) values($1,$2,$3,45)',[tenant,staff,service])
 const actor=async uid=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role authenticated')}
 await actor(owner)
 await db.query(`insert into work_orders(id,tenant_id,client_id,staff_id,title,total,checklist) values($1,$2,$3,$4,'Car',1000,'[{"id":"one","title":"Wash","done":false}]')`,[order,tenant,client,staff])
 const getJob=async (id=order)=>(await db.query('select * from work_order_jobs where work_order_id=$1 order by created_at,id',[id])).rows[0]
 const jobId=(await getJob()).id
 const act=async(action,payload={},version)=>{const j=await getJob();await db.query('select act_work_job($1,$2,$3,$4)',[j.id,action,JSON.stringify(payload),version??j.version])}
 await actor(user)
 await assert.rejects(act('start'),/почати зміну/)
 await db.query("select manage_master_shift($1,'start')",[staff])
 // Storage policy allows evidence only for the assigned master and exact job path.
 const photoPath=`${tenant}/${jobId}/${crypto.randomUUID()}.jpg`
 await db.query("insert into storage.objects(bucket_id,name,owner_id) values('job-photos',$1,$2)",[photoPath,user])
 await act('photo',{path:photoPath,name:'before.jpg'})
 assert.equal((await db.query('delete from storage.objects where name=$1 returning id',[photoPath])).rows.length,0)
 await assert.rejects(act('photo',{path:`${tenant}/${jobId}/missing.jpg`,name:'missing.jpg'}),/завантажте/)
 await act('start');const startVersion=(await getJob()).version
 await assert.rejects(act('submit'),/чек-лист/)
 await assert.rejects(db.query("select manage_master_shift($1,'pause')",[staff]),/призупиніть/)
 await act('check',{item_id:'one',done:true})
 await assert.rejects(act('check',{item_id:'one',done:false},startVersion),/Дані змінилися/)
 await act('submit')
 await assert.rejects(act('approve',{quality:true,defects:true}),/Перевірте/)
 await actor(other)
 assert.equal((await db.query('select * from work_order_jobs')).rows.length,0)
 assert.equal((await db.query('select * from storage.objects')).rows.length,0)
 await assert.rejects(db.query("select act_work_job($1,'approve','{}',1)",[jobId]),/доступу/)
 await actor(owner)
 await assert.rejects(act('approve',{quality:true,defects:false}),/Перевірте/)
 await assert.rejects(act('return',{note:''}),/причину/)
 await act('return',{note:'Remove visible marks'})
 assert.equal((await getJob()).checklist[0].done,false)
 assert.equal((await db.query('select * from staff_earnings')).rows.length,0)
 await actor(user);await act('start');await act('check',{item_id:'one',done:true});await act('submit')
 await actor(owner);await act('approve',{quality:true,defects:true});await act('approve',{quality:true,defects:true})
 let earnings=(await db.query('select * from staff_earnings')).rows
 assert.equal(earnings.length,1);assert.equal(Number(earnings[0].amount),300)
 assert.equal((await db.query('select * from cash_transactions')).rows.length,0)
 const key=crypto.randomUUID()
 await db.query("select record_staff_payout($1,100,'cash',$2,'Partial')",[earnings[0].id,key])
 await db.query("select record_staff_payout($1,100,'cash',$2,'Partial')",[earnings[0].id,key])
 assert.equal((await db.query('select * from cash_transactions')).rows.length,1)
 await assert.rejects(db.query("select record_staff_payout($1,500,'cash',$2,'')",[earnings[0].id,crypto.randomUUID()]),/Сума/)
 await assert.rejects(db.query('delete from cash_transactions where payout_id=$1',[key]),/історії/)
 await actor(user)
 await assert.rejects(db.query("select record_staff_payout($1,10,'cash',$2,'')",[earnings[0].id,crypto.randomUUID()]),/доступу/)
 assert.equal((await db.query('delete from staff_earnings returning id')).rows.length,0)
 await db.query("select manage_master_shift($1,'pause')",[staff]);await db.query("select manage_master_shift($1,'resume')",[staff]);await db.query("select manage_master_shift($1,'end')",[staff])
 assert.equal((await db.query('select breaks from staff_shifts')).rows[0].breaks.length,1)
 await actor(owner)
 await db.query(`insert into work_orders(id,tenant_id,client_id,title,total,checklist) values($1,$2,$3,'Second car',0,'[]')`,[secondOrder,tenant,client])
 const initial=await getJob(secondOrder)
 await db.query('select save_work_job($1,$2,$3)',[secondOrder,JSON.stringify({id:initial.id,staff_id:staff2,service_id:service,title:'Hourly work',price:1000,checklist:[{title:'Wash'}]}),initial.version])
 await db.query('select save_work_job($1,$2,null)',[secondOrder,JSON.stringify({staff_id:staff,service_id:service,title:'Fixed work',price:500,pay_mode:'fixed',rate:200,checklist:[{title:'Finish'}]})])
 const jobs=(await db.query('select * from work_order_jobs where work_order_id=$1',[secondOrder])).rows
 assert.equal(jobs.length,2);assert.equal(jobs.find(j=>j.staff_id===staff2).pay_mode,'hourly')
 assert.equal(Number((await db.query('select total from work_orders where id=$1',[secondOrder])).rows[0].total),1500)
 await actor(user2)
 assert.equal((await db.query('select * from work_order_jobs')).rows.length,1)
 assert.equal((await db.query('update work_order_jobs set rate=999 returning id')).rows.length,0)
 await db.query("select manage_master_shift($1,'start')",[staff2])
 const hourly=jobs.find(j=>j.staff_id===staff2)
 await db.query("select act_work_job($1,'start','{}',$2)",[hourly.id,hourly.version])
 await db.exec('reset role');await db.query("update work_order_jobs set running_since=now()-interval '1 hour' where id=$1",[hourly.id])
 await actor(user2)
 const h=(await db.query('select * from work_order_jobs')).rows[0]
 await db.query("select act_work_job($1,'check',$2,$3)",[h.id,JSON.stringify({item_id:h.checklist[0].id,done:true}),h.version])
 await db.query("select act_work_job($1,'submit','{}',$2)",[h.id,h.version+1])
 await actor(owner);await db.query("select act_work_job($1,'approve','{\"quality\":true,\"defects\":true}',$2)",[h.id,h.version+2])
 const hourlyEarning=(await db.query('select amount from staff_earnings where job_id=$1',[h.id])).rows[0]
 assert.ok(Number(hourlyEarning.amount)>=120&&Number(hourlyEarning.amount)<121)
 assert.notEqual((await db.query('select status from work_orders where id=$1',[secondOrder])).rows[0].status,'ready')
 // Calendar: two services become two unassigned jobs in one vehicle card.
 const carId=crypto.randomUUID(),appointment=crypto.randomUUID()
 await db.query("insert into vehicles(id,tenant_id,client_id,make,model,plate_number) values($1,$2,$3,'Mazda','CX-5','AA1234AA')",[carId,tenant,client])
 await db.query("insert into appointments(id,tenant_id,client_id,vehicle_id,staff_id,starts_at,ends_at) values($1,$2,$3,$4,$5,now()+interval '1 day',now()+interval '1 day 2 hours')",[appointment,tenant,client,carId,staff])
 await db.query("insert into appointment_services(appointment_id,service_id,service_name,unit_price,duration_minutes) values($1,$2,'Wash',1000,60),($1,$2,'Finish',500,30)",[appointment,service])
 const carOrder=(await db.query('select * from work_orders where appointment_id=$1',[appointment])).rows[0]
 assert.equal(carOrder.vehicle_label,'Mazda CX-5 AA1234AA');assert.equal(Number(carOrder.total),1500)
 const carJobs=(await db.query('select * from work_order_jobs where work_order_id=$1 order by price desc',[carOrder.id])).rows
 assert.equal(carJobs.length,2);assert.ok(carJobs.every(j=>j.staff_id===null&&j.service_id===service))
 await assert.rejects(db.query("update appointments set status='completed' where id=$1",[appointment]),/перевірка/)
 for(let i=0;i<carJobs.length;i++)await db.query('select save_work_job($1,$2,$3)',[carOrder.id,JSON.stringify({id:carJobs[i].id,staff_id:staff,service_id:service,title:carJobs[i].title,position:i,price:carJobs[i].price,pay_mode:'fixed',rate:0,checklist:[{title:carJobs[i].title}]}),carJobs[i].version])
 await actor(user);await db.query("select manage_master_shift($1,'start')",[staff])
 let first=(await db.query('select * from work_order_jobs where id=$1',[carJobs[0].id])).rows[0]
 let last=(await db.query('select * from work_order_jobs where id=$1',[carJobs[1].id])).rows[0]
 await assert.rejects(db.query("select act_work_job($1,'start','{}',$2)",[last.id,last.version]),/Попередній етап/)
 await db.query("select act_work_job($1,'start','{}',$2)",[first.id,first.version])
 await db.query("select act_work_job($1,'check',$2,$3)",[first.id,JSON.stringify({item_id:first.checklist[0].id,done:true}),first.version+1])
 await db.query("select act_work_job($1,'submit','{}',$2)",[first.id,first.version+2])
 await actor(owner);await db.query("select act_work_job($1,'approve',$2,$3)",[first.id,JSON.stringify({quality:true,defects:true}),first.version+3])
 assert.equal(Number((await db.query('select amount from staff_earnings where job_id=$1',[first.id])).rows[0].amount),0)
 await actor(user);await db.query("select act_work_job($1,'start','{}',$2)",[last.id,last.version])
 assert.equal((await db.query('select * from cash_transactions')).rows.length,0)
 assert.equal((await db.query('select * from staff_service_compensation')).rows.length,1)
 assert.equal((await db.query('update staff_service_compensation set percent=100 returning id')).rows.length,0)
 assert.equal(Number((await db.query('select percent from staff_service_compensation')).rows[0].percent),45)
 await actor(other)
 await assert.rejects(db.query("insert into work_orders(tenant_id,client_id,staff_id,title,total) values($1,$2,$3,'Cross tenant',0)",[tenant2,client,staff]),/іншій студії/)
 await actor(owner)
 await assert.rejects(db.query('delete from work_orders where id=$1',[carOrder.id]),/історії/)
 // Actual payouts settle the balance; repeated calls cannot duplicate the expense.
 await db.query("select record_staff_payout($1,200,'transfer',$2,'Final')",[earnings[0].id,crypto.randomUUID()])
 const settled=(await db.query('select * from staff_earnings where id=$1',[earnings[0].id])).rows[0]
 assert.equal(settled.status,'paid');assert.equal(Number(settled.paid_amount),300)
 assert.equal((await db.query('select status from appointments where id=$1',[appointment])).rows[0].status,'in_progress')
 await actor(user)
 await db.query("select act_work_job($1,'check',$2,$3)",[last.id,JSON.stringify({item_id:last.checklist[0].id,done:true}),last.version+1])
 await db.query("select act_work_job($1,'submit','{}',$2)",[last.id,last.version+2])
 await actor(owner)
 await db.query("select act_work_job($1,'approve',$2,$3)",[last.id,JSON.stringify({quality:true,defects:true}),last.version+3])
 assert.equal((await db.query('select status from appointments where id=$1',[appointment])).rows[0].status,'completed')
 await db.query("update work_orders set status='issued' where id=$1",[carOrder.id])
 assert.equal((await db.query('select status from work_orders where id=$1',[carOrder.id])).rows[0].status,'issued')
 assert.equal((await db.query('select job_workflow_version() as v')).rows[0].v,30)

})
