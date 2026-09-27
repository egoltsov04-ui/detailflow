import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8')
test('support reviews verified applications atomically and rejects self-escalation',async t=>{
 const db=new PGlite();t.after(()=>db.close())
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',email text,email_confirmed_at timestamptz,encrypted_password text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated;`)
 await db.exec((await read('supabase/schema.sql')).replace('create extension if not exists pgcrypto;',''))
 await db.exec(await read('supabase/migrations/024_access_portal.sql'))
 await db.exec(await read('supabase/migrations/025_resolve_account_access.sql'))
 const sql=await read('supabase/migrations/031_support_applications.sql');await db.exec(sql);await db.exec(sql)
 await db.exec(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000001','support@example.com',now(),'{}'),
 ('00000000-0000-4000-8000-000000000002','owner@example.com',now(),'{"requested_role":"owner","studio_name":"Test Studio","phone":"+380000000000","messenger":"Telegram","contact":"@test"}'),
 ('00000000-0000-4000-8000-000000000003','pending@example.com',null,'{"requested_role":"owner","studio_name":"Pending"}'),
 ('00000000-0000-4000-8000-000000000004','fake@example.com',now(),'{"requested_role":"super_admin"}');
 grant select,insert,update,delete on all tables in schema public to authenticated;`)
 const bootstrap=await read('supabase/deploy/grant_support_account.sql');await db.exec(bootstrap);await db.exec(bootstrap)
 const login=async n=>db.exec(`reset role;select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-${String(n).padStart(12,'0')}',false);set role authenticated;`)
 const request=(await db.query("select id from studio_access_requests where studio_name='Test Studio'")).rows[0].id
 const pending=(await db.query("select id from studio_access_requests where studio_name='Pending'")).rows[0].id
 await login(4)
 await assert.rejects(db.query('select * from support_list_applications()'),/Потрібні права/)
 await assert.rejects(db.query('select support_review_application($1,true)',[request]),/Потрібні права/)
 await login(2)
 await assert.rejects(db.query("select bootstrap_tenant('Bypass','bypass')"),/permission denied/)
 await assert.rejects(db.query('select support_review_application($1,true)',[request]),/Потрібні права/)
 await login(1)
 assert.equal((await db.query('select * from support_list_applications()')).rows.length,2)
 await assert.rejects(db.query('select support_review_application($1,true)',[pending]),/не підтвердив/)
 const studio=(await db.query('select support_review_application($1,true) as id',[request])).rows[0].id
 assert.equal((await db.query('select support_review_application($1,true) as id',[request])).rows[0].id,studio)
 await assert.rejects(db.query("select support_review_application($1,false,'')",[pending]),/причину/)
 await db.query("select support_review_application($1,false,'Contact is incorrect')",[pending])
 await login(2)
 assert.equal((await db.query('select resolve_my_access() as access')).rows[0].access.role,'owner')
 await assert.rejects(db.query("update tenant_memberships set role='super_admin' where user_id=auth.uid()"),/Службові права/)
 await assert.rejects(db.query("insert into tenant_memberships(tenant_id,user_id,role) values($1,'00000000-0000-4000-8000-000000000004','super_admin')",[studio]),/Службові права/)
 await db.exec('reset role')
 assert.equal((await db.query('select count(*)::int n from tenants')).rows[0].n,2)
 assert.equal((await db.query('select count(*)::int n from subscriptions')).rows[0].n,1)
 assert.equal((await db.query('select status from studio_access_requests where id=$1',[pending])).rows[0].status,'rejected')
})
