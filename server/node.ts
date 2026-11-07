// Runs the Vercel-style handlers from api/ on a plain Node server, at the same /api/* paths.
// Caddy serves the built frontend and proxies /api/* here; this port must stay inside the Docker network,
// because the booking rate limit trusts X-Forwarded-For.
import {createServer,type IncomingMessage,type ServerResponse} from 'node:http'
import {pathToFileURL} from 'node:url'
import health from '../api/health.js'
import publicBooking from '../api/public/booking.js'
import bookingRequestUpdate from '../api/booking-requests/update.js'
import push from '../api/push.js'
import sendReminders from '../api/send-reminders.js'
import staffInvite from '../api/staff/invite.js'
import staffAdministrator from '../api/staff/administrator.js'
import wayforpayCallback from '../api/wayforpay/callback.js'
import wayforpayCheckout from '../api/wayforpay/checkout.js'
import wayforpayReturn from '../api/wayforpay/return.js'

type Handler=(request:any,response:any)=>unknown
export const routes:Record<string,Handler>={
 '/api/health':health,
 '/api/public/booking':publicBooking,
 '/api/booking-requests/update':bookingRequestUpdate,
 '/api/push':push,
 '/api/send-reminders':sendReminders,
 '/api/staff/invite':staffInvite,
 '/api/staff/administrator':staffAdministrator,
 '/api/wayforpay/callback':wayforpayCallback,
 '/api/wayforpay/checkout':wayforpayCheckout,
 '/api/wayforpay/return':wayforpayReturn,
}
const MAX_BODY=1024*1024

async function readBody(request:IncomingMessage){
 const chunks:Buffer[]=[];let size=0
 for await(const chunk of request){size+=chunk.length;if(size>MAX_BODY)throw Object.assign(new Error('Body too large'),{status:413});chunks.push(chunk)}
 const text=Buffer.concat(chunks).toString('utf8')
 if(!text)return undefined
 // Like Vercel: JSON is parsed, anything else (the WayForPay callback) arrives as a string the handler parses itself.
 if(String(request.headers['content-type']||'').includes('application/json')){try{return JSON.parse(text)}catch{throw Object.assign(new Error('Invalid JSON'),{status:400})}}
 return text
}

export function createApiServer(table:Record<string,Handler>=routes){
 return createServer(async(request:IncomingMessage,raw:ServerResponse)=>{
  const url=new URL(request.url||'/','http://localhost')
  const response=Object.assign(raw,{
   status(code:number){raw.statusCode=code;return response},
   json(body:unknown){if(!raw.headersSent)raw.setHeader('Content-Type','application/json; charset=utf-8');raw.end(JSON.stringify(body))},
   send(body:string){raw.end(body)},
  })
  raw.setHeader('Cache-Control','no-store')
  const handler=table[url.pathname.replace(/\/$/,'')]
  if(!handler)return response.status(404).json({error:'Not found'})
  try{
   const body=await readBody(request)
   await handler(Object.assign(request,{body,query:Object.fromEntries(url.searchParams)}),response)
   if(!raw.writableEnded)raw.end()
  }catch(error){
   const status=(error as {status?:number}).status||500
   if(status===500)console.error('API handler failed',url.pathname,error instanceof Error?error.name:'error')
   if(!raw.headersSent)response.status(status).json({error:status===500?'Internal error':(error as Error).message});else raw.end()
  }
 })
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const port=Number(process.env.PORT||3000)
 createApiServer().listen(port,'0.0.0.0',()=>console.log(`Detailflow API on :${port}`))
}
