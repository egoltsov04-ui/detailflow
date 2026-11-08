import type {SupabaseClient} from '@supabase/supabase-js'
import {titles} from './push.js'
import {appUrl} from './siteUrl.js'

/** Username of the bot when Telegram is configured on this server, else null: the app hides the Telegram buttons. */
export const telegramBot=()=>process.env.TELEGRAM_BOT_TOKEN&&process.env.TELEGRAM_WEBHOOK_SECRET?process.env.TELEGRAM_BOT_USERNAME||'detailflow_ua_bot':null

/** Telegram answered with an error: the message was not sent. */
export class TelegramError extends Error{status:number;constructor(status:number){super(`Telegram rejected the message (${status})`);this.status=status}}

/** Texts are Telegram HTML: every value from the database goes through escapeHtml. */
export const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!))

type Studio={name:string;timezone?:string|null;phone?:string|null;address?:string|null}
/** The client's message about one booking: a bold title, then studio, time, service, address with a map link and phone. */
export function clientMessage(kind:string,startsAt:string,service:string,studio:Studio){
 const when=new Date(startsAt).toLocaleString('uk-UA',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:studio.timezone||'Europe/Kyiv'})
 const phone=studio.phone?(/^\d{10,15}$/.test(studio.phone)?'+'+studio.phone:studio.phone):''
 const address=studio.address?.trim()?`Адреса: <a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(studio.address.trim())}">${escapeHtml(studio.address.trim())}</a>`:''
 const title={booking_confirmed:'Запис підтверджено',booking_cancelled:'Запис не підтверджено',visit_24:'Нагадування: візит завтра',visit_2:'Нагадування: візит сьогодні'}[kind]||'Ваш запис'
 const lead=kind==='booking_cancelled'?'Студія не змогла прийняти запис на цей час. Зв’яжіться зі студією, щоб обрати інший.':''
 const cancelled=kind==='booking_cancelled',details=[`<b>${escapeHtml(studio.name)}</b>`,`Коли: ${escapeHtml(when)}`,cancelled?'':`Послуга: ${escapeHtml(service)}`,address,phone?`Телефон: ${escapeHtml(phone)}`:''].filter(Boolean).join('\n')
 return [`<b>${title}</b>`+(lead?'\n'+lead:''),details,cancelled?'':'Відписатися від повідомлень: /stop'].filter(Boolean).join('\n\n')
}

export async function sendTelegram(chat:number,text:string){
 const response=await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,text,parse_mode:'HTML',link_preview_options:{is_disabled:true}}),signal:AbortSignal.timeout(8000)})
 if(!response.ok)throw new TelegramError(response.status)
}

const staffTitles:Record<string,string[]>={...titles,booking_request:['Нова онлайн-заявка на запис','New online booking request']}
const one=(value:any)=>Array.isArray(value)?value[0]:value

/** Staff get the same short text as push (no client data), clients get their own booking details. */
export async function deliverTelegramQueue(db:SupabaseClient,send=sendTelegram){
 if(!process.env.TELEGRAM_BOT_TOKEN)return {configured:false,sent:0}
 const queued=await db.rpc('enqueue_telegram_reminders');if(queued.error)throw queued.error
 const claimed=await db.rpc('claim_notifications',{channel_input:'telegram',limit_input:10});if(claimed.error)throw claimed.error
 let sent=0
 for(const job of claimed.data||[]){let state='cancelled',reason:string|null=null,attempted=false,chat:number|null=null
  try{
   let text=''
   if(job.recipient_user_id){
    const link=await db.from('telegram_chats').select('chat_id,locale').eq('user_id',job.recipient_user_id).maybeSingle();if(link.error)throw link.error
    const membership=await db.from('tenant_memberships').select('role').eq('user_id',job.recipient_user_id).eq('tenant_id',job.tenant_id).eq('active',true).maybeSingle();if(membership.error)throw membership.error
    let active=!!membership.data
    if(membership.data?.role==='master'){const member=await db.from('staff_profiles').select('id').eq('user_id',job.recipient_user_id).eq('tenant_id',job.tenant_id).eq('active',true).maybeSingle();if(member.error)throw member.error;active=!!member.data}
    if(active&&link.data){const i=link.data.locale==='en'?1:0;chat=Number(link.data.chat_id);text=`<b>${(staffTitles[job.kind]||['Detailflow','Detailflow'])[i]}</b>\n${['Деталі в застосунку:','Details in the app:'][i]} ${appUrl('/app')}`}
   }else{
    const link=await db.from('telegram_chats').select('chat_id').eq('appointment_id',job.payload?.appointment_id).maybeSingle();if(link.error)throw link.error
    const found=await db.from('appointments').select('status,starts_at,appointment_services(service_name),tenants(name,timezone,phone,address)').eq('id',job.payload?.appointment_id).eq('tenant_id',job.tenant_id).maybeSingle();if(found.error)throw found.error
    const a=found.data,studio=one(a?.tenants),service=(a?.appointment_services||[]).map((s:any)=>s.service_name).join(' + ')||'детейлінг'
    const visit=job.kind==='visit_24'||job.kind==='visit_2'
    const valid=!!a&&!!link.data&&(job.kind==='booking_confirmed'?a.status==='confirmed':job.kind==='booking_cancelled'?a.status==='cancelled':visit&&a.status==='confirmed'&&new Date(a.starts_at).getTime()===new Date(job.payload.starts_at).getTime()&&new Date(a.starts_at).getTime()>Date.now()+15*60000)
    if(valid){chat=Number(link.data!.chat_id);text=clientMessage(job.kind,a!.starts_at,service,studio)}
   }
   if(text&&chat!==null){attempted=true;await send(chat,text);state='sent';sent++}else reason='Recipient, link or booking changed'
  }catch(error){
   const code=error instanceof TelegramError?error.status:0
   // 403: the user blocked the bot; 400: the chat no longer exists. Forget the chat, do not retry.
   if(code===403||code===400){if(chat!==null){const gone=await db.rpc('telegram_unbind',{chat_input:chat});if(gone.error)throw gone.error}state='cancelled';reason='Chat is unavailable'}
   else{state=!attempted||code?'failed':'uncertain';reason=!attempted?'Could not prepare delivery':code?'Telegram rejected delivery':'Delivery acknowledgement unknown'}
  }
  const done=await db.rpc('finish_notification',{job_input:job.id,token_input:job.claim_token,status_input:state,error_input:reason});if(done.error||done.data!==true)throw new Error('Could not save Telegram result')
 }
 return {configured:true,sent}
}
