import LanguageSwitcher from './i18n/LanguageSwitcher'
import {t} from './i18n/core'
import { Select } from './components/Select'
import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, Building2, Headphones, LogIn, Wrench } from 'lucide-react'
import { supabase } from './lib/supabase'
import { authErrorMessage } from './lib/authMessages'
export { default as SupportPortal } from './SupportPortal'

type Role='owner'|'master'|'support'|'admin'

export default function AccessPortal({admin=false}:{admin?:boolean}){
  const registrationEntry=window.location.pathname==='/register', loginEntry=window.location.pathname==='/login'
  const administratorEntry=loginEntry&&new URLSearchParams(window.location.search).get('role')==='admin'
  const masterEntry=loginEntry&&new URLSearchParams(window.location.search).get('role')==='master'
  const [role,setRole]=useState<Role|null>(admin?'support':registrationEntry?'owner':masterEntry?'master':administratorEntry?'admin':null),[mode,setMode]=useState<'choose'|'login'|'register'>(admin||masterEntry||administratorEntry?'login':registrationEntry?'register':'choose'),[name,setName]=useState(''),[studio,setStudio]=useState(''),[phone,setPhone]=useState(''),[messenger,setMessenger]=useState('Telegram'),[contact,setContact]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
  const [confirmationEmail,setConfirmationEmail]=useState(''),[cooldown,setCooldown]=useState(0)
  useEffect(()=>{if(!cooldown)return;const timer=window.setTimeout(()=>setCooldown(v=>Math.max(0,v-1)),1000);return()=>window.clearTimeout(timer)},[cooldown])
  async function resend(){
    if(!supabase||busy||cooldown)return
    setBusy(true);setMessage('')
    try{const {error}=await supabase.auth.resend({type:'signup',email:confirmationEmail,options:{emailRedirectTo:window.location.origin+'/login'}});
      if(error){setMessage(authErrorMessage(error));setCooldown(60);return}
      setMessage(t("Запит на повторне надсилання прийнято. Перевірте вхідні та спам. Якщо email уже підтверджений, увійдіть зі своїм паролем."));setCooldown(60)
    }catch{setMessage(t("Не вдалося з’єднатися із сервісом. Спробуйте ще раз."))}finally{setBusy(false)}
  }
  function back(){setConfirmationEmail('');if(admin||registrationEntry){window.location.assign('/');return}setRole(null);setMode('choose');setMessage('')}
  async function submit(event:FormEvent){
    event.preventDefault();if(busy)return
    if(!supabase){setMessage(t("Сервіс не підключено до бази. Зверніться до адміністратора."));return}
    setBusy(true);setMessage('')
    try{
      const result=mode==='login'?await supabase.auth.signInWithPassword({email:email.trim(),password}):await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:window.location.origin+'/login',data:{full_name:name,requested_role:'owner',studio_name:studio,phone,messenger,contact}}})
      if(result.error){setMessage(authErrorMessage(result.error));if(result.error.code==='email_not_confirmed'){setConfirmationEmail(email.trim());setCooldown(0)}return}
      if(mode==='register'&&!result.data.session){setConfirmationEmail(email.trim());setCooldown(60);setPassword('')}
    }catch{setMessage(t("Не вдалося з’єднатися із сервісом. Перевірте інтернет і спробуйте ще раз."))}
    finally{setBusy(false)}
  }
  if(confirmationEmail)return <main className="access-portal"><LanguageSwitcher/><section className="access-form panel"><div className="access-brand"><i/>detailflow</div><p>{t("Підтвердження email")}</p><h1>{t("Перевірте пошту")}</h1><span>{t("Для завершення реєстрації відкрийте посилання в листі на ")}<strong>{confirmationEmail}</strong>{t(". Потім менеджер зможе активувати студію.")}</span><div className="confirmation-help"><b>{t("Листа немає?")}</b><p>{t("Перевірте «Спам» та правильність адреси. Для вже зареєстрованої пошти новий лист може не надсилатися — спробуйте увійти.")}</p></div>{message&&<p className="access-message" role="status">{t(message)}</p>}<button className="primary" disabled={busy||cooldown>0} onClick={()=>void resend()}>{busy?t("Надсилаємо…"):cooldown?`Повторити через ${cooldown} с`:t("Надіслати лист повторно")}</button><button className="text-btn" onClick={()=>{setConfirmationEmail('');setMode('login');setMessage('')}}>{t("Перейти до входу")}</button><button className="text-btn" onClick={()=>{setConfirmationEmail('');setMode('register');setRole('owner');setMessage('')}}>{t("Вказати іншу адресу")}</button></section></main>
  if(!role)return <main className="access-portal"><LanguageSwitcher/><a className="access-back" href="/"><ArrowLeft size={17}/>{t(" На головну")}</a><div className="access-brand"><i/>detailflow</div><div className="access-hero"><p>{t("Єдина система для студії")}</p><h1>{t("Оберіть спосіб входу")}</h1><span>{t("Кожна роль бачить тільки свій робочий простір.")}</span></div><div className="access-roles"><button onClick={()=>{setRole('owner');setMode(loginEntry?'login':'register')}}><Building2/><b>{t("Власник студії")}</b><small>{loginEntry?t("Увійдіть до робочого простору студії"):t("Подайте заявку та керуйте всією студією")}</small></button><button onClick={()=>{setRole('master');setMode('login')}}><Wrench/><b>{t("Майстер")}</b><small>{t("Увійдіть за запрошенням власника")}</small></button><button onClick={()=>{setRole('admin');setMode('login')}}><Building2/><b>{t("Адміністратор студії")}</b><small>{t("Календар, клієнти та замовлення за доступом власника")}</small></button></div><a className="text-btn" href="/register">{t("Ще немає акаунта? Зареєструвати студію")}</a></main>
  if((role==='master'||role==='admin')&&mode==='login')return <main className="access-portal"><LanguageSwitcher/><button className="access-back" onClick={back}><ArrowLeft size={17}/>{t(" Назад")}</button><div className="access-form panel"><Wrench/><p>{role==='admin'?t("Адміністратор студії"):t("Кабінет майстра")}</p><h1>{t("Вхід за запрошенням")}</h1><span>{t("Власник надіслав вам лист. Увійдіть тим самим email і паролем, який задали в листі.")}</span><LoginForm email={email} password={password} setEmail={setEmail} setPassword={setPassword} busy={busy} message={message} submit={submit}/></div></main>
  if(role==='owner'&&mode==='login')return <main className="access-portal"><LanguageSwitcher/><button className="access-back" onClick={back}><ArrowLeft size={17}/>{t(" Назад")}</button><div className="access-form panel"><Building2/><p>{t("Власник студії")}</p><h1>{t("Вхід до кабінету")}</h1><span>{t("Після активації менеджером тут відкриється робочий простір студії.")}</span><LoginForm email={email} password={password} setEmail={setEmail} setPassword={setPassword} busy={busy} message={message} submit={submit}/></div></main>
  if(role==='support')return <main className="access-portal"><LanguageSwitcher/><button className="access-back" onClick={back}><ArrowLeft size={17}/>{t(" Назад")}</button><div className="access-form panel"><Headphones/><p>{t("Підтримка Detailflow")}</p><h1>{t("Службовий вхід")}</h1><span>{t("Вхід доступний лише співробітникам підтримки з активованим службовим акаунтом.")}</span><LoginForm email={email} password={password} setEmail={setEmail} setPassword={setPassword} busy={busy} message={message} submit={submit}/></div></main>
  return <main className="access-portal"><LanguageSwitcher/><button className="access-back" onClick={back}><ArrowLeft size={17}/>{t(" Назад")}</button><form className="access-form panel owner-registration" onSubmit={submit}><Building2/><p>{t("Власник студії")}</p><h1>{t("Заявка на підключення")}</h1><span>{t("Менеджер активує ваш обліковий запис після зв’язку з вами.")}</span><label>{t("Ваше ім’я")}<input required value={name} onChange={event=>setName(event.target.value)}/></label><label>{t("Назва студії")}<input required value={studio} onChange={event=>setStudio(event.target.value)}/></label><label>{t("Телефон")}<input required value={phone} onChange={event=>setPhone(event.target.value)}/></label><label>{t("Зручний месенджер")}<Select value={messenger} onChange={event=>setMessenger(event.target.value)}><option>Telegram</option><option>Viber</option><option>WhatsApp</option><option>Instagram</option></Select></label><label>{t("Нік / контакт у месенджері")}<input required value={contact} onChange={event=>setContact(event.target.value)} placeholder="@username"/></label><label>Email<input required type="email" value={email} onChange={event=>setEmail(event.target.value)}/></label><label>{t("Пароль")}<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={event=>setPassword(event.target.value)}/></label>{message&&<small className="access-message">{t(message)}</small>}<button className="primary" disabled={busy}>{busy?t("Надсилаємо…"):t("Надіслати заявку")}</button><a className="text-btn" href="/login">{t("Вже є акаунт? Увійти")}</a></form></main>
}

function LoginForm({email,password,setEmail,setPassword,busy,message,submit}:{email:string;password:string;setEmail:(value:string)=>void;setPassword:(value:string)=>void;busy:boolean;message:string;submit:(event:FormEvent)=>Promise<void>}){
 const [resetBusy,setResetBusy]=useState(false),[resetMessage,setResetMessage]=useState(''),[resetCooldown,setResetCooldown]=useState(0)
 useEffect(()=>{if(!resetCooldown)return;const timer=window.setTimeout(()=>setResetCooldown(v=>Math.max(0,v-1)),1000);return()=>window.clearTimeout(timer)},[resetCooldown])
 async function reset(){
  if(!supabase||resetBusy||resetCooldown)return
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){setResetMessage('Спочатку вкажіть email акаунта.');return}
  setResetBusy(true);setResetMessage('')
  try{const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+(window.location.pathname.startsWith('/admin')?'/admin':'/login')});setResetMessage(error?authErrorMessage(error):'Якщо акаунт із цією адресою існує, ви отримаєте посилання для створення нового пароля. Перевірте також спам.');setResetCooldown(60)}
  catch{setResetMessage('Не вдалося з’єднатися із сервісом. Спробуйте ще раз.')}finally{setResetBusy(false)}
 }
 return <form onSubmit={submit}><label>Email<input required type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/></label><label>{t("Пароль")}<input required type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)}/></label>{message&&<small className="access-message" role="status">{t(message)}</small>}<button className="primary" disabled={busy||resetBusy}>{busy?t("Входимо…"):t("Увійти")}</button><button className="text-btn" type="button" disabled={busy||resetBusy||resetCooldown>0} onClick={()=>void reset()}>{resetBusy?t("Надсилаємо…"):resetCooldown?`Повторити через ${resetCooldown} с`:t("Забули пароль?")}</button>{resetMessage&&<small className="access-message" role="status">{resetMessage}</small>}</form>
}

export function OwnerPending(){
  const [request,setRequest]=useState<{status:string;review_note:string|null}|null>(null)
  useEffect(()=>{let active=true;async function check(){if(!supabase)return;const {data,error}=await supabase.from('studio_access_requests').select('status,review_note').maybeSingle();if(!active||error)return;if(data?.status==='approved'){window.location.reload();return}setRequest(data)}void check();const timer=window.setInterval(()=>void check(),15000);return()=>{active=false;window.clearInterval(timer)}},[])
  const rejected=request?.status==='rejected'
  return <main className="access-portal"><LanguageSwitcher/><div className="access-form panel"><Building2/><p>{t("Заявка власника")}</p><h1>{rejected?t("Заявку відхилено"):t("Очікує активації")}</h1><span>{rejected?request.review_note||t("Зверніться до менеджера для уточнення."):t("Менеджер Detailflow перевірить заявку, зв’яжеться з вами у вказаному месенджері та активує доступ до студії.")}</span><button className="text-btn" onClick={()=>window.location.reload()}>{t("Перевірити статус")}</button><button className="text-btn" onClick={()=>void supabase?.auth.signOut()}>{t("Вийти")}</button></div></main>
}
