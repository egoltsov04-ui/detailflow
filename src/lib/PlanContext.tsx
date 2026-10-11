import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
import {supabase} from './supabase'
import {planFor,type PlanId,type PlanFeature} from './plans'
import {Card} from '../components/UI'
import {t} from '../i18n/core'
import {managerLink} from './manualBilling'
export const PlanContext=createContext<PlanId|null>(null)
export const usePlan=()=>useContext(PlanContext)
export function useEntitlements(studio:string|null,role:string|null){
 const [plan,setPlan]=useState<PlanId|null>(null),[error,setError]=useState('')
 useEffect(()=>{let live=true;setPlan(null);if(!studio||!['owner','admin'].includes(role||''))return;async function load(){const r=await supabase?.rpc('get_studio_entitlements',{studio});if(live){if(r?.error)setError(t('Не вдалося перевірити тариф'));else{setPlan(planFor(r?.data?.id)?.id||null);setError('')}}}void load();const timer=setInterval(()=>void load(),15000);return()=>{live=false;clearInterval(timer)}},[studio,role])
 return {plan,error}
}
export function requiredFeature(page:string):PlanFeature|null{
 if(['Команда','Зміни й зарплата','Завдання','Кабінет майстра','Замовлення'].includes(page))return 'team_module'
 if(page==='Склад')return 'warehouse'
 if(['Продажі','Рахунки'].includes(page))return 'finance_full'
 if(page==='Аналітика')return 'analytics_full'
 return null
}
export function PlanGate({page,children,error=''}:{page:string;children:ReactNode;error?:string}){
 const plan=usePlan(),feature=requiredFeature(page)
 if(!feature||plan&&planFor(plan)?.features[feature])return <>{children}</>
 if(!plan)return <p role={error?'alert':'status'} className="content">{error||t('Перевіряємо тариф…')}</p>
 return <section className="content"><Card className="panel"><h1>{t('Доступно на тарифі Студія')}</h1><p>{t('Ваші дані збережені. Зверніться до менеджера, щоб змінити тариф.')}</p><a className="primary" href={managerLink(import.meta.env.VITE_BILLING_TELEGRAM||'detailflow','Detailflow: хочу змінити тариф.')} target="_blank" rel="noreferrer">{t('Звернутися в Telegram')}</a></Card></section>
}
