import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'
import {t} from '../src/i18n/core.ts'
import {messages} from '../src/i18n/messages.ts'
import {hmacMd5} from '../server/lib/wayforpay.ts'
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8')
async function loadHandler(path){const source=(await read(path)).replace("'@supabase/supabase-js'",JSON.stringify(import.meta.resolve('@supabase/supabase-js'))).replace("'../../server/lib/wayforpay.js'",JSON.stringify(new URL('../server/lib/wayforpay.ts',import.meta.url).href));return import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'))}
test('translations preserve unknown user content, spacing and source status values',()=>{
 for(const [key,pair] of Object.entries(messages)){assert.equal(pair.length,2,key);assert.ok(pair.every(v=>typeof v==='string'&&v.length>0),key)}
 assert.equal(t('Усі клієнти','en'),'All clients');assert.equal(t(' Клієнти ','ru'),' Клиенты ')
 assert.equal(t('BMW X5 · AA 1234 AA','en'),'BMW X5 · AA 1234 AA');assert.equal(t('__proto__','en'),'__proto__')
 assert.equal(t('Зберегти','uk'),'Зберегти')
})
test('service worker keeps API, external requests and authenticated responses out of cache',async()=>{
 const events={},cacheWrites=[],store=new Map(),cache={addAll:async paths=>paths.forEach(p=>store.set(p,{offline:p})),match:async r=>store.get(typeof r==='string'?r:r.url),put:async(r,v)=>{cacheWrites.push(r.url);store.set(r.url,v)}}
 const scope={location:{origin:'https://example.com'},addEventListener:(name,callback)=>events[name]=callback,clients:{claim:async()=>{}},skipWaiting:()=>{}}
 let offline=false,fetches=0
 runInNewContext(await read('public/sw.js'),{self:scope,URL,caches:{open:async()=>cache,keys:async()=>[],delete:async()=>{},match:async p=>cache.match(p)},fetch:async()=>{fetches++;if(offline)throw new Error('offline');return {ok:true,type:'basic',clone(){return this}}}})
 let task;events.install({waitUntil:p=>task=p});await task
 function request(url,extra={}){let result;events.fetch({request:{method:'GET',url,mode:'cors',headers:{has:()=>false},...extra},respondWith:p=>result=p});return result}
 assert.equal(request('https://example.com/api/private'),undefined)
 assert.equal(request('https://project.supabase.co/rest/v1/clients'),undefined)
 assert.equal(request('https://example.com/assets/app-abc.js',{headers:{has:()=>true}}),undefined)
 assert.equal(request('https://example.com/assets/app-abc.js',{method:'POST'}),undefined)
 await request('https://example.com/assets/app-abc.js');await request('https://example.com/assets/app-abc.js')
 assert.equal(fetches,1);assert.equal(cacheWrites.length,1)
 offline=true;assert.deepEqual(await request('https://example.com/app?code=private',{mode:'navigate'}),{offline:'/offline.html'})
 assert.equal(cacheWrites.length,1)
})
test('payment endpoint verifies active studio manager, signature and atomic database result',async context=>{
 const env={VITE_SUPABASE_URL:'https://test.supabase.co',VITE_SUPABASE_ANON_KEY:'public-test',SUPABASE_SERVICE_ROLE_KEY:'secret-test',WAYFORPAY_SECRET_KEY:'test-signature',WAYFORPAY_MERCHANT_ACCOUNT:'merchant',WAYFORPAY_MERCHANT_DOMAIN:'example.com',WAYFORPAY_APP_URL:'https://example.com'}
 const prior=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));Object.assign(process.env,env);context.after(()=>{for(const[k,v]of Object.entries(prior)){if(v===undefined)delete process.env[k];else process.env[k]=v}})
 const {createCheckoutHandler}=await loadHandler('api/wayforpay/checkout.ts'),{createCallbackHandler}=await loadHandler('api/wayforpay/callback.ts')
 let active=true,role='owner',staffCount=0,rpcError=null;const filters=[],writes=[],calls=[]
 const db={from(table){const chain={select(){return chain},in(k,v){filters.push([k,v]);return chain},eq(k,v){filters.push([k,v]);return chain},then(resolve){return Promise.resolve({count:staffCount,error:null}).then(resolve)},maybeSingle:async()=>({data:active?{tenant_id:'studio',role}:null}),insert:async value=>{writes.push({table,value});return {error:null}}};return chain},rpc:async(name,args)=>{calls.push({name,args});return {error:rpcError}}}
 const auth={auth:{getUser:async()=>({data:{user:{id:'owner'}}})}}
 const makeClient=(_,key)=>key==='public-test'?auth:db
 const checkout=createCheckoutHandler(makeClient),callback=createCallbackHandler(makeClient)
 async function invoke(handler,body){let code,result;await handler({method:'POST',headers:{authorization:'Bearer test'},body},{status(n){code=n;return this},json(v){result=v}});return {code,result}}
 active=false;assert.equal((await invoke(checkout,{tenantId:'studio',plan:'start'})).code,403);assert.equal(writes.length,0)
 active=true;const purchase=await invoke(checkout,{tenantId:'studio',plan:'start',amount:1});assert.equal(purchase.code,200);assert.equal(purchase.result.fields.amount,'690.00');assert.ok(filters.some(([k,v])=>k==='active'&&v===true))
 role='master';assert.equal((await invoke(checkout,{tenantId:'studio',plan:'start'})).code,403);role='admin';assert.equal((await invoke(checkout,{tenantId:'studio',plan:'start'})).code,200);staffCount=4;assert.equal((await invoke(checkout,{tenantId:'studio',plan:'start'})).code,409);assert.equal((await invoke(checkout,{tenantId:'studio',plan:'studio'})).code,200);
 const payload={merchantAccount:'merchant',orderReference:'DF-test',amount:690,currency:'UAH',transactionStatus:'Approved',authCode:'test',cardPan:'test',reasonCode:1100}
 payload.merchantSignature=hmacMd5([payload.merchantAccount,payload.orderReference,payload.amount,payload.currency,payload.authCode,payload.cardPan,payload.transactionStatus,payload.reasonCode])
 assert.equal((await invoke(callback,{...payload,amount:1})).code,400);assert.equal(calls.length,0)
 assert.equal((await invoke(callback,payload)).result.status,'accept');assert.equal(calls[0].name,'apply_subscription_payment');assert.equal('cardPan' in calls[0].args,false)
 rpcError=new Error('Unavailable');assert.equal((await invoke(callback,payload)).code,500)
})

test('administrator invitations require active owner and recovery uses bound active account',async context=>{
 const env={VITE_SUPABASE_URL:'https://test.supabase.co',VITE_SUPABASE_ANON_KEY:'public-test',SUPABASE_SERVICE_ROLE_KEY:'secret-test',APP_URL:'https://example.com'}
 const prior=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));Object.assign(process.env,env);context.after(()=>{for(const[k,v]of Object.entries(prior)){if(v===undefined)delete process.env[k];else process.env[k]=v}})
 const {createAdministratorHandler}=await loadHandler('api/staff/administrator.ts')
 let ownerActive=false,adminActive=true,deliveryError=null,role='owner',existingId=null;const sent=[],writes=[],filters=[]
 const db={rpc:async(name,args)=>{if(name==='reserve_administrator_invitation')return {data:{id:'invite-id',user_id:existingId},error:null};writes.push({tenant_id:'studio',user_id:args.user_input,role:'admin',active:true,finance_access:false});return {data:null,error:null}},from(table){let query={};const chain={select(){return chain},eq(k,v){query[k]=v;filters.push([k,v]);return chain},maybeSingle:async()=>({data:query.role==='owner'?(ownerActive&&role==='owner'?{role}:null):(query.active===undefined?{user_id:'admin-id',role:'admin',active:adminActive}:(adminActive?{user_id:'admin-id'}:null))}),insert:async value=>{writes.push(value);return {error:null}}};return chain},auth:{admin:{getUserById:async id=>({data:{user:{id,email:'bound-admin@example.com'}}}),inviteUserByEmail:async(email,options)=>{sent.push({email,options,kind:'invite'});return {data:{user:{id:'new-admin'}},error:deliveryError}}}}}
 const auth={auth:{getUser:async()=>({data:{user:{id:'requester'}}}),resetPasswordForEmail:async(email,options)=>{sent.push({email,options,kind:'recovery'});return {error:deliveryError}}}}
 const handler=createAdministratorHandler((url,key)=>key==='public-test'?auth:db)
 async function invoke(body){let code,result;await handler({method:'POST',headers:{authorization:'Bearer test',host:'attacker.example'},body:{tenantId:'studio',...body}},{status(n){code=n;return this},json(v){result=v}});return {code,result}}
 assert.equal((await invoke({action:'invite',name:'Admin',email:'new-admin@example.com'})).code,403);assert.equal(sent.length,0)
 ownerActive=true;role='admin';assert.equal((await invoke({action:'invite',name:'Admin',email:'new-admin@example.com'})).code,403)
 role='owner';adminActive=false;assert.equal((await invoke({action:'recovery',userId:'admin-id'})).code,403);assert.equal(sent.length,0)
 adminActive=true;assert.equal((await invoke({action:'recovery',userId:'admin-id',email:'attacker@example.com'})).code,200)
 assert.equal(sent[0].email,'bound-admin@example.com');assert.equal(sent[0].options.redirectTo,'https://example.com/login?role=admin&activate=admin')
 deliveryError={message:'SMTP unavailable'};assert.equal((await invoke({action:'invite',name:'Admin',email:'new-admin@example.com'})).code,400);assert.equal(writes.length,0)
 deliveryError=null;assert.equal((await invoke({action:'invite',name:'Admin',email:'new-admin@example.com'})).code,200)
 assert.deepEqual(writes[0],{tenant_id:'studio',user_id:'new-admin',role:'admin',active:true,finance_access:false});assert.ok(filters.some(([k,v])=>k==='active'&&v===true))
 existingId='admin-id';adminActive=false;const before=sent.length
 assert.equal((await invoke({action:'invite',name:'Admin',email:'new-admin@example.com'})).code,403);assert.equal(sent.length,before)
 adminActive=true;assert.equal((await invoke({action:'invite',name:'Admin',email:'new-admin@example.com'})).code,200);assert.equal(sent.at(-1).kind,'recovery')
})
