import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {stripTypeScriptTypes} from 'node:module'
const source=(await readFile(new URL('../api/staff/invite.ts',import.meta.url),'utf8'))
 .replace("'@supabase/supabase-js'",JSON.stringify(import.meta.resolve('@supabase/supabase-js')))
 .replace("'../lib/staffMail.js'",JSON.stringify(new URL('../api/lib/staffMail.ts',import.meta.url).href))
const compiled=stripTypeScriptTypes(source)
const {createStaffMailHandler}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'))
test('staff email endpoint enforces membership, identity, blocked state and delivery failures',async t=>{
 const env={VITE_SUPABASE_URL:'https://test.supabase.co',VITE_SUPABASE_ANON_KEY:'test-anon',SUPABASE_SERVICE_ROLE_KEY:'test-service',APP_URL:'https://example.com'}
 const previous=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));Object.assign(process.env,env)
 t.after(()=>{for(const [k,v] of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v}})
 let manager=true,active=true,deliveryError=null,linked=true;const sent=[],writes=[]
 const staff=()=>({id:'staff',tenant_id:'studio',full_name:'Master',active,user_id:linked?'account':null,invite_email:'master@example.com',invite_sent_at:null})
 const db={from(table){let data,update;const chain={select(){return chain},eq(){return chain},in(){return chain},maybeSingle(){return Promise.resolve({data:table==='staff_profiles'?staff():manager?{tenant_id:'studio'}:null})},update(values){update=values;writes.push({table,values});return chain},upsert(values){writes.push({table,values});return Promise.resolve({error:null})},then(resolve){return Promise.resolve({data,error:null}).then(resolve)}};return chain},auth:{admin:{getUserById:async()=>({data:{user:{email:'master@example.com'}}}),inviteUserByEmail:async(email,options)=>{sent.push({kind:'invite',email,options});return {data:{user:{id:'account'}},error:deliveryError}}}}}
 const auth={auth:{getUser:async()=>({data:{user:{id:'owner'}}}),resetPasswordForEmail:async(email,options)=>{sent.push({kind:'recovery',email,options});return {error:deliveryError}}}}
 const handler=createStaffMailHandler((url,key)=>key==='test-anon'?auth:db)
 async function request(body){let status,result;await handler({method:'POST',headers:{authorization:'Bearer token',host:'untrusted.example'},body},{status(code){status=code;return this},json(value){result=value}});return {status,result}}
 manager=false;assert.equal((await request({staffId:'staff',action:'recovery'})).status,403);assert.equal(sent.length,0)
 manager=true;active=false;assert.equal((await request({staffId:'staff',action:'resend'})).status,400);assert.equal(sent.length,0)
 active=true;assert.equal((await request({staffId:'staff',action:'recovery',email:'stranger@example.com'})).status,400);assert.equal(sent.length,0)
 assert.equal((await request({staffId:'staff',action:'recovery'})).status,200)
 assert.equal(sent[0].email,'master@example.com');assert.equal(sent[0].options.redirectTo,'https://example.com/login?role=master&activate=master')
 assert.deepEqual(Object.keys(writes[0].values),['invite_sent_at'])
 deliveryError={message:'SMTP unavailable'};const before=writes.length
 assert.equal((await request({staffId:'staff',action:'resend'})).status,400);assert.equal(writes.length,before)
 linked=false;deliveryError=null
 assert.equal((await request({staffId:'staff',email:'new@example.com',action:'invite'})).status,200)
 assert.equal(sent.at(-1).kind,'invite');assert.equal(sent.at(-1).email,'new@example.com')
})
