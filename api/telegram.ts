import {createClient} from '@supabase/supabase-js'
import {createHash,timingSafeEqual} from 'node:crypto'
import {sendTelegram,telegramBot} from '../server/lib/telegram.js'
type Request={method?:string;headers:Record<string,string|string[]|undefined>;body?:any}
type Response={status:(code:number)=>Response;json:(body:unknown)=>void}
const digest=(value:string)=>createHash('sha256').update(value).digest()
const replies={
 staff:['Telegram підключено. Сюди приходитимуть робочі сповіщення Detailflow. Вимкнути: /stop або кнопка «Відключити» в застосунку.','Telegram is connected. Detailflow work notifications will arrive here. To turn them off: /stop or «Disconnect» in the app.'],
 invalid:['Посилання застаріло або вже використане. Отримайте нове в Detailflow.','This link has expired or was already used. Get a new one in Detailflow.'],
 stop:['Сповіщення вимкнено. Щоб увімкнути знову, скористайтеся кнопкою в Detailflow.','Notifications are off. To turn them on again, use the button in Detailflow.'],
 help:['Це бот сповіщень Detailflow. Щоб підключити його, натисніть кнопку Telegram у застосунку Detailflow або після онлайн-запису.','This is the Detailflow notification bot. To connect it, press the Telegram button in the Detailflow app or after an online booking.'],
}

/** Telegram webhook: /start <token> links the chat, /stop unlinks it. Only Telegram knows the secret header. */
export function createTelegramHandler(makeClient:typeof createClient=createClient,send=sendTelegram){return async function handler(req:Request,res:Response){
 if(req.method==='GET')return res.status(200).json({bot:telegramBot()})
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
 const secret=process.env.TELEGRAM_WEBHOOK_SECRET,given=req.headers['x-telegram-bot-api-secret-token']
 if(!secret||!process.env.TELEGRAM_BOT_TOKEN||typeof given!=='string'||!timingSafeEqual(digest(given),digest(secret)))return res.status(401).json({error:'Unauthorized'})
 const url=process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)return res.status(503).json({error:'Telegram is not configured'})
 const message=req.body?.message,chat=message?.chat
 if(chat?.type!=='private'||!Number.isSafeInteger(chat.id)||typeof message.text!=='string')return res.status(200).json({ok:true})
 const i=String(message.from?.language_code||'').startsWith('en')?1:0,[command,arg='']=message.text.trim().split(/\s+/)
 let reply:string
 try{
  const db=makeClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
  if(command==='/start'&&/^[a-f0-9]{32}$/.test(arg)){
   const r=await db.rpc('telegram_bind',{token_input:arg,chat_input:chat.id,locale_input:i?'en':'uk'});if(r.error)throw r.error
   reply=r.data?.status==='staff'?replies.staff[i]:r.data?.status==='client'?`Готово. Сюди прийде підтвердження запису до «${r.data.studio}» і нагадування перед візитом. Відписатися: /stop.`:replies.invalid[i]
  }else if(command==='/stop'){const r=await db.rpc('telegram_unbind',{chat_input:chat.id});if(r.error)throw r.error;reply=replies.stop[i]}
  else reply=replies.help[i]
 }catch{return res.status(503).json({error:'Telegram link unavailable'})} // Telegram retries the update
 try{await send(chat.id,reply)}catch{} // the link is saved either way
 return res.status(200).json({ok:true})
}}
export default createTelegramHandler()
