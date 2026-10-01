import {useEffect,useState} from 'react'
import {supabase} from '../lib/supabase'
import {disableDevicePush} from './pushClient'
import {t,getLocale} from '../i18n/core'
export default function PushControls(){
 const [enabled,setEnabled]=useState(false),[configured,setConfigured]=useState(false),[key,setKey]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[open,setOpen]=useState(false)
 const supported='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window
 useEffect(()=>{if(!supported)return;let live=true;void fetch('/api/push').then(r=>r.json()).then(data=>{if(live){setConfigured(!!data.publicKey);setKey(data.publicKey||'')}}).catch(()=>{});void navigator.serviceWorker.getRegistration('/').then(reg=>reg?.pushManager?.getSubscription()).then(sub=>{if(live)setEnabled(!!sub)});return()=>{live=false}},[supported])
 async function toggle(){if(busy)return;setBusy(true);setError('');try{
  if(enabled){await disableDevicePush();setEnabled(false);return}
  if(!supported||!configured)throw new Error(t('Push-повідомлення ще не налаштовано.'))
  const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error(t('Дозвольте повідомлення в налаштуваннях браузера.'))
  const registration=await navigator.serviceWorker.getRegistration('/');if(!registration?.active)throw new Error(t('Оновіть застосунок і повторіть спробу.'))
  const bytes=Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)),subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes})
  const session=await supabase?.auth.getSession();if(!session?.data.session){await subscription.unsubscribe();throw new Error(t('Увійдіть повторно.'))}
  const response=await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.data.session.access_token}`},body:JSON.stringify({action:'subscribe',subscription:subscription.toJSON(),locale:getLocale()})});if(!response.ok){await subscription.unsubscribe();throw new Error(t('Не вдалося зберегти повідомлення. Спробуйте ще раз.'))}setEnabled(true)
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <span className="push-controls"><button className="text-btn" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{t('Сповіщення')}</button>{open&&<span className="push-popover"><b>{t('Робочі сповіщення')}</b><span>{t('Призначення, перевірка та підтвердження робіт на цьому пристрої.')}</span>{!supported?<span>{t('Для iPhone встановіть застосунок на головний екран і відкрийте його звідти.')}</span>:<button className="secondary" disabled={busy||(!enabled&&!configured)} onClick={()=>void toggle()}>{enabled?t('Вимкнути на цьому пристрої'):t('Увімкнути повідомлення')}</button>}{supported&&!configured&&<span>{t('Push-повідомлення ще не налаштовано.')}</span>}{error&&<span role="alert">{t(error)}</span>}<button className="text-btn" onClick={()=>setOpen(false)}>{t('Закрити')}</button></span>}</span>
}
