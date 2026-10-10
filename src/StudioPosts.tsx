import {useEffect,useState} from 'react'
import {supabase} from './lib/supabase'
import {t,localeTag} from './i18n/core'
import {NumberInput} from './components/FormInputs'
import {Select} from './components/Select'
import type {WorkOrder} from './WorkOrders'
export type StudioPost={id:string;studio_id:string;name:string;position:number}
export function useStudioPosts(studio:string|null,enabled:boolean,refreshVersion=0){
 const [posts,setPosts]=useState<StudioPost[]>([]),[error,setError]=useState('')
 useEffect(()=>{if(!studio||!enabled||!supabase){setPosts([]);setError('');return}let alive=true
 const load=async()=>{const r=await supabase!.from('studio_posts').select('*').eq('studio_id',studio).order('position');if(!alive)return;if(r.error)setError('Не вдалося завантажити пости студії. Перевірте підключення та оновлення бази.');else{setPosts(r.data||[]);setError('')}}
 void load();const interval=setInterval(()=>{if(document.visibilityState==='visible')void load()},5000);const focus=()=>void load();window.addEventListener('focus',focus)
 return()=>{alive=false;clearInterval(interval);window.removeEventListener('focus',focus)}},[studio,enabled,refreshVersion])
 return {posts,error}
}
export function PostSettings({studio,posts,onSaved}:{studio:string;posts:StudioPost[];onSaved:()=>void}){
 const [dirty,setDirty]=useState(false)
 const [count,setCount]=useState(String(posts.length)),[names,setNames]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 useEffect(()=>{if(!dirty)setCount(String(posts.length))},[posts.length,dirty])
 return <section className="content"><h1>{t('Пости студії')}</h1><form className="panel settings" onSubmit={async e=>{e.preventDefault();if(busy||!supabase)return;setBusy(true);const r=await supabase.rpc('configure_studio_posts',{studio,count_input:Number(count),names_input:names});setBusy(false);setMessage(r.error?.message||t('Пости збережено'));if(!r.error){setDirty(false);setNames({});onSaved()}}}><label>{t('Кількість постів')}<NumberInput required min={0} max={100} step={1} value={count} onChange={e=>{setDirty(true);setCount(e.target.value)}}/></label><p>{t('Зайнятий пост не можна прибрати. Спочатку завершіть роботу або перенесіть замовлення на інший пост.')}</p>{posts.filter(p=>p.position<=Number(count)).map(p=><label key={p.id}>{p.position}. {t('Назва поста')}<input required maxLength={80} value={names[p.id]??p.name} onChange={e=>setNames(v=>({...v,[p.id]:e.target.value}))}/></label>)}{message&&<p role="status">{t(message)}</p>}<button className="primary" disabled={busy}>{t('Зберегти')}</button></form></section>
}
export function PostAssignment({order,posts,orders,onSaved}:{order:WorkOrder;posts:StudioPost[];orders:WorkOrder[];onSaved:()=>void}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 if(['ready','issued','cancelled'].includes(order.status))return null
 return <div className="panel post-assignment"><label>{t('Пост студії')}<Select disabled={busy} value={order.postId||''} onChange={async e=>{if(!supabase)return;setBusy(true);const r=await supabase.rpc('assign_order_post',{order_input:order.id,post_input:e.target.value||null});setBusy(false);setMessage(r.error?.message||'');if(!r.error)onSaved()}}><option value="">{t('Без поста')}</option>{posts.map(p=><option key={p.id} value={p.id} disabled={orders.some(o=>o.id!==order.id&&o.postId===p.id&&!['ready','issued','cancelled'].includes(o.status))}>{p.name}</option>)}</Select></label>{message&&<p role="alert">{t(message)}</p>}</div>
}
export function PostsMap({posts,orders,open,settings,error=''}:{posts:StudioPost[];orders:WorkOrder[];open:(id:string)=>void;settings:()=>void;error?:string}){
 const [now,setNow]=useState(Date.now());useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[])
 return <section className="panel"><div className="panel-head"><h2>{t('Пости студії')}</h2><button className="text-btn" onClick={settings}>{t('Налаштувати')}</button></div>{error?<p role="alert">{t(error)}</p>:!posts.length?<p>{t('Додайте пости в налаштуваннях студії.')}</p>:<div className="posts-map">{posts.map(p=>{const o=orders.find(o=>o.postId===p.id&&!['ready','issued','cancelled'].includes(o.status)),elapsed=o?.startedAt?Math.max(0,(now-Date.parse(o.startedAt))/60000):0,remaining=o?.plannedMinutes?o.plannedMinutes-elapsed:null,overdue=remaining!==null&&remaining<0,minutes=Math.ceil(Math.abs(remaining||0));return <button className={'post-card '+(o?'occupied':'free')} key={p.id} onClick={()=>o?open(String(o.id)):settings()}><b>{p.name}</b>{o?<><strong>{o.vehicle||o.title}</strong><span>{o.clientName}</span><span>{o.staffName||t('Майстра не призначено')}</span><small>{o.serviceSummary||o.title}</small><span className={overdue?'post-overdue':''}>{!o.startedAt?t('Очікує початку'):remaining===null?t('Планову тривалість не задано'):`${t(overdue?'Прострочено':'Залишилось')} ${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`}</span>{o.startedAt&&o.plannedMinutes&&<progress aria-label={t('Прогрес роботи')} max={100} value={Math.min(100,elapsed/o.plannedMinutes*100)}/>}</>:<strong>{t('Вільний')}</strong>}</button>})}</div>}</section>
}
