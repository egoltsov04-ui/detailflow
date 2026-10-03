import {extendAccess} from './lib/manualBilling'
import {studioSearch,accessEnd,accessActive} from './lib/supportStudios'
import {subscriptionPlans} from './lib/plans'
import {useEffect,useState} from 'react'
import {Copy,Search,RefreshCw,Building2,X,ExternalLink} from 'lucide-react'
import {supabase} from './lib/supabase'
import {Select} from './components/Select'
import {DateInput} from './components/FormInputs'
import {studioDateTime} from './lib/formValues'
import {studioDay} from './lib/bookingAvailability'
import {t,localeTag} from './i18n/core'
import './support.css'
export type Studio={id:string;name:string;slug:string;timezone:string;phone:string;email:string;plan:string;status:string;trial_ends_at:string|null;current_period_end:string|null;staff_count:number;client_count:number}
const labels:Record<string,string>={trialing:'Пробний період',active:'Підписка активна',past_due:'Потрібне продовження',cancelled:'Нові записи зупинено'}
export default function SupportStudios({previewStore}:{previewStore?:{load:()=>Studio[];save:(id:string,plan:string,status:string,end:string,note:string)=>void}}={}){
 const [items,setItems]=useState<Studio[]>([]),[query,setQuery]=useState(''),[search,setSearch]=useState(''),[offset,setOffset]=useState(0)
 const [selected,setSelected]=useState<Studio|null>(null),[plan,setPlan]=useState('start'),[status,setStatus]=useState('trialing'),[end,setEnd]=useState(''),[note,setNote]=useState('')
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[version,setVersion]=useState(0)
 useEffect(()=>{
  let live=true;setError('');setLoading(true)
  if(previewStore){setItems(previewStore.load().filter(r=>[r.id,r.name,r.slug,r.email,r.phone].join(' ').toLowerCase().includes(search.toLowerCase())).slice(offset,offset+50));setLoading(false);return}
  if(!supabase){setLoading(false);return}
  void supabase.rpc('support_list_studios',{search_input:search,offset_input:offset}).then(({data,error})=>{if(!live)return;setLoading(false);if(error)setError('Не вдалося завантажити студії. Спробуйте ще раз.');else setItems(data||[])})
  return()=>{live=false}
 },[search,offset,version,previewStore])
 useEffect(()=>{if(!selected||busy)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setSelected(null)};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[selected,busy])
 function edit(row:Studio){setSelected(row);setPlan(row.plan||'start');setStatus(row.status||'past_due');const value=accessEnd(row);setEnd(value?studioDay(new Date(value),row.timezone):'');setNote('');setError('');setMessage('')}
 async function copy(id:string){try{await navigator.clipboard.writeText(id);setMessage(t('Номер студії скопійовано'))}catch{setMessage(t('Виділіть та скопіюйте номер студії вручну.'))}}
 const chosen=subscriptionPlans.find(p=>p.id===plan),overLimit=!!selected&&chosen?.staffLimit!=null&&selected.staff_count>chosen.staffLimit
 async function save(){
  if(!selected||busy||overLimit)return
  if(note.trim().length<5){setError('Вкажіть причину зміни (щонайменше 5 символів).');return}
  setBusy(true);setError('')
  try{
   if(previewStore)previewStore.save(selected.id,plan,status,end,note.trim())
   else{if(!supabase)throw new Error('Немає з’єднання');const r=await supabase.rpc('support_set_subscription',{studio:selected.id,plan_input:plan,status_input:status,end_input:['active','trialing'].includes(status)?studioDateTime(end,'23:59',selected.timezone).toISOString():null,note_input:note.trim()});if(r.error)throw r.error}
   setMessage(t('Підписку оновлено')+' · '+selected.name);setSelected(null);setVersion(v=>v+1)
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 function date(value:string|null,zone:string){return value?new Date(value).toLocaleDateString(localeTag(),{timeZone:zone,day:'numeric',month:'short',year:'numeric'}):'—'}
 return <section className="support-studios">
  <div className="page-title"><div><p>{t('Керування доступом')}</p><h1>{t('Студії та підписки')}</h1></div><button className="secondary" disabled={loading} onClick={()=>setVersion(v=>v+1)}><RefreshCw size={16}/>{t('Оновити')}</button></div>
  <form className="panel support-search" onSubmit={e=>{e.preventDefault();setSearch(studioSearch(query));setOffset(0)}}><label htmlFor="studio-search">{t('Знайти студію')}</label><div><Search size={19}/><input id="studio-search" placeholder={t('Номер, назва, телефон, email або текст із Telegram')} value={query} onChange={e=>setQuery(e.target.value)}/><button className="primary" disabled={loading}>{t('Знайти')}</button></div><small>{t('Вставте повідомлення про оплату — номер студії визначиться автоматично.')}</small>{search&&<button type="button" className="text-btn" onClick={()=>{setSearch('');setQuery('');setOffset(0)}}>{t('Скинути пошук')}</button>}</form>
  {message&&<p role="status" className="support-feedback">{message}</p>}{error&&!selected&&<p role="alert" className="import-error">{t(error)}</p>}
  {loading?<p role="status">{t('Завантажуємо студії…')}</p>:<div className="support-applications">{items.map(row=>{const active=accessActive(row),limit=subscriptionPlans.find(p=>p.id===row.plan)?.staffLimit;return <article className="panel studio-card" key={row.id}>
   <div className="studio-card-title"><Building2 size={22}/><h2>{row.name}</h2><span className={'support-badge '+(active?'is-active':'is-expired')}>{t(active?(labels[row.status]||row.status):row.status==='cancelled'?labels.cancelled:'Потрібне продовження')}</span></div>
   <div className="studio-id"><small>{t('Номер студії')}</small><div><code>{row.id}</code><button type="button" className="text-btn" aria-label={t('Копіювати номер студії')} onClick={()=>void copy(row.id)}><Copy size={17}/></button></div></div>
   <dl className="studio-facts"><div><dt>{t('Тариф')}</dt><dd>{subscriptionPlans.find(p=>p.id===row.plan)?.name||'—'}</dd></div><div><dt>{t('Доступ до')}</dt><dd>{date(accessEnd(row),row.timezone)}</dd></div><div><dt>{t('Активних майстрів')}</dt><dd>{row.staff_count} / {row.plan?(limit??t('Без ліміту')):'—'}</dd></div><div><dt>{t('Клієнтів')}</dt><dd>{row.client_count}</dd></div></dl>
   <details className="studio-contacts"><summary>{t('Контакти та сторінка запису')}</summary><p>{row.email||t('Email не вказано')}</p><p>{row.phone||t('Телефон не вказано')}</p>{row.slug&&<a target="_blank" rel="noopener noreferrer" href={'/?book='+encodeURIComponent(row.slug)}>{row.slug}<ExternalLink size={14}/></a>}<small>{row.timezone}</small></details>
   <button className="secondary" onClick={()=>edit(row)}>{t('Тариф і продовження')}</button>
  </article>})}</div>}
  {!loading&&!error&&!items.length&&<div className="panel support-empty"><Building2/><h2>{t('Студій не знайдено')}</h2><p>{t('Перевірте номер студії або скиньте пошук.')}</p></div>}
  <div className="planning-toolbar support-pagination"><button className="secondary" disabled={loading||offset===0} onClick={()=>setOffset(n=>Math.max(0,n-50))}>{t('Назад')}</button><span>{items.length?offset+1:0}–{offset+items.length}</span><button className="secondary" disabled={loading||items.length<50} onClick={()=>setOffset(n=>n+50)}>{t('Далі')}</button></div>
  {selected&&<div className="overlay"><form className="modal settings support-subscription-modal" role="dialog" aria-modal="true" aria-labelledby="subscription-title" onSubmit={e=>{e.preventDefault();void save()}}><div className="studio-modal-heading"><div><p>{t('Тариф і продовження')}</p><h2 id="subscription-title">{selected.name}</h2></div><button type="button" className="text-btn" disabled={busy} aria-label={t('Закрити')} onClick={()=>setSelected(null)}><X/></button></div><div className="studio-id"><small>{t('Номер студії')}</small><code>{selected.id}</code></div>
   <div className="support-edit-grid"><label>{t('Тариф')}<Select value={plan} onChange={e=>setPlan(e.target.value)}>{subscriptionPlans.map(p=><option key={p.id} value={p.id}>{p.name} · {p.price} ₴</option>)}</Select></label><label>{t('Статус')}<Select value={status} onChange={e=>setStatus(e.target.value)}>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}</Select></label></div>
   {overLimit&&<p role="alert" className="import-error">{t('Для цього тарифу спочатку деактивуйте зайві профілі майстрів.')}</p>}
   <fieldset className="support-extension"><legend>{t('Додати оплачений період')}</legend><div className="planning-toolbar">{[1,3,12].map(months=><button type="button" className="secondary" key={months} onClick={()=>{setStatus('active');setEnd(extendAccess(end,months,studioDay(new Date(),selected.timezone)))}}>+{months} {t('міс.')}</button>)}</div><small>{t('Продовження додається до залишку доступу. Для завершеного періоду — від сьогодні.')}</small></fieldset>
   {['active','trialing'].includes(status)&&<label>{t('Доступ до')}<DateInput required min={studioDay(new Date(),selected.timezone)} value={end} onChange={e=>setEnd(e.target.value)}/><small>{selected.timezone}</small></label>}
   <label>{t('Причина зміни')}<textarea placeholder={t('Наприклад: оплату за тариф підтверджено менеджером у Telegram')} required minLength={5} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></label><p className="support-audit-note">{t('Зміна фіксується в журналі. Зупинка нових записів зберігає доступ до наявних даних.')}</p>{error&&<p role="alert" className="import-error">{t(error)}</p>}<div className="support-actions"><button className="primary" disabled={busy||overLimit}>{t(busy?'Зберігаємо…':'Зберегти')}</button><button type="button" className="secondary" disabled={busy} onClick={()=>setSelected(null)}>{t('Скасувати')}</button></div>
  </form></div>}
 </section>
}
