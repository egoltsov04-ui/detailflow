import BusinessAnalytics from './BusinessAnalytics'
import StudioRecommendations from './StudioRecommendations'
import {useStudioTimezone} from './lib/StudioTimezone'
import {t,localeTag} from './i18n/core'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChartNoAxesCombined, WalletCards } from 'lucide-react'
import { DateInput } from './components/FormInputs'
import { Select } from './components/Select'
import { financeDay, financeLedger, financeSeries, summarizeFinance, type FinanceCash, type FinanceExpense, type FinanceEarning, type FinancePayout } from './lib/finance'
import './finance.css'

const money=(n:number)=>new Intl.NumberFormat(localeTag(),{maximumFractionDigits:2}).format(n)+' ₴'
const label=(day:string)=>new Date(`${day.length===7?day+'-01':day}T12:00:00`).toLocaleDateString(localeTag(),day.length===7?{month:'short',year:'2-digit'}:{day:'numeric',month:'short'})
type Props={tenantId?:string|null;cash:FinanceCash[];expenses:FinanceExpense[];earnings:FinanceEarning[];payouts?:FinancePayout[];cashEditor:ReactNode;expenseEditor:ReactNode;payroll:ReactNode}
export default function FinanceHub({tenantId,cash,expenses,earnings,payouts=[],cashEditor,expenseEditor,payroll}:Props){
  const timezone=useStudioTimezone(), today=financeDay(new Date().toISOString(),timezone)
  const [tab,setTab]=useState('Огляд'),[from,setFrom]=useState(today.slice(0,7)+'-01'),[to,setTo]=useState(today),[direction,setDirection]=useState('all'),[limit,setLimit]=useState(30)
  const ledger=useMemo(()=>financeLedger(cash,expenses,payouts,timezone),[cash,expenses,payouts,timezone])
  const data=useMemo(()=>summarizeFinance(ledger,earnings,from,to,timezone),[ledger,earnings,from,to,timezone])
  const series=useMemo(()=>financeSeries(data.rows,from,to),[data.rows,from,to])
  const journal=data.rows.filter(r=>direction==='all'||(direction==='salary'?r.direction==='expense'&&r.salary:r.direction===direction))
  function preset(which:string){let start=today.slice(0,7)+'-01',end=today;if(which==='today')start=today;if(which==='week'){const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-6);start=d.toISOString().slice(0,10)}if(which==='previous'){const d=new Date(today.slice(0,7)+'-01T12:00:00Z');d.setUTCDate(0);end=d.toISOString().slice(0,10);start=end.slice(0,7)+'-01'}if(which==='all'){start='';end=''}setFrom(start);setTo(end);setLimit(30)}
  return <section className="content finance-hub"><header className="page-title"><div><p>{t("Повна картина грошей студії")}</p><h1>{t("Аналітика та фінанси")}</h1></div><span className="finance-currency">UAH · ₴</span></header>
    <nav className="finance-tabs" aria-label={t("Розділи фінансів")}>{['Огляд','Аналітика студії','Рекомендації','Операції','Зарплати','Витрати'].map(name=><button key={name} aria-pressed={tab===name} className={tab===name?'active':''} onClick={()=>setTab(name)}>{t(name)}</button>)}</nav>
    {tab==='Рекомендації'&&<StudioRecommendations tenantId={tenantId}/>}
    {tab==='Аналітика студії'&&<BusinessAnalytics tenantId={tenantId}/>}
    {tab==='Огляд'&&<>
      <div className="panel finance-period"><div className="finance-presets">{[['today','Сьогодні'],['week','7 днів'],['month','Цей місяць'],['previous','Минулий місяць'],['all','Увесь час']].map(([value,title])=><button className="text-btn" key={value} onClick={()=>preset(value)}>{t(title)}</button>)}</div><div className="finance-dates"><label>{t("Від")}<DateInput type="date" max={to||undefined} value={from} onChange={e=>{setFrom(e.target.value);setLimit(30)}}/></label><span aria-hidden="true">—</span><label>{t("До")}<DateInput type="date" min={from||undefined} value={to} onChange={e=>{setTo(e.target.value);setLimit(30)}}/></label></div></div>
      <div className="finance-kpis"><Kpi title={t("Надходження")} value={data.income} note={t("Фактично отримані оплати")} icon={<ArrowDownLeft/>}/><Kpi title={t("Усі витрати")} value={data.expense} note={`${t("У тому числі зарплати")}: ${money(data.salaryPaid)}`} icon={<ArrowUpRight/>}/><Kpi title={t("Прибуток за оплатами")} value={data.profit} note={t("Надходження мінус усі витрати")} icon={<ChartNoAxesCombined/>} accent/><Kpi title={t("Зарплату нараховано")} value={data.accrued} note={t("За підтверджені роботи в періоді")} icon={<WalletCards/>}/></div>
      <div className="finance-balance"><span>{t("Виплачено зарплати за період ")}<b>{money(data.salaryPaid)}</b></span><span>{t("До виплати за всі періоди ")}<b>{money(data.due)}</b></span><button className="text-btn" onClick={()=>setTab('Зарплати')}>{t("Перейти до зарплат →")}</button></div>
      <div className="finance-chart-grid"><section className="panel finance-chart"><h2>{t("Надходження та витрати")}</h2><p>{t("Порівняння за ")}{series[0]?.date.length===7?t("місяцями"):t("днями")}</p><div className="finance-legend"><span><i className="income"/>{t("Надходження")}</span><span><i className="expense"/>{t("Витрати")}</span></div><Trend rows={series}/></section><section className="panel finance-chart"><h2>{t("Структура витрат")}</h2><p>{t("Операційні витрати та виплачена зарплата")}</p>{data.categories.length?<div className="finance-categories">{data.categories.map(c=><div key={c.name}><div><span>{t(c.name)}</span><b>{money(c.value)}</b></div><div className="finance-track"><span style={{width:`${c.value/data.expense*100}%`}}/></div><small>{Math.round(c.value/data.expense*100)}{t("% від усіх витрат")}</small></div>)}</div>:<Empty/>}</section></div>
      <section className="panel finance-chart"><h2>{t("Динаміка прибутку за оплатами")}</h2><p>{t("Результат кожного періоду після витрат, включно з виплатами майстрам")}</p><Trend rows={series} profit/>
        <details className="finance-details"><summary>{t("Показати точні суми за періодами")}</summary><div className="finance-table-scroll"><table><thead><tr><th>{t("Період")}</th><th>{t("Надходження")}</th><th>{t("Витрати")}</th><th>{t("Прибуток за оплатами")}</th></tr></thead><tbody>{series.map(r=><tr key={r.date}><td>{label(r.date)}</td><td>{money(r.income)}</td><td>{money(r.expense)}</td><td>{money(r.profit)}</td></tr>)}</tbody></table></div></details>
      </section>
      <section className="panel finance-journal"><div className="finance-journal-title"><div><h2>{t("Усі фінансові операції")}</h2><p>{journal.length}{t(" операцій за вибраний період")}</p></div><label>{t("Показати")}<Select value={direction} onChange={e=>{setDirection(e.target.value);setLimit(30)}}><option value="all">{t("Усі операції")}</option><option value="income">{t("Надходження")}</option><option value="expense">{t("Витрати")}</option><option value="salary">{t("Виплати зарплати")}</option></Select></label></div>
        {journal.slice(0,limit).map(r=><article className="finance-entry" key={r.id}><span className={'finance-entry-icon '+r.direction}>{r.direction==='income'?<ArrowDownLeft size={18}/>:<ArrowUpRight size={18}/>}</span><div><b>{r.title}</b><small>{label(r.date)} · {t(r.category)} · {t(r.method)}</small></div><strong className={r.direction==='income'?'finance-positive':''}>{r.direction==='income'?'+':'−'}{money(r.amount)}</strong></article>)}{!journal.length&&<Empty/>}{journal.length>limit&&<button className="text-btn" onClick={()=>setLimit(n=>n+30)}>{t("Показати ще 30")}</button>}
      </section>
      <details className="panel finance-method"><summary>{t("Як розраховані показники")}</summary><p>{t("Надходження — зареєстровані оплати замовлень, продажі товарів і ручні надходження. Витрати — записи витрат студії та видаткові операції каси, включно з фактичними виплатами зарплати. Кожна виплата враховується один раз.")}</p><p>{t("Прибуток за оплатами — касовий результат, а не бухгалтерський чистий прибуток. Неоплачені замовлення та невиплачена нарахована зарплата до нього не входять. Податки, оренду та інші видатки потрібно внести у витрати. Не дублюйте одну витрату в касі та у витратах студії.")}</p><p>{t("Нарахування зарплати показані за датою підтвердження роботи, виплати — за датою платежу. Залишок до виплати охоплює всі періоди. ")}{t("Часовий пояс студії")}: {timezone}.</p></details>
    </>}
    {tab==='Операції'&&<div className="finance-editor"><p className="finance-tab-note">{t("Каса: оплати замовлень, продажі, виплати та ручні операції. Повний журнал, включно з витратами студії, — у вкладці «Огляд».")}</p>{cashEditor}</div>}
    {tab==='Зарплати'&&<div className="finance-editor">{payroll}</div>}
    {tab==='Витрати'&&<div className="finance-editor"><p className="finance-tab-note">{t("Оренда, матеріали, маркетинг та інші витрати. Виплати за нараховану роботу майстрів реєструйте у вкладці «Зарплати».")}</p>{expenseEditor}</div>}
  </section>
}
function Kpi({title,value,note,icon,accent=false}:{title:string;value:number;note:string;icon:ReactNode;accent?:boolean}){return <article className={'panel finance-kpi'+(accent?' accent':'')}><div><span>{t(title)}</span>{icon}</div><strong className={value<0?'finance-negative':''}>{money(value)}</strong><small>{t(note)}</small></article>}
function Empty(){return <p className="finance-empty">{t("За цей період операцій немає.")}</p>}
function Trend({rows,profit=false}:{rows:ReturnType<typeof financeSeries>;profit?:boolean}){
  const svg=useRef<SVGSVGElement>(null),[width,setWidth]=useState(780)
  const hasData=rows.some(r=>r.income||r.expense)
  useEffect(()=>{if(!svg.current)return;const element=svg.current;const resize=()=>setWidth(Math.max(280,Math.min(1100,element.clientWidth)));resize();const observer=new ResizeObserver(resize);observer.observe(element);return()=>observer.disconnect()},[hasData])
  if(!rows.some(r=>r.income||r.expense))return <Empty/>
  const values=rows.flatMap(r=>profit?[r.profit]:[r.income,r.expense]),max=Math.max(0,...values)||1,min=Math.min(0,...values),height=180,top=16,left=54,bottom=236
  const y=(v:number)=>top+(max-v)/(max-min)*height,step=(width-left-12)/rows.length,bar=Math.min(22,step*.32),zero=y(0)
  const points=rows.map((r,i)=>`${left+step*(i+.5)},${y(r.profit)}`).join(' ')
  return <svg ref={svg} className="finance-trend" viewBox={`0 0 ${width} ${bottom}`} role="img" aria-label={profit?t("Графік прибутку за оплатами. Точні суми в таблиці нижче."):t("Графік надходжень і витрат. Точні суми в таблиці нижче.")}>
    {[max,(max+min)/2,min].map((v,i)=><g key={i}><line x1={left} x2={width-12} y1={y(v)} y2={y(v)} className="finance-grid-line"/><text x={left-10} y={y(v)+4} textAnchor="end">{new Intl.NumberFormat(localeTag(),{notation:'compact',maximumFractionDigits:1}).format(v)}</text></g>)}
    <line x1={left} x2={width-12} y1={zero} y2={zero} className="finance-zero"/>
    {profit&&<polyline points={points} fill="none" stroke="#a9d755" strokeWidth="3"/>}
    {rows.map((r,i)=>{const x=left+step*(i+.5);return <g key={r.date}><title>{label(r.date)}{t(": надходження ")}{money(r.income)}{t(", витрати ")}{money(r.expense)}{t(", прибуток ")}{money(r.profit)}</title>{profit?<circle cx={x} cy={y(r.profit)} r={rows.length>60?2:4} fill={r.profit<0?'#f09a83':'#a9d755'}/>:<><rect x={x-bar-1} y={y(r.income)} width={bar} height={Math.max(0,zero-y(r.income))} rx="2" fill="#a9d755"/><rect x={x+1} y={y(r.expense)} width={bar} height={Math.max(0,zero-y(r.expense))} rx="2" fill="#8b9ac7"/></>}{(i===0||i===rows.length-1||(i%Math.max(1,Math.ceil(rows.length/(width<500?3:7)))===0&&i<rows.length-2))&&<text x={x} y={bottom-12} textAnchor={i===rows.length-1?'end':i===0?'start':'middle'}>{label(r.date)}</text>}</g>})}
  </svg>
}
