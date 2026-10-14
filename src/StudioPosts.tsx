import {Card,FormField} from './components/UI'
import {useEffect,useState} from 'react'
import {supabase} from './lib/supabase'
import {t} from './i18n/core'
import {ArrowUpRight,Clock3,UserRound,Settings2,CheckCircle2,AlertCircle} from 'lucide-react'
import './studio-posts.css'
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
 return <section className="content"><h1>{t('Пости студії')}</h1><Card as="form" className="panel settings" onSubmit={async e=>{e.preventDefault();if(busy||!supabase)return;setBusy(true);const r=await supabase.rpc('configure_studio_posts',{studio,count_input:Number(count),names_input:names});setBusy(false);setMessage(r.error?.message||t('Пости збережено'));if(!r.error){setDirty(false);setNames({});onSaved()}}}><FormField>{t('Кількість постів')}<NumberInput required min={0} max={100} step={1} value={count} onChange={e=>{setDirty(true);setCount(e.target.value)}}/></FormField><p>{t('Зайнятий пост не можна прибрати. Спочатку завершіть роботу або перенесіть замовлення на інший пост.')}</p>{posts.filter(p=>p.position<=Number(count)).map(p=><FormField key={p.id}>{p.position}. {t('Назва поста')}<input required maxLength={80} value={names[p.id]??p.name} onChange={e=>setNames(v=>({...v,[p.id]:e.target.value}))}/></FormField>)}{message&&<p role="status">{t(message)}</p>}<button className="primary" disabled={busy}>{t('Зберегти')}</button></Card></section>
}
export function PostAssignment({order,posts,orders,onSaved}:{order:WorkOrder;posts:StudioPost[];orders:WorkOrder[];onSaved:()=>void}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 if(['ready','issued','cancelled'].includes(order.status))return null
 return <Card as="div" className="panel post-assignment"><FormField>{t('Пост студії')}<Select disabled={busy} value={order.postId||''} onChange={async e=>{if(!supabase)return;setBusy(true);const r=await supabase.rpc('assign_order_post',{order_input:order.id,post_input:e.target.value||null});setBusy(false);setMessage(r.error?.message||'');if(!r.error)onSaved()}}><option value="">{t('Без поста')}</option>{posts.map(p=><option key={p.id} value={p.id} disabled={orders.some(o=>o.id!==order.id&&o.postId===p.id&&!['ready','issued','cancelled'].includes(o.status))}>{p.name}</option>)}</Select></FormField>{message&&<p role="alert">{t(message)}</p>}</Card>
}
export function PostsMap({posts,orders,open,settings,error=''}:{posts:StudioPost[];orders:WorkOrder[];open:(id:string)=>void;settings:()=>void;error?:string}){
 const [now,setNow]=useState(Date.now());useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[])
 const active=orders.filter(o=>!['ready','issued','cancelled'].includes(o.status)),occupied=posts.filter(p=>active.some(o=>o.postId===p.id)).length
 const duration=(minutes:number)=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`
 return <Card className="panel studio-posts"><div className="posts-heading"><div><span className="posts-eyebrow">{t('Робочий простір')}</span><h2>{t('Пости студії')}</h2><p>{t('Завантаження та перебіг робіт зараз')}</p></div><button className="text-btn" onClick={settings}><Settings2 size={16}/>{t('Налаштувати')}</button></div>
 {error?<p role="alert">{t(error)}</p>:!posts.length?<div className="posts-empty"><ParkingBay/><p>{t('Додайте пости в налаштуваннях студії.')}</p><button className="secondary" onClick={settings}>{t('Налаштувати пости')}</button></div>:<>
 <div className="posts-summary"><span><i className="post-dot"/>{t('Зайняті пости')} <b>{occupied}</b></span><span><i className="post-dot free"/>{t('Вільні пости')} <b>{posts.length-occupied}</b></span><span className="posts-utilization">{t('Завантаження')} <b>{Math.round(occupied/posts.length*100)}%</b></span></div>
 <div className="posts-map">{posts.map(p=>{
  const o=active.find(o=>o.postId===p.id),started=!!o?.startedAt&&Number.isFinite(Date.parse(o.startedAt)),elapsed=started?Math.max(0,(now-Date.parse(o!.startedAt!))/60000):0,planned=Number(o?.plannedMinutes),remaining=planned>0?planned-elapsed:null,overdue=started&&remaining!==null&&remaining<0
  const status=!o?'Вільний':o.status==='review'?'На перевірці':o.status==='waiting'?'Очікування':started?'У роботі':'Очікує початку'
  return <button type="button" className={'post-card '+(o?'occupied':'free')+(overdue?' is-overdue':'')} key={p.id} onClick={()=>o?open(String(o.id)):settings()}>
   <span className="post-card-heading"><b>{p.name}</b><span className={'post-status '+(!o?'is-free':overdue?'is-late':'')}><i/>{t(status)}</span></span>
   <span className="post-visual"><ParkingBay occupied={!!o}/><span className="post-position">{String(p.position).padStart(2,'0')}</span></span>
   {o?<><span className="post-car-details"><strong>{o.vehicle||t('Авто не вказано')}</strong><span>{o.clientName||t('Клієнт не вказаний')}</span></span><span className="post-service">{o.serviceSummary||o.title}</span><span className="post-master"><UserRound size={16}/>{o.staffName||t('Майстра не призначено')}</span><span className={'post-timing'+(overdue?' post-overdue':'')}><span><Clock3 size={15}/>{t(!started?'Очікує початку':remaining===null?'Час у роботі':overdue?'Прострочено':'Залишилось')}</span><b>{started?duration(remaining===null?Math.floor(elapsed):Math.ceil(Math.abs(remaining))):'—'}</b></span>{started&&remaining!==null?<progress aria-label={t('Прогрес роботи')} max={100} value={Math.min(100,elapsed/planned*100)}/>:<span className="post-progress-empty"/>}<span className="post-plan-note">{t('Планова тривалість')}: {planned>0?duration(planned):t('Не задано')}</span><span className="post-card-action">{overdue?<AlertCircle size={15}/>:<CheckCircle2 size={15}/>}<span>{t('Відкрити замовлення')}</span><ArrowUpRight size={16}/></span></>:<><span className="post-car-details"><strong>{t('Готовий до роботи')}</strong><span>{t('На цьому посту немає активного замовлення.')}</span></span><span className="post-free-hint">{t('Оберіть цей пост у картці замовлення, щоб розпочати роботу.')}</span><span className="post-card-action"><Settings2 size={15}/><span>{t('Налаштувати пост')}</span><ArrowUpRight size={16}/></span></>}
  </button>
 })}</div></>}
 </Card>
}
function ParkingBay({occupied=false}:{occupied?:boolean}){
 return <svg className="parking-bay" viewBox="0 0 260 132" fill="none" aria-hidden="true"><path d="M32 14V112H228V14" stroke="currentColor" strokeOpacity=".3" strokeWidth="2"/><path d="M44 103H216M44 94H216" stroke="currentColor" strokeOpacity=".08"/><path d="M32 22h14m168 0h14M32 48h8m180 0h8M32 74h8m180 0h8" stroke="currentColor" strokeOpacity=".3" strokeWidth="2"/>{occupied?<g transform="translate(77 21)"><rect x="3" y="14" width="20" height="12" rx="4" fill="#11151c"/><rect x="85" y="14" width="20" height="12" rx="4" fill="#11151c"/><rect x="3" y="66" width="20" height="12" rx="4" fill="#11151c"/><rect x="85" y="66" width="20" height="12" rx="4" fill="#11151c"/><rect x="12" y="0" width="84" height="91" rx="24" fill="#aebac9" stroke="#dee5ed"/><path d="M26 26Q54 15 82 26L76 40H32Z" fill="#222c39"/><path d="M32 58H76L82 71Q54 82 26 71Z" fill="#222c39"/><path d="M22 12l12-4m40 0 12 4" stroke="#d5f8a4" strokeWidth="4" strokeLinecap="round"/></g>:<><rect x="108" y="36" width="44" height="44" rx="12" stroke="currentColor" strokeOpacity=".35"/><path d="M125 68V48h8a6 6 0 0 1 0 12h-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></>}</svg>
}
