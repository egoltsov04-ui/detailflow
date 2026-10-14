import {Card,Table} from './components/UI'
import {subscriptionPlans,planFeatures,effectivePrice,planFor,canManageBilling} from './lib/plans'
import {managerLink} from './lib/manualBilling'
import {useStudioTimezone} from './lib/StudioTimezone'
import {t,localeTag} from './i18n/core'
import {useEffect,useState} from 'react'
import {supabase} from './lib/supabase'
import './billing.css'
import {ArrowUpRight,Check,UserRound,Users,Layers,HardDrive,ShieldCheck} from 'lucide-react'
function BillingSummary({data,tenantId,timezone,refresh}:{data:any;tenantId:string|null;timezone:string;refresh:()=>void}){
 const sub=data?.subscription,plan=planFor(sub?.plan),end=sub?.status==='trialing'?sub.trial_ends_at:sub?.current_period_end,storageGB=Number(data?.storage_bytes||0)/1073741824
 return <Card className="panel billing-summary"><div className="billing-summary-heading"><div><span className="billing-eyebrow">{t('Ваш робочий простір')}</span><h2>{t(plan?.name||'Тариф')}</h2><p>{sub?effectivePrice(sub).toLocaleString(localeTag()):'—'}{t(' ₴ / місяць')}</p></div><div className="billing-period"><span>{t('Доступ до')}</span><strong>{end?new Date(end).toLocaleDateString(localeTag(),{timeZone:timezone}):'—'}</strong>{sub?.price_override!=null&&<span className="ui-chip">{t('Ціна засновника')}</span>}</div></div><div className="billing-usage"><div><Users size={18}/><span>{t('Активних майстрів')}</span><strong>{data?.staff_count??'—'} <small>/ {plan?(plan.staffLimit??t('Без ліміту')):'—'}</small></strong></div><div><ShieldCheck size={18}/><span>{t('Адміністратори')}</span><strong>{data?.admin_count??'—'} <small>/ {plan?(plan.adminLimit??t('Без ліміту')):'—'}</small></strong></div><div><HardDrive size={18}/><span>{t('Фото та відео')}</span><strong>{data?storageGB.toLocaleString(localeTag(),{maximumFractionDigits:2}):'—'} <small>/ {plan?.storageGB??'—'} {t('ГБ')}</small></strong><progress aria-label={t('Використання сховища')} max={plan?.storageGB||1} value={storageGB}/></div></div><div className="billing-summary-bottom"><span>{t('Номер студії')} <code>{tenantId}</code></span><button className="text-btn" onClick={refresh}>{t('Оновити статус доступу')}</button></div><p className="billing-retention">{t('Після завершення періоду збережені дані доступні; нові записи й активація майстрів потребують продовження.')}</p></Card>
}
export function PlanCards({studioId='',subscription}:{studioId?:string;subscription?:any}){
 const contact=import.meta.env.VITE_BILLING_TELEGRAM||'detailflow'
 return <div className="billing-plans">{subscriptionPlans.map(p=>{
  const current=subscription?.plan===p.id,price=current?effectivePrice(subscription):p.price,Icon=p.id==='solo'?UserRound:p.id==='studio'?Users:Layers
  const features=[...planFeatures,p.features.finance_full?'Повні фінанси та аналітика':'Базові доходи, витрати та огляд',...(p.features.team_module?['Кабінети майстрів, зміни та зарплата']:[]),...(p.features.warehouse?['Склад']:[]),...(p.features.repeat_visit_reminders?['Нагадування про повторний візит']:[]),...(p.features.priority_support?['Пріоритетна підтримка']:[])]
  return <Card as="article" className={'panel billing-plan'+(p.id==='studio'?' billing-plan-featured':'')+(current?' billing-plan-current':'')} key={p.id}>
   <div className="plan-topline"><span className="plan-icon"><Icon size={22}/></span><span className="plan-label">{t(current?'Ваш тариф':p.id==='solo'?'Самостійна робота':p.id==='studio'?'Для команди':'Для масштабування')}</span></div>
   <div className="plan-heading"><h2>{t(p.name)}</h2><p>{t(p.audience)}</p></div>
   <div className="plan-price"><strong>{price.toLocaleString(localeTag())} <span>₴</span></strong><span>{t('на місяць')}</span>{current&&price!==p.price&&<small>{t('Стандартна ціна')}: {p.price.toLocaleString(localeTag())} ₴</small>}</div>
   <dl className="plan-capacity"><div><dt><Users size={16}/>{t('Майстри')}</dt><dd>{p.staffLimit??t('Без ліміту')}</dd></div><div><dt><ShieldCheck size={16}/>{t('Адміністратори')}</dt><dd>{p.adminLimit??t('Без ліміту')}</dd></div><div><dt><HardDrive size={16}/>{t('Фото та відео')}</dt><dd>{p.storageGB} {t('ГБ')}</dd></div></dl>
   <div className="plan-includes"><h3>{t('Що входить')}</h3><ul>{features.map(f=><li key={f}><Check size={17} aria-hidden="true"/><span>{t(f)}</span></li>)}</ul></div>
   {p.id==='solo'&&<p className="plan-scope-note">{t('Для власника, який працює сам. Команда та склад — у тарифах Студія і Pro.')}</p>}
   <a className="primary" {...(studioId?{target:'_blank',rel:'noopener noreferrer'}:{})} href={studioId?managerLink(contact,`Detailflow: прошу підключити тариф ${p.name} на 1 місяць (${price} грн). Студія: ${studioId}.`):'/register?plan='+p.id}><span>{t(studioId?(current?'Продовжити тариф':'Звернутися в Telegram'):'Підключити студію')}</span><ArrowUpRight size={18}/></a>
  </Card>
 })}</div>
}
export default function BillingPage({tenantId,role}:{tenantId:string|null;role:string|null}){
 const timezone=useStudioTimezone(),allowed=canManageBilling(role),[data,setData]=useState<any>(null),[error,setError]=useState('')
 async function load(){if(!supabase||!tenantId||!allowed)return;const r=await supabase.rpc('get_studio_billing',{studio:tenantId});if(r.error)setError(t('Не вдалося завантажити тариф. Оновіть сторінку або зверніться до підтримки.'));else{setData(r.data);setError('')}}
 useEffect(()=>{void load();const timer=setInterval(()=>{if(document.visibilityState==='visible')void load()},15000);return()=>clearInterval(timer)},[tenantId,role])
 if(!allowed)return null
 const sub=data?.subscription
 return <section className="content billing-page"><h1>{t('Тариф і білінг')}</h1>{error&&<p role="alert">{error}</p>}<BillingSummary data={data} tenantId={tenantId} timezone={timezone} refresh={()=>void load()}/><div className="billing-section-heading"><h2>{t("Оберіть формат роботи")}</h2><p>{t("Від самостійної роботи до великої команди.")}</p></div><PlanCards studioId={tenantId||''} subscription={sub}/><p>{t('Пробний період — 14 днів після активації менеджером.')}</p><p>{t('Підключення та продовження — через менеджера. Узгодьте тариф і спосіб оплати в Telegram. Після підтвердження менеджер активує доступ; залишок періоду зберігається.')}</p><Card className="panel"><h2>{t("Історія онлайн-платежів")}</h2><Table rows={(data?.orders||[]) as {id:string;created_at:string;plan:string;amount:number;status:string}[]} rowKey={o=>o.id} empty="Платежів ще немає." columns={[{key:"date",label:t("Дата"),render:o=>new Date(o.created_at).toLocaleDateString(localeTag(),{timeZone:timezone})},{key:"plan",label:t("Тариф"),render:o=>t(planFor(o.plan)?.name||o.plan)},{key:"amount",label:t("Сума, ₴"),render:o=>Number(o.amount).toLocaleString(localeTag())},{key:"status",label:t("Статус"),render:o=>t(({approved:"Оплачено",created:"Очікує оплати",declined:"Не оплачено",expired:"Строк минув"} as Record<string,string>)[o.status]||o.status)}]}/></Card></section>
}
