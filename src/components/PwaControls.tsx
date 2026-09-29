import {t} from '../i18n/core'
import {useEffect,useState} from 'react'
import './pwa.css'
type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}
export default function PwaControls(){
 const [install,setInstall]=useState<InstallPrompt|null>(null),[update,setUpdate]=useState<ServiceWorker|null>(null),[dismissed,setDismissed]=useState(false)
 useEffect(()=>{
  if(!import.meta.env.PROD||!('serviceWorker' in navigator))return
  let active=true,refresh=false
  const ready=(e:Event)=>{e.preventDefault();setInstall(e as InstallPrompt)}
  const installed=()=>setInstall(null)
  const changed=()=>{if(refresh)window.location.reload()}
  const activate=()=>{refresh=true}
  window.addEventListener('beforeinstallprompt',ready);window.addEventListener('appinstalled',installed);window.addEventListener('detailflow:update',activate)
  navigator.serviceWorker.addEventListener('controllerchange',changed)
  void navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(registration=>{
   if(!active)return
   if(registration.waiting)setUpdate(registration.waiting)
   registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(active&&worker.state==='installed'&&navigator.serviceWorker.controller)setUpdate(worker)})})
  }).catch(()=>{/* The online application remains usable when installation is unavailable. */})
  return()=>{active=false;window.removeEventListener('beforeinstallprompt',ready);window.removeEventListener('appinstalled',installed);window.removeEventListener('detailflow:update',activate);navigator.serviceWorker.removeEventListener('controllerchange',changed)}
 },[])
 if(dismissed||(!install&&!update))return null
 return <aside className="pwa-controls" aria-label="Застосунок Detailflow">{update?<><span>{t("Доступна нова версія. Збережіть відкриті форми перед оновленням.")}</span><button className="primary" onClick={()=>{window.dispatchEvent(new Event('detailflow:update'));update.postMessage({type:'ACTIVATE_UPDATE'})}}>{t("Оновити застосунок")}</button></>:<button className="primary" onClick={async()=>{await install!.prompt();await install!.userChoice;setInstall(null)}}>{t("Встановити застосунок")}</button>}<button className="text-btn" onClick={()=>setDismissed(true)}>{t("Пізніше")}</button></aside>
}
