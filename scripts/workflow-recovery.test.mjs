import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8')
async function baseline(db){
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',email text,encrypted_password text,last_sign_in_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text);
 alter table storage.objects enable row level security;
 grant usage on schema public,auth,storage to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`)
 await db.exec((await read('supabase/schema.sql')).replace('create extension if not exists pgcrypto;',''))
 for(const file of (await readdir(new URL('../supabase/migrations/',import.meta.url))).sort()){
  if(Number(file.slice(0,3))>=28)break
  if(file.startsWith('013_'))continue
  await db.exec(await read('supabase/migrations/'+file))
 }
}
for(const state of ['table-only','028','028+029'])test('workflow recovery from '+state,async t=>{
 const db=new PGlite({extensions:{btree_gist}});t.after(()=>db.close());await baseline(db)
 const migration=await read('supabase/migrations/028_job_workflow.sql')
 if(state==='table-only')await db.exec(migration.slice(migration.indexOf('create table'),migration.indexOf('create index')).replace(/^ position .*\n/m,''))
 else await db.exec(migration)
 if(state==='028+029')await db.exec(await read('supabase/migrations/029_workflow_media_realtime.sql'))
 await db.exec(await read('supabase/deploy/workflow_resume_028_030.sql'))
 assert.equal((await db.query('select public.job_workflow_version() as version')).rows[0].version,30)
 assert.equal((await db.query("select column_name from information_schema.columns where table_schema='public' and table_name='work_order_jobs' and column_name='position'")).rows.length,1)
 assert.equal((await db.query("select count(*)::int as n from pg_trigger where tgrelid='public.work_order_jobs'::regclass and tgname='jobs_sync_parent'")).rows[0].n,1)
})
test('workflow recovery refuses an unrelated existing table without deleting its data',async t=>{
 const db=new PGlite({extensions:{btree_gist}});t.after(()=>db.close());await baseline(db)
 await db.exec("create table public.work_order_jobs(id uuid primary key,note text);insert into public.work_order_jobs values(gen_random_uuid(),'Keep me')")
 await assert.rejects(db.exec(await read('supabase/deploy/workflow_resume_028_030.sql')),/Несумісна структура/)
 await db.exec('rollback')
 assert.equal((await db.query('select note from public.work_order_jobs')).rows[0].note,'Keep me')
 assert.equal((await db.query("select to_regclass('public.staff_payouts') as table_name")).rows[0].table_name,null)
})
