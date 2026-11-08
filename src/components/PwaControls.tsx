import {t} from '../i18n/core'
import {useEffect,useState} from 'react'
import {Check,Share,SquarePlus} from 'lucide-react'
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
 return <aside className="pwa-controls" aria-label={t("Застосунок Detailflow")}>{update?<><span>{t("Доступна нова версія. Збережіть відкриті форми перед оновленням.")}</span><button className="primary" onClick={()=>{window.dispatchEvent(new Event('detailflow:update'));update.postMessage({type:'ACTIVATE_UPDATE'})}}>{t("Оновити застосунок")}</button></>:<button className="primary" onClick={async()=>{await install!.prompt();await install!.userChoice;setInstall(null)}}>{t("Встановити застосунок")}</button>}<button className="text-btn" onClick={()=>setDismissed(true)}>{t("Пізніше")}</button></aside>
}

/** iPhone has no install prompt: explain "Share → Add to Home Screen" once, inside the app, until it is installed. */
export function IosInstallHint(){
 const [show,setShow]=useState(false)
 useEffect(()=>{
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)
  const installed=matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true
  let dismissed=false;try{dismissed=localStorage.getItem('detailflow.iosInstallHint')==='1'}catch{/* private mode: show once per visit */}
  setShow(ios&&!installed&&!dismissed&&location.pathname.startsWith('/app'))
 },[])
 if(!show)return null
 const close=()=>{setShow(false);try{localStorage.setItem('detailflow.iosInstallHint','1')}catch{/* nothing to remember */}}
 return <aside className="pwa-controls ios-install" aria-label={t("Встановити Detailflow на iPhone")}><img src="/icons/app-192.png" width="48" height="48" alt=""/><b>{t("Встановіть Detailflow на iPhone")}</b><span>{t("Відкривайте як застосунок з екрана «Додому», без адресного рядка, і отримуйте сповіщення.")}</span><ol><li><Share size={16} aria-hidden="true"/>{t("Натисніть «Поділитися» внизу Safari")}</li><li><SquarePlus size={16} aria-hidden="true"/>{t("Оберіть «На екран «Додому»»")}</li><li><Check size={16} aria-hidden="true"/>{t("Натисніть «Додати»")}</li></ol><button className="secondary" onClick={close}>{t("Зрозуміло")}</button></aside>
}
