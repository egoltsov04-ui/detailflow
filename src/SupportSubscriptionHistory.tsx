import {useEffect,useState} from 'react'
import {supabase} from './lib/supabase'
import {t,localeTag} from './i18n/core'
type Entry={id:string;created_at:string;actor_id:string;actor_name:string;previous_plan:string;plan:string;status:string;access_end:string|null;reason:string}
export default function SupportSubscriptionHistory({studio,timezone}:{studio:string;timezone:string}){
 const [open,setOpen]=useState(false),[offset,setOffset]=useState(0),[rows,setRows]=useState<Entry[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(false),[retry,setRetry]=useState(0)
 useEffect(()=>{if(!open)return;let live=true;setLoading(true);setError(false);setRows([])
 if(!supabase){setLoading(false);setError(true);return}
 void supabase.rpc('support_subscription_history',{studio,page_offset:offset}).then(({data,error})=>{if(live){setLoading(false);setError(!!error);setRows(data||[])}})
 return()=>{live=false}
 },[open,studio,offset,retry])
 return <details className="studio-contacts" onToggle={e=>setOpen(e.currentTarget.open)}><summary>{t('Історія змін підписки')}</summary>{loading?<p role="status">{t('Завантаження…')}</p>:error?<p role="alert">{t('Не вдалося завантажити історію.')} <button type="button" className="text-btn" onClick={()=>setRetry(n=>n+1)}>{t('Оновити')}</button></p>:<>{rows.map(r=><article key={r.id} className="support-history-entry"><b>{new Date(r.created_at).toLocaleString(localeTag(),{timeZone:timezone})}</b><p>{r.previous_plan} → {r.plan} · {t(({active:'Підписка активна',trialing:'Пробний період',past_due:'Потрібне продовження',cancelled:'Нові записи зупинено'} as Record<string,string>)[r.status]||r.status)}</p><p>{t('Доступ до')}: {r.access_end?new Date(r.access_end).toLocaleDateString(localeTag(),{timeZone:timezone}):'—'}</p><p>{r.reason}</p><small>{r.actor_name} · {r.actor_id}</small></article>)}{!rows.length&&<p>{t('Змін підписки ще немає.')}</p>}<div className="planning-toolbar"><button type="button" className="text-btn" disabled={offset===0} onClick={()=>setOffset(n=>n-20)}>{t('Назад')}</button><button type="button" className="text-btn" disabled={rows.length<20} onClick={()=>setOffset(n=>n+20)}>{t('Далі')}</button></div></>}</details>
}
