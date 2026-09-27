import { Select } from './components/Select'
import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, Building2, Headphones, LogIn, Wrench } from 'lucide-react'
import { supabase } from './lib/supabase'
import { authErrorMessage } from './lib/authMessages'
export { default as SupportPortal } from './SupportPortal'

type Role='owner'|'master'|'support'

export default function AccessPortal({admin=false}:{admin?:boolean}){
  const registrationEntry=window.location.pathname==='/register', loginEntry=window.location.pathname==='/login'
  const masterEntry=loginEntry&&new URLSearchParams(window.location.search).get('role')==='master'
  const [role,setRole]=useState<Role|null>(admin?'support':registrationEntry?'owner':masterEntry?'master':null),[mode,setMode]=useState<'choose'|'login'|'register'>(admin||masterEntry?'login':registrationEntry?'register':'choose'),[name,setName]=useState(''),[studio,setStudio]=useState(''),[phone,setPhone]=useState(''),[messenger,setMessenger]=useState('Telegram'),[contact,setContact]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
  const [confirmationEmail,setConfirmationEmail]=useState(''),[cooldown,setCooldown]=useState(0)
  useEffect(()=>{if(!cooldown)return;const timer=window.setTimeout(()=>setCooldown(v=>Math.max(0,v-1)),1000);return()=>window.clearTimeout(timer)},[cooldown])
  async function resend(){
    if(!supabase||busy||cooldown)return
    setBusy(true);setMessage('')
    try{const {error}=await supabase.auth.resend({type:'signup',email:confirmationEmail,options:{emailRedirectTo:window.location.origin+'/login'}});
      if(error){setMessage(authErrorMessage(error));setCooldown(60);return}
      setMessage('Запит на повторне надсилання прийнято. Перевірте вхідні та спам. Якщо email уже підтверджений, увійдіть зі своїм паролем.');setCooldown(60)
    }catch{setMessage('Не вдалося з’єднатися із сервісом. Спробуйте ще раз.')}finally{setBusy(false)}
  }
  function back(){setConfirmationEmail('');if(admin||registrationEntry){window.location.assign('/');return}setRole(null);setMode('choose');setMessage('')}
  async function submit(event:FormEvent){
    event.preventDefault();if(busy)return
    if(!supabase){setMessage('Сервіс не підключено до бази. Зверніться до адміністратора.');return}
    setBusy(true);setMessage('')
    try{
      const result=mode==='login'?await supabase.auth.signInWithPassword({email:email.trim(),password}):await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:window.location.origin+'/login',data:{full_name:name,requested_role:'owner',studio_name:studio,phone,messenger,contact}}})
      if(result.error){setMessage(authErrorMessage(result.error));if(result.error.code==='email_not_confirmed'){setConfirmationEmail(email.trim());setCooldown(0)}return}
      if(mode==='register'&&!result.data.session){setConfirmationEmail(email.trim());setCooldown(60);setPassword('')}
    }catch{setMessage('Не вдалося з’єднатися із сервісом. Перевірте інтернет і спробуйте ще раз.')}
    finally{setBusy(false)}
  }
  if(confirmationEmail)return <main className="access-portal"><section className="access-form panel"><div className="access-brand"><i/>detailflow</div><p>Підтвердження email</p><h1>Перевірте пошту</h1><span>Для завершення реєстрації відкрийте посилання в листі на <strong>{confirmationEmail}</strong>. Потім менеджер зможе активувати студію.</span><div className="confirmation-help"><b>Листа немає?</b><p>Перевірте «Спам» та правильність адреси. Для вже зареєстрованої пошти новий лист може не надсилатися — спробуйте увійти.</p></div>{message&&<p className="access-message" role="status">{message}</p>}<button className="primary" disabled={busy||cooldown>0} onClick={()=>void resend()}>{busy?'Надсилаємо…':cooldown?`Повторити через ${cooldown} с`:'Надіслати лист повторно'}</button><button className="text-btn" onClick={()=>{setConfirmationEmail('');setMode('login');setMessage('')}}>Перейти до входу</button><button className="text-btn" onClick={()=>{setConfirmationEmail('');setMode('register');setRole('owner');setMessage('')}}>Вказати іншу адресу</button></section></main>
  if(!role)return <main className="access-portal"><a className="access-back" href="/"><ArrowLeft size={17}/> На головну</a><div className="access-brand"><i/>detailflow</div><div className="access-hero"><p>Єдина система для студії</p><h1>Оберіть спосіб входу</h1><span>Кожна роль бачить тільки свій робочий простір.</span></div><div className="access-roles"><button onClick={()=>{setRole('owner');setMode(loginEntry?'login':'register')}}><Building2/><b>Власник студії</b><small>{loginEntry?'Увійдіть до робочого простору студії':'Подайте заявку та керуйте всією студією'}</small></button><button onClick={()=>{setRole('master');setMode('login')}}><Wrench/><b>Майстер</b><small>Увійдіть за запрошенням власника</small></button></div><a className="text-btn" href="/register">Ще немає акаунта? Зареєструвати студію</a></main>
  if(role==='master'&&mode==='login')return <main className="access-portal"><button className="access-back" onClick={back}><ArrowLeft size={17}/> Назад</button><div className="access-form panel"><Wrench/><p>Кабінет майстра</p><h1>Вхід за запрошенням</h1><span>Власник надіслав вам лист. Увійдіть тим самим email і паролем, який задали в листі.</span><LoginForm email={email} password={password} setEmail={setEmail} setPassword={setPassword} busy={busy} message={message} submit={submit}/></div></main>
  if(role==='owner'&&mode==='login')return <main className="access-portal"><button className="access-back" onClick={back}><ArrowLeft size={17}/> Назад</button><div className="access-form panel"><Building2/><p>Власник студії</p><h1>Вхід до кабінету</h1><span>Після активації менеджером тут відкриється робочий простір студії.</span><LoginForm email={email} password={password} setEmail={setEmail} setPassword={setPassword} busy={busy} message={message} submit={submit}/></div></main>
  if(role==='support')return <main className="access-portal"><button className="access-back" onClick={back}><ArrowLeft size={17}/> Назад</button><div className="access-form panel"><Headphones/><p>Підтримка Detailflow</p><h1>Службовий вхід</h1><span>Вхід доступний лише співробітникам підтримки з активованим службовим акаунтом.</span><LoginForm email={email} password={password} setEmail={setEmail} setPassword={setPassword} busy={busy} message={message} submit={submit}/></div></main>
  return <main className="access-portal"><button className="access-back" onClick={back}><ArrowLeft size={17}/> Назад</button><form className="access-form panel owner-registration" onSubmit={submit}><Building2/><p>Власник студії</p><h1>Заявка на підключення</h1><span>Менеджер активує ваш обліковий запис після зв’язку з вами.</span><label>Ваше ім’я<input required value={name} onChange={event=>setName(event.target.value)}/></label><label>Назва студії<input required value={studio} onChange={event=>setStudio(event.target.value)}/></label><label>Телефон<input required value={phone} onChange={event=>setPhone(event.target.value)}/></label><label>Зручний месенджер<Select value={messenger} onChange={event=>setMessenger(event.target.value)}><option>Telegram</option><option>Viber</option><option>WhatsApp</option><option>Instagram</option></Select></label><label>Нік / контакт у месенджері<input required value={contact} onChange={event=>setContact(event.target.value)} placeholder="@username"/></label><label>Email<input required type="email" value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Пароль<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={event=>setPassword(event.target.value)}/></label>{message&&<small className="access-message">{message}</small>}<button className="primary" disabled={busy}>{busy?'Надсилаємо…':'Надіслати заявку'}</button><a className="text-btn" href="/login">Вже є акаунт? Увійти</a></form></main>
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
 return <form onSubmit={submit}><label>Email<input required type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Пароль<input required type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)}/></label>{message&&<small className="access-message" role="status">{message}</small>}<button className="primary" disabled={busy||resetBusy}>{busy?'Входимо…':'Увійти'}</button><button className="text-btn" type="button" disabled={busy||resetBusy||resetCooldown>0} onClick={()=>void reset()}>{resetBusy?'Надсилаємо…':resetCooldown?`Повторити через ${resetCooldown} с`:'Забули пароль?'}</button>{resetMessage&&<small className="access-message" role="status">{resetMessage}</small>}</form>
}

export function OwnerPending(){
  const [request,setRequest]=useState<{status:string;review_note:string|null}|null>(null)
  useEffect(()=>{let active=true;async function check(){if(!supabase)return;const {data,error}=await supabase.from('studio_access_requests').select('status,review_note').maybeSingle();if(!active||error)return;if(data?.status==='approved'){window.location.reload();return}setRequest(data)}void check();const timer=window.setInterval(()=>void check(),15000);return()=>{active=false;window.clearInterval(timer)}},[])
  const rejected=request?.status==='rejected'
  return <main className="access-portal"><div className="access-form panel"><Building2/><p>Заявка власника</p><h1>{rejected?'Заявку відхилено':'Очікує активації'}</h1><span>{rejected?request.review_note||'Зверніться до менеджера для уточнення.':'Менеджер Detailflow перевірить заявку, зв’яжеться з вами у вказаному месенджері та активує доступ до студії.'}</span><button className="text-btn" onClick={()=>window.location.reload()}>Перевірити статус</button><button className="text-btn" onClick={()=>void supabase?.auth.signOut()}>Вийти</button></div></main>
}
