import WorkflowPreview from './WorkflowPreview'
import ClientImportPreview from './ClientImportPreview'
import CompensationPreview from './CompensationPreview'
import { useState } from 'react'
import { DateInput, NumberInput } from '../components/FormInputs'
import WorkOrders, { WorkOrder } from '../WorkOrders'
import MasterCabinet from '../MasterCabinet'
import Reports from '../Reports'
import CashFlow from '../CashFlow'
import Catalog from '../Catalog'
import WarehouseControls from '../WarehouseControls'
import TeamSchedules from '../TeamSchedules'
import Tasks from '../Tasks'
import Leads from '../Leads'
import Invoices from '../Invoices'
import Sales from '../Sales'
import Analytics from '../Analytics'
import BookingRequests from '../BookingRequests'
import { localDate } from '../lib/formValues'
import { transitionError } from '../lib/workOrderFlow'
import { Dashboard, Calendar, Clients, Team, Inventory, Expenses, BookingModal, Billing, SettingsPage } from '../App'
import { seedBookings } from '../data'

const staff=[{id:1,name:'Тестовий майстер',color:'#a7d65c',speciality:'Мийка та полірування'}]
const clients=[{id:1,name:'Тестовий клієнт з довгим прізвищем',car:'Mercedes-Benz GLE · AA 1234 AA',phone:'+380000000000'}]
const initial:WorkOrder={id:1,clientId:1,clientName:clients[0].name,staffId:1,staffName:staff[0].name,title:'Комплексне полірування та захисне покриття автомобіля',vehicle:clients[0].car,serviceSummary:'Мийка',status:'assigned',total:2000,deposit:0,dueAt:'',notes:'Перевірити стан покриття перед роботою',createdAt:new Date().toISOString(),statusChangedAt:new Date().toISOString(),checklist:[{id:'wash',title:'Мийка',done:false}],compensationPercent:30,compensationFixed:null,submittedForReviewAt:'',reviewNote:''}
const ok=async()=>'', yes=async()=>true
export default function ServicePreview(){
 const [page,setPage]=useState('Поля'),[date,setDate]=useState(localDate()),[time,setTime]=useState('09:00'),[due,setDue]=useState(''),[number,setNumber]=useState('1250.5'),[percent,setPercent]=useState('30'),[saved,setSaved]=useState(''),[orders,setOrders]=useState<WorkOrder[]>([initial]),[shift,setShift]=useState(true),[width,setWidth]=useState('100%')
 async function update(id:WorkOrder['id'],patch:Partial<WorkOrder>){setOrders(rows=>rows.map(row=>row.id===id?{...row,...patch}:row));return ''}
 const screens:Record<string,React.ReactNode>={
  'Огляд':<Dashboard bookings={seedBookings} staff={staff.map(s=>({...s,role:'Майстер',load:50}))} revenue={2000} name="Тест" onCreate={()=>setPage('Запис')} onStatus={()=>{}} calendar={()=>setPage('Календар')} open={setPage}/>,
  'Календар':<Calendar bookings={seedBookings.map(b=>({...b,date:date||localDate()}))} onCreate={()=>setPage('Запис')} onStatus={()=>{}}/>,
  'Клієнти':<Clients items={clients.map(c=>({...c,visits:0,total:0}))} bookings={[]} add={()=>{}} remove={()=>{}} edit={ok}/>,
  'Команда':<Team items={staff.map(s=>({...s,role:'Майстер',load:50}))} selected={staff[0].name} select={()=>{}} bookings={[]} earnings={[]} shifts={[]} onStatus={()=>{}} add={ok} remove={()=>{}}/>,
  'Залишки':<Inventory items={[{id:1,name:'Автошампунь',unit:'л',quantity:10,lastUnitCost:100,minQuantity:2,sellingPrice:200}]} movements={[]} add={()=>{}} writeOff={yes} updateMinimum={()=>{}}/>,
  'Витрати':<Expenses items={[]} add={()=>{}} remove={()=>{}}/>,
  'Запис':<BookingModal initialDate={date} bookings={[]} clients={clients.map(c=>({...c,visits:0,total:0}))} staff={staff.map(s=>({...s,role:'Майстер',load:0}))} services={[[initial.title,'Полірування','4 год',2000]]} close={()=>setPage('Календар')} save={async()=>{setPage('Календар');return ''}}/>,
  'Тариф':<Billing plan="Start" select={()=>{}}/>,
  'Налаштування':<SettingsPage/>,
  'Поля':<section className="content"><h1>Дата, час і числа</h1><form className="panel settings" onSubmit={e=>{e.preventDefault();setSaved(`${date} / ${time} / ${due} / ${number} / ${percent}`)}}><label>Дата<DateInput required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Час<DateInput required type="time" value={time} onChange={e=>setTime(e.target.value)}/></label><label>Термін<DateInput type="datetime-local" value={due} onChange={e=>setDue(e.target.value)}/></label><label>Сума, ₴<NumberInput required type="number" min={0} step="0.01" value={number} onChange={e=>setNumber(e.target.value)}/></label><label>Відсоток, %<NumberInput type="number" min={0} max={100} value={percent} onChange={e=>setPercent(e.target.value)}/></label><button className="primary">Перевірити форму</button><output>{saved}</output></form></section>,
  'Замовлення':<WorkOrders items={orders} clients={clients} staff={staff} add={async item=>{setOrders(rows=>[...rows,item]);return ''}} update={update} remove={ok} recordPayment={async(item,payment)=>update(item.id,{deposit:item.deposit+payment.amount})} approve={async item=>{const error=transitionError(item,'ready');return error||update(item.id,{status:'ready'})}}/>,
  'Майстер':<MasterCabinet staff={staff[0]} orders={orders} shifts={shift?[{id:'1',staffId:'1',startedAt:new Date().toISOString(),endedAt:null}]:[]} earnings={orders.filter(o=>o.status==='ready').map(o=>({id:String(o.id),staffId:'1',workOrderId:String(o.id),amount:600,status:'accrued',accruedAt:new Date().toISOString()}))} toggleShift={async()=>{setShift(v=>!v);return ''}} updateOrder={update}/>,
  'Звіти':<Reports bookings={[]} expenses={[{date:localDate(),category:'Матеріали',amount:200}]} sales={[]} invoices={[]}/>,
  'Фінанси':<CashFlow items={[]} clients={clients} add={ok} remove={ok}/>,
  'Каталог':<Catalog services={[[initial.title,'Полірування','4 год',2000]]} products={[]} packages={[]} addService={()=>{}} updateService={ok} removeService={()=>{}} addPackage={ok} removePackage={ok}/>,
  'Склад':<section className="content"><WarehouseControls items={[{id:1,name:'Автошампунь',unit:'л',quantity:10,lastUnitCost:100}]} receive={yes} adjust={yes}/></section>,
  'Проценти':<CompensationPreview/>,
  'Імпорт':<ClientImportPreview/>,
  'Процес':<WorkflowPreview/>,
  'Графік':<TeamSchedules staff={staff} schedules={[]} save={ok} remove={ok}/>,
  'Завдання':<Tasks tasks={[]} clients={clients} staff={staff} add={ok} update={ok} remove={ok}/>,
  'Звернення':<Leads items={[]} clients={clients} staff={staff} add={ok} update={ok} remove={ok}/>,
  'Рахунки':<Invoices items={[]} clients={clients} add={ok} update={ok}/>,
  'Продажі':<Sales items={[]} clients={clients} products={[{id:1,name:'Автошампунь',unit:'л',quantity:10,price:200}]} add={ok}/>,
  'Аналітика':<Analytics bookings={[]} expenses={[]} cashTransactions={[]}/>,
  'Заявки':<BookingRequests bookings={[]} update={ok} link="http://localhost/"/>
 }
 return <><nav aria-label="Тестові розділи" style={{display:'flex',flexWrap:'wrap',gap:8,padding:16}}>{Object.keys(screens).map(name=><button className={page===name?'primary':'text-btn'} key={name} onClick={()=>setPage(name)}>{name}</button>)}<select aria-label="Ширина макета" value={width} onChange={e=>setWidth(e.target.value)}><option value="100%">Широкий</option><option value="768px">768 px</option><option value="390px">390 px</option></select></nav><p style={{padding:'0 16px'}}>Локальний стенд · синтетичні дані · записи до бази вимкнені</p><main style={{width,maxWidth:'100%',margin:'auto',border:'1px solid #2c303c'}}>{screens[page]}</main></>
}
