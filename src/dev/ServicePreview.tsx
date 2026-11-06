import {OwnerBottomNavigation,mainNavigation} from '../components/AppNavigation'
import {sectionTabs,canonicalPage} from '../lib/navigation'
import StudioOverview from '../StudioOverview'
import '../navigation.css'
import AnalyticsPreview from './AnalyticsPreview'
import BillingPage from '../BillingPage'
import PlanningPreview from './PlanningPreview'
import PlatformPreview from './PlatformPreview'
import LanguageSwitcher from '../i18n/LanguageSwitcher'
import ServiceVariantsPreview from './ServiceVariantsPreview'
import FinancePreview from './FinancePreview'
import PublicBookingPreview from './PublicBookingPreview'
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
import NotificationSettings from '../NotificationSettings'
import StudioAdministrators from '../StudioAdministrators'
import BookingRequests from '../BookingRequests'
import { localDate } from '../lib/formValues'
import { transitionError } from '../lib/workOrderFlow'
import { Dashboard, Calendar, Clients, Team, Inventory, Expenses, BookingModal, SettingsPage } from '../App'
import { seedBookings } from '../data'

const staff=[{id:1,name:'Руслан Коваленко',color:'#a7d65c',speciality:'Мийка та полірування'},{id:2,name:'Максим Бондар',color:'#76a7ff',speciality:'Захисні покриття'},{id:3,name:'Андрій Мельник',color:'#df9b55',speciality:'Хімчистка салону'}]
const clients=[{id:1,name:'Олександр Марченко',car:'Porsche 911 Carrera · Shark Blue',phone:'+380 67 432 18 26'}]
const previewClientNames=['Ірина Савчук','Дмитро Коваль','Наталія Шевченко','Артем Лисенко','Вікторія Бондар','Олег Романюк','Марія Ткаченко']
const previewCars=['BMW X5','Audi Q5','Tesla Model 3','Volvo XC60','Mercedes-Benz GLE','Lexus RX','Porsche Macan']
const previewBookings=Array.from({length:7},(_,i)=>({...seedBookings[i%seedBookings.length],id:i+1,date:localDate(),time:`${String(9+i).padStart(2,'0')}:00`,client:previewClientNames[i],car:previewCars[i],tech:staff[i%staff.length].name,phone:'+380 67 432 18 26'}))
const initial:WorkOrder={id:1,clientId:1,clientName:clients[0].name,staffId:1,staffName:staff[0].name,title:'Комплексне полірування та захисне покриття автомобіля',vehicle:clients[0].car,serviceSummary:'Мийка',status:'assigned',total:2000,deposit:0,dueAt:'',notes:'Перевірити стан покриття перед роботою',createdAt:new Date().toISOString(),statusChangedAt:new Date().toISOString(),checklist:[{id:'wash',title:'Мийка',done:false}],compensationPercent:30,compensationFixed:null,submittedForReviewAt:'',reviewNote:''}
const demoNow=Date.now(),demoToday=localDate(),demoIso=(minutesAgo:number)=>new Date(demoNow-minutesAgo*60000).toISOString()
const overviewOrders:WorkOrder[]=[
 {...initial,id:'overview-new',clientName:'Катерина Дорошенко',staffId:null,staffName:'',title:'Керамічний захист кузова',vehicle:'BMW X7',serviceSummary:'Керамічний захист',status:'new',total:9800,deposit:0,dueAt:demoIso(40),createdAt:demoIso(180),statusChangedAt:demoIso(180),postId:null,startedAt:null,plannedMinutes:180},
 {...initial,id:'overview-review',clientName:'Тарас Бойко',staffId:2,staffName:staff[1].name,title:'Полірування кузова',vehicle:'Audi Q7',serviceSummary:'Полірування · перевірка якості',status:'review',total:6400,deposit:2000,dueAt:new Date(demoNow+90*60000).toISOString(),createdAt:demoIso(240),statusChangedAt:demoIso(30),postId:null,startedAt:null,plannedMinutes:150},
 {...initial,id:'overview-active',clientName:'Олександр Марченко',staffId:1,staffName:staff[0].name,title:'Двохетапне полірування',vehicle:'Porsche 911 Carrera · Shark Blue',serviceSummary:'Полірування кузова',status:'in_progress',total:7800,deposit:3000,dueAt:new Date(demoNow+70*60000).toISOString(),createdAt:demoIso(120),statusChangedAt:demoIso(55),postId:'post-1',startedAt:demoIso(38),plannedMinutes:110},
]
const overviewBookings=previewBookings.map((booking,i)=>({...booking,status:i===6?'Очікує підтвердження' as const:'Підтверджено' as const,source:i===6?'public' as const:'admin' as const}))
const overviewCash=[
 {id:'overview-income-today-1',date:demoToday,direction:'income' as const,amount:4600,category:'Оплата замовлення',title:'Полірування кузова',method:'Картка'},
 {id:'overview-income-today-2',date:demoToday,direction:'income' as const,amount:1850,category:'Оплата замовлення',title:'Комплексна мийка',method:'Готівка'},
 {id:'overview-income-week-1',date:localDate(new Date(demoNow-2*86400000)),direction:'income' as const,amount:7200,category:'Оплата замовлення',title:'Керамічний захист',method:'Переказ'},
]
const overviewPosts=[1,2,3].map(position=>({id:`post-${position}`,studio_id:'qa-demo',name:`Пост ${position}`,position}))
const inventoryItems=[
 {id:1,name:'Автошампунь нейтральний',unit:'л',quantity:18.5,minQuantity:5,lastUnitCost:142,sellingPrice:240},
 {id:2,name:'Знежирювач кузова',unit:'л',quantity:6.2,minQuantity:4,lastUnitCost:218,sellingPrice:0},
 {id:3,name:'Керамічне покриття 9H',unit:'шт',quantity:7,minQuantity:3,lastUnitCost:1850,sellingPrice:2900},
 {id:4,name:'Мікрофібра 40×40',unit:'шт',quantity:32,minQuantity:12,lastUnitCost:68,sellingPrice:120},
 {id:5,name:'Полірувальна паста medium',unit:'л',quantity:1.6,minQuantity:2,lastUnitCost:930,sellingPrice:0},
]
const inventoryMovements=[
 {id:'mv-1',itemId:'1',itemName:'Автошампунь нейтральний',unit:'л',type:'purchase' as const,quantity:12,unitCost:142,note:'Постачання · партія DF-104',createdAt:new Date(demoNow-45*60000).toISOString()},
 {id:'mv-2',itemId:'3',itemName:'Керамічне покриття 9H',unit:'шт',type:'write_off' as const,quantity:-1,unitCost:1850,note:'Замовлення · полірування кузова',createdAt:new Date(demoNow-130*60000).toISOString()},
 {id:'mv-3',itemId:'2',itemName:'Знежирювач кузова',unit:'л',type:'purchase' as const,quantity:4,unitCost:218,note:'Закупівля матеріалів',createdAt:new Date(demoNow-270*60000).toISOString()},
 {id:'mv-4',itemId:'4',itemName:'Мікрофібра 40×40',unit:'шт',type:'write_off' as const,quantity:-3,unitCost:68,note:'Щоденна робота студії',createdAt:new Date(demoNow-390*60000).toISOString()},
 {id:'mv-5',itemId:'5',itemName:'Полірувальна паста medium',unit:'л',type:'adjustment' as const,quantity:0.3,unitCost:930,note:'Інвентаризація',createdAt:new Date(demoNow-510*60000).toISOString()},
]
const kanbanOrders=['new','assigned','in_progress','waiting','review','ready','issued'].map((status,i)=>({...initial,id:`work-${i+1}`,clientName:previewClientNames[i],staffId:i===0?null:(i%staff.length)+1,staffName:i===0?'':staff[i%staff.length].name,title:['Преміум мийка','Полірування кузова','Керамічний захист','Догляд за салоном','Детейлінг інтерʼєру','Захисне покриття','Фінальна перевірка'][i],vehicle:previewCars[i],serviceSummary:['Мийка','Полірування','Кераміка','Хімчистка','Інтерʼєр','Захисне покриття','Контроль якості'][i],status:status as WorkOrder['status'],deposit:i%2?500:0,total:1500+i*750}))
const ok=async()=>'', yes=async()=>true
export default function ServicePreview(){
 const [workView,setWorkView]=useState<'calendar'|'kanban'>('kanban'),[more,setMore]=useState(false),[previewFilters,setPreviewFilters]=useState<Record<string,string>>({})
 const [page,setPage]=useState('Поля'),[date,setDate]=useState(localDate()),[time,setTime]=useState('09:00'),[due,setDue]=useState(''),[number,setNumber]=useState('1250.5'),[percent,setPercent]=useState('30'),[saved,setSaved]=useState(''),[orders,setOrders]=useState<WorkOrder[]>([initial]),[shift,setShift]=useState(true),[width,setWidth]=useState('100%')
 async function update(id:WorkOrder['id'],patch:Partial<WorkOrder>){setOrders(rows=>rows.map(row=>row.id===id?{...row,...patch}:row));return ''}
 const screens:Record<string,React.ReactNode>={
  'Планування':<PlanningPreview/>,
  'CRM і чеки':<PlatformPreview/>,
  'Огляд':<Dashboard bookings={previewBookings} staff={staff.map(s=>({...s,role:'Майстер',load:50}))} revenue={12800} name="Detail Lab" onCreate={()=>setPage('Запис')} onStatus={()=>{}} calendar={()=>setPage('Календар')} open={setPage}/>,
  'Новий огляд':<StudioOverview orders={overviewOrders} bookings={overviewBookings} cash={overviewCash} posts={overviewPosts} postError="" timezone="Europe/Kyiv" financeAccess navigate={setPage} openOrder={()=>setPage('Замовлення')}/>,
  'Календар':<Calendar bookings={previewBookings.map(b=>({...b,date:date||localDate()}))} onCreate={()=>setPage('Запис')} onStatus={()=>{}}/>,
  'Клієнти':<Clients items={clients.map(c=>({...c,visits:0,total:0}))} bookings={[]} add={()=>{}} remove={()=>{}} edit={ok}/>,
  'Команда':<Team items={staff.map(s=>({...s,role:'Майстер',load:50}))} selected={staff[0].name} select={()=>{}} bookings={[]} earnings={[]} shifts={[]} onStatus={()=>{}} add={ok} remove={()=>{}}/>,
  'Залишки':<Inventory items={inventoryItems} movements={inventoryMovements} add={()=>{}} writeOff={yes} updateMinimum={()=>{}}/>,
  'Витрати':<Expenses items={[]} add={()=>{}} remove={()=>{}}/>,
  'Запис':<BookingModal initialDate={date} bookings={[]} clients={clients.map(c=>({...c,visits:0,total:0}))} staff={staff.map(s=>({...s,role:'Майстер',load:0}))} services={[[initial.title,'Полірування','4 год',2000]]} close={()=>setPage('Календар')} save={async()=>{setPage('Календар');return ''}}/>,
  'Тариф':<BillingPage tenantId={null} role="admin"/>,
  'Налаштування':<SettingsPage/>,
  'Поля':<section className="content"><h1>Дата, час і числа</h1><form className="panel settings" onSubmit={e=>{e.preventDefault();setSaved(`${date} / ${time} / ${due} / ${number} / ${percent}`)}}><label>Дата<DateInput required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Час<DateInput required type="time" value={time} onChange={e=>setTime(e.target.value)}/></label><label>Термін<DateInput type="datetime-local" value={due} onChange={e=>setDue(e.target.value)}/></label><label>Сума, ₴<NumberInput required type="number" min={0} step="0.01" value={number} onChange={e=>setNumber(e.target.value)}/></label><label>Відсоток, %<NumberInput type="number" min={0} max={100} value={percent} onChange={e=>setPercent(e.target.value)}/></label><button className="primary">Перевірити форму</button><output>{saved}</output></form></section>,
  'Замовлення':<><nav className="section-tabs">{sectionTabs.work.slice(0,2).map((tab,i)=><button key={tab.page} aria-current={workView===['calendar','kanban'][i]?'page':undefined} onClick={()=>setWorkView((['calendar','kanban'] as const)[i])}>{tab.label}</button>)}</nav><WorkOrders view={workView} onFilter={setPreviewFilters} dateFilter={previewFilters.date||''} scheduled={{'1':{date:localDate(),time:'10:30'}}} services={[{id:'wash',name:'Комплексна мийка',price:800,duration_minutes:60,description:'Кузов, диски та салон',variants:[{id:'m',name:'M',price:800,duration_minutes:60},{id:'xl',name:'XL',price:1200,duration_minutes:90}]},{id:'polish',name:'Полірування',price:2000,duration_minutes:120}]} items={kanbanOrders} clients={clients} staff={staff} add={async item=>{setOrders(rows=>[...rows,item]);return ''}} update={update} remove={ok} recordPayment={async(item,payment)=>update(item.id,{deposit:item.deposit+payment.amount})} approve={async item=>{const error=transitionError(item,'ready');return error||update(item.id,{status:'ready'})}}/></>,
  'Майстер':<MasterCabinet staff={staff[0]} orders={orders} shifts={shift?[{id:'1',staffId:'1',startedAt:new Date().toISOString(),endedAt:null}]:[]} earnings={orders.filter(o=>o.status==='ready').map(o=>({id:String(o.id),staffId:'1',workOrderId:String(o.id),amount:600,status:'accrued',accruedAt:new Date().toISOString()}))} toggleShift={async()=>{setShift(v=>!v);return ''}} updateOrder={update}/>,
  'Аналітика та фінанси':<FinancePreview/>,
  'Аналітика студії':<AnalyticsPreview/>,
  'Рекомендації':<RecommendationsPreview/>,
  'Фінанси':<CashFlow items={[]} clients={clients} add={ok} remove={ok}/>,
  'Варіанти послуг':<ServiceVariantsPreview/>,
  'Каталог':<Catalog services={[[initial.title,'Полірування','4 год',2000]]} products={[]} packages={[]} addService={()=>{}} updateService={ok} removeService={()=>{}} addPackage={ok} removePackage={ok}/>,
  'Склад':<section className="content"><WarehouseControls items={inventoryItems} receive={yes} adjust={yes}/></section>,
  'Проценти':<CompensationPreview/>,
  'Імпорт':<ClientImportPreview/>,
  'Онлайн-запис':<PublicBookingPreview/>,
  'Процес':<WorkflowPreview/>,
  'Графік':<TeamSchedules staff={staff} schedules={[]} save={ok} remove={ok}/>,
  'Завдання':<Tasks tasks={[]} clients={clients} staff={staff} add={ok} update={ok} remove={ok}/>,
  'Звернення':<Leads items={[]} clients={clients} staff={staff} add={ok} update={ok} remove={ok}/>,
  'Рахунки':<Invoices items={[]} clients={clients} add={ok} update={ok}/>,
  'Продажі':<Sales items={[]} clients={clients} products={[{id:1,name:'Автошампунь',unit:'л',quantity:10,price:200}]} add={ok}/>,
  'Аналітика':<Analytics bookings={[]} expenses={[]} cashTransactions={[]}/>,
  'Заявки':<BookingRequests bookings={[]} update={ok} link="http://localhost/"/>
  ,'Нагадування':<NotificationSettings tenantId="qa-demo" previewData={{settings:{email_enabled:true,reminder_24h_enabled:true,reminder_2h_enabled:true,repeat_enabled:true},services:[{id:'wash',name:'Преміум мийка',repeat_interval_months:2},{id:'polish',name:'Полірування кузова',repeat_interval_months:6}],jobs:[{id:'job1',kind:'visit_24',status:'queued',attempts:0,created_at:new Date().toISOString(),expires_at:new Date(Date.now()+86400000).toISOString()}]}}/>
  ,'Адміністратори':<StudioAdministrators tenantId="qa-demo" previewData={[{user_id:'studio-admin',name:'Олена Кравець',email:'olena.k@example.com',active:true,finance_access:true,registered:true}]}/>
 }
 return <><LanguageSwitcher/><nav aria-label="Тестові розділи" style={{display:'flex',flexWrap:'wrap',gap:8,padding:16}}>{Object.keys(screens).map(name=><button className={page===name?'primary':'text-btn'} key={name} onClick={()=>setPage(name)}>{name}</button>)}<select aria-label="Ширина макета" value={width} onChange={e=>setWidth(e.target.value)}><option value="100%">Широкий</option><option value="768px">768 px</option><option value="390px">390 px</option></select></nav><p style={{padding:'0 16px'}}>Локальний стенд · синтетичні дані · записи до бази вимкнені</p><main style={{width,maxWidth:'100%',margin:'auto',border:'1px solid #2c303c'}}>{screens[page]}</main>{more&&<aside className="panel qa-more">{mainNavigation.slice(4).map(([label,Icon])=><button className="text-btn" key={label} onClick={()=>{setPage(canonicalPage(label));setMore(false)}}><Icon size={18}/>{label}</button>)}</aside>}{!['Процес','Майстер'].includes(page)&&<OwnerBottomNavigation page={page==='Новий огляд'?'Огляд':page} financeAccess moreOpen={more} onMore={()=>setMore(v=>!v)} onNavigate={label=>{setMore(false);if(label==='Огляд')setPage('Новий огляд');else if(label==='Роботи')setPage('Замовлення');else setPage(label)}}/>}</>
}
import RecommendationsPreview from './RecommendationsPreview'
