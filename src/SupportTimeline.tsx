import {useEffect,useState} from 'react'
import {supabase} from './lib/supabase'
import {t,localeTag} from './i18n/core'
import {money} from './workflow/model'
import {planFor} from './lib/plans'
function ChangeDetail({detail,timezone}:{detail:any;timezone:string}){
 const before=detail.before||{},after=detail.after||{},statuses:Record<string,string>={active:'Підписка активна',trialing:'Пробний період',past_due:'Потрібне продовження',cancelled:'Нові записи зупинено'}
 if('price_override' in after)return <p>{t('Ціна засновника')}: {before.price_override==null?'—':money(Number(before.price_override))} → {after.price_override==null?t('Стандартна ціна'):money(Number(after.price_override))} · {t(after.price_locked?'Зафіксувати на весь час':'До завершення поточного періоду')}</p>
 return <p>{t(planFor(before.plan)?.name||before.plan||'—')} → {t(planFor(after.plan)?.name||after.plan||'—')} · {t(statuses[after.status]||after.status||'')} · {after.end&&new Date(after.end).toLocaleDateString(localeTag(),{timeZone:timezone})}</p>
}
export default function SupportTimeline({studio,timezone}:{studio:string;timezone:string}){
 const [rows,setRows]=useState<any[]>([]),[offset,setOffset]=useState(0),[error,setError]=useState(''),[loading,setLoading]=useState(false)
 useEffect(()=>{let live=true;setLoading(true);setError('');void supabase?.rpc('support_studio_timeline',{studio,page_offset:offset}).then(({data,error})=>{if(live){setLoading(false);if(error)setError(error.message);else setRows(data||[])}});return()=>{live=false}},[studio,offset])
 return <section><h3>{t('Платежі й історія')}</h3>{loading&&<p role="status">{t('Завантаження…')}</p>}{error&&<p role="alert">{t(error)}</p>}{rows.map(r=><article className="support-history-entry" key={r.kind+r.id}><b>{new Date(r.created_at).toLocaleString(localeTag(),{timeZone:timezone})} · {t(r.kind==='payment'?'Оплата':'Зміна доступу')}</b>{r.kind==='payment'?<><p>{money(Number(r.detail.amount))} · {t(({transfer:'Переказ',card:'Картка',cash:'Готівка'} as Record<string,string>)[r.detail.method])} · {r.detail.paid_on}</p><p>+{r.detail.months} {t('міс.')} · {t('Доступ до')}: {new Date(r.detail.end).toLocaleDateString(localeTag(),{timeZone:timezone})}</p></>:<ChangeDetail detail={r.detail} timezone={timezone}/>}<p>{r.detail.reason}</p><small>{r.actor_name} · {r.actor_id}</small></article>)}{!rows.length&&!loading&&!error&&<p>{t('Змін підписки ще немає.')}</p>}<div className="planning-toolbar"><button className="secondary" disabled={!offset||loading} onClick={()=>setOffset(n=>n-25)}>{t('Назад')}</button><button className="secondary" disabled={rows.length<25||loading} onClick={()=>setOffset(n=>n+25)}>{t('Далі')}</button></div></section>
}
