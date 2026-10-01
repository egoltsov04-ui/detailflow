import {createClient} from '@supabase/supabase-js'
type Request={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown}
type Response={status:(code:number)=>Response;json:(body:unknown)=>void}
export function createAdministratorHandler(makeClient:typeof createClient=createClient){return async(req:Request,res:Response)=>{
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
 try{
  const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!url||!key||!secret)return res.status(503).json({error:'Сервіс запрошень не налаштовано'})
  const token=typeof req.headers.authorization==='string'?req.headers.authorization.replace(/^Bearer\s+/i,''):''
  const body=req.body as {tenantId?:string;name?:string;email?:string;userId?:string;action?:string}|undefined
  if(!token||typeof body?.tenantId!=='string')return res.status(400).json({error:'Оберіть студію та увійдіть'})
  const auth=makeClient(url,key),db=makeClient(url,secret),session=await auth.auth.getUser(token)
  if(session.error||!session.data.user)return res.status(401).json({error:'Увійдіть повторно'})
  const owner=await db.from('tenant_memberships').select('role').eq('tenant_id',body.tenantId).eq('user_id',session.data.user.id).eq('active',true).eq('role','owner').maybeSingle()
  if(!owner.data)return res.status(403).json({error:'Адміністраторів запрошує лише власник'})
  const base=process.env.APP_URL||process.env.WAYFORPAY_APP_URL||(process.env.VERCEL_PROJECT_PRODUCTION_URL?'https://'+process.env.VERCEL_PROJECT_PRODUCTION_URL:'')
  if(!base)return res.status(503).json({error:'Налаштуйте адресу сайту для листів'})
  const redirectTo=new URL('/login?role=admin&activate=admin',base).toString()
  if(body.action==='recovery'){
   if(typeof body.userId!=='string')return res.status(400).json({error:'Оберіть адміністратора'})
   const member=await db.from('tenant_memberships').select('user_id').eq('tenant_id',body.tenantId).eq('user_id',body.userId).eq('active',true).eq('role','admin').maybeSingle()
   if(!member.data)return res.status(403).json({error:'Активного адміністратора не знайдено'})
   const account=await db.auth.admin.getUserById(body.userId)
   if(account.error||!account.data.user?.email)return res.status(404).json({error:'Акаунт не знайдено'})
   const sent=await auth.auth.resetPasswordForEmail(account.data.user.email,{redirectTo});if(sent.error)throw sent.error
   return res.status(200).json({message:'Запит на лист прийнято. Посилання дозволить встановити новий пароль.'})
  }
  if(body.action&&body.action!=='invite')return res.status(400).json({error:'Невідома дія'})
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():'',name=typeof body.name==='string'?body.name.trim():''
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||name.length<2||name.length>120)return res.status(400).json({error:'Вкажіть ім’я та email адміністратора'})
  const reserved=await db.rpc('reserve_administrator_invitation',{studio:body.tenantId,owner_input:session.data.user.id,email_input:email,name_input:name})
  if(reserved.error||!reserved.data)return res.status(400).json({error:reserved.error?.message||'Не вдалося зберегти запрошення'})
  let invitedId=reserved.data.user_id
  if(invitedId){
   const existing=await db.from('tenant_memberships').select('active,role').eq('tenant_id',body.tenantId).eq('user_id',invitedId).maybeSingle()
   if(existing.error)throw existing.error
   if(existing.data&&(!existing.data.active||existing.data.role!=='admin'))return res.status(403).json({error:'Спочатку перевірте й активуйте доступ адміністратора у команді.'})
   const linked=await db.rpc('attach_administrator_invitation',{invite_input:reserved.data.id,user_input:invitedId});if(linked.error)throw linked.error
   const sent=await auth.auth.resetPasswordForEmail(email,{redirectTo});if(sent.error)throw sent.error
  }else{
   const invitation=await db.auth.admin.inviteUserByEmail(email,{data:{full_name:name},redirectTo})
   if(invitation.error||!invitation.data.user)return res.status(400).json({error:invitation.error?.message||'Не вдалося надіслати запрошення'})
   invitedId=invitation.data.user.id
   const linked=await db.rpc('attach_administrator_invitation',{invite_input:reserved.data.id,user_input:invitedId})
   if(linked.error)return res.status(202).json({message:'Лист надіслано. Прив’язка до студії завершиться автоматично після підтвердження email.'})
  }
  return res.status(200).json({message:'Адміністратора запрошено. Доступ до фінансів вимкнено.'})
 }catch(e){return res.status(500).json({error:e instanceof Error?e.message:(e as {message?:string})?.message||'Помилка запрошення'})}
}}
export default createAdministratorHandler()
