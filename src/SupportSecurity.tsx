import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react'
import {supabase} from './lib/supabase'
import {Card,FormField,Modal} from './components/UI'
import {t} from './i18n/core'

type Action=()=>Promise<void>
/** Runs a support action. Only `strict` actions (deleting a studio, exporting its data) ask for the password and code again. */
const SecurityContext=createContext<(action:Action,strict?:boolean)=>void>(()=>{})
export const useSupportReauth=()=>useContext(SecurityContext)
export function passwordTime(token:string){try{const claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return {aal:claims.aal,password:Math.max(0,...(claims.amr||[]).filter((a:{method:string})=>a.method==='password').map((a:{timestamp:number})=>a.timestamp))*1000}}catch{return {aal:'aal1',password:0}}}
export default function SupportSecurity({children}:{children:ReactNode}){
 const [ready,setReady]=useState(false),[loading,setLoading]=useState(true),[reauth,setReauth]=useState(false),[password,setPassword]=useState(''),[code,setCode]=useState(''),[factor,setFactor]=useState(''),[qr,setQr]=useState(''),[secret,setSecret]=useState(''),[step,setStep]=useState<'password'|'totp'>('password'),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const action=useRef<Action|null>(null),lastActivity=useRef(Date.now()),totpPending=useRef(false)
 useEffect(()=>{let live=true,checked=false;async function check(){const r=await supabase?.auth.getSession();const session=r?.data.session;const claims=passwordTime(session?.access_token||'');if(live){const idle=lastActivity.current<Date.now()-30*60000,valid=claims.aal==='aal2'&&claims.password>Date.now()-8*3600000&&!idle;if(!checked){setReady(valid);checked=true}else if(idle&&!action.current){totpPending.current=false;setReady(false);setStep('password');setQr('');setSecret('');setFactor('')}else if(!valid&&!action.current&&!totpPending.current){setReady(false);setStep('password')}setLoading(false)}}void check();const timer=setInterval(()=>void check(),10000);const active=()=>{if(lastActivity.current<Date.now()-30*60000&&!action.current){totpPending.current=false;setReady(false);setStep('password');setQr('');setSecret('');setFactor('')}lastActivity.current=Date.now()};window.addEventListener('pointerdown',active);window.addEventListener('keydown',active);return()=>{live=false;clearInterval(timer);window.removeEventListener('pointerdown',active);window.removeEventListener('keydown',active)}},[])
 // The code step: the existing authenticator, or a new one with a QR code on the first sign-in.
 async function startTotp(){if(!supabase)return
  const factors=await supabase.auth.mfa.listFactors();if(factors.error)throw factors.error
  const verified=factors.data.totp.find(f=>f.status==='verified');if(verified){setFactor(verified.id);setQr('');setSecret('')}
  else{for(const f of factors.data.all.filter(f=>f.status==='unverified'&&f.factor_type==='totp'))await supabase.auth.mfa.unenroll({factorId:f.id});const enroll=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'Detailflow Support'});if(enroll.error)throw enroll.error;setFactor(enroll.data.id);setQr(enroll.data.totp.qr_code);setSecret(enroll.data.totp.secret)}
  totpPending.current=true;lastActivity.current=Date.now();setStep('totp')}
 const readyRef=useRef(false);readyRef.current=ready
 function request(fn:Action,strict=false){if(!strict&&readyRef.current){lastActivity.current=Date.now();void fn();return}action.current=fn;setReauth(true);setStep('password');setPassword('');setCode('');setError('')}
 // Just signed in on the login page (password under 5 minutes old): go straight to the code, without a second password.
 useEffect(()=>{if(loading||ready||reauth||step!=='password'||totpPending.current||!supabase)return;let live=true
  void supabase.auth.getSession().then(r=>{const c=passwordTime(r.data.session?.access_token||'');if(live&&c.password>Date.now()-5*60000)void startTotp().catch(e=>setError((e as Error).message))});return()=>{live=false}},[loading,ready,reauth,step])
 async function submit(){if(!supabase||busy)return;setBusy(true);setError('');try{
  if(step==='password'){
   const session=await supabase.auth.getSession(),email=session.data.session?.user.email;if(!email)throw new Error(t('Увійдіть повторно.'))
   const login=await supabase.auth.signInWithPassword({email,password});setPassword('');if(login.error)throw new Error(t('Не вдалося підтвердити пароль'))
   await startTotp()
  }else{
   const result=await supabase.auth.mfa.challengeAndVerify({factorId:factor,code});setCode('');if(result.error)throw new Error(t('Невірний код. Спробуйте ще раз.'))
   totpPending.current=false;setReady(true);lastActivity.current=Date.now();setReauth(false);setStep('password');setQr('');setSecret('');const fn=action.current;action.current=null;if(fn)await fn()
  }
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const form=<Card as="form" className="panel support-security" onSubmit={e=>{e.preventDefault();void submit()}}><h1>{t(reauth?'Підтвердіть зміну доступу':'Захищений вхід підтримки')}</h1><p>{t('Для підтримки потрібні пароль і код із застосунку автентифікації. Вхід діє 8 годин, блокування після 30 хвилин бездіяльності. Видалення та вивантаження даних студії потребують повторного підтвердження.')}</p>{step==='password'?<FormField>{t('Пароль')}<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></FormField>:<>{qr&&<><p>{t('Додайте цей QR-код у застосунок автентифікації.')}</p><img className="support-totp-qr" src={qr} alt={t('QR-код двофакторного входу')}/><details><summary>{t('Ключ для ручного введення')}</summary><code>{secret}</code></details></>}<FormField>{t('Код автентифікації')}<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required value={code} onChange={e=>setCode(e.target.value)}/></FormField></>}{error&&<p role="alert">{t(error)}</p>}<button className="primary" disabled={busy}>{t(busy?'Перевіряємо…':'Підтвердити')}</button>{reauth&&step==='password'&&<button type="button" className="text-btn" onClick={()=>{action.current=null;setReauth(false)}}>{t('Скасувати')}</button>}<button type="button" className="text-btn" disabled={busy} onClick={()=>void supabase?.auth.signOut()}>{t('Вийти')}</button></Card>
 if(loading)return <p role="status">{t('Перевіряємо доступ…')}</p>
 return <SecurityContext.Provider value={request}>{ready?children:<main className="support-workspace">{form}</main>}{ready&&reauth&&<div className="overlay"><Modal className="modal">{form}</Modal></div>}</SecurityContext.Provider>
}
