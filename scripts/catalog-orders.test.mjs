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
 await login(owner)
 const second='50000000-0000-4000-8000-000000000002'
 await assert.rejects(make(second,{...order,services:[{service_id:service,variant_id:'xl',expected_price:1}]}),/Ціна/)
 assert.equal((await db.query('select count(*)::int n from work_orders where id=$1',[second])).rows[0].n,0)
 await login(master);await assert.rejects(make(second),/доступу/)
 await db.exec('reset role');await db.query("update subscriptions set trial_ends_at=now()-interval '1 day' where tenant_id=$1",[studio]);await login(owner)
 await assert.rejects(make(second),/Період доступу/)
})
