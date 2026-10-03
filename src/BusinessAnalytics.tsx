import {useEffect,useState} from 'react'
import {t,localeTag} from './i18n/core'
import {supabase} from './lib/supabase'
import {financeDay} from './lib/finance'
import {useStudioTimezone} from './lib/StudioTimezone'
import {DateInput} from './components/FormInputs'
import {excelReport} from './lib/reportExport'
import './business-analytics.css'

export type Report={timezone:string;orders:number;revenue:number;late_orders:number;dated_orders:number;
 clients:{id:string;name:string;visits:number;revenue:number;lifetime_visits:number;lifetime_value:number;returning:boolean}[];
 masters:{staff_id:string|null;name:string;jobs:number;revenue:number;seconds:number;timed_jobs:number;timed_revenue:number|null}[];
 services:{title:string;jobs:number;measured:number;planned:number|null;actual:number|null;exceeded:number}[];
 demand:{weekday:number;booking_hour:number;bookings:number;cancelled:number}[];months:{month:string;orders:number;revenue:number}[]}
const n=(value:number|null)=>value===null?'—':new Intl.NumberFormat(localeTag(),{maximumFractionDigits:1}).format(value)
export default function BusinessAnalytics({tenantId,preview}:{tenantId?:string|null;preview?:Report}){
 const timezone=useStudioTimezone(),today=financeDay(new Date().toISOString(),timezone)
 const [from,setFrom]=useState(today.slice(0,7)+'-01'),[to,setTo]=useState(today),[period,setPeriod]=useState({from:today.slice(0,7)+'-01',to:today})
 const [data,setData]=useState<Report|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[version,setVersion]=useState(0)
 useEffect(()=>{let live=true;setData(null);setError('');setLoading(false);if(import.meta.env.DEV&&preview){setData(preview);return}if(!supabase||!tenantId){setError('Для звіту підключіть студію.');return}setLoading(true)
 void supabase.rpc('business_analytics',{studio:tenantId,date_from:period.from,date_to:period.to}).then(({data,error})=>{if(!live)return;setLoading(false);if(error)setError('Звіт недоступний. Перевірте підключення, фінансові права та оновлення бази.');else setData(data as Report)})
 return()=>{live=false}
 },[tenantId,period,version,preview])
 const valid=!!from&&!!to&&from<=to&&(Date.parse(to)-Date.parse(from))/86400000<=1095
 const tables=data?[
  {name:t('Майстри'),headers:['Майстер','Роботи','Вартість робіт, ₴','Години','Роботи з таймером','Вартість за годину, ₴'],rows:data.masters.map(r=>[r.name,r.jobs,r.revenue,r.seconds/3600,r.timed_jobs,r.seconds>0?(r.timed_revenue||0)/(r.seconds/3600):'—'])},
  {name:t('Час послуг'),headers:['Послуга','Роботи','Виміряно','План, хв','Факт, хв','Перевищення плану'],rows:data.services.map(r=>[r.title,r.jobs,r.measured,r.planned??'—',r.actual??'—',r.exceeded])},
  {name:t('Клієнти'),headers:['Клієнт','Візити','Вартість робіт, ₴','Середній чек, ₴','Візити за всю історію','Історична вартість, ₴'],rows:data.clients.map(r=>[r.name,r.visits,r.revenue,r.revenue/r.visits,r.lifetime_visits,r.lifetime_value])},
  {name:t('Сезонність'),headers:['Місяць','Замовлення','Вартість робіт, ₴'],rows:data.months.map(r=>[r.month,r.orders,r.revenue])}
 ]:[]
 function download(){if(!data)return;const content=excelReport([{name:t('Період'),rows:[[t('Від'),period.from],[t('До'),period.to],[t('Часовий пояс студії'),data.timezone],['UAH'],[t('Вартість завершених замовлень'),data.revenue],[t('Замовлення'),data.orders]]},...tables.map(s=>({name:s.name,rows:[s.headers.map(h=>t(h)),...s.rows]})),{name:t('Попит'),rows:[[t('День тижня'),t('Година'),t('Записи'),t('Скасовано')],...data.demand.map(r=>[r.weekday,r.booking_hour,r.bookings,r.cancelled])]}]);const url=URL.createObjectURL(new Blob([content],{type:'application/xml;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`detailflow-analytics-${period.from}-${period.to}.xml`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return <div className="business-analytics">
  <form className="panel finance-period analytics-controls" onSubmit={e=>{e.preventDefault();if(valid){setPeriod({from,to});setVersion(v=>v+1)}}}>
   <label>{t('Від')}<DateInput type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)}/></label><label>{t('До')}<DateInput type="date" value={to} min={from} onChange={e=>setTo(e.target.value)}/></label><button className="primary" disabled={!valid||loading}>{t('Оновити звіт')}</button><small>{t('Період до трьох років. Часовий пояс студії.')}</small>
  </form>
  {loading&&<p role="status">{t('Завантаження…')}</p>}{error&&<p role="alert" className="panel">{t(error)}</p>}
  {data&&<><header className="analytics-report-title"><div><h2>{t('Аналітика студії')}</h2><p>{period.from} — {period.to} · {data.timezone} · UAH</p></div><div className="analytics-controls"><button className="secondary" onClick={download}>{t('Експорт Excel (XML)')}</button><button className="secondary" onClick={()=>window.print()}>{t('Друк / PDF')}</button></div></header>
   <div className="finance-kpis">{[[t('Завершені замовлення'),data.orders],[t('Вартість завершених замовлень'),data.revenue],[t('Середній чек, ₴'),data.orders?data.revenue/data.orders:null],[t('Повторні клієнти, %'),data.clients.length?100*data.clients.filter(c=>c.returning||c.visits>1).length/data.clients.length:null]].map(([title,value])=><section className="panel" key={String(title)}><p>{title}</p><h2>{n(value as number|null)}</h2></section>)}</div>
   <p className="panel">{t('Завершено із запізненням')}: <b>{data.late_orders} / {data.dated_orders}</b> · {t('Замовлення з указаним терміном готовності')}</p>
   <details className="panel" open><summary>{t('Як розраховані показники')}</summary><p>{t('Вартість завершених робіт — не отримані оплати. Грошові надходження та прибуток дивіться в огляді фінансів.')}</p><p>{t('Повторні клієнти мають попередній завершений візит або кілька візитів у періоді. Історична вартість — сума завершених замовлень до кінця періоду, без прогнозу LTV.')}</p><p>{t('Години — активний час підтверджених робіт. Вартість за годину враховує лише роботи з таймером. План зберігається для нових робіт із каталогу; для старих робіт може бути відсутній.')}</p></details>
   {tables.map(table=><section className="panel" key={table.name}><h2>{table.name}</h2>{table.rows.length?<div className="finance-table-scroll"><table><thead><tr>{table.headers.map(h=><th key={h}>{t(h)}</th>)}</tr></thead><tbody>{table.rows.map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j}>{typeof v==='number'?n(v):v}</td>)}</tr>)}</tbody></table></div>:<p>{t('Немає даних за цей період')}</p>}</section>)}
   <section className="panel"><h2>{t('Попит за днями та годинами')}</h2><p>{t('Кількість записів за часом початку. Скасовані записи виключено; це не відсоток завантаження.')}</p><div className="analytics-heatmap">{['Пн','Вт','Ср','Чт','Пт','Сб','Нд'].map((day,i)=><div className="analytics-heat-row" key={day}><b>{t(day)}</b>{Array.from({length:24},(_,hour)=>{const r=data.demand.find(r=>r.weekday===i+1&&r.booking_hour===hour),value=r?r.bookings-r.cancelled:0,max=Math.max(1,...data.demand.map(r=>r.bookings-r.cancelled));return <span key={hour} title={`${t(day)} ${hour}:00 · ${value}`} style={{background:`rgba(169,215,85,${value?.15+.75*value/max:.04})`}}><small>{hour}</small><b>{value||'·'}</b></span>})}</div>)}</div><p>{t('Скасовано')}: {data.demand.reduce((sum,r)=>sum+r.cancelled,0)}</p></section>
  </>}
 </div>
}
