import {createClient} from '@supabase/supabase-js'
export function validPushEndpoint(value:unknown):value is string{if(typeof value!=='string'||value.length>2048)return false;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&(u.hostname==='fcm.googleapis.com'||u.hostname==='android.googleapis.com'||u.hostname.endsWith('.push.services.mozilla.com')||u.hostname==='web.push.apple.com'||u.hostname.endsWith('.notify.windows.com'))}catch{return false}}
type Request={method?:string;headers:Record<string,string|string[]|undefined>;body?:any}
type Response={status:(n:number)=>Response;json:(value:unknown)=>void}
export function createPushHandler(makeClient:typeof createClient=createClient){return async(req:Request,res:Response)=>{
 if(req.method==='GET')return res.status(200).json({publicKey:process.env.VAPID_PRIVATE_KEY?process.env.VAPID_PUBLIC_KEY||null:null})
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
 const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY,token=typeof req.headers.authorization==='string'?req.headers.authorization:''
 if(!url||!key||!secret)return res.status(503).json({error:'Push is not configured'})
 if(!token.startsWith('Bearer '))return res.status(401).json({error:'Authentication required'})
 try{
  const client=makeClient(url,key,{global:{headers:{Authorization:token}},auth:{persistSession:false}}),session=await client.auth.getUser(token.slice(7));if(session.error||!session.data.user)return res.status(401).json({error:'Authentication required'})
  const db=makeClient(url,secret),body=req.body,endpoint=body?.subscription?.endpoint||body?.endpoint,userId=session.data.user.id
  if(!validPushEndpoint(endpoint))return res.status(400).json({error:'Invalid push endpoint'})
  if(body.action==='unsubscribe'){const r=await db.from('push_subscriptions').delete().eq('user_id',userId).eq('endpoint',endpoint);if(r.error)throw r.error;return res.status(200).json({ok:true})}
  if(body.action!=='subscribe'||!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY)return res.status(400).json({error:'Push is not available'})
  const access=await client.rpc('resolve_my_access');if(access.error||!['owner','admin','master'].includes(access.data?.role))return res.status(403).json({error:'Active studio account required'})
  const keys=body.subscription?.keys;if(!/^[A-Za-z0-9_-]{87}$/.test(keys?.p256dh||'')||!/^[A-Za-z0-9_-]{22}$/.test(keys?.auth||''))return res.status(400).json({error:'Invalid push keys'})
  const r=await db.rpc('register_push_subscription',{user_input:userId,endpoint_input:endpoint,keys_input:keys,locale_input:['uk','ru','en'].includes(body.locale)?body.locale:'uk'});if(r.error)throw r.error
  if(r.data==='conflict')return res.status(409).json({error:'Disable the previous browser subscription first'})
  if(r.data==='limit')return res.status(400).json({error:'Device limit reached'})
  if(r.data!=='ok')throw new Error('Subscription was not saved')
  return res.status(200).json({ok:true})
 }catch{return res.status(503).json({error:'Push settings unavailable'})}
}}
export default createPushHandler()
