import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {stripTypeScriptTypes} from 'node:module'
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8')
const load=source=>import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'))
const libSource=(await read('server/lib/telegram.ts')).replace("import {titles} from './push.js'","const titles={work_assigned:['Призначено нову роботу','New work assigned']}").replace("'./siteUrl.js'",JSON.stringify(new URL('../server/lib/siteUrl.ts',import.meta.url).href))
const lib=await load(libSource)
const libUrl='data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(libSource)).toString('base64')
const {createTelegramHandler}=await load((await read('api/telegram.ts')).replace("'@supabase/supabase-js'",JSON.stringify(import.meta.resolve('@supabase/supabase-js'))).replace("'../server/lib/telegram.js'",JSON.stringify(libUrl)))
function env(t,values){const prior=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));for(const[k,v]of Object.entries(values)){if(v===undefined)delete process.env[k];else process.env[k]=v}t.after(()=>{for(const[k,v]of Object.entries(prior)){if(v===undefined)delete process.env[k];else process.env[k]=v}})}
const base={VITE_SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'service-test',TELEGRAM_BOT_TOKEN:'bot-test',TELEGRAM_WEBHOOK_SECRET:'hook-secret',TELEGRAM_BOT_USERNAME:undefined,APP_URL:'https://app.example.com'}

test('Telegram webhook trusts only the secret header, links by one-time token and unlinks on /stop',async t=>{
 env(t,base)
 const calls=[],sent=[];let bind={status:'staff'},fail=false
 const db={rpc:async(name,args)=>{calls.push([name,args]);if(fail)return {error:new Error('down')};return {data:name==='telegram_bind'?bind:1}}}
 const handler=createTelegramHandler(()=>db,async(chat,text)=>{sent.push([chat,text])})
 async function call(body,secret='hook-secret',method='POST'){let code,json;await handler({method,headers:{'x-telegram-bot-api-secret-token':secret},body},{status(n){code=n;return this},json(v){json=v}});return {code,json}}
 const msg=(text,extra={})=>({message:{text,chat:{id:42,type:'private'},from:{language_code:'uk'},...extra}})
 const token='0123456789abcdef0123456789abcdef'
 assert.deepEqual((await call(undefined,'','GET')).json,{bot:'detailflow_ua_bot'})
 assert.equal((await call(msg('/start '+token),'wrong')).code,401);assert.equal(calls.length,0)
 assert.equal((await call(msg('/start '+token))).code,200)
 assert.deepEqual(calls.at(-1),['telegram_bind',{token_input:token,chat_input:42,locale_input:'uk'}]);assert.match(sent.at(-1)[1],/Telegram підключено/)
 bind={status:'client',studio:'A<b>'};await call(msg('/start '+token));assert.match(sent.at(-1)[1],/<b>A&lt;b&gt;<\/b>/)
 bind={status:'invalid'};await call(msg('/start '+token));assert.match(sent.at(-1)[1],/застаріло/)
 await call(msg('/start not-a-token'));assert.equal(calls.length,3);assert.match(sent.at(-1)[1],/бот сповіщень/)
 await call(msg('/stop'));assert.deepEqual(calls.at(-1),['telegram_unbind',{chat_input:42}])
 // group chats are ignored: a link must not reach a shared chat
 const before=calls.length;await call({message:{text:'/start '+token,chat:{id:-5,type:'group'}}});assert.equal(calls.length,before)
 fail=true;assert.equal((await call(msg('/start '+token))).code,503)
 env(t,{TELEGRAM_WEBHOOK_SECRET:undefined});assert.equal((await call(msg('/stop'))).code,401);assert.deepEqual((await call(undefined,'','GET')).json,{bot:null})
})

test('Telegram queue: staff get a short text, clients their booking; blocked chats are forgotten',async t=>{
 env(t,base)
 const starts=new Date(Date.now()+3*3600000).toISOString(),finish=[],unbound=[],sent=[]
 let jobs=[],status='confirmed',member=true,sendError=null
 const rows={telegram_chats:{chat_id:77,locale:'uk'},tenant_memberships:()=>member?{role:'owner'}:null,appointments:()=>({status,starts_at:starts,appointment_services:[{service_name:'Мийка'}],tenants:{name:'Shine & Co',timezone:'Europe/Kyiv',phone:'380501112233',address:'Київ, вул. Хрещатик, 1'}})}
 const db={rpc:async(name,args)=>{if(name==='claim_notifications')return {data:jobs};if(name==='finish_notification'){finish.push(args);return {data:true}};if(name==='telegram_unbind'){unbound.push(args.chat_input);return {data:1}};return {data:null}},
  from(table){const chain={select(){return chain},eq(){return chain},maybeSingle:async()=>({data:typeof rows[table]==='function'?rows[table]():rows[table]})};return chain}}
 const send=async(chat,text)=>{if(sendError)throw sendError;sent.push([chat,text])}
 jobs=[{id:'1',claim_token:'c',tenant_id:'s',kind:'work_assigned',recipient_user_id:'u',payload:{}}]
 assert.deepEqual(await lib.deliverTelegramQueue(db,send),{configured:true,sent:1});assert.equal(sent[0][0],77);assert.match(sent[0][1],/^<b>Призначено нову роботу<\/b>\nДеталі в застосунку: https:\/\/app\.example\.com\/app/)
 member=false;await lib.deliverTelegramQueue(db,send);assert.equal(finish.at(-1).status_input,'cancelled');assert.equal(sent.length,1)
 jobs=[{id:'2',claim_token:'c',tenant_id:'s',kind:'booking_confirmed',recipient_user_id:null,payload:{appointment_id:'a'}}]
 await lib.deliverTelegramQueue(db,send);assert.match(sent.at(-1)[1],/^<b>Запис підтверджено<\/b>\n\n<b>Shine &amp; Co<\/b>\nКоли: .+\nПослуга: Мийка\nАдреса: <a href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=.+">Київ, вул\. Хрещатик, 1<\/a>\nТелефон: \+380501112233\n\nВідписатися від повідомлень: \/stop$/)
 status='cancelled';await lib.deliverTelegramQueue(db,send);assert.equal(finish.at(-1).status_input,'cancelled');assert.equal(sent.length,2)
 status='confirmed';jobs=[{id:'3',claim_token:'c',tenant_id:'s',kind:'visit_2',recipient_user_id:null,payload:{appointment_id:'a',starts_at:starts}}]
 await lib.deliverTelegramQueue(db,send);assert.match(sent.at(-1)[1],/^<b>Нагадування: візит сьогодні<\/b>/)
 jobs[0].payload.starts_at=new Date(Date.now()+9*3600000).toISOString();await lib.deliverTelegramQueue(db,send);assert.equal(finish.at(-1).status_input,'cancelled');jobs[0].payload.starts_at=starts
 sendError=new lib.TelegramError(403);await lib.deliverTelegramQueue(db,send);assert.deepEqual(unbound,[77]);assert.equal(finish.at(-1).status_input,'cancelled')
 sendError=new lib.TelegramError(429);await lib.deliverTelegramQueue(db,send);assert.equal(finish.at(-1).status_input,'failed')
 sendError=new Error('timeout');await lib.deliverTelegramQueue(db,send);assert.equal(finish.at(-1).status_input,'uncertain')
 env(t,{TELEGRAM_BOT_TOKEN:undefined});assert.deepEqual(await lib.deliverTelegramQueue(db,send),{configured:false,sent:0})
})
