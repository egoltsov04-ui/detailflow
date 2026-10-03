import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {stripTypeScriptTypes} from 'node:module'
import {availableStaff,bookingTotals,studioDay,addBookingDays} from '../src/lib/bookingAvailability.ts'
import {bookingEmail} from '../server/lib/bookingContact.ts'
const data={studio:{name:'Test',address:null,timezone:'Europe/Kyiv'},services:[{id:'wash',name:'Wash',price:850,duration_minutes:60},{id:'inside',name:'Interior',price:1200,duration_minutes:90}],staff:[{id:'a',full_name:'A'},{id:'b',full_name:'B'}],schedules:['a','b'].map(staff_id=>({staff_id,weekday:1,starts_at:'09:00',ends_at:'19:00'})),appointments:[]}
const now=Date.parse('2026-09-28T04:00:00Z'),start=new Date('2026-09-28T06:00:00Z')
test('booking totals, timezone dates and date arithmetic',()=>{
 assert.deepEqual(bookingTotals(data.services),{price:2050,duration:150})
 assert.equal(studioDay(new Date('2026-09-28T22:00:00Z'),'Europe/Kyiv'),'2026-09-29')
 assert.equal(addBookingDays('2026-09-30',1),'2026-10-01')
})
test('availability respects full duration, lead time and horizon',()=>{
 assert.equal(availableStaff(data,start,150,'',now).length,2)
 assert.equal(availableStaff(data,start,150,'a',now).length,1)
 assert.equal(availableStaff(data,new Date('2026-09-28T15:00:00Z'),150,'',now).length,0)
 assert.equal(availableStaff(data,start,150,'',start.getTime()-60000).length,0)
 assert.equal(availableStaff(data,new Date('2026-11-01T07:00:00Z'),60,'',now).length,0)
 assert.equal(availableStaff(data,start,NaN,'',now).length,0)
 assert.equal(availableStaff({...data,schedules:[]},start,60,'',now).length,0)
})
test('availability uses any free professional, overlapping shifts and boundary slots',()=>{
 const busy={...data,appointments:[{staff_id:'a',starts_at:'2026-09-28T06:00:00Z',ends_at:'2026-09-28T08:00:00Z'}]}
 assert.deepEqual(availableStaff(busy,start,60,'',now).map(s=>s.id),['b'])
 assert.equal(availableStaff(busy,start,60,'a',now).length,0)
 assert.equal(availableStaff(busy,new Date('2026-09-28T08:00:00Z'),60,'a',now).length,1)
 const shifts={...data,schedules:[{staff_id:'a',weekday:2,starts_at:'09:00',ends_at:'19:00'},data.schedules[1]]}
 assert.deepEqual(availableStaff(shifts,start,60,'',now).map(s=>s.id),['b'])
 assert.equal(availableStaff({...busy,appointments:[{...busy.appointments[0],staff_id:null}]},start,60,'',now).length,0)
 const overnight={...data,schedules:[{staff_id:'a',weekday:1,starts_at:'09:00',ends_at:'23:59'}]}
 assert.equal(availableStaff(overnight,new Date('2026-09-28T20:00:00Z'),150,'a',now).length,0)
})
test('booking-specific email cannot replace CRM email for unrelated appointments',()=>{
 assert.equal(bookingEmail('Email онлайн-запису: request@example.com\nMore','public','crm@example.com'),'request@example.com')
 assert.equal(bookingEmail('Email онлайн-запису: request@example.com','manual','crm@example.com'),'crm@example.com')
 assert.equal(bookingEmail('Email онлайн-запису: invalid','public','crm@example.com'),'crm@example.com')
})
const source=(await readFile(new URL('../api/public/booking.ts',import.meta.url),'utf8')).replace("'@supabase/supabase-js'",JSON.stringify(import.meta.resolve('@supabase/supabase-js'))).replace("'../../src/lib/bookingAvailability.js'",JSON.stringify(new URL('../src/lib/bookingAvailability.ts',import.meta.url).href))
const {createPublicBookingHandler}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source.replace("'../../src/lib/pagination.js'",JSON.stringify(new URL('../src/lib/pagination.ts',import.meta.url).href)))).toString('base64'))
test('public API validates tenant catalog and server time, saves multiple services, and cleans failed requests',async t=>{
 const originalNow=Date.now;Date.now=()=>now;t.after(()=>Date.now=originalNow)
 const prev={VITE_SUPABASE_URL:process.env.VITE_SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY};Object.assign(process.env,{VITE_SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fake'})
 t.after(()=>{for(const [k,v]of Object.entries(prev)){if(v===undefined)delete process.env[k];else process.env[k]=v}})
 const writes=[];let failServices=false;let busy=[];let access=true
 const db={rpc:async()=>({data:access,error:null}),from(table){let operation='select';const chain={select(){return chain},eq(){return chain},in(){return chain},gte(){return chain},lte(){return chain},order(){return chain},range(){return chain},insert(values){operation='insert';writes.push({table,operation,values});return chain},upsert(values,options){operation='upsert';writes.push({table,operation,values,options});return chain},delete(){operation='delete';writes.push({table,operation});return chain},maybeSingle(){return chain},single(){return chain},then(resolve){const rows=table==='tenants'?{id:'tenant',...data.studio}:table==='services'?data.services:table==='staff_profiles'?data.staff:table==='work_schedules'?data.schedules:table==='appointments'&&operation==='select'?busy:{id:table+'-id'};return Promise.resolve({data:rows,error:table==='appointment_services'&&failServices?{code:'failed'}:null}).then(resolve)}};return chain}}
 const handler=createPublicBookingHandler(()=>db)
 async function request(body,method='POST'){let status,result;await handler({method,body,query:{slug:'test'}},{status(code){status=code;return this},json(value){result=value}});return {status,result}}
 const payload={slug:'test',clientName:'Test',phone:'+380 00 000 00 01',email:'test@example.com',car:'BMW X5',serviceIds:['wash','inside'],staffId:'',startsAt:start.toISOString()}
 assert.equal((await request({...payload,serviceIds:['unknown']})).status,400);assert.equal(writes.length,0)
 assert.equal((await request({...payload,staffId:'other-tenant'})).status,409);assert.equal(writes.length,0)
 assert.equal((await request({...payload,phone:'123'})).status,400)
 assert.equal((await request({...payload,startsAt:'invalid'})).status,409)
 assert.equal((await request(payload)).status,201)
 const appointment=writes.find(w=>w.table==='appointments'&&w.operation==='insert').values
 assert.equal(appointment.status,'pending');assert.equal(appointment.staff_id,'a');assert.equal(appointment.ends_at,'2026-09-28T08:30:00.000Z')
 assert.equal(writes.find(w=>w.table==='appointment_services').values.length,2)
 assert.equal(writes.find(w=>w.table==='clients').options.ignoreDuplicates,true)
 assert.equal(bookingEmail(appointment.notes,'public'),payload.email)
 data.services[0].variants=[{id:'xl',name:'XL',price:1400,duration_minutes:120}]
 assert.equal((await request({...payload,serviceIds:['wash']})).status,400)
 assert.equal((await request({...payload,serviceIds:['wash'],variantIds:{wash:'wrong'}})).status,400)
 assert.equal((await request({...payload,serviceIds:['wash'],variantIds:{wash:'xl'},price:1})).status,201)
 const variantWrite=writes.filter(w=>w.table==='appointment_services').at(-1).values[0]
 assert.equal(variantWrite.service_id,'wash');assert.equal(variantWrite.service_name,'Wash · XL');assert.equal(variantWrite.unit_price,1400);assert.equal(variantWrite.duration_minutes,120)
 delete data.services[0].variants
 const count=writes.length;busy=[{staff_id:null,starts_at:start.toISOString(),ends_at:'2026-09-28T10:00:00Z'}]
 assert.equal((await request(payload)).status,409);assert.equal(writes.length,count)
 busy=[];access=false;const beforeExpired=writes.length;assert.equal((await request(payload)).status,409);assert.equal((await request(null,'GET')).status,409);assert.equal(writes.length,beforeExpired);access=true;failServices=true
 assert.equal((await request(payload)).status,500)
 assert.deepEqual(writes.at(-1),{table:'appointments',operation:'delete'})
})
