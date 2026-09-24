import { test } from 'node:test'
import assert from 'node:assert/strict'
import { localDate, validDate, parseDate, dateError, normalizeNumber, numberError, stepNumber, studioDateTime } from '../src/lib/formValues.ts'
import { transitionError } from '../src/lib/workOrderFlow.ts'
import { readAllPages } from '../src/lib/pagination.ts'
import { entryRoute } from '../src/lib/entryRoute.ts'

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
