import {deliverPushQueue} from '../server/lib/push.js'
import {createClient} from '@supabase/supabase-js'
import {bookingEmail} from '../server/lib/bookingContact.js'
import {sendEmail,EmailDeliveryError} from '../server/lib/sendpulse.js'
type Request={headers:Record<string,string|string[]|undefined>;method?:string}
type Response={status:(code:number)=>Response;json:(body:unknown)=>void}
const one=(value:any)=>Array.isArray(value)?value[0]:value
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export function createReminderHandler(makeClient:typeof createClient=createClient,deliver:typeof sendEmail=sendEmail){return async function handler(req:Request,res:Response){
 if(!['POST','GET'].includes(req.method||''))return res.status(405).json({error:'Method not allowed'})
 if(!process.env.CRON_SECRET||req.headers.authorization!==`Bearer ${process.env.CRON_SECRET}`)return res.status(401).json({error:'Unauthorized'})
 const url=process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 const emailConfigured=!!process.env.SENDPULSE_API_KEY&&!!process.env.SENDPULSE_API_FROM_EMAIL
 if(!url||!key)return res.status(503).json({error:'Delivery is not configured'})
 try{
  const db=makeClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
  if(emailConfigured){const queued=await db.rpc('enqueue_client_reminders');if(queued.error)throw queued.error}
  const claimed=emailConfigured?await db.rpc('claim_notifications',{channel_input:'email',limit_input:3}):{data:[],error:null};if(claimed.error)throw claimed.error
  const counts={sent:0,failed:0,uncertain:0,cancelled:0}
  for(const job of claimed.data||[]){
   let status:'sent'|'failed'|'uncertain'|'cancelled'='cancelled',reason:string|null=null,provider:string|null=null,attempted=false
   try{
    const found=await db.from('appointments').select('id,tenant_id,status,starts_at,ends_at,notes,source,client_id,clients(full_name,email,followup_enabled),appointment_services(service_id,service_name),tenants(name,slug,timezone,phone,reminder_settings(email_enabled,reminder_24h_enabled,reminder_2h_enabled,repeat_enabled))').eq('id',job.payload.appointment_id).eq('tenant_id',job.tenant_id).maybeSingle()
    if(found.error)throw found.error
    const a=found.data,client=one(a?.clients),studio=one(a?.tenants),settings=one(studio?.reminder_settings),repeat=job.kind==='return_visit',email=repeat?client?.email:bookingEmail(a?.notes,a?.source,client?.email)
    let allowed=!!a&&!!settings?.email_enabled&&!!email&&new Date(job.expires_at).getTime()>Date.now()
    if(repeat&&a){const service=await db.from('services').select('active,repeat_interval_months').eq('id',job.payload.service_id).eq('tenant_id',job.tenant_id).maybeSingle();if(service.error)throw service.error;allowed=allowed&&service.data?.active&&service.data.repeat_interval_months===job.payload.interval_months;allowed=allowed&&a.status==='completed'&&settings.repeat_enabled&&client?.followup_enabled;const subsequent=await db.from('appointments').select('id,appointment_services!inner(service_id)').eq('tenant_id',job.tenant_id).eq('client_id',a?.client_id).gt('starts_at',a?.starts_at).eq('appointment_services.service_id',job.payload.service_id).not('status','in','(cancelled,no_show)').limit(1);if(subsequent.error)throw subsequent.error;if(subsequent.data?.length)allowed=false}
    else allowed=allowed&&!!a&&new Date(a.starts_at).getTime()===new Date(job.payload.starts_at).getTime()&&a.status==='confirmed'&&(job.kind==='visit_24'?settings.reminder_24h_enabled:settings.reminder_2h_enabled)&&new Date(a.starts_at).getTime()>Date.now()+15*60000
    if(allowed&&a){
     const service=(a.appointment_services||[]).map((s:any)=>s.service_name).join(' + '),when=new Date(a.starts_at).toLocaleString('uk-UA',{timeZone:studio.timezone||'Europe/Kyiv'})
     const text=repeat?`Вітаємо, ${client.full_name}! Час запланувати повторний візит до ${studio.name}. Послуга: ${service}. Для запису або відмови від наступних нагадувань зверніться до студії: ${studio.phone||process.env.SENDPULSE_API_FROM_EMAIL}.`:`Вітаємо, ${client.full_name}! Нагадуємо про запис до ${studio.name}: ${when}. Послуга: ${service}.`
     attempted=true;const result=await deliver({to:[{email}],subject:repeat?`Повторний візит — ${studio.name}`:`Нагадування про запис — ${studio.name}`,text,html:`<p>${escape(text)}</p>`,fromName:studio.name})
     provider=typeof result.id==='string'?result.id:null;status='sent'
    }else reason='Recipient, appointment or reminder settings changed'
   }catch(error){status=!attempted?'failed':error instanceof EmailDeliveryError&&!error.uncertain?'failed':'uncertain';reason=!attempted?'Could not prepare delivery':status==='uncertain'?'Delivery acknowledgement unknown; check provider before retry':'Provider rejected delivery'}
   const done=await db.rpc('finish_notification',{job_input:job.id,token_input:job.claim_token,status_input:status,error_input:reason,provider_input:provider});if(done.error||done.data!==true)throw new Error('Could not save delivery result');counts[status]++
  }
  const push=await deliverPushQueue(db);return res.status(emailConfigured||push.configured?200:503).json({...counts,emailConfigured,push})
 }catch{return res.status(503).json({error:'Notification processing unavailable'})}
}}
export default createReminderHandler()
