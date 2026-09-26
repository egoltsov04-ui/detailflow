import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { localDate, validDate, parseDate, dateError, normalizeNumber, numberError, stepNumber, studioDateTime } from '../src/lib/formValues.ts'
import { transitionError } from '../src/lib/workOrderFlow.ts'
import { readAllPages } from '../src/lib/pagination.ts'
import { entryRoute } from '../src/lib/entryRoute.ts'
import { parseClientCsv, suggestMapping, validateClientRows, normalizePhone, importClientRows } from '../src/lib/clientImport.ts'

test('downloadable template is empty and completed rows map without manual setup',async()=>{
 const template=await readFile(new URL('../public/templates/detailflow-clients.csv',import.meta.url),'utf8')
 assert.equal(template.replace(/^\uFEFF/,'').trim(),'Ім’я;Телефон;Авто')
 assert.throws(()=>parseClientCsv(template),/хоча б одного клієнта/)
 const table=parseClientCsv(template+'Тестовий клієнт;+380671234567;BMW X5\r\n')
 const checked=validateClientRows(table,suggestMapping(table.headers))
 assert.equal(checked.errors.length,0);assert.equal(checked.rows.length,1)
 assert.throws(()=>parseClientCsv('Name;Phone\n\uFFFD;+380671234567'),/UTF-8/)
})

test('client CSV supports exports, quoting, BOM, semicolons and pasted tabular data',()=>{
 const csv=parseClientCsv('\uFEFFІм’я;Телефон;Авто\r\n"Іван; Петренко";+380671234567;"BMW ""X5""\nAA1234"\r\n')
 assert.deepEqual(suggestMapping(csv.headers),{name:0,phone:1,vehicle:2})
 assert.equal(csv.rows[0][0],'Іван; Петренко');assert.equal(csv.rows[0][2],'BMW "X5"\nAA1234')
 assert.equal(parseClientCsv('name\tphone\nTest\t0671234567').rows[0][1],'0671234567')
 assert.equal(normalizePhone('067 123-45-67'),'380671234567')
 assert.equal(normalizePhone('00380671234567'),'380671234567')
 assert.throws(()=>parseClientCsv('name,phone\n"unfinished,123'))
 assert.throws(()=>parseClientCsv('name,phone\nTest,123,extra'))
 assert.throws(()=>parseClientCsv('name,phone\n'+Array(1001).fill('Test,0671234567').join('\n')))
})
test('client import validates mappings and reports bad rows before writes',()=>{
 const table=parseClientCsv('name,phone,car\nTest,0671234567,BMW\nMissing,wrong,Audi')
 assert.equal(validateClientRows(table,{name:0,phone:1,vehicle:2}).errors.length,1)
 assert.equal(validateClientRows(table,{name:0,phone:1,vehicle:2}).rows[0].phone,'+380671234567')
 assert.ok(validateClientRows(table,{name:0,phone:0,vehicle:2}).errors.length)
 assert.ok(validateClientRows(table,{name:-1,phone:1,vehicle:2}).errors.length)
})
test('client import recovers partial writes, deduplicates phones and keeps existing records',async()=>{
 const clients=[],vehicles=[];let fail=true
 const store={load:async()=>({clients,vehicles}),clients:async rows=>{const fresh=rows.filter(r=>!clients.some(c=>c.id===r.id));clients.push(...fresh);return fresh.length},vehicles:async rows=>{const fresh=rows.filter(r=>!vehicles.some(c=>c.id===r.id));vehicles.push(...fresh);if(fail){fail=false;throw new Error('Response lost after commit')}return fresh.length}}
 const rows=[{name:'First',phone:'+380671234567',vehicle:'BMW X5'},{name:'Duplicate',phone:'067 123 45 67',vehicle:'BMW X5'}]
 const partial=await importClientRows('tenant',rows,store)
 assert.ok(partial.error);assert.equal(clients.length,1);assert.equal(vehicles.length,1)
 const retry=await importClientRows('tenant',rows,store)
 assert.equal(retry.error,'');assert.equal(retry.clients,0);assert.equal(retry.vehicles,0)
 assert.equal(clients[0].full_name,'First');assert.equal(clients.length,1);assert.equal(vehicles.length,1)
 const otherClients=[]
 await importClientRows('other-tenant',rows,{load:async()=>({clients:[],vehicles:[]}),clients:async r=>{otherClients.push(...r);return r.length},vehicles:async r=>r.length})
 assert.notEqual(clients[0].id,otherClients[0].id)
 let wrote=false
 const blocked=await importClientRows('tenant',rows,{...store,load:async()=>{throw new Error('Cannot read')},clients:async()=>{wrote=true;return 0}})
 assert.ok(blocked.error);assert.equal(wrote,false)
})

test('landing preserves booking, invitation and authentication entry points',()=>{
 assert.equal(entryRoute('/','',''),'landing')
 assert.equal(entryRoute('/','','#features'),'landing')
 for(const path of ['/register','/login','/app','/admin','/admin/studios'])assert.equal(entryRoute(path,'',''),'app')
 for(const query of ['?book=studio','?activate=master','?code=example','?error=access_denied','?token_hash=example&type=invite'])assert.equal(entryRoute('/',query,''),'app')
 for(const hash of ['#access_token=example&type=invite','#type=recovery','#error=access_denied'])assert.equal(entryRoute('/','',hash),'app')
})

test('calendar rejects impossible dates and accepts leap years',()=>{
 assert.equal(validDate('2026-02-29'),false);assert.equal(validDate('2028-02-29'),true)
 assert.equal(parseDate('31.04.2026','date'),null);assert.equal(parseDate('24.09.2026','date'),'2026-09-24')
 assert.equal(parseDate('24.09.2026 23:59','datetime-local'),'2026-09-24T23:59')
 assert.equal(parseDate('24.09.2026 24:00','datetime-local'),null)
 assert.equal(parseDate('','date'),'');assert.equal(parseDate('9:67','time'),null)
})
test('date ranges constrain both ends',()=>{
 assert.ok(dateError('2026-09-23','2026-09-24'));assert.ok(dateError('2026-09-25',undefined,'2026-09-24'))
 assert.equal(dateError('2026-09-24','2026-09-24','2026-09-24'),'')
})
test('local dates and studio timezone respect summer and winter',()=>{
 assert.equal(localDate(new Date(2026,0,1,0,15)),'2026-01-01')
 assert.equal(studioDateTime('2026-01-15','09:00').toISOString(),'2026-01-15T07:00:00.000Z')
 assert.equal(studioDateTime('2026-07-15','09:00').toISOString(),'2026-07-15T06:00:00.000Z')
 assert.throws(()=>studioDateTime('2026-03-29','03:30'))
})
test('numbers accept comma, pasted spaces and zero but reject garbage and out of range',()=>{
 assert.equal(normalizeNumber('1 250,50'),'1250.50');assert.equal(numberError('0',0,100),'')
 for(const v of ['Infinity','NaN','1.2.3','-'])assert.ok(numberError(v,0))
 assert.ok(numberError('101',0,100));assert.ok(numberError('-1',0));assert.ok(numberError('1.005',0,100,.01))
 assert.equal(numberError('0.001',0,undefined,.001),'')
})
test('steppers respect precision and boundaries',()=>{
 assert.equal(stepNumber('0.2',1,0,100,.1),'0.3');assert.equal(stepNumber('100',1,0,100,1),'100')
 assert.equal(stepNumber('0',-1,0,100,1),'0');assert.equal(stepNumber('1.5',1,0,100,1),'2')
})
test('approval flow cannot skip review or change already accrued work',()=>{
 const base={status:'new',staffId:null,checklist:[]} 
 assert.ok(transitionError(base,'assigned'));assert.ok(transitionError(base,'issued'));assert.ok(transitionError(base,'ready'))
 const assigned={...base,status:'assigned',staffId:'master',checklist:[{id:'1',title:'Мийка',done:false}]}
 assert.ok(transitionError(assigned,'review'))
 assert.equal(transitionError({...assigned,checklist:[{id:'1',title:'Мийка',done:true}]},'review'),'')
 assert.equal(transitionError({...assigned,status:'review'},'ready'),'')
 assert.ok(transitionError({...assigned,status:'ready'},'in_progress'))
 assert.equal(transitionError({...assigned,status:'ready'},'issued'),'')
})
test('payroll loads every page and does not return partial totals on failure',async()=>{
 const rows=Array.from({length:1201},(_,id)=>({id,amount:10}))
 const result=await readAllPages(async(from,to)=>({data:rows.slice(from,to+1),error:null}))
 assert.equal(result.data.length,1201);assert.equal(result.data.reduce((s,r)=>s+r.amount,0),12010)
 const failed=await readAllPages(async(from,to)=>from?{data:null,error:'offline'}:{data:rows.slice(from,to+1),error:null})
 assert.equal(failed.data,null);assert.equal(failed.error,'offline')
})
