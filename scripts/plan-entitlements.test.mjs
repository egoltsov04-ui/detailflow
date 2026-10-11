import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile,readdir,writeFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist'
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8')
test('plans: preserve paid prices, map once, Solo owner workflow and server limits',async t=>{
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




 const [owner,studio]=['94000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000002']
 await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'solo@example.com',now())",[owner]);await db.query("insert into tenants(id,name,slug) values($1,'Solo test','solo-test')",[studio]);await db.query("insert into tenant_memberships(tenant_id,user_id,role) values($1,$2,'owner')",[studio,owner]);await db.query("insert into subscriptions(tenant_id,plan,status,current_period_end) values($1,'start','active',now()+interval '30 days')",[studio])
 const migration=await read('supabase/migrations/059_plans_solo.sql')
 const changed=[...migration.matchAll(/create or replace function public\.(\w+)\(/g)].map(m=>m[1]).concat(['act_work_job','business_analytics','business_analytics_v2'])
 const prior=(await db.query("select pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any($1)",[changed])).rows.map(r=>r.definition+';').join('\n')
 const rollback=`begin;
-- Preserve media, payments, requests and price history. Revert feature enforcement and plan identifiers.
drop trigger if exists studio_storage_quota on storage.objects;
drop trigger if exists solo_owner on subscriptions;
drop trigger if exists admin_capacity on tenant_memberships;
drop trigger if exists admin_capacity on administrator_invitations;
drop trigger if exists repeat_plan_guard on reminder_settings;
drop trigger if exists repeat_plan_guard on services;
drop trigger if exists subscription_plan_limit on subscriptions;
do $$declare tbl text;begin for tbl in select unnest(array['inventory_items','inventory_movements','sales','tasks','staff_shifts','staff_earnings','staff_payouts','staff_service_compensation','invoices']) loop execute format('drop trigger if exists plan_module_guard on public.%I',tbl);end loop;end $$;
alter table subscriptions drop constraint if exists subscriptions_plan_check;
update subscriptions set plan=case when plan='solo' then 'start' when plan='studio' and (select count(*) from staff_profiles p where p.tenant_id=subscriptions.tenant_id and p.active)>10 then 'pro' else plan end;
alter table subscriptions add constraint subscriptions_plan_check check(plan in ('start','studio','pro'));
${prior}
create trigger subscription_plan_limit before insert or update of plan,tenant_id on subscriptions for each row execute function guard_subscription_plan();
revoke execute on function solo_work_action(uuid,text,integer),get_studio_entitlements(uuid),support_founder_price(uuid,numeric,boolean,text) from authenticated,service_role;
notify pgrst,'reload schema';
commit;`
 if(process.env.WRITE_PLAN_ROLLBACK==='1')await writeFile(new URL('../supabase/rollback/059_plans_solo.sql',import.meta.url),rollback)
 await db.exec(migration)
 let sub=(await db.query('select * from subscriptions where tenant_id=$1',[studio])).rows[0];assert.equal(sub.plan,'studio');assert.equal(Number(sub.legacy_price),690)
 await db.exec(await read('supabase/migrations/059_plans_solo.sql'))
 assert.equal(Number((await db.query('select legacy_price from subscriptions where tenant_id=$1',[studio])).rows[0].legacy_price),690)
 await db.query("update subscriptions set plan='solo' where tenant_id=$1",[studio])
 const staff=(await db.query('select * from staff_profiles where tenant_id=$1',[studio])).rows[0];assert.equal(staff.user_id,owner)
 await assert.rejects(db.query("insert into staff_profiles(tenant_id,full_name) values($1,'Extra master')",[studio]),/SOLO_OWNER_ONLY/)
 await assert.rejects(db.query("select require_plan_feature($1,'warehouse')",[studio]),/PLAN_FEATURE_REQUIRED/)
 await assert.rejects(db.query("insert into inventory_items(tenant_id,name,unit,quantity) values($1,'Forbidden','л',1)",[studio]),/PLAN_FEATURE_REQUIRED/)
 await assert.rejects(db.query("insert into reminder_settings(tenant_id,repeat_enabled) values($1,true) on conflict(tenant_id) do update set repeat_enabled=true",[studio]),/PLAN_FEATURE_REQUIRED/)
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('set role authenticated')
 await assert.rejects(db.query('select studio_staff_usage($1)',[studio]),/permission denied/)
 await assert.rejects(db.query('select studio_plan($1)',[studio]),/permission denied/)
 assert.equal((await db.query('select get_studio_entitlements($1) data',[studio])).rows[0].data.id,'solo')
 const client=(await db.query("insert into clients(tenant_id,full_name,phone) values($1,'Client','+380000000000') returning id",[studio])).rows[0].id
 await db.exec('reset role');const order=(await db.query("insert into work_orders(tenant_id,client_id,title) values($1,$2,'Solo wash') returning id",[studio,client])).rows[0].id
 let job=(await db.query('select * from work_order_jobs where work_order_id=$1',[order])).rows[0]
 await db.exec('set role authenticated');await db.query("select solo_work_action($1,'start',$2)",[job.id,job.version]);await db.exec('reset role');job=(await db.query('select * from work_order_jobs where id=$1',[job.id])).rows[0];assert.equal(job.status,'in_progress')
 await db.exec('set role authenticated');await db.query("select solo_work_action($1,'complete',$2)",[job.id,job.version]);await db.exec('reset role');assert.equal((await db.query('select status from work_orders where id=$1',[order])).rows[0].status,'ready');assert.equal((await db.query('select count(*)::int n from staff_earnings')).rows[0].n,0)
 await assert.rejects(db.query("insert into storage.objects(bucket_id,name,owner_id,metadata) values('job-photos',$1,$2,'{\"size\":2147483649}')",[studio+'/'+job.id+'/large.mp4',owner]),/STORAGE_LIMIT_REACHED/)
 await db.query("insert into storage.objects(bucket_id,name,owner_id,metadata) values('job-photos',$1,$2,'{\"size\":100}')",[studio+'/'+job.id+'/small.jpg',owner])
 const billing=(await db.query('select get_studio_billing($1) data',[studio])).rows[0].data;assert.equal(Number(billing.storage_bytes),100);assert.equal(Number(billing.staff_count),1)
 const support='94000000-0000-4000-8000-000000000003',internal='94000000-0000-4000-8000-000000000004'
 await db.exec("select set_config('request.jwt.claim.sub','',false)")
 await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'support@example.com',now())",[support]);await db.query("insert into tenants(id,name,slug,is_internal) values($1,'Internal','internal-plans',true)",[internal]);await db.query("insert into tenant_memberships(tenant_id,user_id,role) values($1,$2,'super_admin')",[internal,support])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[support]);await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({aal:'aal2',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)}]})]);await db.exec('set role authenticated')
 await db.query("select support_founder_price($1,199,true,'Founder price agreed')",[studio])
 assert.equal(Number((await db.query('select support_platform_summary(current_date-1,current_date) data')).rows[0].data.mrr),199)
 const supportPage=(await db.query('select support_studios_page() data')).rows[0].data;assert.equal(Number(supportPage.rows[0].price_override),199)
 const payment=(await db.query("select support_add_payment($1,gen_random_uuid(),0,'transfer',current_date,1,'Founder free period') id",[studio])).rows[0].id;assert.ok(payment)
 await db.exec('reset role');await db.query("update payments set period_from=now()-interval '1 day' where id=$1",[payment]);await db.exec('set role authenticated')
 const summary=(await db.query('select support_platform_summary(current_date-1,current_date) data')).rows[0].data;assert.equal(Number(summary.mrr),0);assert.deepEqual(summary.paid_by_plan,{});assert.equal(Number(summary.converted),0)
 await db.query("select support_founder_price($1,299,false,'Price for this period')",[studio]);await db.query("select support_add_payment($1,gen_random_uuid(),390,'transfer',current_date,1,'Renew at standard price')",[studio]);await db.exec('reset role');assert.equal((await db.query('select price_override from subscriptions where tenant_id=$1',[studio])).rows[0].price_override,null)
 await db.query("update subscriptions set plan='studio' where tenant_id=$1",[studio])
 for(let i=0;i<5;i++)await db.query("insert into staff_profiles(tenant_id,full_name) values($1,$2)",[studio,'Master '+i])
 await assert.rejects(db.query("insert into staff_profiles(tenant_id,full_name) values($1,'Sixth')",[studio]),/STAFF_LIMIT_REACHED/)
 await assert.rejects(db.query("update staff_profiles set user_id=null where id=$1",[staff.id]),/STAFF_LIMIT_REACHED/)
 await assert.rejects(db.query("update subscriptions set plan='solo' where tenant_id=$1",[studio]),/STAFF_LIMIT_REACHED/)
 // A newly registered Solo owner gets the chosen plan and the canonical work
 // profile on activation. A later repeat of the upgrade cannot add old prices.
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[support])
 const applicant='94000000-0000-4000-8000-000000000005'
 await db.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,'newsolo@example.com',now(),'{\"requested_role\":\"owner\",\"studio_name\":\"New Solo\",\"selected_plan\":\"solo\"}')",[applicant])
 const application=(await db.query('select id from studio_access_requests where user_id=$1',[applicant])).rows[0].id
 await db.exec('set role authenticated')
 const activated=(await db.query("select support_review_application($1,true,'Activate selected plan') id",[application])).rows[0].id
 await db.exec('reset role')
 assert.equal((await db.query('select plan from subscriptions where tenant_id=$1',[activated])).rows[0].plan,'solo')
 assert.equal((await db.query('select user_id from staff_profiles where tenant_id=$1',[activated])).rows[0].user_id,applicant)
 await db.query("update subscriptions set plan='studio' where tenant_id=$1",[activated])
 await db.exec(migration)
 assert.equal((await db.query('select legacy_price from subscriptions where tenant_id=$1',[activated])).rows[0].legacy_price,null)
 await db.exec(rollback)
 assert.equal((await db.query('select plan from subscriptions where tenant_id=$1',[studio])).rows[0].plan,'studio')
 await db.exec(migration)
 // Exercise the complete rollback sequence as well, preserving business rows.
 await db.exec(rollback)
 for(const file of ['058_shift_defaults.sql','057_support_workspace.sql','056_master_workspace.sql'])await db.exec(await read('supabase/rollback/'+file))
 assert.equal(Number((await db.query('select count(*) n from payments')).rows[0].n),2)
 for(const file of ['056_master_workspace.sql','057_support_workspace.sql','058_shift_defaults.sql','059_plans_solo.sql'])await db.exec(await read('supabase/migrations/'+file))
 await db.exec(await read('supabase/rollback/unified_056_059.sql'))
 await db.exec(await read('supabase/deploy/unified_056_059.sql'))
 assert.equal(Number((await db.query('select count(*) n from payments')).rows[0].n),2)
})
