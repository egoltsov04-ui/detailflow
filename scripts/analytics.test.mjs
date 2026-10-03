import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {excelReport} from '../src/lib/reportExport.ts'

test('analytics: tenant isolation, timezone, no duplicate visits, historical value and missing timers',async t=>{
 const db=new PGlite();t.after(()=>db.close())
 await db.exec(`create role anon;create role authenticated;
 create function can_view_finance(studio uuid) returns boolean language sql as $$select studio='00000000-0000-4000-8000-000000000001' and current_setting('test.role',true)='owner'$$;
 create table tenants(id uuid,timezone text);
 create table clients(id uuid,full_name text);
 create table staff_profiles(id uuid,full_name text);
 create table services(id uuid,tenant_id uuid,name text,variants jsonb,duration_minutes integer);
 create table work_orders(id uuid,tenant_id uuid,client_id uuid,status text,total numeric,approved_at timestamptz,status_changed_at timestamptz,due_at timestamptz);
 create table work_order_jobs(tenant_id uuid,staff_id uuid,service_id uuid,title text,status text,price numeric,worked_seconds integer,approved_at timestamptz);
 create table appointments(tenant_id uuid,starts_at timestamptz,status text);`)
 const migration=await readFile(new URL('../supabase/migrations/048_business_analytics.sql',import.meta.url),'utf8')
 await db.exec(migration);await db.exec(migration)
 const studio='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002'
 await db.query("insert into tenants values($1,'Europe/Kyiv')",[studio]);await db.query("insert into clients values($1,'Client')",[studio])
 await db.query("insert into services values($1,$1,'Wash','[]',60)",[studio])
 for(const [date,amount,tenant] of [['2026-09-01T12:00Z',100,studio],['2026-09-30T22:00Z',200,studio],['2026-10-05T12:00Z',300,studio],['2026-11-05T12:00Z',900,studio],['2026-10-05T12:00Z',999,other]])await db.query("insert into work_orders values(gen_random_uuid(),$1,$2,'ready',$3,$4,$4,null)",[tenant,studio,amount,date])
 await db.query("insert into work_order_jobs values($1,null,$1,'Wash','approved',200,7200,'2026-10-01T12:00Z',null)",[studio])
 await db.query("insert into work_order_jobs values($1,null,null,'Legacy','approved',900,0,'2026-10-01T12:00Z',null)",[studio])
 await db.query("update services set duration_minutes=20 where id=$1",[studio])
 await db.exec("update work_order_jobs set price=price")
 await db.query("insert into appointments values($1,'2026-09-30T22:00Z','confirmed'),($1,'2026-09-30T22:00Z','cancelled')",[studio])
 const report=()=>db.query("select business_analytics($1,'2026-10-01','2026-10-31') report",[studio])
 await db.exec("set test.role='master'");await assert.rejects(report(),/Access denied/)
 await db.exec("set test.role='owner'")
 await assert.rejects(db.query("select business_analytics($1,'2026-10-01','2026-10-31')",[other]),/Access denied/)
 const r=(await report()).rows[0].report
 assert.equal(r.orders,2);assert.equal(r.revenue,500);assert.equal(r.clients[0].lifetime_value,600);assert.equal(r.clients[0].returning,true)
 assert.equal(r.masters[0].timed_revenue,200);assert.equal(r.masters[0].timed_jobs,1)
 assert.equal(r.services.find(s=>s.title==='Wash').planned,60);assert.equal(r.services.find(s=>s.title==='Wash').actual,120)
 assert.equal(r.services.find(s=>s.title==='Legacy').measured,0)
 assert.equal(r.demand[0].booking_hour,1);assert.equal(r.demand[0].bookings,2);assert.equal(r.demand[0].cancelled,1)
 await assert.rejects(db.query("select business_analytics($1,'2026-10-02','2026-10-01')",[studio]),/Invalid report/)
})
test('Excel export preserves numeric cells and treats formulas and markup as text',()=>{
 const xml=excelReport([{name:'A&B',rows:[['=1+1','<script>',20]]}])
 assert.match(xml,/ss:Name="A&amp;B"/);assert.match(xml,/ss:Type="String">=1\+1/);assert.match(xml,/&lt;script&gt;/);assert.match(xml,/ss:Type="Number">20/)
})
test('support history is support-only and scoped to the selected studio',async t=>{
 const db=new PGlite();t.after(()=>db.close())
 await db.exec(`create role anon;create role authenticated;
 create function is_support_user() returns boolean language sql as $$select current_setting('test.role',true)='support'$$;
 create table profiles(id uuid,full_name text);
 create table audit_logs(id uuid,tenant_id uuid,actor_id uuid,created_at timestamptz,entity_type text,action text,before_data jsonb,after_data jsonb);`)
 const migration=await readFile(new URL('../supabase/migrations/049_support_subscription_history.sql',import.meta.url),'utf8');await db.exec(migration);await db.exec(migration)
 const studio='00000000-0000-4000-8000-000000000001'
 await db.query(`insert into audit_logs values(gen_random_uuid(),$1,null,now(),'subscriptions','support_adjustment','{"plan":"start"}','{"plan":"studio","reason":"Payment verified"}')`,[studio])
 await db.exec("set test.role='owner'");await assert.rejects(db.query('select support_subscription_history($1)',[studio]),/Access denied/)
 await db.exec("set test.role='support'");assert.equal((await db.query('select support_subscription_history($1) data',[studio])).rows[0].data[0].reason,'Payment verified')
 assert.equal((await db.query("select support_subscription_history('00000000-0000-4000-8000-000000000002') data")).rows[0].data.length,0)
 await assert.rejects(db.query('select support_subscription_history($1,-1)',[studio]),/Invalid page/)
})
