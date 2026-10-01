import {supabase} from '../lib/supabase'
export async function disableDevicePush(){
 if(!('serviceWorker' in navigator))return
 const registration=await navigator.serviceWorker.getRegistration('/'),subscription=await registration?.pushManager?.getSubscription()
 if(!subscription)return
 try{const session=await supabase?.auth.getSession();if(session?.data.session)await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.data.session.access_token}`},body:JSON.stringify({action:'unsubscribe',endpoint:subscription.endpoint})})}finally{await subscription.unsubscribe()}
}
export async function signOutWithNotifications(){try{await disableDevicePush()}finally{await supabase?.auth.signOut()}}
