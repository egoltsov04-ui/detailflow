import {createClient} from '@supabase/supabase-js'
type Request={method?:string}
type Response={status:(code:number)=>Response;json:(body:unknown)=>void}
export default async function health(req:Request,res:Response){
 if(req.method!=='GET')return res.status(405).json({status:'method_not_allowed'})
 const url=process.env.VITE_SUPABASE_URL,secret=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!secret)return res.status(503).json({status:'unavailable'})
 try{
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(5000)})}})
  const r=await db.rpc('platform_readiness')
  return res.status(!r.error&&r.data===true?200:503).json({status:!r.error&&r.data===true?'ok':'unavailable'})
 }catch{return res.status(503).json({status:'unavailable'})}
}
