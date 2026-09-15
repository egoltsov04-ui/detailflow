import { AlertTriangle, CheckCircle2, ChevronRight, ClipboardList, Package, ReceiptText, UsersRound } from 'lucide-react'

type Task={id:string|number;title:string;status:string;dueDate:string}
type Lead={id:string|number;title:string;status:string;priority:string;dueAt:string}
type Inventory={id:string|number;name:string;quantity:number;minQuantity:number;unit:string}
type Invoice={id:string|number;number:string;clientName:string;total:number;status:string;dueAt:string}
type Page='Завдання'|'Звернення'|'Склад'|'Рахунки'
const money=(value:number)=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:2}).format(value)+' ₴'

export default function AttentionCenter({tasks,leads,inventory,invoices,open}:{tasks:Task[];leads:Lead[];inventory:Inventory[];invoices:Invoice[];open:(page:Page)=>void}){
  const now=Date.now(),today=new Date().toISOString().slice(0,10)
  const overdueTasks=tasks.filter(item=>item.status!=='done'&&Boolean(item.dueDate)&&item.dueDate<today)
  const urgentLeads=leads.filter(item=>item.status!=='won'&&item.status!=='lost'&&((item.priority==='urgent')||Boolean(item.dueAt)&&new Date(item.dueAt).getTime()<now))
  const lowStock=inventory.filter(item=>item.quantity<=item.minQuantity)
  const dueInvoices=invoices.filter(item=>['sent','overdue'].includes(item.status)&&(item.status==='overdue'||Boolean(item.dueAt)&&new Date(item.dueAt).getTime()<now))
  const allSections:{title:string;hint:string;icon:typeof AlertTriangle;rows:{title:string;detail:string}[];page:Page;tone:string}[]=[
    {title:'Прострочені завдання',hint:'Потрібен наступний крок',icon:ClipboardList,rows:overdueTasks.map(item=>({title:item.title,detail:`Дедлайн: ${new Date(`${item.dueDate}T12:00:00`).toLocaleDateString('uk-UA')}`})),page:'Завдання',tone:'danger'},
    {title:'Звернення потребують уваги',hint:'Термінові або прострочені',icon:UsersRound,rows:urgentLeads.map(item=>({title:item.title,detail:item.dueAt?`Контакт до: ${new Date(item.dueAt).toLocaleString('uk-UA',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}`:'Термінове звернення'})),page:'Звернення',tone:'warning'},
    {title:'Потрібно поповнити',hint:'Залишок на рівні мінімального',icon:Package,rows:lowStock.map(item=>({title:item.name,detail:`${item.quantity} ${item.unit} · мінімум ${item.minQuantity} ${item.unit}`})),page:'Склад',tone:'warning'},
    {title:'Прострочені рахунки',hint:'Потрібно перевірити оплату',icon:ReceiptText,rows:dueInvoices.map(item=>({title:`${item.number} · ${item.clientName||'Клієнта не вказано'}`,detail:money(item.total)})),page:'Рахунки',tone:'danger'}
  ]
  const sections=allSections.filter(section=>section.rows.length)
  return <section className="content attention-center"><div className="page-title"><div><p>Операційний контроль</p><h1>Потребують уваги</h1></div><span className="attention-count">{sections.reduce((sum,section)=>sum+section.rows.length,0)}</span></div>{sections.length?<div className="attention-grid">{sections.map(section=>{const Icon=section.icon;return <article className={'panel attention-card '+section.tone} key={section.title}><header><span><Icon size={19}/></span><div><h2>{section.title}</h2><small>{section.hint}</small></div></header><div>{section.rows.slice(0,3).map(row=><button key={row.title} onClick={()=>open(section.page)}><span><b>{row.title}</b><small>{row.detail}</small></span><ChevronRight size={17}/></button>)}</div>{section.rows.length>3&&<button className="text-btn" onClick={()=>open(section.page)}>Ще {section.rows.length-3} →</button>}</article>})}</div>:<div className="panel attention-empty"><CheckCircle2 size={21}/><div><b>Усе під контролем</b><p>Немає прострочених завдань, термінових звернень, проблемних залишків або прострочених рахунків.</p></div></div>}</section>
}
