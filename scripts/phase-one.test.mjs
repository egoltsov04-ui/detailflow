import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile,readdir} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist'
import {dayCapacity,shiftInterval} from '../src/lib/capacity.ts'
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8')
test('capacity merges overlapping shifts and jobs, clips to working time and preserves breaks',()=>{
 const r=dayCapacity([{start:540,end:720},{start:660,end:780},{start:840,end:1080}],[{start:500,end:600},{start:570,end:660},{start:750,end:870}])
 assert.equal(r.total,480);assert.equal(r.used,180);assert.deepEqual(r.free,[{start:660,end:750},{start:870,end:1080}]);assert.equal(r.slots,10);assert.equal(r.percent,38)
 assert.deepEqual(dayCapacity([], [{start:540,end:600}]),{total:0,used:0,free:[],slots:0,percent:0})
})
test('recurring capacity handles database time precision and missing daylight-saving hour',()=>{
 const winter=shiftInterval('2027-01-04','09:00:00','18:00:00','Europe/Kyiv');assert.equal(winter.end-winter.start,540)
 assert.equal(shiftInterval('2027-03-28','03:30','05:00','Europe/Kyiv'),null)
 assert.equal(shiftInterval('2027-01-04','18:00','09:00','Europe/Kyiv'),null)
})

test('phase one calendar, onboarding and support enforce studio and role boundaries',async t=>{
 const db=new PGlite({extensions:{btree_gist}});t.after(()=>db.close())
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',email text,email_confirmed_at timestamptz,encrypted_password text,last_sign_in_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text);alter table storage.objects enable row level security;grant usage on schema public,auth,storage to authenticated,anon,service_role;`)
 await db.exec((await read('supabase/schema.sql')).replace('create extension if not exists pgcrypto;',''))
 const files=(await readdir(new URL('../supabase/migrations/',import.meta.url))).sort()
 for(const f of files){if(/^(013|029|030)_/.test(f))continue;if(f.startsWith('033_'))await db.exec('grant select,insert,update,delete on all tables in schema public to authenticated;');await db.exec(await read(f.startsWith('028_')?'supabase/deploy/workflow_028_030.sql':'supabase/migrations/'+f))}
 await db.exec(await read('supabase/deploy/phase_one_040_044.sql'))
 await db.exec(await read('supabase/migrations/047_support_studio_search.sql'))
 await db.exec(await read('supabase/migrations/047_support_studio_search.sql'))
 assert.equal((await db.query('select platform_readiness() ready')).rows[0].ready,true)
 const [owner,master,outsider,support,studio,other,staff,client,service]=Array.from({length:9},(_,i)=>`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)
 await db.query('insert into auth.users(id) values($1),($2),($3),($4)',[owner,master,outsider,support])
 await db.query("insert into tenants(id,name,slug) values($1,'Studio','studio'),($2,'Other','other')",[studio,other])
 await db.query("insert into tenant_memberships(tenant_id,user_id,role) values($1,$3,'owner'),($1,$4,'master'),($2,$5,'owner'),($2,$6,'super_admin')",[studio,other,owner,master,outsider,support])
 await db.query("insert into subscriptions(tenant_id,plan,status,trial_ends_at) values($1,'start','trialing',now()+interval '14 days')",[studio])
 await db.query("insert into staff_profiles(id,tenant_id,user_id,full_name) values($1,$2,$3,'Master')",[staff,studio,master])
 await db.query("insert into clients(id,tenant_id,full_name,phone) values($1,$2,'Test client','1234567890')",[client,studio])
 await db.query("insert into services(id,tenant_id,name,category,price,duration_minutes) values($1,$2,'Wash','Wash',100,60)",[service,studio])
 await db.query("insert into work_schedules(tenant_id,staff_id,weekday,starts_at,ends_at) values($1,$2,1,'09:00','18:00')",[studio,staff])
 await db.query("insert into appointments(tenant_id,client_id,staff_id,starts_at,ends_at) values($1,$2,$3,'2027-01-04T10:00:00Z','2027-01-04T11:00:00Z')",[studio,client,staff])
 const login=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated')}
 await login(master)
 const calendar=(await db.query("select staff_calendar($1,'2027-01-04','2027-01-10') value",[staff])).rows[0].value
 assert.equal(calendar.appointments.length,1);assert.equal(calendar.schedules.length,1)
 await assert.rejects(db.query("select staff_calendar($1,'2027-01-01','2028-01-01')",[staff]),/62/)
 await assert.rejects(db.query('select studio_setup($1)',[studio]),/власника/)
 await assert.rejects(db.query('select support_list_studios()'),/підтримки/)
 await login(outsider);await assert.rejects(db.query("select staff_calendar($1,'2027-01-04','2027-01-10')",[staff]),/доступу/)
 await login(owner);await assert.rejects(db.query('select studio_setup($1,null,true)',[studio]),/контакти/)
 const setup=(await db.query('select studio_setup($1,$2::jsonb,true) value',[studio,JSON.stringify({name:'Studio',address:'Kyiv, test address',phone:'+380991234567',timezone:'Europe/Kyiv'})])).rows[0].value
 assert.equal(setup.completed,true)
 await assert.rejects(db.query("select support_set_subscription($1,'pro','active',now()+interval '1 month','Support adjustment')",[studio]),/підтримки/)
 await login(support);assert.equal((await db.query('select support_list_studios($1) studios',[studio])).rows[0].studios[0].id,studio);assert.equal((await db.query("select jsonb_array_length(support_list_studios('Studio')) n")).rows[0].n,1)
 await assert.rejects(db.query("select support_set_subscription($1,'pro','active',now()+interval '1 month','')",[studio]),/причину/)
 await db.query("select support_set_subscription($1,'pro','active',now()+interval '1 month','Confirmed manual activation')",[studio])
 await login(owner);assert.equal((await db.query('select plan from subscriptions where tenant_id=$1',[studio])).rows[0].plan,'pro')
 assert.equal((await db.query("select count(*)::int n from audit_logs where tenant_id=$1 and action='support_adjustment'",[studio])).rows[0].n,1)
 await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)");await db.query("update tenant_memberships set active=false where user_id=$1",[support]);await login(support);await assert.rejects(db.query('select support_list_studios()'),/підтримки/)
 await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)")
 await db.query("insert into reminder_settings(tenant_id,email_enabled,reminder_24h_enabled,reminder_2h_enabled) values($1,true,true,true)",[studio])
 await db.query("insert into appointments(tenant_id,client_id,starts_at,ends_at) values($1,$2,now()+interval '90 minutes',now()+interval '150 minutes')",[studio,client])
 await db.exec('select enqueue_client_reminders();select enqueue_client_reminders()')
 assert.equal((await db.query("select count(*)::int n from notification_jobs where channel='email'")).rows[0].n,1)
 await login(owner);await assert.rejects(db.query("select * from claim_notifications('email',5)"),/permission denied/)
 await login(outsider);assert.equal((await db.query('select count(*)::int n from notification_jobs')).rows[0].n,0)
 await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)");await db.exec('set role service_role')
 const claim=(await db.query("select * from claim_notifications('email',5)")).rows[0]
 assert.equal((await db.query("select * from claim_notifications('email',5)")).rows.length,0)
 assert.equal((await db.query("select finish_notification($1,gen_random_uuid(),'sent') ok",[claim.id])).rows[0].ok,false)
 assert.equal((await db.query("select finish_notification($1,$2,'failed','Rate limited') ok",[claim.id,claim.claim_token])).rows[0].ok,true)
 assert.equal((await db.query("select * from claim_notifications('email',5)")).rows.length,0)
 await login(owner);await db.query('select retry_notification($1)',[claim.id])
 await db.exec('reset role');const again=(await db.query("select * from claim_notifications('email',5)")).rows[0]
 assert.notEqual(again.claim_token,claim.claim_token)
 await db.query("update notification_jobs set locked_until=now()-interval '1 minute' where id=$1",[claim.id]);await db.query("select * from claim_notifications('email',5)")
 assert.equal((await db.query('select status from notification_jobs where id=$1',[claim.id])).rows[0].status,'uncertain')
 await db.query("update reminder_settings set repeat_enabled=true where tenant_id=$1",[studio])
 await db.query("update services set repeat_interval_months=1 where id=$1",[service])
 await db.query("update clients set email='synthetic@example.com' where id=$1",[client])
 const completed=(await db.query("insert into appointments(tenant_id,client_id,starts_at,ends_at,status) values($1,$2,now()-interval '1 month 2 hours',now()-interval '1 month 1 hour','completed') returning id",[studio,client])).rows[0].id
 await db.query("insert into appointment_services(appointment_id,service_id,service_name,unit_price,duration_minutes) values($1,$2,'Wash',100,60)",[completed,service])
 await db.exec('select enqueue_client_reminders()')
 assert.equal((await db.query("select count(*)::int n from notification_jobs where kind='return_visit'")).rows[0].n,0)
 await db.query("update clients set followup_enabled=true where id=$1",[client]);await db.exec('select enqueue_client_reminders();select enqueue_client_reminders()')
 assert.equal((await db.query("select count(*)::int n from notification_jobs where kind='return_visit'")).rows[0].n,1)
 await db.query("delete from notification_jobs where kind='return_visit'")
 const upcoming=(await db.query("insert into appointments(tenant_id,client_id,starts_at,ends_at) values($1,$2,now()+interval '2 days',now()+interval '2 days 1 hour') returning id",[studio,client])).rows[0].id
 await db.query("insert into appointment_services(appointment_id,service_id,service_name,unit_price,duration_minutes) values($1,$2,'Wash',100,60)",[upcoming,service]);await db.exec('select enqueue_client_reminders()')
 assert.equal((await db.query("select count(*)::int n from notification_jobs where kind='return_visit'")).rows[0].n,0)
 await db.query("select set_config('request.jwt.claim.sub','',false)")
 await db.query("insert into push_subscriptions(user_id,endpoint,keys) values($1,'https://fcm.googleapis.com/test','{}')",[master])
 assert.equal((await db.query("select register_push_subscription($1,'https://fcm.googleapis.com/test','{}','en') value",[outsider])).rows[0].value,'conflict')
 assert.equal((await db.query("select register_push_subscription($1,'https://fcm.googleapis.com/test','{}','en') value",[master])).rows[0].value,'ok')
 const order=(await db.query("insert into work_orders(tenant_id,title,client_id) values($1,'Push test',$2) returning id",[studio,client])).rows[0].id
 await db.query("insert into work_order_jobs(tenant_id,work_order_id,staff_id,title,status) values($1,$2,$3,'Test job','assigned')",[studio,order,staff])
 assert.equal((await db.query("select count(*)::int n from notification_jobs where channel='push'")).rows[0].n,1)
 await login(master);await assert.rejects(db.query('select * from push_subscriptions'),/permission denied/)

 await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)")
 const invited='10000000-0000-4000-8000-000000000099';await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'new-admin@example.com',now())",[invited])
 const intent=(await db.query('select reserve_administrator_invitation($1,$2,$3,$4) value',[studio,owner,'new-admin@example.com','New admin'])).rows[0].value
 await login(invited);assert.equal((await db.query('select resolve_my_access() value')).rows[0].value.role,'admin')
 assert.equal((await db.query('select resolve_my_access() value')).rows[0].value.role,'admin')
 await login(owner);await db.query('update tenant_memberships set active=false where tenant_id=$1 and user_id=$2',[studio,invited]);await login(invited)
 assert.equal((await db.query('select resolve_my_access() value')).rows[0].value.role,'blocked')
 await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)");await assert.rejects(db.query('select reserve_administrator_invitation($1,$2,$3,$4)',[other,outsider,'new-admin@example.com','Other admin']),/іншу|іншої/)

})
