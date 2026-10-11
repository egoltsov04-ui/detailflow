import {useEffect,useState} from 'react'
import {supabase} from './lib/supabase'
import {subscriptionPlans} from './lib/plans'
import {Card,FormField,PageHeader} from './components/UI'
import {DateInput} from './components/FormInputs'
import {t} from './i18n/core'
import {money} from './workflow/model'
export default function SupportSummary(){
 const today=new Date().toISOString().slice(0,10),[from,setFrom]=useState(today.slice(0,8)+'01'),[to,setTo]=useState(today),[data,setData]=useState<{paid_by_plan:Record<string,number>;mrr?:number;trial:number;ending:number;cohort:number;converted:number}|null>(null),[error,setError]=useState(''),[version,setVersion]=useState(0)
 useEffect(()=>{let live=true;setData(null);setError('');void supabase?.rpc('support_platform_summary',{from_input:from,to_input:to}).then(({data,error})=>{if(live){if(error)setError(error.message);else setData(data)}});return()=>{live=false}},[from,to,version])
 const paid=Object.values(data?.paid_by_plan||{}).reduce((s,n)=>s+Number(n),0),mrr=data?.mrr??subscriptionPlans.reduce((s,p)=>s+p.price*Number(data?.paid_by_plan?.[p.id]||0),0)
 return <section><PageHeader><h1>{t('Стан платформи')}</h1><button className="secondary" onClick={()=>setVersion(v=>v+1)}>{t('Оновити')}</button></PageHeader><div className="support-summary-grid">{[[t('Активні платні студії'),paid],[t('MRR'),money(mrr)],[t('Пробні студії'),data?.trial??'—'],[t('Закінчується ≤ 7 днів'),data?.ending??'—']].map(([title,value])=><Card key={title} className="panel"><h2>{title}</h2><strong>{data?value:'—'}</strong></Card>)}</div><Card className="panel"><h2>{t('Конверсія пробного періоду')}</h2><div className="support-edit-grid"><FormField>{t('Від')}<DateInput required value={from} max={to} onChange={e=>setFrom(e.target.value)}/></FormField><FormField>{t('До')}<DateInput required value={to} min={from} max={today} onChange={e=>setTo(e.target.value)}/></FormField></div><strong>{data?.cohort?Math.round(data.converted/data.cohort*100)+'%':'—'}</strong><p>{data?.converted??0} / {data?.cohort??0}</p><p>{t('Студії, що почали пробний період у вибрані дати та перейшли на оплату до кінця періоду. Внутрішні студії не враховуються.')}</p></Card>{error&&<p role="alert">{t(error)}</p>}</section>
}
