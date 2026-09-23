import { FormEvent, useState } from 'react'
import { supabase } from './lib/supabase'

export function AccessNotice({title,description,retry}:{title:string;description:string;retry?:()=>void}) {
  return <main className="access-portal"><section className="access-form panel"><p>Detailflow</p><h1>{title}</h1><span>{description}</span>{retry&&<button className="primary" onClick={retry}>Спробувати ще раз</button>}<button className="text-btn" onClick={()=>void supabase?.auth.signOut()}>Вийти з акаунта</button></section></main>
}

export function InvitationPassword({complete}:{complete:()=>void}) {
  const [password,setPassword]=useState(''),[repeat,setRepeat]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
  async function submit(event:FormEvent) {
    event.preventDefault()
    if(!supabase||busy)return
    if(password!==repeat){setError('Паролі не збігаються.');return}
    setBusy(true);setError('')
    try {
      const result=await supabase.auth.updateUser({password})
      if(result.error){setError(result.error.message);return}
      complete()
    } catch {setError('Не вдалося зберегти пароль. Спробуйте ще раз.')}
    finally {setBusy(false)}
  }
  return <main className="access-portal"><form className="access-form panel" onSubmit={submit}><p>Активація акаунта</p><h1>Створіть пароль</h1><span>Після збереження відкриється ваш робочий кабінет.</span><label>Новий пароль<input autoComplete="new-password" required minLength={8} type="password" value={password} onChange={event=>setPassword(event.target.value)}/></label><label>Повторіть пароль<input autoComplete="new-password" required minLength={8} type="password" value={repeat} onChange={event=>setRepeat(event.target.value)}/></label>{error&&<p role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy?'Зберігаємо…':'Зберегти та увійти'}</button><button type="button" className="text-btn" onClick={()=>void supabase?.auth.signOut()}>Вийти</button></form></main>
}
