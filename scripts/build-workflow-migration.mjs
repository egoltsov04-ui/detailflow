import { readFile, writeFile, mkdir } from 'node:fs/promises'
const files=['028_job_workflow.sql','029_workflow_media_realtime.sql','030_workflow_calendar_access.sql']
const source=(await Promise.all(files.map(async name=>'-- '+name+'\n'+(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8')).replace(/^begin;\s*$/gm,'').replace(/^commit;\s*$/gm,'')))).join('\n\n')
function replaceOnce(sql,from,to){if(!sql.includes(from))throw new Error('Migration source changed: '+from.slice(0,70));return sql.replace(from,()=>to)}
let sql=source
 .replace(/^create table public\./gm,'create table if not exists public.')
 .replace(/^create (unique )?index /gm,(_,unique)=>`create ${unique||''}index if not exists `)
 .replace(/add column (?!if not exists)/g,'add column if not exists ')
 .replace(/^create function /gm,'create or replace function ')
 .replace(/^create policy "([^"]+)" on (\w+\.\w+)/gm,(_,name,table)=>`drop policy if exists "${name}" on ${table};\ncreate policy "${name}" on ${table}`)
 .replace(/^create trigger (\w+)([^\n]*?) on (public\.\w+)/gm,(_,name,body,table)=>`drop trigger if exists ${name} on ${table};\ncreate trigger ${name}${body} on ${table}`)
sql=replaceOnce(sql,'create index if not exists jobs_order_idx',`alter table public.work_order_jobs add column if not exists position integer not null default 0 check(position>=0);\ncreate index if not exists jobs_order_idx`)
sql=replaceOnce(sql,"end from public.work_orders;",`end from public.work_orders o
where not exists(select 1 from public.work_order_jobs j where j.work_order_id=o.id);`)
sql=replaceOnce(sql,'update public.staff_earnings e set job_id=j.id from public.work_order_jobs j where j.work_order_id=e.work_order_id;',`-- Never relink an existing earning when a car now has several jobs.
do $$ begin
 if exists(select 1 from public.staff_earnings e where e.job_id is null and (select count(*) from public.work_order_jobs j where j.work_order_id=e.work_order_id)<>1) then
 raise exception 'Не вдалося однозначно прив’язати старе нарахування. Оновлення скасовано; потрібна перевірка зв’язків'; end if;
end $$;
update public.staff_earnings e set job_id=j.id from public.work_order_jobs j where e.job_id is null and j.work_order_id=e.work_order_id;`)
sql=replaceOnce(sql,'alter function public.guard_work_order_update() rename to guard_work_order_update_legacy;',`do $$ begin
 if to_regprocedure('public.guard_work_order_update_legacy()') is null then
 alter function public.guard_work_order_update() rename to guard_work_order_update_legacy;
 end if;
end $$;`)
sql=replaceOnce(sql,'where j.work_order_id=o.id and a.appointment_id=o.appointment_id',`where j.work_order_id=o.id and a.appointment_id=o.appointment_id
and j.appointment_service_id is null and (j.service_id is null or j.service_id=a.service_id)
and (select count(*) from public.work_order_jobs other where other.work_order_id=o.id)=1
and not exists(select 1 from public.work_order_jobs other where other.appointment_service_id=a.id)`)
sql=replaceOnce(sql," execute format('create policy \"manager accesses finance\"", " execute format('drop policy if exists \"manager accesses finance\" on public.%I',item.tbl);\n execute format('create policy \"manager accesses finance\"")
// Fail closed on an unrelated/older schema instead of treating IF NOT EXISTS as compatibility.
const layouts={
 work_order_jobs:{uuid:'id tenant_id work_order_id service_id staff_id approved_by',text:'title stage status pay_mode note review_note',numeric:'price rate',jsonb:'checklist attachments',int4:'worked_seconds version',timestamptz:'running_since submitted_at approved_at created_at updated_at'},
 work_job_events:{uuid:'id tenant_id job_id actor_id',text:'event',jsonb:'detail',timestamptz:'created_at'},
 staff_payouts:{uuid:'id tenant_id earning_id created_by',numeric:'amount',payment_method:'method',text:'note',timestamptz:'created_at'}
}
const checks=[]
for(const [table,types] of Object.entries(layouts))for(const [type,columns] of Object.entries(types))for(const column of columns.split(' '))checks.push(`('${table}','${column}','${type}',true)`)
for(const [table,column,type] of [
 ['work_order_jobs','position','int4'],['work_order_jobs','appointment_service_id','uuid'],['appointment_services','id','uuid'],
 ['staff_earnings','job_id','uuid'],['staff_earnings','paid_amount','numeric'],['cash_transactions','payout_id','uuid'],['cash_transactions','is_accrual','bool'],
 ['staff_shifts','paused_at','timestamptz'],['staff_shifts','pause_seconds','int4'],['staff_shifts','breaks','jsonb']
])checks.push(`('${table}','${column}','${type}',false)`)
const preflight=`-- Re-runnable recovery/install for the workflow after migration 027.
-- No tables or business records are deleted. All changes commit together.
begin;
select pg_advisory_xact_lock(280030);
do $$ declare expected record; actual_type text; begin
 if to_regprocedure('public.guard_work_order_update()') is null then raise exception 'Спочатку потрібна міграція 027'; end if;
 for expected in select * from (values\n${checks.join(',\n')}
 ) as v(tbl,col,typ,required) loop
 if to_regclass('public.'||expected.tbl) is not null then
 select udt_name into actual_type from information_schema.columns where table_schema='public' and table_name=expected.tbl and column_name=expected.col;
 if (actual_type is null and expected.required) or (actual_type is not null and actual_type<>expected.typ) then
 raise exception 'Несумісна структура %.%: очікується %. Оновлення скасовано без видалення даних',expected.tbl,expected.col,expected.typ;
 end if;
 end if;
 end loop;
end $$;
`
const result=preflight+sql+'\nnotify pgrst, \'reload schema\';\ncommit;\nselect public.job_workflow_version() as workflow_version;\n'
await mkdir(new URL('../supabase/deploy/',import.meta.url),{recursive:true})
for(const name of ['workflow_028_030.sql','workflow_resume_028_030.sql'])await writeFile(new URL('../supabase/deploy/'+name,import.meta.url),result)
console.log('Prepared repeatable workflow install and recovery SQL')
