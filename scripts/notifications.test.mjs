import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {stripTypeScriptTypes} from 'node:module'
import {EmailDeliveryError,sendEmail} from '../server/lib/sendpulse.ts'
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8')
async function handler(){let source=await read('api/send-reminders.ts');source=source.replace("import {deliverPushQueue} from '../server/lib/push.js'","const deliverPushQueue=async()=>({configured:false,sent:0})").replace("'@supabase/supabase-js'",JSON.stringify(import.meta.resolve('@supabase/supabase-js'))).replace("'../server/lib/sendpulse.js'",JSON.stringify(new URL('../server/lib/sendpulse.ts',import.meta.url).href)).replace("'../server/lib/bookingContact.js'",JSON.stringify(new URL('../server/lib/bookingContact.ts',import.meta.url).href));return (await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'))).createReminderHandler}
function env(t,values){const prior=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));Object.assign(process.env,values);t.after(()=>{for(const[k,v]of Object.entries(prior)){if(v===undefined)delete process.env[k];else process.env[k]=v}})}
test('notification processor cancels changed bookings, retries rejection and preserves uncertain delivery',async t=>{
 env(t,{VITE_SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'secret-test',CRON_SECRET:'cron-test',SENDPULSE_API_KEY:'mail-test',SENDPULSE_API_FROM_EMAIL:'studio@example.com'})
 const create=await handler(),starts=new Date(Date.now()+90*60000).toISOString();let status='confirmed',deliveryError=null,sent=0,saveError=false;const results=[]
 const job={id:'job',tenant_id:'studio',claim_token:'claim',kind:'visit_2',payload:{appointment_id:'appointment',starts_at:starts},expires_at:new Date(Date.now()+3600000).toISOString()}
 const db={rpc:async(name,args)=>{if(name==='claim_notifications')return {data:[job]};if(name==='finish_notification'){results.push(args);return {data:!saveError,error:saveError?new Error('Unavailable'):null}}return {data:null}},from(){const chain={select(){return chain},eq(){return chain},maybeSingle:async()=>({data:{id:'appointment',status,starts_at:starts,source:'public',notes:'Email онлайн-запису: booking@example.com',clients:{full_name:'Client',email:'crm@example.com'},appointment_services:[{service_name:'Wash'}],tenants:{name:'Studio',timezone:'Europe/Kyiv',reminder_settings:{email_enabled:true,reminder_2h_enabled:true}}}})};return chain}}
 const request=create(()=>db,async message=>{sent++;assert.equal(message.to[0].email,'booking@example.com');if(deliveryError)throw deliveryError;return {id:'provider-id'}})
 async function invoke(token='cron-test'){let code,body;await request({method:'POST',headers:{authorization:'Bearer '+token}},{status(n){code=n;return this},json(v){body=v}});return {code,body}}
 assert.equal((await invoke('wrong')).code,401);assert.equal(sent,0)
 status='cancelled';assert.equal((await invoke()).body.cancelled,1);assert.equal(sent,0)
 status='confirmed';job.payload.starts_at=new Date(Date.now()+24*3600000).toISOString();assert.equal((await invoke()).body.cancelled,1);assert.equal(sent,0);job.payload.starts_at=starts
 deliveryError=new EmailDeliveryError('429',false);assert.equal((await invoke()).body.failed,1)
 deliveryError=new Error('Network timeout');assert.equal((await invoke()).body.uncertain,1)
 deliveryError=null;assert.equal((await invoke()).body.sent,1);assert.equal(results.at(-1).provider_input,'provider-id')
 saveError=true;assert.equal((await invoke()).code,503);assert.equal(results.at(-1).status_input,'sent')
})
test('SendPulse encodes HTML and rejects provider refusal without exposing response data',async t=>{
 env(t,{SENDPULSE_API_KEY:'mail-test',SENDPULSE_API_FROM_EMAIL:'studio@example.com'});let body,status=200,result={result:true,id:'provider'}
 t.mock.method(globalThis,'fetch',async(url,init)=>{body=JSON.parse(init.body);return {ok:status===200,status,statusText:'Error',text:async()=>JSON.stringify(result)}})
 assert.equal((await sendEmail({to:[{email:'client@example.com'}],subject:'Test',html:'<p>Привіт</p>',text:'Привіт'})).id,'provider')
 assert.equal(Buffer.from(body.email.html,'base64').toString('utf8'),'<p>Привіт</p>')
 result={result:false};await assert.rejects(sendEmail({to:[],subject:'Test',html:'',text:''}),e=>e instanceof EmailDeliveryError&&!e.uncertain)
 result={};await assert.rejects(sendEmail({to:[],subject:'Test',html:'',text:''}),e=>e instanceof EmailDeliveryError&&e.uncertain)
 status=500;await assert.rejects(sendEmail({to:[],subject:'Test',html:'',text:''}),e=>e instanceof EmailDeliveryError&&e.uncertain)
})

test('push API rejects untrusted endpoints, blocked accounts and changing another account subscription',async t=>{
 env(t,{VITE_SUPABASE_URL:'https://test.supabase.co',VITE_SUPABASE_ANON_KEY:'public-test',SUPABASE_SERVICE_ROLE_KEY:'service-test',VAPID_PUBLIC_KEY:'public-vapid-test',VAPID_PRIVATE_KEY:'private-vapid-test'})
 const source=(await read('api/push.ts')).replace("'@supabase/supabase-js'",JSON.stringify(import.meta.resolve('@supabase/supabase-js')))
 const {createPushHandler,validPushEndpoint}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'))
 for(const invalid of ['http://fcm.googleapis.com/a','https://fcm.googleapis.com.attacker.example/a','https://127.0.0.1','https://fcm.googleapis.com:8443/a','https://user:pass@fcm.googleapis.com/a'])assert.equal(validPushEndpoint(invalid),false)
 assert.equal(validPushEndpoint('https://updates.push.services.mozilla.com/a'),true)
 let role='blocked',existing=null,writes=0;const filters=[]
 const auth={auth:{getUser:async()=>({data:{user:{id:'user'}}})},rpc:async()=>({data:{role}})}
 const db={rpc:async()=>{if(existing&&existing.user_id!=='user')return {data:'conflict'};writes++;return {data:'ok'}},from(){const chain={select(){return chain},eq(k,v){filters.push([k,v]);return chain},maybeSingle:async()=>({data:existing}),upsert:async()=>{writes++;return {}},delete(){writes++;return chain},then(resolve){return Promise.resolve({count:0,error:null}).then(resolve)}};return chain}}
 const handler=createPushHandler((url,key)=>key==='public-test'?auth:db),subscription={endpoint:'https://fcm.googleapis.com/a',keys:{p256dh:'A'.repeat(87),auth:'A'.repeat(22)}}
 async function invoke(action='subscribe'){let code;await handler({method:'POST',headers:{authorization:'Bearer test'},body:{action,subscription}},{status(n){code=n;return this},json(){}});return code}
 assert.equal(await invoke(),403);assert.equal(writes,0)
 role='master';existing={id:'s',user_id:'someone-else'};assert.equal(await invoke(),409);assert.equal(writes,0)
 existing=null;assert.equal(await invoke(),200);assert.equal(writes,1)
 assert.equal(await invoke('unsubscribe'),200);assert.ok(filters.some(([k,v])=>k==='user_id'&&v==='user'))
})

test('push delivery skips blocked recipients, removes expired devices and distinguishes retryable failures',async t=>{
 env(t,{VAPID_PUBLIC_KEY:'public-test',VAPID_PRIVATE_KEY:'private-test'})
 const endpointSource=(await read('api/push.ts')).replace("'@supabase/supabase-js'",JSON.stringify(import.meta.resolve('@supabase/supabase-js')))
 const endpointModule='data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(endpointSource)).toString('base64')
 const source=(await read('server/lib/push.ts')).replace("'web-push'",JSON.stringify(import.meta.resolve('web-push'))).replace("'../../api/push.js'",JSON.stringify(endpointModule))
 const {deliverPushQueue}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'))
 let active=false,code=0,sends=0,deleted=0,finish
 const db={rpc:async(name,args)=>name==='claim_notifications'?{data:[{id:'job',tenant_id:'studio',recipient_user_id:'master',claim_token:'claim',kind:'work_assigned',payload:{subscription_id:'subscription'}}]}:(finish=args,{data:true}),from(table){const chain={select(){return chain},eq(){return chain},delete(){deleted++;return chain},maybeSingle:async()=>({data:table==='push_subscriptions'?{endpoint:'https://fcm.googleapis.com/test',keys:{},locale:'en'}:active?{role:'master',id:'master'}:null}),then(resolve){return Promise.resolve({error:null}).then(resolve)}};return chain}}
 const send=async(sub,payload)=>{sends++;assert.equal(JSON.parse(payload).title,'New work assigned');if(code)throw {statusCode:code}}
 await deliverPushQueue(db,send);assert.equal(sends,0);assert.equal(finish.status_input,'cancelled')
 active=true;await deliverPushQueue(db,send);assert.equal(sends,1);assert.equal(finish.status_input,'sent')
 code=410;await deliverPushQueue(db,send);assert.equal(deleted,1);assert.equal(finish.status_input,'cancelled')
 code=429;await deliverPushQueue(db,send);assert.equal(finish.status_input,'failed')
 code=500;await deliverPushQueue(db,send);assert.equal(finish.status_input,'uncertain')
})
