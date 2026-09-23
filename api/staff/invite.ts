import { createClient } from '@supabase/supabase-js'

type Request = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown }
type Response = { status: (code: number) => Response; json: (body: unknown) => void }
const required=(name:string)=>{const value=process.env[name];if(!value)throw new Error(`Missing ${name}`);return value}

export default async function handler(request:Request,response:Response){
  if(request.method!=='POST')return response.status(405).json({error:'Method not allowed'})
  try{
    const token=typeof request.headers.authorization==='string'?request.headers.authorization.replace(/^Bearer\s+/i,''):''
    const body=request.body as {staffId?:unknown;email?:unknown}|undefined
    const staffId=typeof body?.staffId==='string'?body.staffId:''
    const email=typeof body?.email==='string'?body.email.trim().toLowerCase():''
    if(!token||!staffId||!email)return response.status(400).json({error:'Invalid request'})
    const auth=createClient(required('VITE_SUPABASE_URL'),required('VITE_SUPABASE_ANON_KEY'))
    const {data:authData,error:authError}=await auth.auth.getUser(token)
    if(authError||!authData.user)return response.status(401).json({error:'Invalid session'})
    const db=createClient(required('VITE_SUPABASE_URL'),required('SUPABASE_SERVICE_ROLE_KEY'))
    const {data:staff}=await db.from('staff_profiles').select('id,tenant_id,full_name').eq('id',staffId).maybeSingle()
    if(!staff)return response.status(404).json({error:'Master not found'})
    const {data:membership}=await db.from('tenant_memberships').select('tenant_id').eq('tenant_id',staff.tenant_id).eq('user_id',authData.user.id).in('role',['owner','admin']).maybeSingle()
    if(!membership)return response.status(403).json({error:'Only an owner or admin can invite masters'})
    const host=typeof request.headers.host==='string'?request.headers.host:''
    const protocol=host.includes('localhost')?'http':'https'
    const redirectTo=host?`${protocol}://${host}/?activate=master`:(process.env.WAYFORPAY_APP_URL ? `${process.env.WAYFORPAY_APP_URL}/?activate=master` : undefined)
    const {data,error}=await db.auth.admin.inviteUserByEmail(email,{data:{full_name:staff.full_name},redirectTo})
    if(error||!data.user)return response.status(400).json({error:error?.message||'Invite was not sent'})
    const {error:bindError}=await db.from('staff_profiles').update({user_id:data.user.id,active:true,invite_email:email,invite_sent_at:new Date().toISOString(),invite_accepted_at:null}).eq('id',staff.id)
    if(bindError)return response.status(500).json({error:'Invite sent, but profile could not be linked'})
    const {error:membershipError}=await db.from('tenant_memberships').upsert({tenant_id:staff.tenant_id,user_id:data.user.id,role:'master'},{onConflict:'tenant_id,user_id',ignoreDuplicates:true})
    if(membershipError)return response.status(500).json({error:'Лист надіслано, але доступ до студії не збережено. Зверніться до підтримки.'})
    return response.status(200).json({ok:true})
  }catch(error){return response.status(500).json({error:error instanceof Error?error.message:'Unable to invite master'})}
}
