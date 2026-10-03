import type {AuthChangeEvent,Session,SupabaseClient} from '@supabase/supabase-js'

/** A newer auth event must win over an older asynchronous session read. */
export function observeSession(auth:SupabaseClient['auth'],receive:(session:Session|null,event?:AuthChangeEvent)=>void){
 let live=true,revision=0
 const initialRevision=revision
 const {data:{subscription}}=auth.onAuthStateChange((event,session)=>{
  revision++;if(live)receive(session,event)
 })
 void auth.getSession().then(({data,error})=>{
  if(live&&revision===initialRevision)receive(error?null:data.session)
 }).catch(()=>{if(live&&revision===initialRevision)receive(null)})
 return()=>{live=false;subscription.unsubscribe()}
}
