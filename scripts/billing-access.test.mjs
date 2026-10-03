import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile,readdir} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist'
import {subscriptionPlans,canManageBilling} from '../src/lib/plans.ts'
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8')
test('billing roles, published plan limits, downgrade and expiration are enforced in the database',async t=>{
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


 await db.exec(await read('supabase/migrations/046_billing_roles_limits.sql'))
 const ids=Array.from({length:5},(_,i)=>`60000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`),[owner,admin,master,outsider,studio]=ids
 await db.query('insert into auth.users(id) values($1),($2),($3),($4)',[owner,admin,master,outsider])
 await db.query("insert into tenants(id,name,slug) values($1,'Test','test')",[studio])
 await db.query("insert into tenant_memberships(tenant_id,user_id,role) values($1,$2,'owner'),($1,$3,'admin'),($1,$4,'master')",[studio,owner,admin,master])
 await db.query("insert into subscriptions(tenant_id,plan,status,trial_ends_at) values($1,'start','trialing',now()+interval '14 days')",[studio])
 await db.query("insert into payment_orders(tenant_id,plan,amount,order_reference) values($1,'start',690,'test')",[studio])
 for(const plan of subscriptionPlans)assert.equal((await db.query('select plan_staff_limit($1) n',[plan.id])).rows[0].n,plan.staffLimit)
 const login=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated')}
 for(const [id,role] of [[owner,'owner'],[admin,'admin'],[master,'master'],[outsider,'outsider']]){
  await login(id)
  assert.equal((await db.query('select count(*)::int n from subscriptions')).rows[0].n,canManageBilling(role)?1:0)
  assert.equal((await db.query('select count(*)::int n from payment_orders')).rows[0].n,canManageBilling(role)?1:0)
  if(canManageBilling(role))assert.equal((await db.query('select get_studio_billing($1) data',[studio])).rows[0].data.subscription.staff_limit,3)
  else await assert.rejects(db.query('select get_studio_billing($1)',[studio]),/власнику/)
  await assert.rejects(db.query("update subscriptions set plan='pro' where tenant_id=$1",[studio]),/permission denied/)
  await assert.rejects(db.query("update payment_orders set status='approved' where tenant_id=$1",[studio]),/permission denied/)
 }
 await login(owner)
 assert.equal((await db.query("select business_analytics_v2($1,'2026-01-01','2026-12-31') data",[studio])).rows[0].data.orders,0)
 await login(admin)
 await assert.rejects(db.query("select business_analytics_v2($1,'2026-01-01','2026-12-31')",[studio]),/Access denied/)
 await db.exec('reset role');await db.query('update tenant_memberships set finance_access=true where user_id=$1',[admin]);await login(admin)
 assert.equal((await db.query("select business_analytics_v2($1,'2026-01-01','2026-12-31') data",[studio])).rows[0].data.orders,0)
 await login(owner)
 const add=()=>db.query("insert into staff_profiles(tenant_id,full_name) values($1,'Master') returning id",[studio])
 const first=(await add()).rows[0].id;await add();await add()
 await assert.rejects(add(),/ліміт/)
 await db.query('update staff_profiles set active=false where id=$1',[first]);await add()
 await assert.rejects(db.query('update staff_profiles set active=true where id=$1',[first]),/ліміт/)
 await db.exec('reset role');await db.query("update subscriptions set plan='studio' where tenant_id=$1",[studio]);await login(owner)
 for(let i=3;i<10;i++)await add()
 await assert.rejects(add(),/ліміт/)
 await db.exec('reset role');await assert.rejects(db.query("update subscriptions set plan='start' where tenant_id=$1",[studio]),/3 активних/)
 await db.query("update subscriptions set plan='pro' where tenant_id=$1",[studio]);await login(owner);await add();await add()
 await db.exec('reset role');await db.query("update subscriptions set trial_ends_at=now()-interval '1 day' where tenant_id=$1",[studio]);await login(owner)
 await assert.rejects(add(),/Період доступу/)
 await db.query('update staff_profiles set active=false where id=$1',[first])
 assert.equal((await db.query('select get_studio_billing($1) data',[studio])).rows[0].data.staff_count,12)
 await db.exec('reset role');await db.query('update tenant_memberships set active=false where user_id=$1',[admin]);await login(admin)
 await assert.rejects(db.query('select get_studio_billing($1)',[studio]),/власнику/)
 assert.equal((await db.query('select count(*)::int n from subscriptions')).rows[0].n,0)
})
