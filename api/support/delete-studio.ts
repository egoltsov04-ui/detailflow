import {createClient} from '@supabase/supabase-js'
type Request={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown}
type Response={status:(code:number)=>Response;json:(body:unknown)=>void}
// Support deletes a whole studio. The database checks support rights, 2FA, a fresh password and the studio name,
// and removes every row in one transaction (support_delete_studio, migration 070). Then this route removes
// the studio's photos and the accounts that belonged only to it.
export function createDeleteStudioHandler(makeClient:typeof createClient=createClient){return async(req:Request,res:Response)=>{
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
 try{
  const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!url||!key||!secret)return res.status(503).json({error:'Сервіс не налаштовано'})
  const token=typeof req.headers.authorization==='string'?req.headers.authorization.replace(/^Bearer\s+/i,''):''
  const body=req.body as {studioId?:string;confirmName?:string}|undefined
  if(!token)return res.status(401).json({error:'Увійдіть повторно'})
  if(typeof body?.studioId!=='string'||typeof body.confirmName!=='string')return res.status(400).json({error:'Оберіть студію та введіть її назву'})
  const asUser=makeClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}})
  const deleted=await asUser.rpc('support_delete_studio',{studio:body.studioId,confirm_name:body.confirmName})
  if(deleted.error)return res.status(deleted.error.code==='42501'?403:400).json({error:deleted.error.message})
  const result=deleted.data as {name:string;users:string[];files:string[]}
  const db=makeClient(url,secret,{auth:{persistSession:false}}),problems:string[]=[]
  for(let i=0;i<result.files.length;i+=100){const removed=await db.storage.from('job-photos').remove(result.files.slice(i,i+100));if(removed.error)problems.push('photos')}
  let accounts=0
  for(const user of result.users){const removed=await db.auth.admin.deleteUser(user);if(removed.error)problems.push('accounts');else accounts++}
  if(problems.length)console.error('Studio deleted, cleanup incomplete',[...new Set(problems)].join(','))
  return res.status(200).json({name:result.name,photos:result.files.length,accounts,cleanupComplete:!problems.length})
 }catch(e){console.error('Studio deletion failed',e instanceof Error?e.name:'error');return res.status(500).json({error:'Internal error'})}
}}
export default createDeleteStudioHandler()
