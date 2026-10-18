import {test} from 'node:test'
import assert from 'node:assert/strict'
import {operationsReport,futureCapacity,customerForecast,recommendationOutcomes} from '../src/lib/studioIntelligence.ts'
const empty=()=>({as_of:'2026-10-04T18:00:00Z',timezone:'Europe/Kyiv',from:'2026-10-04',to:'2026-10-04',orders:[],clients:[],staff:[],schedules:[],appointments:[],shifts:[],sessions:[],services:[],outcomes:[]})
test('actual utilization merges timers, excludes breaks and clips to report dates; no-shows remain separate',()=>{
 const d=empty();d.staff=[{id:'a',name:'A',active:true},{id:'b',name:'B',active:true}]
 d.shifts=[{staff_id:'a',start:'2026-10-04T06:00Z',end:'2026-10-04T14:00Z',breaks:[{from:'2026-10-04T10:00Z',to:'2026-10-04T11:00Z'}]}]
 d.sessions=[{staff_id:'a',start:'2026-10-04T07:00Z',end:'2026-10-04T12:00Z'},{staff_id:'a',start:'2026-10-04T08:00Z',end:'2026-10-04T09:00Z'}]
 d.appointments=['no_show','completed','cancelled','pending'].map((status,i)=>({id:String(i),staff_id:'a',start:'2026-10-04T07:00Z',end:'2026-10-04T08:00Z',status}))
 const r=operationsReport(d).rows;assert.equal(r[0].attendance,420);assert.equal(r[0].worked,240);assert.equal(r[0].no_show_rate,50);assert.equal(r[0].cancelled,1);assert.equal(r[1].utilization,null)
})
test('future schedule capacity excludes cancellations and never invents an absent schedule',()=>{
 const d=empty();d.staff=[{id:'a',name:'A',active:true}];assert.equal(futureCapacity(d).percent,null)
 d.schedules=[{staff_id:'a',weekday:1,starts_at:'09:00',ends_at:'17:00'}]
 d.appointments=[{id:'a',staff_id:'a',start:'2026-10-05T06:00Z',end:'2026-10-05T10:00Z',status:'confirmed'},{id:'b',staff_id:'a',start:'2026-10-05T10:00Z',end:'2026-10-05T14:00Z',status:'cancelled'}]
 const r=futureCapacity(d);assert.equal(r.total,960);assert.equal(r.used,240);assert.equal(r.percent,25)
})
test('forecast stays unavailable for sparse history and validates on later labels without future feature leakage',()=>{
 const d=empty();assert.equal(customerForecast(d).ready,false)
 const now=Date.parse(d.as_of),day=86400000
 for(let i=0;i<100;i++){const id=String(i);d.clients.push({id,name:id});for(const ago of (i<50?[360,330,300,270,240,210,175,145,115,85,55,25]:[360,340,320]))d.orders.push({id:id+'-'+ago,client_id:id,value:i<50?1000:100,at:new Date(now-ago*day).toISOString()})}
 const r=customerForecast(d);assert.equal(r.training,100);assert.equal(r.validation,100);assert.equal(r.ready,true);assert.ok(r.mae<r.baseline_mae);assert.ok(r.brier<r.baseline_brier);assert.ok(r.rows.every(r=>Number.isFinite(r.value90)&&r.return_probability>=0&&r.return_probability<=1))
 // Future rows must not change either validation or forecasts.
 d.orders.push({id:'future',client_id:'0',value:10000000,at:new Date(now+day).toISOString()})
 const next=customerForecast(d);assert.equal(next.mae,r.mae);assert.deepEqual(next.rows,r.rows)
})
test('observed outcomes use the action date and stop at 90 days, without causal claims',()=>{
 const d=empty();d.outcomes=[{id:'x',kind:'return',target:'client',at:'2026-06-01T00:00Z',evidence:{}}];d.orders=[{id:'1',client_id:'client',value:100,at:'2026-05-30T00:00Z'},{id:'2',client_id:'client',value:200,at:'2026-06-20T00:00Z'},{id:'3',client_id:'client',value:500,at:'2026-10-01T00:00Z'}]
 const r=recommendationOutcomes(d)[0];assert.equal(r.visits,1);assert.equal(r.value,200);assert.equal(r.complete,true)
})
