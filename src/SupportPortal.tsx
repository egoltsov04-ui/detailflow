import { useEffect, useState } from 'react'
import { Headphones, RefreshCw } from 'lucide-react'
import { supabase } from './lib/supabase'
import './support.css'

type Application={id:string;full_name:string;email:string;email_confirmed:boolean;studio_name:string;phone:string;messenger:string;contact:string;status:'pending'|'approved'|'rejected';created_at:string;review_note:string|null}
export default function SupportPortal(){
 const [items,setItems]=useState<Application[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[filter,setFilter]=useState('pending'),[notes,setNotes]=useState<Record<string,string>>({}),[message,setMessage]=useState('')
 async function load(){
  if(!supabase)return
  setLoading(true);setError('')
  try{const {data,error}=await supabase.rpc('support_list_applications');if(error)throw error;setItems(data||[])}
  catch{setError('Не вдалося отримати заявки. Перевірте з’єднання та встановлення оновлення підтримки (031).')}
  finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[])
 async function review(item:Application,approve:boolean){
  if(!supabase||busy)return
  setBusy(item.id);setError('');setMessage('')
  try{const {error}=await supabase.rpc('support_review_application',{request_id:item.id,approve,note:notes[item.id]||''});if(error)throw error;setMessage(approve?'Студію активовано. Власник може увійти або оновити сторінку.':'Заявку відхилено.');await load()}
  catch(e){setError(e instanceof Error?e.message:(e as {message?:string})?.message||'Не вдалося зберегти рішення.')}
  finally{setBusy('')}
 }
 return <main className="support-workspace"><header><div><Headphones/><b>detailflow · Підтримка</b></div><button className="text-btn" onClick={()=>void supabase?.auth.signOut()}>Вийти</button></header><section><div className="page-title"><div><p>Підключення студій</p><h1>Заявки власників</h1></div><button className="secondary" disabled={loading||!!busy} onClick={()=>void load()}><RefreshCw size={16}/> Оновити</button></div><div className="support-filters">{[['pending','Очікують'],['approved','Активовані'],['rejected','Відхилені']].map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label} <span>{items.filter(i=>i.status===value).length}</span></button>)}</div>{error&&<p role="alert" className="import-error">{error}</p>}{message&&<p role="status">{message}</p>}{loading?<p role="status">Завантажуємо заявки…</p>:<div className="support-applications">{items.filter(item=>item.status===filter).map(item=><article className="panel" key={item.id}><div><p>{new Date(item.created_at).toLocaleString('uk-UA')}</p><h2>{item.studio_name}</h2><b>{item.full_name}</b></div><dl><div><dt>Email</dt><dd>{item.email}<small className={item.email_confirmed?'confirmed':'unconfirmed'}>{item.email_confirmed?'Підтверджено':'Очікує підтвердження пошти'}</small></dd></div><div><dt>Телефон</dt><dd>{item.phone||'—'}</dd></div><div><dt>{item.messenger||'Месенджер'}</dt><dd>{item.contact||'—'}</dd></div></dl>{item.status==='pending'?<><label>Примітка менеджера<textarea value={notes[item.id]||''} maxLength={2000} onChange={e=>setNotes(v=>({...v,[item.id]:e.target.value}))} placeholder="Для відмови вкажіть причину"/></label><div className="support-actions"><button className="primary" disabled={!!busy||!item.email_confirmed} onClick={()=>void review(item,true)}>Активувати студію</button><button className="secondary" disabled={!!busy||!notes[item.id]?.trim()} onClick={()=>void review(item,false)}>Відхилити</button></div></>:item.review_note&&<p>{item.review_note}</p>}</article>)}{!error&&!items.some(item=>item.status===filter)&&<div className="panel">У цьому розділі заявок немає.</div>}</div>}</section></main>
}
