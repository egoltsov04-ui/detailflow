import { createClient } from '@supabase/supabase-js'
import { staffMailDecision, type StaffMailAction } from '../../server/lib/staffMail.js'

type Request = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown }
type Response = { status: (code: number) => Response; json: (body: unknown) => void }
const required=(name:string)=>{const value=process.env[name];if(!value)throw new Error(`Missing ${name}`);return value}

export function createStaffMailHandler(makeClient:typeof createClient=createClient){return async function handler(request:Request,response:Response){
  if(request.method!=='POST')return response.status(405).json({error:'Method not allowed'})
  try{
    const token=typeof request.headers.authorization==='string'?request.headers.authorization.replace(/^Bearer\s+/i,''):''
    const body=request.body as {staffId?:unknown;email?:unknown;action?:unknown}|undefined
    const staffId=typeof body?.staffId==='string'?body.staffId:''
    const email=typeof body?.email==='string'?body.email.trim().toLowerCase():''
    const action=(body?.action||'invite') as StaffMailAction
    if(!['invite','resend','recovery'].includes(action))return response.status(400).json({error:'Invalid action'})
    if(!token||!staffId)return response.status(400).json({error:'Invalid request'})
    const auth=makeClient(required('VITE_SUPABASE_URL'),required('VITE_SUPABASE_ANON_KEY'))
    const {data:authData,error:authError}=await auth.auth.getUser(token)
    if(authError||!authData.user)return response.status(401).json({error:'Invalid session'})
    const db=makeClient(required('VITE_SUPABASE_URL'),required('SUPABASE_SERVICE_ROLE_KEY'))
    const {data:staff}=await db.from('staff_profiles').select('id,tenant_id,full_name,active,user_id,invite_email,invite_sent_at').eq('id',staffId).maybeSingle()
    if(!staff)return response.status(404).json({error:'Master not found'})
    const {data:membership}=await db.from('tenant_memberships').select('tenant_id').eq('tenant_id',staff.tenant_id).eq('user_id',authData.user.id).in('role',['owner','admin']).eq('active',true).maybeSingle()
    if(!membership)return response.status(403).json({error:'Only an owner or admin can invite masters'})
    let accountEmail:string|undefined
    if(staff.user_id){const {data,error}=await db.auth.admin.getUserById(staff.user_id);if(error||!data.user?.email)return response.status(409).json({error:'Не вдалося перевірити прив’язаний акаунт.'});accountEmail=data.user.email}
    let decision:ReturnType<typeof staffMailDecision>
    try{decision=staffMailDecision(staff,action,email,accountEmail)}catch(e){return response.status(400).json({error:(e as Error).message})}
    if(staff.invite_sent_at&&Date.now()-new Date(staff.invite_sent_at).getTime()<60000)return response.status(429).json({error:'Зачекайте хвилину перед наступним листом.'})
    const base=process.env.APP_URL||process.env.WAYFORPAY_APP_URL||(process.env.VERCEL_PROJECT_PRODUCTION_URL?'https://'+process.env.VERCEL_PROJECT_PRODUCTION_URL:'')
    if(!base)return response.status(503).json({error:'Адміністратор має налаштувати адресу сайту для листів.'})
    const redirectTo=new URL('/login?role=master&activate=master',base).toString()
    if(decision.kind==='recovery'){
      const {error}=await auth.auth.resetPasswordForEmail(decision.email,{redirectTo})
      if(error)return response.status(400).json({error:error.message})
      const {error:saveError}=await db.from('staff_profiles').update({invite_sent_at:new Date().toISOString()}).eq('id',staff.id)
      return response.status(200).json({ok:true,message:saveError?'Запит на лист прийнято, але час надсилання не збережено.':'Запит на лист зі створенням нового пароля прийнято. Майстер має перевірити вхідні та спам.'})
    }
    const {data,error}=await db.auth.admin.inviteUserByEmail(decision.email,{data:{full_name:staff.full_name},redirectTo})
    if(error||!data.user)return response.status(400).json({error:error?.message||'Invite was not sent'})
    const {error:bindError}=await db.from('staff_profiles').update({user_id:data.user.id,active:true,invite_email:decision.email,invite_sent_at:new Date().toISOString(),invite_accepted_at:null}).eq('id',staff.id)
    if(bindError)return response.status(500).json({error:'Invite sent, but profile could not be linked'})
    const {error:membershipError}=await db.from('tenant_memberships').upsert({tenant_id:staff.tenant_id,user_id:data.user.id,role:'master'},{onConflict:'tenant_id,user_id',ignoreDuplicates:true})
    if(membershipError)return response.status(500).json({error:'Лист надіслано, але доступ до студії не збережено. Зверніться до підтримки.'})
    return response.status(200).json({ok:true,message:'Запрошення надіслано. Майстер має перевірити пошту та спам.'})
  }catch(error){return response.status(500).json({error:error instanceof Error?error.message:'Unable to invite master'})}
}

}
export default createStaffMailHandler()
