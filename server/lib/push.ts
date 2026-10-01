import webpush from 'web-push'
import type {SupabaseClient} from '@supabase/supabase-js'
import {validPushEndpoint} from '../../api/push.js'
const titles:Record<string,string[]>={work_assigned:['Призначено нову роботу','Назначена новая работа','New work assigned'],work_review:['Робота очікує перевірки','Работа ожидает проверки','Work awaits review'],work_approved:['Роботу підтверджено','Работа подтверждена','Work approved'],work_returned:['Роботу повернуто на доопрацювання','Работа возвращена на доработку','Work returned for changes']}
export async function deliverPushQueue(db:SupabaseClient,send=webpush.sendNotification){
 if(!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY)return {configured:false,sent:0}
 const claimed=await db.rpc('claim_notifications',{channel_input:'push',limit_input:2});if(claimed.error)throw claimed.error
 let sent=0
 for(const job of claimed.data||[]){let state='cancelled',reason:string|null=null,attempted=false
  try{
   const sub=await db.from('push_subscriptions').select('*').eq('id',job.payload.subscription_id).eq('user_id',job.recipient_user_id).maybeSingle();if(sub.error)throw sub.error
   const membership=await db.from('tenant_memberships').select('role').eq('user_id',job.recipient_user_id).eq('tenant_id',job.tenant_id).eq('active',true).maybeSingle();if(membership.error)throw membership.error
   let active=!!membership.data
   if(membership.data?.role==='master'){const member=await db.from('staff_profiles').select('id').eq('user_id',job.recipient_user_id).eq('tenant_id',job.tenant_id).eq('active',true).maybeSingle();if(member.error)throw member.error;active=!!member.data}
   if(active&&sub.data&&validPushEndpoint(sub.data.endpoint)){
    const index=sub.data.locale==='ru'?1:sub.data.locale==='en'?2:0,title=(titles[job.kind]||['Detailflow','Detailflow','Detailflow'])[index]
    attempted=true;await send({endpoint:sub.data.endpoint,keys:sub.data.keys},JSON.stringify({title,body:['Відкрийте застосунок, щоб переглянути деталі.','Откройте приложение, чтобы посмотреть детали.','Open the app to view details.'][index],tag:job.id,url:'/app'}),{TTL:3600,timeout:5000,vapidDetails:{subject:process.env.VAPID_SUBJECT||'https://detailflow-xi.vercel.app',publicKey:process.env.VAPID_PUBLIC_KEY,privateKey:process.env.VAPID_PRIVATE_KEY}});state='sent';sent++
   }
  }catch(e){const code=(e as {statusCode?:number}).statusCode;if(code===404||code===410){await db.from('push_subscriptions').delete().eq('id',job.payload.subscription_id).eq('user_id',job.recipient_user_id);state='cancelled';reason='Subscription expired'}else {state=!attempted||code===429?'failed':'uncertain';reason='Push delivery failed'}}
  const result=await db.rpc('finish_notification',{job_input:job.id,token_input:job.claim_token,status_input:state,error_input:reason});if(result.error||result.data!==true)throw new Error('Could not save push result')
 }
 return {configured:true,sent}
}
