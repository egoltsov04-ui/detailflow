import { DateInput } from './components/FormInputs'
import { useState } from 'react'
import type { Booking } from './data'

type Expense = {date:string;category:string;amount:number}
type CashTransaction = {date:string;direction:'income'|'expense';amount:number;category:string;method:string}
const money=(value:number)=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:2}).format(value)+' ₴'
const dateKey=(date:Date)=>new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,10)
export default function Analytics({bookings,expenses,cashTransactions}:{bookings:Booking[];expenses:Expense[];cashTransactions:CashTransaction[]}) {
  const today=dateKey(new Date())
  const [from,setFrom]=useState(today.slice(0,7)+'-01'),[to,setTo]=useState(today)
  const [tech,setTech]=useState(''),[service,setService]=useState(''),[status,setStatus]=useState(''),[payment,setPayment]=useState(''),[category,setCategory]=useState('')
  const invalid=Boolean(from && to && from>to)
  const within=(date:string)=>!invalid && (!from||date>=from)&&(!to||date<=to)
  const rows=bookings.filter(b=>within(b.date)&&(!tech||b.tech===tech)&&(!service||b.service===service)&&(!status||b.status===status)&&(!payment||b.paymentMethod===payment))
  const completed=rows.filter(b=>b.status==='Завершено'), planned=rows.filter(b=>['Підтверджено','В роботі'].includes(b.status))
  const net=(b:Booking)=>b.price-b.discount
  const revenue=completed.reduce((sum,b)=>sum+net(b),0), forecast=planned.reduce((sum,b)=>sum+net(b),0)
  const costs=expenses.filter(e=>within(e.date)&&(!category||category===e.category))
  const cost=costs.reduce((sum,e)=>sum+e.amount,0), partial=Boolean(tech||service||status||payment||category)
  const cashRows=cashTransactions.filter(item=>within(item.date)&&(!payment||item.method===payment)&&(!category||item.category===category))
  const cashIncome=cashRows.filter(item=>item.direction==='income').reduce((sum,item)=>sum+item.amount,0)
  const cashExpense=cashRows.filter(item=>item.direction==='expense').reduce((sum,item)=>sum+item.amount,0)
  const group=(key:'service'|'tech')=>[...new Set(rows.map(b=>b[key]))].map(name=>{
    const all=rows.filter(b=>b[key]===name),done=all.filter(b=>b.status==='Завершено')
    return {name,count:all.length,done:done.length,hours:done.reduce((sum,b)=>sum+b.durationMinutes,0)/60,total:done.reduce((sum,b)=>sum+net(b),0)}
  }).sort((a,b)=>b.total-a.total)
  const days=[...new Set([...rows.map(b=>b.date),...costs.map(e=>e.date),...cashRows.map(item=>item.date)])].sort()
  function preset(value:'today'|'week'|'month'|'all') {
    const date=new Date()
    if(value==='all'){setFrom('');setTo('');return}
    if(value==='week')date.setDate(date.getDate()-6)
    if(value==='month')date.setDate(1)
    setFrom(dateKey(date));setTo(today)
  }
  const options=(values:string[])=>[...new Set(values)].sort().map(value=><option key={value}>{value}</option>)
  return <section className="content analytics-page"><div className="page-title"><div><p>Показники за вибраний період</p><h1>Аналітика студії</h1></div><div className="filter-actions">{(['today','week','month','all'] as const).map((value,i)=><button className="text-btn" key={value} onClick={()=>preset(value)}>{['Сьогодні','7 днів','Цей місяць','Увесь час'][i]}</button>)}</div>
    </div><div className="panel analytics-filters">
      <label>Від<DateInput type="date" max={to||undefined} value={from} onChange={e=>setFrom(e.target.value)}/></label><label>До<DateInput type="date" min={from||undefined} value={to} onChange={e=>setTo(e.target.value)}/></label>
      <label>Майстер<select value={tech} onChange={e=>setTech(e.target.value)}><option value="">Усі</option>{options(bookings.map(b=>b.tech))}</select></label>
      <label>Послуга<select value={service} onChange={e=>setService(e.target.value)}><option value="">Усі</option>{options(bookings.map(b=>b.service))}</select></label>
      <label>Статус запису<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Усі</option>{options(bookings.map(b=>b.status))}</select></label>
      <label>Метод оплати запису<select value={payment} onChange={e=>setPayment(e.target.value)}><option value="">Усі</option>{options(bookings.map(b=>b.paymentMethod))}</select></label>
      <label>Категорія витрат<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Усі</option>{options(expenses.map(e=>e.category))}</select></label>
      <button className="text-btn" onClick={()=>{preset('month');setTech('');setService('');setStatus('');setPayment('');setCategory('')}}>Скинути фільтри</button>
    </div>
    {invalid && <p role="alert">Дата початку має бути не пізніше дати завершення.</p>}
    <p className="report-note">Вартість робіт рахується після знижок за датою запису. Фактичні надходження та витрати беруться з фінансового журналу. Фільтри майстра, послуги й статусу не застосовуються до руху грошей.</p>
    <div className="metrics">
      <Kpi title="Завершені роботи" value={money(revenue)} note={completed.length+' записів'}/>
      <Kpi title="Планові роботи" value={money(forecast)} note={planned.length+' підтверджених / у роботі'}/>
      <Kpi title="Витрати" value={money(cost)} note={costs.length+' операцій'}/>
      <Kpi title="Роботи мінус витрати" value={partial?'—':money(revenue-cost)} note={partial?'Доступно без окремих фільтрів записів і витрат':'За весь обраний період'}/>
      <Kpi title="Фактично надійшло" value={money(cashIncome)} note={cashRows.filter(item=>item.direction==='income').length+' фінансових операцій'}/>
      <Kpi title="Грошовий потік" value={money(cashIncome-cashExpense)} note={`Витрати журналу: ${money(cashExpense)}`}/>
      <Kpi title="Середня завершена робота" value={money(completed.length?revenue/completed.length:0)} note="Після знижок"/>
      <Kpi title="Скасовано / неявки" value={rows.filter(b=>b.status==='Скасовано').length+' / '+rows.filter(b=>b.status==='Не прийшов').length} note={rows.length+' записів у вибірці'}/>
    </div>
    {(['service','tech'] as const).map(key=><div className="panel report-section" key={key}><h2>{key==='service'?'Послуги':'Майстри'}</h2><div className="report-scroll"><table><thead><tr><th>Назва</th><th>Записів</th><th>Завершено</th><th>Годин завершених робіт</th><th>Вартість завершених робіт</th></tr></thead><tbody>{group(key).map(row=><tr key={row.name}><td>{row.name}</td><td>{row.count}</td><td>{row.done}</td><td>{row.hours.toFixed(1)}</td><td>{money(row.total)}</td></tr>)}</tbody></table></div>{!rows.length&&<p>За цими фільтрами записів немає.</p>}</div>)}
    <div className="panel report-section"><h2>Витрати за категоріями</h2>{[...new Set(costs.map(e=>e.category))].map(name=><div className="report-pair" key={name}><span>{name}</span><b>{money(costs.filter(e=>e.category===name).reduce((sum,e)=>sum+e.amount,0))}</b></div>)}{!costs.length&&<p>Витрат за цими фільтрами немає.</p>}</div>
    <div className="panel report-section"><h2>Динаміка за днями</h2><div className="report-scroll"><table><thead><tr><th>Дата</th><th>Записів</th><th>Завершені роботи</th><th>Планові роботи</th><th>Фактично надійшло</th><th>Витрати журналу</th></tr></thead><tbody>{days.map(day=><tr key={day}><td>{day}</td><td>{rows.filter(b=>b.date===day).length}</td><td>{money(completed.filter(b=>b.date===day).reduce((sum,b)=>sum+net(b),0))}</td><td>{money(planned.filter(b=>b.date===day).reduce((sum,b)=>sum+net(b),0))}</td><td>{money(cashRows.filter(item=>item.date===day&&item.direction==='income').reduce((sum,item)=>sum+item.amount,0))}</td><td>{money(cashRows.filter(item=>item.date===day&&item.direction==='expense').reduce((sum,item)=>sum+item.amount,0))}</td></tr>)}</tbody></table></div>{!days.length&&<p>Немає даних за вибраний період.</p>}</div>
  </section>
}
function Kpi({title,value,note}:{title:string;value:string;note:string}){return <div className="metric"><span>{title}</span><b>{value}</b><small>{note}</small></div>}
