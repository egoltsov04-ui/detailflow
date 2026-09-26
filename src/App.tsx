import { studioMonth, jobLabels } from './workflow/model'
import { useWorkflow } from './workflow/useWorkflow'
import { MasterWorkspace, OwnerToday, OrderWorkDialog, Payroll } from './workflow/WorkflowUI'
import ClientImport from './ClientImport'
import { Select } from './components/Select'
import { showNotice } from './components/Dialogs'
import { readAllPages } from './lib/pagination'
import { localDate, studioDateTime } from './lib/formValues'
import { DateInput, NumberInput } from './components/FormInputs'
import { FormEvent, useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { CalendarDays, CarFront, ChevronDown, CircleDollarSign, Clock3, LayoutDashboard, Menu, Plus, Search, Settings, Sparkles, Users, X, Globe2, CreditCard, BarChart3, WalletCards, Package, ListTodo, ClipboardList, MessageSquare, ShoppingCart, ReceiptText, Files } from 'lucide-react'
import { Booking, seedBookings, services, technicians, Status, PaymentMethod } from './data'
import { supabase, supabaseSetupMessage } from './lib/supabase'
import AccessPortal, { OwnerPending, SupportPortal } from './AccessPortal'
import { AccessNotice, InvitationPassword } from './AccountAccess'
import './account-access.css'
import MasterProfileForm from './MasterProfileForm'
import type { User } from '@supabase/supabase-js'

const Analytics = lazy(()=>import('./Analytics'))
const BookingRequests = lazy(()=>import('./BookingRequests'))
const PublicBookingPage = lazy(()=>import('./PublicBookingPage'))
const Tasks = lazy(()=>import('./Tasks'))
const WorkOrders = lazy(()=>import('./WorkOrders'))
const Leads = lazy(()=>import('./Leads'))
const Catalog = lazy(()=>import('./Catalog'))
const Sales = lazy(()=>import('./Sales'))
const Invoices = lazy(()=>import('./Invoices'))
const WarehouseControls = lazy(()=>import('./WarehouseControls'))
const Reports = lazy(()=>import('./Reports'))
const TeamSchedules = lazy(()=>import('./TeamSchedules'))
const AttentionCenter = lazy(()=>import('./AttentionCenter'))
const CashFlow = lazy(()=>import('./CashFlow'))
const MasterCabinet = lazy(()=>import('./MasterCabinet'))
const TeamCompensation = lazy(()=>import('./TeamCompensation'))
const TeamAccess = lazy(()=>import('./TeamAccess'))
const nav = [['Огляд', LayoutDashboard], ['Календар', CalendarDays], ['Замовлення', ClipboardList], ['Клієнти', Users], ['Команда', CarFront], ['Кабінет майстра', Users], ['Послуги', Sparkles], ['Фінанси', CircleDollarSign], ['Склад', Package], ['Звіти', Files], ['Онлайн-запис', Globe2]] as const
function resolveOrderVehicle(item:any):string {
  if(item.vehicle_label&&item.vehicle_label!=='Авто не вказано')return item.vehicle_label
  const cars=item.clients?.vehicles||[]
  const car=item.appointments?.vehicles||(cars.length===1?cars[0]:null)
  return car?[car.make,car.model,car.plate_number,car.notes].filter(Boolean).join(' · '):''
}
const money = (n: number) => new Intl.NumberFormat('uk-UA').format(n) + ' ₴'
const formatDuration = (minutes:number) => minutes % 1440 === 0 ? `${minutes / 1440} дні` : minutes % 60 === 0 ? `${minutes / 60} год` : `${minutes} хв`
const parseDuration = (value:string) => value.includes('дні') ? Number.parseInt(value, 10) * 1440 : value.includes('год') ? Number.parseInt(value, 10) * 60 : Number.parseInt(value, 10) || 60
const paymentValue = (value:string) => ({'Картка':'card','Готівка':'cash','Переказ':'transfer'}[value] ?? 'card')
const paymentLabel = (value:string | null): PaymentMethod => ({card:'Картка',cash:'Готівка',transfer:'Переказ'}[value ?? ''] ?? 'Картка') as PaymentMethod
const statusValue = (value:Status) => ({'Очікує підтвердження':'pending','Підтверджено':'confirmed','В роботі':'in_progress','Завершено':'completed','Скасовано':'cancelled','Не прийшов':'no_show'}[value])
const statusLabel = (value:string) => ({pending:'Очікує підтвердження',confirmed:'Підтверджено',in_progress:'В роботі',completed:'Завершено',cancelled:'Скасовано',no_show:'Не прийшов'}[value] ?? 'Підтверджено') as Status
type Client = { id:number | string; name:string; phone:string; car:string; visits:number; total:number; tags?:string[]; notes?:string; source?:string }
type Expense = { id:number | string; date:string; category:string; title:string; amount:number; method:string; note:string; stockQuantity?:number; stockUnit?:string }
type InventoryItem = { id:number|string; name:string; unit:string; quantity:number; minQuantity:number; lastUnitCost:number|null; sellingPrice:number|null }
type InventoryMovement = { id:string; itemId:string; itemName:string; unit:string; type:'purchase'|'write_off'|'adjustment'; quantity:number; unitCost:number|null; note:string; createdAt:string }
type ServiceRow = { id:string; name:string; category:string; price:number; duration_minutes:number }
type Staff = { id:number | string; name:string; role:string; color:string; load:number; speciality:string; userId?:string|null; compensationPercent?:number|null; hourlyRate?:number; profileCompletedAt?:string|null }
type WorkSchedule = { id:string|number; staffId:string|number; weekday:number; startsAt:string; endsAt:string }
type Task = import('./Tasks').Task
type TaskStatus = import('./Tasks').TaskStatus
type TaskPriority = import('./Tasks').TaskPriority
type WorkOrder = import('./WorkOrders').WorkOrder
type WorkOrderStatus = import('./WorkOrders').WorkOrderStatus
type WorkOrderPayment = import('./WorkOrders').WorkOrderPayment
type ChecklistItem = import('./WorkOrders').ChecklistItem
type Lead = import('./Leads').Lead
type LeadStatus = import('./Leads').LeadStatus
type ServicePackage = import('./Catalog').ServicePackage
type Sale = import('./Sales').Sale
type Invoice = import('./Invoices').Invoice
type InvoiceStatus = import('./Invoices').InvoiceStatus
type CashTransaction = import('./CashFlow').CashTransaction
const seedExpenses: Expense[] = [
  {id:1,date:'2026-09-13',category:'Матеріали',title:'Кераміка та автохімія',amount:4680,method:'Картка',note:'Запас на тиждень'},
  {id:2,date:'2026-09-12',category:'Оренда',title:'Оренда студії',amount:24000,method:'Переказ',note:'Вересень'},
  {id:3,date:'2026-09-11',category:'Маркетинг',title:'Реклама в Instagram',amount:3500,method:'Картка',note:'Кампанія Київ'}
]

export default function App() {
  const publicSlug = new URLSearchParams(window.location.search).get('book')
  if (publicSlug) return <Suspense fallback={<main className="public-page"><div className="public-card">Завантаження запису…</div></main>}><PublicBookingPage slug={publicSlug}/></Suspense>
  const [page, setPage] = useState('Огляд'), [bookings, setBookings] = useState<Booking[]>(supabase?[]:seedBookings)
  const [serviceList, setServiceList] = useState<typeof services>(supabase?[]:services)
  const [staffList, setStaffList] = useState<Staff[]>(() => supabase?[]:technicians.map((item,index) => ({...item,id:index + 1})))
  const [clients, setClients] = useState<Client[]>(() => supabase?[]:seedBookings.map(item => ({ id:item.id, name:item.client, phone:item.phone, car:item.car, visits:1, total:item.price })))
  const [selectedTech, setSelectedTech] = useState(technicians[0].name)
  const [plan, setPlan] = useState('Start')
  const [studioMenu,setStudioMenu]=useState(false), [profileMenu,setProfileMenu]=useState(false)
  const [studioProfile,setStudioProfile]=useState({name:'Студія',address:'',slug:''})

  const [expenses, setExpenses] = useState<Expense[]>(supabase?[]:seedExpenses)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([])
  const [cashTransactions,setCashTransactions]=useState<CashTransaction[]>([])
  const [legacyAccruals,setLegacyAccruals]=useState<{id:string;date:string;title:string;amount:number}[]>([])
  const [staffShifts,setStaffShifts]=useState<{id:string;staffId:string;startedAt:string;endedAt:string|null}[]>([])
  const [staffEarnings,setStaffEarnings]=useState<{id:string;staffId:string;workOrderId:string;amount:number;status:string;accruedAt:string}[]>([])
  const [connection, setConnection] = useState<'local' | 'checking' | 'connected' | 'error'>(supabase ? 'checking' : 'local')
  const [syncVersion,setSyncVersion]=useState(0)
  const [syncErrors,setSyncErrors]=useState<Record<string,string>>({})
  const [staffLoaded,setStaffLoaded]=useState(false)
  const syncWarning=Object.values(syncErrors).filter(Boolean).join(' ')
  function syncError(area:string,failed:boolean){setSyncErrors(errors=>({...errors,[area]:failed?`Не вдалося оновити ${area}. Перевірте з’єднання та міграції бази.`:''}))}
  const adminEntry = /^\/admin(?:\/|$)/.test(window.location.pathname)
  const [sessionReady,setSessionReady]=useState(!supabase)
  const [resolvedUser,setResolvedUser]=useState<string|null>(null)
  const [accessError,setAccessError]=useState('')
  const [accessRetry,setAccessRetry]=useState(0)
  const [invitation,setInvitation]=useState(()=>['invite','recovery'].includes(new URLSearchParams(window.location.hash.slice(1)).get('type')||'') || new URLSearchParams(window.location.search).get('activate')==='master')
  const [user,setUser] = useState<User | null>(null), [authOpen,setAuthOpen] = useState(false), [tenantId,setTenantId] = useState<string | null>(null), [tenantOpen,setTenantOpen] = useState(false), [userRole,setUserRole] = useState<string | null>(null)
  const workflow=useWorkflow(tenantId)
  const [focusOrder,setFocusOrder]=useState<string|null>(null)
  useEffect(()=>{setSyncVersion(v=>v+1)},[workflow.data])
  useEffect(()=>{
    if(!tenantId)return
    const refresh=()=>{if(document.visibilityState==='visible')setSyncVersion(v=>v+1)}
    const timer=window.setInterval(refresh,5000)
    window.addEventListener('focus',refresh)
    document.addEventListener('visibilitychange',refresh)
    return ()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)}
  },[tenantId])
  useEffect(()=>{
    if(!supabase || !tenantId) return
    let active=true
    void supabase.from('tenants').select('name,address,slug').eq('id',tenantId).single().then(({data})=>{
      if(active && data) setStudioProfile({name:data.name,address:data.address || '',slug:data.slug || ''})
    })
    return ()=>{active=false}
  },[tenantId,page])
  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {setUser(data.session?.user ?? null);setSessionReady(true)})
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {setUser(session?.user ?? null);setSessionReady(true);if(event==='PASSWORD_RECOVERY')setInvitation(true)})
    return () => listener.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!supabase || !user) { if(supabase){setBookings([]);setClients([]);setServiceList([]);setStaffList([]);setExpenses([]);setInventory([]);setInventoryMovements([]);setTasks([]);setWorkOrders([]);setLeads([]);setServicePackages([]);setSales([]);setInvoices([]);setWorkSchedules([]);setCashTransactions([]);setLegacyAccruals([]);setStaffShifts([]);setStaffEarnings([]);setStudioProfile({name:'Студія',address:'',slug:''})} setTenantId(null);setUserRole(null); setConnection(supabase ? 'checking' : 'local'); return }
    let cancelled=false
    setResolvedUser(null);setAccessError('');setTenantId(null);setUserRole(null);setStaffLoaded(false);setSyncErrors({})
    void (async()=>{
      try {
        const {data,error}=await supabase!.rpc('resolve_my_access')
        if(cancelled)return
        if(error)throw error
        setUserRole(data?.role||'unlinked')
        if(data?.needs_password)setInvitation(true)
        setTenantId(data?.tenant_id||null)
        setTenantOpen(false);setConnection('connected')
      } catch {if(!cancelled)setAccessError('Не вдалося перевірити доступ. Спробуйте ще раз або зверніться до адміністратора студії.')}
      finally {if(!cancelled)setResolvedUser(user.id)}
    })()
    return ()=>{cancelled=true}
  }, [user?.id,accessRetry])
  useEffect(() => {
    if (!supabase || !tenantId) return
    void supabase.from('services').select('id,name,category,price,duration_minutes').eq('tenant_id', tenantId).eq('active', true).order('created_at').then(({ data, error }) => {
      if (error || !data) return
      setServiceList(data.map((item:ServiceRow) => [item.name, item.category, formatDuration(item.duration_minutes), Number(item.price)] as [string,string,string,number]))
    })
  }, [tenantId])
  useEffect(() => {
    if (!supabase || !tenantId) return
    void supabase.from('appointments').select('id,client_id,source,starts_at,ends_at,status,clients(full_name,phone,email),staff_profiles(full_name),appointment_services(service_name,unit_price,duration_minutes),receipts(subtotal,discount,payment_method),vehicles(notes,make,model,plate_number)').eq('tenant_id', tenantId).order('starts_at').then(({ data, error }) => {
      if (error || !data) return
      setBookings(data.map((item: any) => { const start=new Date(item.starts_at), end=new Date(item.ends_at), service=item.appointment_services?.[0], receipt=Array.isArray(item.receipts) ? item.receipts[0] : item.receipts; return {id:item.id,clientId:item.client_id,source:item.source,date:new Date(start.getTime()-start.getTimezoneOffset()*60000).toISOString().slice(0,10),time:start.toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit',hour12:false}),client:item.clients?.full_name || 'Клієнт',phone:item.clients?.phone || 'Не вказано',email:item.clients?.email || '',car:item.vehicles?.notes || [item.vehicles?.make,item.vehicles?.model,item.vehicles?.plate_number].filter(Boolean).join(' ') || 'Авто не вказано',service:service?.service_name || 'Послуга',tech:item.staff_profiles?.full_name || 'Не призначено',price:Number(receipt?.subtotal ?? service?.unit_price ?? 0),durationMinutes:Math.round((end.getTime()-start.getTime())/60000),discount:Number(receipt?.discount || 0),paymentMethod:paymentLabel(receipt?.payment_method),status:statusLabel(item.status)} }))
    })
  }, [tenantId])
  useEffect(() => {
    if (!supabase || !tenantId) return
    void supabase.from('staff_profiles').select('*').eq('tenant_id', tenantId).eq('active', true).order('created_at').then(({ data, error }) => {
      setStaffLoaded(true);syncError('команду',!!error); if(error || !data)return
      setStaffList(data.map((item: {id:string;full_name:string;specialty:string | null;color:string;user_id:string|null;compensation_percent:number|null;hourly_rate:number|null;profile_completed_at:string|null}) => ({id:item.id,name:item.full_name,role:'Майстер',color:item.color || '#3869e9',load:0,speciality:item.specialty || 'Спеціалізація не вказана',userId:item.user_id,compensationPercent:item.compensation_percent===null?null:Number(item.compensation_percent),hourlyRate:Number(item.hourly_rate||0),profileCompletedAt:item.profile_completed_at})))
    })
  }, [tenantId,syncVersion])
  useEffect(() => {
    if (!supabase || !tenantId) return
    void supabase.from('work_schedules').select('id,staff_id,weekday,starts_at,ends_at').eq('tenant_id',tenantId).order('weekday').then(({data,error})=>{
      if(error || !data) return
      setWorkSchedules(data.map((item:{id:string;staff_id:string;weekday:number;starts_at:string;ends_at:string})=>({id:item.id,staffId:item.staff_id,weekday:item.weekday,startsAt:item.starts_at.slice(0,5),endsAt:item.ends_at.slice(0,5)})))
    })
  },[tenantId])
  useEffect(() => {
    if (!supabase || !tenantId) return
    void supabase.from('expenses').select('id,expense_date,category,title,amount,payment_method,note').eq('tenant_id', tenantId).order('expense_date', { ascending: false }).then(({ data, error }) => {
      if (error || !data) return
      setExpenses(data.map((item: { id:string; expense_date:string; category:string; title:string; amount:number; payment_method:string | null; note:string | null }) => ({id:item.id as unknown as number,date:item.expense_date,category:item.category,title:item.title,amount:Number(item.amount),method:paymentLabel(item.payment_method),note:item.note || ''})))
    })
  }, [tenantId])
  useEffect(() => {
    if (!supabase || !tenantId) return
    void supabase.from('inventory_items').select('id,name,unit,quantity,min_quantity,last_unit_cost,selling_price').eq('tenant_id',tenantId).eq('active',true).order('name').then(({data,error}) => { if(!error && data) setInventory(data.map(item=>({id:item.id,name:item.name,unit:item.unit,quantity:Number(item.quantity),minQuantity:Number(item.min_quantity),lastUnitCost:item.last_unit_cost===null?null:Number(item.last_unit_cost),sellingPrice:item.selling_price===null?null:Number(item.selling_price)}))) })
  },[tenantId])
  useEffect(() => {
    if (!supabase || !tenantId) return
    void supabase.from('inventory_movements').select('id,inventory_item_id,movement_type,quantity,unit_cost,note,created_at,inventory_items(name,unit)').eq('tenant_id',tenantId).order('created_at',{ascending:false}).limit(20).then(({data,error}) => {
      if (error || !data) return
      setInventoryMovements(data.map((item:any) => ({id:item.id,itemId:item.inventory_item_id,itemName:item.inventory_items?.name || 'Товар',unit:item.inventory_items?.unit || 'шт',type:item.movement_type,quantity:Number(item.quantity),unitCost:item.unit_cost === null ? null : Number(item.unit_cost),note:item.note || '',createdAt:item.created_at})))
    })
  },[tenantId])
  useEffect(() => {
    if (!supabase || !tenantId) return
    void supabase.from('clients').select('id,full_name,phone,tags,notes,source,vehicles(make,model,plate_number,notes)').eq('tenant_id', tenantId).order('created_at', { ascending: false }).then(({ data, error }) => {
      if (error || !data) return
      setClients(data.map((item: { id:string; full_name:string; phone:string | null; tags:string[] | null; notes:string | null; source:string | null; vehicles:{make:string | null; model:string | null; plate_number:string | null; notes:string | null}[] | null }) => ({ id:item.id, name:item.full_name, phone:item.phone || 'Не вказано', car:item.vehicles?.map(car => car.notes || [car.make,car.model,car.plate_number].filter(Boolean).join(' ')).filter(Boolean).join(', ') || 'Авто не вказано', visits:0, total:0,tags:item.tags || [],notes:item.notes || '',source:item.source || '' })))
    })
  }, [tenantId])
  useEffect(() => {
    if (!supabase || !tenantId) return
    void supabase.from('tasks').select('id,title,description,status,priority,due_date,staff_id,client_id,created_at,staff_profiles(full_name),clients(full_name)').eq('tenant_id',tenantId).order('created_at',{ascending:false}).then(({data,error})=>{
      if(error || !data) return
      setTasks(data.map((item:any)=>({id:item.id,title:item.title,description:item.description || '',status:item.status as TaskStatus,priority:item.priority as TaskPriority,dueDate:item.due_date || '',staffId:item.staff_id,staffName:item.staff_profiles?.full_name || '',clientId:item.client_id,clientName:item.clients?.full_name || '',createdAt:item.created_at})))
    })
  },[tenantId])
  useEffect(() => {
    if (!supabase || !tenantId) return
    void readAllPages((from,to)=>supabase!.from('work_orders').select('id,appointment_id,client_id,staff_id,title,vehicle_label,service_summary,status,total,deposit,due_at,notes,created_at,status_changed_at,checklist,compensation_percent,compensation_fixed,submitted_for_review_at,review_note,staff_profiles(full_name),clients(full_name,vehicles(make,model,plate_number,notes)),appointments(vehicles(make,model,plate_number,notes))').eq('tenant_id',tenantId).order('created_at',{ascending:false}).order('id').range(from,to)).then(({data,error})=>{
      syncError('замовлення',!!error); if(error || !data)return
      setWorkOrders(data.map((item:any)=>({id:item.id,appointmentId:item.appointment_id,clientId:item.client_id,clientName:item.clients?.full_name || 'Клієнт',staffId:item.staff_id,staffName:item.staff_profiles?.full_name || '',title:item.title,vehicle:resolveOrderVehicle(item),serviceSummary:item.service_summary || '',status:item.status as WorkOrderStatus,total:Number(item.total),deposit:Number(item.deposit),dueAt:item.due_at || '',notes:item.notes || '',createdAt:item.created_at,statusChangedAt:item.status_changed_at || item.created_at,checklist:Array.isArray(item.checklist)?item.checklist:[],compensationPercent:item.compensation_percent===null?null:Number(item.compensation_percent),compensationFixed:item.compensation_fixed===null?null:Number(item.compensation_fixed),submittedForReviewAt:item.submitted_for_review_at || '',reviewNote:item.review_note || ''})))
    })
  },[tenantId,syncVersion])
  useEffect(()=>{
    if(!supabase || !tenantId)return
    void Promise.all([
      supabase.from('staff_shifts').select('id,staff_id,started_at,ended_at').eq('tenant_id',tenantId).is('ended_at',null).order('started_at',{ascending:false}),
      readAllPages((from,to)=>supabase!.from('staff_earnings').select('id,staff_id,work_order_id,amount,status,accrued_at').eq('tenant_id',tenantId).order('accrued_at',{ascending:false}).order('id').range(from,to))
    ]).then(([shifts,earnings])=>{
      syncError('зміни',!!shifts.error);syncError('нарахування',!!earnings.error)
      if(!shifts.error&&shifts.data)setStaffShifts(shifts.data.map(item=>({id:item.id,staffId:item.staff_id,startedAt:item.started_at,endedAt:item.ended_at})))
      if(!earnings.error&&earnings.data)setStaffEarnings(earnings.data.map(item=>({id:item.id,staffId:item.staff_id,workOrderId:item.work_order_id,amount:Number(item.amount),status:item.status,accruedAt:item.accrued_at})))
    })
  },[tenantId,syncVersion])
  useEffect(() => {
    if (!supabase || !tenantId) return
    void supabase.from('leads').select('id,client_id,staff_id,title,phone,source,status,priority,due_at,notes,created_at,staff_profiles(full_name),clients(full_name)').eq('tenant_id',tenantId).order('created_at',{ascending:false}).then(({data,error})=>{
      if(error || !data) return
      setLeads(data.map((item:any)=>({id:item.id,clientId:item.client_id,clientName:item.clients?.full_name || '',staffId:item.staff_id,staffName:item.staff_profiles?.full_name || '',title:item.title,phone:item.phone || '',source:item.source || 'Вручну',status:item.status as LeadStatus,priority:item.priority==='urgent'?'urgent':'normal',dueAt:item.due_at || '',notes:item.notes || '',createdAt:item.created_at})))
    })
  },[tenantId])
  useEffect(() => {
    if (!supabase || !tenantId) return
    void supabase.from('service_packages').select('id,name,category,description,service_names,price').eq('tenant_id',tenantId).eq('active',true).order('created_at',{ascending:false}).then(({data,error})=>{
      if(error || !data) return
      setServicePackages(data.map((item:any)=>({id:item.id,name:item.name,category:item.category,description:item.description || '',serviceNames:Array.isArray(item.service_names)?item.service_names:[],price:Number(item.price)})))
    })
  },[tenantId])
  useEffect(() => {
    if (!supabase || !tenantId) return
    void supabase.from('sales').select('id,client_id,items,total,payment_method,note,created_at,clients(full_name)').eq('tenant_id',tenantId).order('created_at',{ascending:false}).then(({data,error})=>{
      if(error || !data) return
      setSales(data.map((item:any)=>({id:item.id,clientId:item.client_id,clientName:item.clients?.full_name || '',items:Array.isArray(item.items)?item.items:[],total:Number(item.total),paymentMethod:paymentLabel(item.payment_method),note:item.note || '',createdAt:item.created_at})))
    })
  },[tenantId])
  useEffect(() => {
    if (!supabase || !tenantId) return
    void supabase.from('invoices').select('id,number,client_id,title,line_items,total,status,due_at,note,created_at,clients(full_name)').eq('tenant_id',tenantId).order('created_at',{ascending:false}).then(({data,error})=>{
      if(error || !data) return
      setInvoices(data.map((item:any)=>({id:item.id,number:item.number,clientId:item.client_id,clientName:item.clients?.full_name || '',title:item.title,lineItems:Array.isArray(item.line_items)?item.line_items:[],total:Number(item.total),status:item.status as InvoiceStatus,dueAt:item.due_at || '',note:item.note || '',createdAt:item.created_at})))
    })
  },[tenantId])
  useEffect(()=>{
    if(!supabase || !tenantId)return
    let active=true
    void readAllPages((from,to)=>supabase!.from('cash_transactions').select('id,transaction_date,direction,amount,payment_method,category,title,note,client_id,created_at,clients(full_name)'+(workflow.available?',payout_id,is_accrual':'')).eq('tenant_id',tenantId).order('transaction_date',{ascending:false}).order('id').range(from,to)).then(({data,error})=>{
      if(!active)return
      setLegacyAccruals((data||[]).filter((item:any)=>item.is_accrual).map((item:any)=>({id:item.id,date:item.transaction_date,title:item.title,amount:Number(item.amount)})))
      syncError('фінанси',!!error); if(error || !data)return
      setCashTransactions(data.filter((item:any)=>!item.is_accrual).map((item:any)=>({id:item.id,date:item.transaction_date,direction:item.direction==='expense'?'expense':'income',amount:Number(item.amount),method:paymentLabel(item.payment_method),category:item.category,title:item.title,note:item.note || '',clientId:item.client_id,clientName:item.clients?.full_name || '',payoutId:item.payout_id})))
    })
    return()=>{active=false}
  },[tenantId,syncVersion,workflow.available])
  const [bookingDate,setBookingDate]=useState('')
  const [menuOpen, setMenuOpen] = useState(false), [modal, setModal] = useState(false), [query, setQuery] = useState('')
  const filtered = bookings.filter(x => `${x.client} ${x.car} ${x.service}`.toLowerCase().includes(query.toLowerCase()))
  const revenue = useMemo(() => bookings.filter(x => x.status === 'Завершено' && x.date===new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)).reduce((sum, x) => sum + x.price - x.discount, 0), [bookings])
  async function updateStatus(id:number|string,status:Status):Promise<string> {
    const current=bookings.find(b=>b.id===id)
    if(!current)return 'Запис не знайдено.'
    if(workflow.available&&['В роботі','Завершено'].includes(status)){const order=workOrders.find(o=>o.appointmentId===String(id));if(order){setFocusOrder(String(order.id));return 'Статус календаря оновиться після виконання та перевірки робіт.'}}
    if(supabase && tenantId && typeof id==='string'){
      if(current.source === 'public' && current.status === 'Очікує підтвердження' && (status === 'Підтверджено' || status === 'Скасовано')) {
        const { data: { session } } = await supabase.auth.getSession()
        if(!session?.access_token) return 'Потрібно увійти повторно, щоб обробити заявку.'
        const response = await fetch('/api/booking-requests/update', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ appointmentId: id, status: status === 'Підтверджено' ? 'confirmed' : 'cancelled' })
        })
        const result = await response.json().catch(() => ({})) as { error?: string; notification?: string }
        if(!response.ok) return result.error || 'Не вдалося обробити заявку. Спробуйте ще раз.'
        setBookings(items=>items.map(b=>b.id===id?{...b,status}:b))
        return result.notification === 'failed' ? 'Запис підтверджено, але лист клієнту не вдалося надіслати.' : ''
      }
      const {error}=await supabase.from('appointments').update({status:statusValue(status)}).eq('tenant_id',tenantId).eq('id',id).eq('status',statusValue(current.status)).select('id').single()
      if(error){setConnection('error');return error.code==='23P01'?'У майстра вже є запис на цей час. Перенесіть запис перед підтвердженням.':error.message||'Не вдалося змінити статус. Оновіть сторінку та спробуйте ще раз.'}
    }
    setBookings(items=>items.map(b=>b.id===id?{...b,status}:b));return ''
  }

  async function updatePayment(id:number|string,paymentMethod:PaymentMethod) { setBookings(items => items.map(item => item.id === id ? {...item,paymentMethod} : item)); if (!supabase || !tenantId || typeof id !== 'string') return; const {error}=await supabase.from('receipts').update({payment_method:paymentValue(paymentMethod)}).eq('tenant_id',tenantId).eq('appointment_id',id); if(error) setConnection('error') }
  async function createBooking(item: Booking, goToCalendar = true):Promise<string> {
    let saved=item
    if(supabase&&tenantId){
      try{
        const service=await supabase.from('services').select('id').eq('tenant_id',tenantId).eq('name',item.service).eq('active',true).maybeSingle()
        if(service.error||!service.data)return 'Послугу не знайдено. Оновіть каталог.'
        let client=clients.find(c=>item.phone!=='Не вказано'&&c.phone===item.phone)
        if(!client||typeof client.id!=='string'){
          const result=await supabase.from('clients').insert({tenant_id:tenantId,full_name:item.client,phone:item.phone==='Не вказано'?null:item.phone}).select('id').single()
          if(result.error||!result.data)return 'Не вдалося зберегти клієнта. Перевірте телефон і з’єднання.'
          client={id:result.data.id,name:item.client,phone:item.phone,car:item.car,visits:0,total:0}
          const newClient=client;setClients(list=>[...list,newClient])
        }
        let vehicleId:string|null=null
        if(item.car&&item.car!=='Авто не вказано'){
          const vehicles=await supabase.from('vehicles').select('id,notes,make,model,plate_number').eq('tenant_id',tenantId).eq('client_id',client.id)
          if(vehicles.error)return 'Не вдалося перевірити автомобіль.'
          vehicleId=vehicles.data?.find(v=>v.notes===item.car||[v.make,v.model,v.plate_number].filter(Boolean).join(' ')===item.car)?.id||null
          if(!vehicleId){const car=await supabase.from('vehicles').insert({tenant_id:tenantId,client_id:client.id,notes:item.car}).select('id').single();if(car.error||!car.data)return 'Не вдалося зберегти автомобіль.';vehicleId=car.data.id}
        }
        const master=staffList.find(m=>m.name===item.tech),startsAt=studioDateTime(item.date,item.time).toISOString(),endsAt=new Date(new Date(startsAt).getTime()+item.durationMinutes*60000).toISOString()
        const result=await supabase.from('appointments').insert({tenant_id:tenantId,client_id:client.id,vehicle_id:vehicleId,staff_id:typeof master?.id==='string'?master.id:null,starts_at:startsAt,ends_at:endsAt,status:statusValue(item.status),source:'admin'}).select('id').single()
        if(result.error||!result.data)return 'Не вдалося створити запис. Перевірте, чи вільний обраний час.'
        const bookingId=result.data.id
        const serviceRow=await supabase.from('appointment_services').insert({appointment_id:bookingId,service_id:service.data.id,service_name:item.service,unit_price:item.price,duration_minutes:item.durationMinutes})
        if(serviceRow.error){const rollback=await supabase.from('appointments').delete().eq('id',bookingId);return rollback.error?'Запис створено частково. Оновіть календар перед повторною спробою.':'Не вдалося додати послугу. Запис не створено.'}
        const order=await supabase.from('work_orders').select('id').eq('tenant_id',tenantId).eq('appointment_id',bookingId).maybeSingle()
        if(order.error||!order.data)showNotice('Запис збережено в календарі, але замовлення ще не створено. Перевірте міграцію 020 — не створюйте запис повторно.')
        saved={...item,id:bookingId,clientId:client.id}
      }catch{return 'Не вдалося завершити збереження. Перевірте календар і з’єднання перед повторною спробою.'}
    }
    setBookings(list=>[...list,saved]);setSyncVersion(v=>v+1);setModal(false);if(goToCalendar)setPage('Календар');return ''
  }
  async function addService(item:(typeof services)[number]) { setServiceList(list => [...list, item]); if (!supabase || !tenantId) return; const { error } = await supabase.from('services').insert({tenant_id:tenantId,name:item[0],category:item[1],price:item[3],duration_minutes:parseDuration(item[2])}); if (error) setConnection('error') }
  async function updateService(originalName:string,item:(typeof services)[number]):Promise<string> { const current=serviceList.find(service=>service[0]===originalName);if(!current)return 'Послугу не знайдено.';setServiceList(list=>list.map(service=>service[0]===originalName?item:service));if(!supabase||!tenantId)return '';const {error}=await supabase.from('services').update({name:item[0],category:item[1],price:item[3],duration_minutes:parseDuration(item[2])}).eq('tenant_id',tenantId).eq('name',originalName);if(error){setServiceList(list=>list.map(service=>service[0]===item[0]?current:service));setConnection('error');return 'Не вдалося зберегти зміни послуги.'}return '' }
  async function removeService(name:string) { setServiceList(list => list.filter(item => item[0] !== name)); if (!supabase || !tenantId) return; const { error } = await supabase.from('services').update({active:false}).eq('tenant_id',tenantId).eq('name',name); if (error) setConnection('error') }
  async function addClient(client:Client) {
    setClients(items => [...items, client]); if (!supabase || !tenantId) return
    const { data, error } = await supabase.from('clients').insert({tenant_id:tenantId,full_name:client.name,phone:client.phone === 'Не вказано' ? null : client.phone}).select('id').single()
    if (error || !data) { setConnection('error'); return }
    if (client.car !== 'Авто не вказано') await supabase.from('vehicles').insert({tenant_id:tenantId,client_id:data.id,notes:client.car})
    setClients(items => items.map(item => item.id === client.id ? {...item,id:data.id} : item))
  }
  async function editClient(id:number|string,name:string,phone:string,tags:string[],notes:string):Promise<string> {
    if(!name.trim()) return 'Вкажіть ім’я клієнта.'
    const current=clients.find(item=>item.id===id)
    if(!current) return 'Клієнта не знайдено.'
    if(supabase && tenantId && typeof id==='string'){
      const {data,error}=await supabase.from('clients').update({full_name:name.trim(),phone:phone.trim() || null,tags,notes:notes.trim() || null}).eq('tenant_id',tenantId).eq('id',id).select('id').single()
      if(error || !data) return error?.code==='23505'?'Клієнт із цим телефоном уже існує.':'Не вдалося зберегти клієнта.'
    }
    setClients(list=>list.map(item=>item.id===id?{...item,name:name.trim(),phone:phone.trim()||'Не вказано',tags,notes:notes.trim()}:item))
    setBookings(list=>list.map(item=>item.clientId===id?{...item,client:name.trim(),phone:phone.trim()||'Не вказано'}:item))
    return ''
  }
  async function removeClient(id:number|string) {
    if(supabase && tenantId && typeof id==='string'){
      const {error}=await supabase.from('clients').delete().eq('tenant_id',tenantId).eq('id',id)
      if(error){setConnection('error');showNotice('Не вдалося видалити клієнта. Можливо, він має пов’язані записи.');return}
    }
    setClients(items=>items.filter(client=>client.id!==id))
  }

  async function addExpense(item:Expense) {
    setExpenses(list => [item,...list])
    if (!supabase || !tenantId) return
    const { data,error } = await supabase.from('expenses').insert({tenant_id:tenantId,expense_date:item.date,category:item.category,title:item.title,amount:item.amount,payment_method:paymentValue(item.method),note:item.note || null}).select('id').single()
    if (error || !data) {setConnection('error');return}
    const quantity = item.stockQuantity
    if(item.category === 'Матеріали' && quantity !== undefined && quantity > 0) {
      const existing = inventory.find(stock => stock.name.toLowerCase() === item.title.toLowerCase())
      const unitCost = item.amount / quantity
      let stockId:string
      if(existing && typeof existing.id === 'string') {
        stockId = existing.id
        const updated = await supabase.from('inventory_items').update({quantity:existing.quantity + quantity,last_unit_cost:unitCost}).eq('id',stockId).select('quantity').single()
        if(updated.error) {setConnection('error');return}
        setInventory(list => list.map(stock => stock.id === stockId ? {...stock,quantity:Number(updated.data?.quantity ?? stock.quantity),lastUnitCost:unitCost} : stock))
      } else {
        const created = await supabase.from('inventory_items').insert({tenant_id:tenantId,name:item.title,unit:item.stockUnit || 'шт',quantity,last_unit_cost:unitCost}).select('id').single()
        if(created.error || !created.data) {setConnection('error');return}
        stockId = created.data.id
        setInventory(list => [...list,{id:stockId,name:item.title,unit:item.stockUnit || 'шт',quantity,minQuantity:0,lastUnitCost:unitCost,sellingPrice:null}])
      }
      const movement = await supabase.from('inventory_movements').insert({tenant_id:tenantId,inventory_item_id:stockId,expense_id:data.id,movement_type:'purchase',quantity,unit_cost:unitCost,note:item.note || 'Закупівля матеріалів'})
      if (movement.error) setConnection('error')
    }
    setExpenses(list => list.map(expense => expense.id === item.id ? {...expense,id:data.id as unknown as number} : expense))
  }
  async function addInventory(item:InventoryItem) { setInventory(list=>[...list,item]); if(!supabase || !tenantId) return; const {data,error}=await supabase.from('inventory_items').insert({tenant_id:tenantId,name:item.name,unit:item.unit,quantity:item.quantity,min_quantity:item.minQuantity,last_unit_cost:item.lastUnitCost,selling_price:item.sellingPrice}).select('id').single(); if(error || !data){setConnection('error');return} await supabase.from('inventory_movements').insert({tenant_id:tenantId,inventory_item_id:data.id,movement_type:'adjustment',quantity:item.quantity,unit_cost:item.lastUnitCost,note:'Початковий залишок'}); setInventory(list=>list.map(entry=>entry.id===item.id?{...entry,id:data.id}:entry)) }
  async function writeOffInventory(id:number|string, quantity:number, note:string) { const current=inventory.find(item=>item.id===id); if(!current || quantity<=0 || quantity>current.quantity) return false; setInventory(list=>list.map(item=>item.id===id?{...item,quantity:item.quantity-quantity}:item)); if(!supabase || !tenantId || typeof id !== 'string') return true; const updated=await supabase.from('inventory_items').update({quantity:current.quantity-quantity}).eq('tenant_id',tenantId).eq('id',id); if(updated.error){setConnection('error');setInventory(list=>list.map(item=>item.id===id?current:item));return false} const movement=await supabase.from('inventory_movements').insert({tenant_id:tenantId,inventory_item_id:id,movement_type:'write_off',quantity:-quantity,unit_cost:current.lastUnitCost,note:note || 'Списання матеріалу'}).select('id,created_at').single(); if(movement.error){setConnection('error');return false} setInventoryMovements(list=>[{id:movement.data.id,itemId:id,itemName:current.name,unit:current.unit,type:'write_off' as const,quantity:-quantity,unitCost:current.lastUnitCost,note:note || 'Списання матеріалу',createdAt:movement.data.created_at},...list].slice(0,20));return true }
  async function receiveInventory(id:number|string, quantity:number, unitCost:number|null, note:string):Promise<boolean> { const current=inventory.find(item=>item.id===id);if(!current||quantity<=0)return false;const next={...current,quantity:current.quantity+quantity,lastUnitCost:unitCost??current.lastUnitCost};setInventory(list=>list.map(item=>item.id===id?next:item));if(!supabase||!tenantId||typeof id!=='string')return true;const updated=await supabase.from('inventory_items').update({quantity:next.quantity,last_unit_cost:next.lastUnitCost}).eq('tenant_id',tenantId).eq('id',id);if(updated.error){setInventory(list=>list.map(item=>item.id===id?current:item));setConnection('error');return false}const movement=await supabase.from('inventory_movements').insert({tenant_id:tenantId,inventory_item_id:id,movement_type:'purchase',quantity,unit_cost:next.lastUnitCost,note:note||'Оприходування'}).select('id,created_at').single();if(movement.error){setConnection('error');return false}setInventoryMovements(list=>[{id:movement.data.id,itemId:id,itemName:current.name,unit:current.unit,type:'purchase' as const,quantity,unitCost:next.lastUnitCost,note:note||'Оприходування',createdAt:movement.data.created_at},...list].slice(0,20));return true }
  async function adjustInventory(id:number|string, actualQuantity:number, note:string):Promise<boolean> { const current=inventory.find(item=>item.id===id);if(!current||actualQuantity<0)return false;const difference=actualQuantity-current.quantity;if(difference===0)return true;const next={...current,quantity:actualQuantity};setInventory(list=>list.map(item=>item.id===id?next:item));if(!supabase||!tenantId||typeof id!=='string')return true;const updated=await supabase.from('inventory_items').update({quantity:actualQuantity}).eq('tenant_id',tenantId).eq('id',id);if(updated.error){setInventory(list=>list.map(item=>item.id===id?current:item));setConnection('error');return false}const movement=await supabase.from('inventory_movements').insert({tenant_id:tenantId,inventory_item_id:id,movement_type:'adjustment',quantity:difference,unit_cost:current.lastUnitCost,note:note||'Інвентаризація'}).select('id,created_at').single();if(movement.error){setConnection('error');return false}setInventoryMovements(list=>[{id:movement.data.id,itemId:id,itemName:current.name,unit:current.unit,type:'adjustment' as const,quantity:difference,unitCost:current.lastUnitCost,note:note||'Інвентаризація',createdAt:movement.data.created_at},...list].slice(0,20));return true }
  async function updateInventoryMinimum(id:number|string, minimum:number) { const current=inventory.find(item=>item.id===id); if(!current || minimum<0) return; setInventory(list=>list.map(item=>item.id===id?{...item,minQuantity:minimum}:item)); if(!supabase || !tenantId || typeof id!=='string') return; const {error}=await supabase.from('inventory_items').update({min_quantity:minimum}).eq('tenant_id',tenantId).eq('id',id); if(error){setConnection('error');setInventory(list=>list.map(item=>item.id===id?current:item))} }
  async function removeExpense(id:number|string) { setExpenses(list => list.filter(item => item.id !== id)); if (!supabase || !tenantId || typeof id !== 'string') return; const { error } = await supabase.from('expenses').delete().eq('tenant_id',tenantId).eq('id',id); if (error) setConnection('error') }
  async function addStaff(member:Staff,email:string):Promise<string> { setStaffList(list => [...list,member]); if (!supabase || !tenantId) return 'Підключіть Supabase, щоб створити майстра.'; const { data,error } = await supabase.from('staff_profiles').insert({tenant_id:tenantId,full_name:member.name,specialty:member.speciality,color:member.color}).select('id').single(); if (error || !data) {setStaffList(list=>list.filter(item=>item.id!==member.id));setConnection('error');return 'Не вдалося зберегти майстра.'} setStaffList(list => list.map(item => item.id === member.id ? {...item,id:data.id} : item)); const {data:session}=await supabase.auth.getSession(); const invite=await fetch('/api/staff/invite',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.session?.access_token||''}`},body:JSON.stringify({staffId:data.id,email:email.trim()})}); const result=await invite.json().catch(()=>({})); if(!invite.ok)return result.error||'Майстра створено, але лист не надіслано.'; return '' }
  async function removeStaff(id:number|string) { setStaffList(list => list.filter(item => item.id !== id)); if (!supabase || !tenantId || typeof id !== 'string') return; const {error} = await supabase.from('staff_profiles').update({active:false}).eq('tenant_id',tenantId).eq('id',id); if(error) setConnection('error') }
  async function addTask(task:Task):Promise<string> {
    if(!task.title.trim()) return 'Вкажіть назву завдання.'
    setTasks(list=>[task,...list])
    if(!supabase || !tenantId) return ''
    const {data,error}=await supabase.from('tasks').insert({tenant_id:tenantId,title:task.title.trim(),description:task.description || null,status:task.status,priority:task.priority,due_date:task.dueDate || null,staff_id:typeof task.staffId==='string'?task.staffId:null,client_id:typeof task.clientId==='string'?task.clientId:null,created_by:user?.id || null}).select('id,created_at').single()
    if(error || !data){setTasks(list=>list.filter(item=>item.id!==task.id));setConnection('error');return 'Не вдалося створити завдання.'}
    setTasks(list=>list.map(item=>item.id===task.id?{...item,id:data.id,createdAt:data.created_at}:item));return ''
  }
  async function updateTask(id:Task['id'],patch:Partial<Pick<Task,'status'|'priority'|'dueDate'|'staffId'|'clientId'|'title'|'description'>>):Promise<string> {
    const current=tasks.find(task=>task.id===id);if(!current)return 'Завдання не знайдено.'
    const next={...current,...patch};setTasks(list=>list.map(task=>task.id===id?next:task))
    if(!supabase || !tenantId || typeof id!=='string') return ''
    const {error}=await supabase.from('tasks').update({status:patch.status,priority:patch.priority,due_date:patch.dueDate === undefined ? undefined : patch.dueDate || null,staff_id:patch.staffId === undefined ? undefined : typeof patch.staffId==='string'?patch.staffId:null,client_id:patch.clientId === undefined ? undefined : typeof patch.clientId==='string'?patch.clientId:null,title:patch.title,description:patch.description,updated_at:new Date().toISOString()}).eq('tenant_id',tenantId).eq('id',id)
    if(error){setTasks(list=>list.map(task=>task.id===id?current:task));setConnection('error');return 'Не вдалося оновити завдання.'}
    return ''
  }
  async function removeTask(id:Task['id']):Promise<string> {
    const current=tasks.find(task=>task.id===id);if(!current)return 'Завдання не знайдено.'
    setTasks(list=>list.filter(task=>task.id!==id))
    if(!supabase || !tenantId || typeof id!=='string')return ''
    const {error}=await supabase.from('tasks').delete().eq('tenant_id',tenantId).eq('id',id)
    if(error){setTasks(list=>[current,...list]);setConnection('error');return 'Не вдалося видалити завдання.'}
    return ''
  }
  async function addWorkOrder(item:WorkOrder):Promise<string> {
    if(!item.clientId || !item.title.trim()) return 'Оберіть клієнта та вкажіть назву робіт.'
    setWorkOrders(list=>[item,...list])
    if(!supabase || !tenantId) return ''
    const {data,error}=await supabase.from('work_orders').insert({tenant_id:tenantId,client_id:typeof item.clientId==='string'?item.clientId:null,staff_id:typeof item.staffId==='string'?item.staffId:null,title:item.title.trim(),vehicle_label:item.vehicle || null,service_summary:item.serviceSummary || null,status:item.status,total:item.total,deposit:item.deposit,due_at:item.dueAt || null,notes:item.notes || null,checklist:item.checklist,compensation_percent:item.compensationPercent,compensation_fixed:item.compensationFixed,created_by:user?.id || null}).select('id,created_at').single()
    if(error || !data){setWorkOrders(list=>list.filter(order=>order.id!==item.id));setConnection('error');return 'Не вдалося створити замовлення.'}
    setWorkOrders(list=>list.map(order=>order.id===item.id?{...order,id:data.id,createdAt:data.created_at}:order));return ''
  }
  async function updateWorkOrder(id:WorkOrder['id'],patch:Partial<Pick<WorkOrder,'status'|'total'|'deposit'|'dueAt'|'staffId'|'title'|'serviceSummary'|'notes'|'checklist'|'submittedForReviewAt'>>):Promise<string> {
    const current=workOrders.find(order=>order.id===id);if(!current)return 'Замовлення не знайдено.'
    const next={...current,...patch,staffName:patch.staffId===undefined?current.staffName:staffList.find(member=>String(member.id)===String(patch.staffId))?.name||'',statusChangedAt:patch.status && patch.status!==current.status ? new Date().toISOString() : current.statusChangedAt};setWorkOrders(list=>list.map(order=>order.id===id?next:order))
    if(!supabase || !tenantId || typeof id!=='string')return ''
    const {error}=await supabase.from('work_orders').update({status:patch.status,total:patch.total,deposit:patch.deposit,due_at:patch.dueAt === undefined ? undefined : patch.dueAt || null,staff_id:patch.staffId === undefined ? undefined : typeof patch.staffId==='string'?patch.staffId:null,title:patch.title,service_summary:patch.serviceSummary,notes:patch.notes,checklist:patch.checklist,submitted_for_review_at:patch.submittedForReviewAt === undefined ? undefined : patch.submittedForReviewAt || null,updated_at:new Date().toISOString()}).eq('tenant_id',tenantId).eq('id',id).select('id').single()
    if(error){setWorkOrders(list=>list.map(order=>order.id===id?current:order));setConnection('error');return error.message || 'Не вдалося оновити замовлення.'}
    return ''
  }
  async function approveWorkOrder(item:WorkOrder):Promise<string>{
    if(typeof item.id!=='string' || !supabase)return 'Спочатку збережіть замовлення.'
    const {data,error}=await supabase.rpc('approve_work_order',{target_work_order_id:item.id,reviewer_note:null})
    if(error)return error.message || 'Не вдалося підтвердити роботу.'
    setWorkOrders(list=>list.map(order=>order.id===item.id?{...order,status:'ready'}:order))
    if(data)setStaffEarnings(list=>[{id:data.id,staffId:data.staff_id,workOrderId:data.work_order_id,amount:Number(data.amount),status:data.status,accruedAt:data.accrued_at},...list.filter(entry=>entry.workOrderId!==item.id)])
    return 'Роботу підтверджено, заробіток нараховано майстру.'
  }
  async function toggleShift(staffId:string,openShift:{id:string;staffId:string;startedAt:string;endedAt:string|null}|undefined):Promise<string>{
    if(!supabase||!tenantId)return 'Для обліку зміни підключіть Supabase.'
    if(openShift){const {error}=await supabase.from('staff_shifts').update({ended_at:new Date().toISOString()}).eq('id',openShift.id);if(error)return 'Не вдалося завершити зміну.';setStaffShifts(list=>list.map(item=>item.id===openShift.id?{...item,endedAt:new Date().toISOString()}:item));return 'Зміну завершено.'}
    const {data,error}=await supabase.from('staff_shifts').insert({tenant_id:tenantId,staff_id:staffId}).select('id,staff_id,started_at,ended_at').single();if(error||!data)return 'Не вдалося розпочати зміну.';setStaffShifts(list=>[{id:data.id,staffId:data.staff_id,startedAt:data.started_at,endedAt:data.ended_at},...list]);return 'Зміну розпочато.'
  }
  async function removeWorkOrder(id:WorkOrder['id']):Promise<string> {
    const current=workOrders.find(order=>order.id===id);if(!current)return 'Замовлення не знайдено.'
    setWorkOrders(list=>list.filter(order=>order.id!==id))
    if(!supabase || !tenantId || typeof id!=='string')return ''
    const {error}=await supabase.from('work_orders').delete().eq('tenant_id',tenantId).eq('id',id)
    if(error){setWorkOrders(list=>[current,...list]);setConnection('error');return 'Не вдалося видалити замовлення.'}
    return ''
  }
  async function recordWorkOrderPayment(item:WorkOrder,payment:WorkOrderPayment):Promise<string> {
    const remaining=Math.max(item.total-item.deposit,0)
    if(!Number.isFinite(payment.amount)||payment.amount<=0||payment.amount>remaining) return 'Сума оплати некоректна.'
    const updateError=await updateWorkOrder(item.id,{deposit:item.deposit+payment.amount})
    if(updateError) return updateError
    const cashError=await addCashTransaction({id:`payment-${Date.now()}`,date:payment.date,direction:'income',amount:payment.amount,method:payment.method,category:'Оплата замовлення',title:`Оплата замовлення: ${item.title}`,note:payment.note,clientId:item.clientId,clientName:item.clientName})
    if(!cashError) return ''
    await updateWorkOrder(item.id,{deposit:item.deposit})
    return `${cashError} Оплату в замовленні скасовано, щоб дані не розійшлися.`
  }
  async function addLead(item:Lead):Promise<string> {
    if(!item.title.trim()) return 'Вкажіть тему звернення.'
    setLeads(list=>[item,...list])
    if(!supabase || !tenantId) return ''
    const {data,error}=await supabase.from('leads').insert({tenant_id:tenantId,client_id:typeof item.clientId==='string'?item.clientId:null,staff_id:typeof item.staffId==='string'?item.staffId:null,title:item.title.trim(),phone:item.phone || null,source:item.source,status:item.status,priority:item.priority,due_at:item.dueAt || null,notes:item.notes || null,created_by:user?.id || null}).select('id,created_at').single()
    if(error || !data){setLeads(list=>list.filter(lead=>lead.id!==item.id));setConnection('error');return 'Не вдалося створити звернення.'}
    setLeads(list=>list.map(lead=>lead.id===item.id?{...lead,id:data.id,createdAt:data.created_at}:lead));return ''
  }
  async function updateLead(id:Lead['id'],patch:Partial<Pick<Lead,'status'|'staffId'|'dueAt'|'priority'|'notes'>>):Promise<string> {
    const current=leads.find(lead=>lead.id===id);if(!current)return 'Звернення не знайдено.'
    const next={...current,...patch};setLeads(list=>list.map(lead=>lead.id===id?next:lead))
    if(!supabase || !tenantId || typeof id!=='string')return ''
    const {error}=await supabase.from('leads').update({status:patch.status,staff_id:patch.staffId === undefined ? undefined : typeof patch.staffId==='string'?patch.staffId:null,due_at:patch.dueAt === undefined ? undefined : patch.dueAt || null,priority:patch.priority,notes:patch.notes,updated_at:new Date().toISOString()}).eq('tenant_id',tenantId).eq('id',id)
    if(error){setLeads(list=>list.map(lead=>lead.id===id?current:lead));setConnection('error');return 'Не вдалося оновити звернення.'}
    return ''
  }
  async function removeLead(id:Lead['id']):Promise<string> {
    const current=leads.find(lead=>lead.id===id);if(!current)return 'Звернення не знайдено.'
    setLeads(list=>list.filter(lead=>lead.id!==id))
    if(!supabase || !tenantId || typeof id!=='string')return ''
    const {error}=await supabase.from('leads').delete().eq('tenant_id',tenantId).eq('id',id)
    if(error){setLeads(list=>[current,...list]);setConnection('error');return 'Не вдалося видалити звернення.'}
    return ''
  }
  async function addServicePackage(item:ServicePackage):Promise<string> {
    setServicePackages(list=>[item,...list])
    if(!supabase || !tenantId) return ''
    const {data,error}=await supabase.from('service_packages').insert({tenant_id:tenantId,name:item.name,category:item.category,description:item.description || null,service_names:item.serviceNames,price:item.price}).select('id').single()
    if(error || !data){setServicePackages(list=>list.filter(entry=>entry.id!==item.id));setConnection('error');return 'Не вдалося зберегти набір.'}
    setServicePackages(list=>list.map(entry=>entry.id===item.id?{...entry,id:data.id}:entry));return ''
  }
  async function removeServicePackage(id:ServicePackage['id']):Promise<string> {
    const current=servicePackages.find(item=>item.id===id);if(!current)return 'Набір не знайдено.'
    setServicePackages(list=>list.filter(item=>item.id!==id))
    if(!supabase || !tenantId || typeof id!=='string')return ''
    const {error}=await supabase.from('service_packages').update({active:false}).eq('tenant_id',tenantId).eq('id',id)
    if(error){setServicePackages(list=>[current,...list]);setConnection('error');return 'Не вдалося деактивувати набір.'}
    return ''
  }
  async function addSale(item:Sale):Promise<string> {
    const requested=item.items.reduce<Record<string,number>>((result,line)=>{const key=String(line.itemId);result[key]=(result[key]||0)+line.quantity;return result},{})
    const invalid=Object.entries(requested).some(([id,quantity])=>{const stock=inventory.find(entry=>String(entry.id)===id);return !stock || quantity>stock.quantity})
    if(invalid) return 'Недостатньо товару на складі. Оновіть склад і спробуйте ще раз.'
    setSales(list=>[item,...list])
    if(!supabase || !tenantId){for(const line of item.items){await writeOffInventory(line.itemId,line.quantity,`Продаж #${item.id}`)}return ''}
    const {data,error}=await supabase.from('sales').insert({tenant_id:tenantId,client_id:typeof item.clientId==='string'?item.clientId:null,items:item.items,total:item.total,payment_method:paymentValue(item.paymentMethod),note:item.note || null,created_by:user?.id || null}).select('id,created_at').single()
    if(error || !data){setSales(list=>list.filter(sale=>sale.id!==item.id));setConnection('error');return 'Не вдалося зберегти продаж.'}
    setSales(list=>list.map(sale=>sale.id===item.id?{...sale,id:data.id,createdAt:data.created_at}:sale))
    for(const line of item.items){const written=await writeOffInventory(line.itemId,line.quantity,`Продаж #${String(data.id).slice(0,8)}`);if(!written){setConnection('error');return 'Продаж створено, але не вдалося списати один із товарів. Перевірте склад.'}}
    return ''
  }
  async function addInvoice(item:Invoice):Promise<string> {
    setInvoices(list=>[item,...list])
    if(!supabase || !tenantId) return ''
    const {data,error}=await supabase.from('invoices').insert({tenant_id:tenantId,number:item.number,client_id:typeof item.clientId==='string'?item.clientId:null,title:item.title,line_items:item.lineItems,total:item.total,status:item.status,due_at:item.dueAt || null,note:item.note || null,created_by:user?.id || null}).select('id,created_at').single()
    if(error || !data){setInvoices(list=>list.filter(invoice=>invoice.id!==item.id));setConnection('error');return error?.code==='23505'?'Такий номер рахунку вже існує. Створіть рахунок ще раз.':'Не вдалося створити рахунок.'}
    setInvoices(list=>list.map(invoice=>invoice.id===item.id?{...invoice,id:data.id,createdAt:data.created_at}:invoice));return ''
  }
  async function updateInvoice(id:Invoice['id'],patch:Partial<Pick<Invoice,'status'|'dueAt'|'note'>>):Promise<string> {
    const current=invoices.find(item=>item.id===id);if(!current)return 'Рахунок не знайдено.'
    const next={...current,...patch};setInvoices(list=>list.map(item=>item.id===id?next:item))
    if(!supabase || !tenantId || typeof id!=='string')return ''
    const {error}=await supabase.from('invoices').update({status:patch.status,due_at:patch.dueAt === undefined ? undefined : patch.dueAt || null,note:patch.note,updated_at:new Date().toISOString()}).eq('tenant_id',tenantId).eq('id',id)
    if(error){setInvoices(list=>list.map(item=>item.id===id?current:item));setConnection('error');return 'Не вдалося оновити рахунок.'}
    return ''
  }
  async function addCashTransaction(item:CashTransaction):Promise<string>{
    setCashTransactions(list=>[item,...list])
    if(!supabase || !tenantId)return ''
    const {data,error}=await supabase.from('cash_transactions').insert({tenant_id:tenantId,transaction_date:item.date,direction:item.direction,amount:item.amount,payment_method:paymentValue(item.method),category:item.category,title:item.title,note:item.note || null,client_id:typeof item.clientId==='string'?item.clientId:null,created_by:user?.id || null}).select('id').single()
    if(error || !data){setCashTransactions(list=>list.filter(entry=>entry.id!==item.id));setConnection('error');return 'Не вдалося зберегти операцію.'}
    setCashTransactions(list=>list.map(entry=>entry.id===item.id?{...entry,id:data.id}:entry));return ''
  }
  async function removeCashTransaction(id:CashTransaction['id']):Promise<string>{
    const current=cashTransactions.find(item=>item.id===id);if(!current)return ''
    setCashTransactions(list=>list.filter(item=>item.id!==id))
    if(!supabase || !tenantId || typeof id!=='string')return ''
    const {error}=await supabase.from('cash_transactions').delete().eq('tenant_id',tenantId).eq('id',id)
    if(error){setCashTransactions(list=>[current,...list]);setConnection('error');return 'Не вдалося видалити операцію.'}
    return ''
  }
  async function saveWorkSchedule(item:Omit<WorkSchedule,'id'>):Promise<string> {
    if(item.startsAt >= item.endsAt) return 'Час завершення має бути пізніше за початок.'
    const current=workSchedules.find(schedule=>String(schedule.staffId)===String(item.staffId)&&schedule.weekday===item.weekday)
    const optimistic:{id:string|number;staffId:string|number;weekday:number;startsAt:string;endsAt:string}={id:current?.id || `local-${Date.now()}`,...item}
    setWorkSchedules(list=>current?list.map(schedule=>schedule.id===current.id?optimistic:schedule):[...list,optimistic])
    if(!supabase || !tenantId || typeof item.staffId!=='string') return ''
    const {data,error}=await supabase.from('work_schedules').upsert({tenant_id:tenantId,staff_id:item.staffId,weekday:item.weekday,starts_at:item.startsAt,ends_at:item.endsAt},{onConflict:'staff_id,weekday'}).select('id').single()
    if(error || !data){setWorkSchedules(list=>current?[...list.filter(schedule=>schedule.id!==optimistic.id),current]:list.filter(schedule=>schedule.id!==optimistic.id));setConnection('error');return 'Не вдалося зберегти графік.'}
    setWorkSchedules(list=>list.map(schedule=>schedule.id===optimistic.id?{...optimistic,id:data.id}:schedule))
    return ''
  }
  async function removeWorkSchedule(id:WorkSchedule['id']):Promise<string> {
    const current=workSchedules.find(schedule=>schedule.id===id);if(!current)return ''
    setWorkSchedules(list=>list.filter(schedule=>schedule.id!==id))
    if(!supabase || !tenantId || typeof id!=='string') return ''
    const {error}=await supabase.from('work_schedules').delete().eq('tenant_id',tenantId).eq('id',id)
    if(error){setWorkSchedules(list=>[...list,current]);setConnection('error');return 'Не вдалося видалити зміну.'}
    return ''
  }
  if(!sessionReady)return <main className="access-portal">Перевіряємо сесію…</main>
  if(!user)return <AccessPortal admin={adminEntry}/>
  if(resolvedUser!==user.id)return <main className="access-portal">Перевіряємо доступ…</main>
  if(accessError)return <AccessNotice title="Не вдалося увійти" description={accessError} retry={()=>setAccessRetry(value=>value+1)}/>
  if(adminEntry){
    if(userRole!=='super_admin')return <AccessNotice title="Службовий доступ" description="Цей акаунт не має прав підтримки. Увійдіть службовим акаунтом або поверніться на головну сторінку."/>
    return <SupportPortal/>
  }
  if(userRole==='blocked')return <AccessNotice title="Доступ призупинено" description="Власник студії заблокував ваш профіль. Зверніться до нього для відновлення доступу."/>
  if(userRole==='super_admin')return <AccessNotice title="Кабінет підтримки" description="Відкрийте /admin на цьому сайті для службового входу."/>
  if(userRole==='owner_request')return <OwnerPending/>
  if(!tenantId)return <AccessNotice title="Профіль не прив’язано" description="Для майстра потрібне запрошення від власника. Якщо ви вже перейшли з листа, попросіть власника перевірити прив’язку акаунта." retry={()=>setAccessRetry(value=>value+1)}/>
  if(invitation)return <InvitationPassword complete={()=>{setInvitation(false);window.history.replaceState({},'',window.location.pathname)}}/>
  const ownMaster=staffList.find(item=>item.userId===user.id)
  if(userRole==='master'&&!ownMaster)return staffLoaded?<AccessNotice title="Профіль майстра недоступний" description={syncWarning||'Доступ міг бути заблокований власником. Перевірте прив’язку акаунта.'} retry={()=>setAccessRetry(v=>v+1)}/>:<main className="access-portal">Завантаження профілю майстра…</main>
  if(userRole==='master'&&ownMaster&&!ownMaster.profileCompletedAt)return <MasterProfileForm initialName={ownMaster.name} complete={()=>setSyncVersion(v=>v+1)}/>
  if(userRole==='master')return <div className="master-workspace"><header className="master-workspace-header"><b>detailflow · Кабінет майстра</b><button className="text-btn" onClick={()=>void supabase?.auth.signOut()}>Вийти</button></header>{syncWarning&&<p role="alert" className="sync-warning">{syncWarning}</p>}<Suspense fallback={<p className="content">Завантаження кабінету…</p>}>{workflow.available?<MasterWorkspace workflow={workflow} orders={workOrders} staff={staffList} member={ownMaster||null}/>:<MasterCabinet staff={ownMaster||null} orders={workOrders} shifts={staffShifts} earnings={staffEarnings} toggleShift={toggleShift} updateOrder={updateWorkOrder}/>}</Suspense></div>
  return <div className="app-shell">
    <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><span className="brand-dot"/> detailflow</div><button aria-label="Закрити меню" className="mobile-close" onClick={() => setMenuOpen(false)}><X size={20}/></button>
      <div className="studio-control"><button className="studio" aria-expanded={studioMenu} onClick={()=>setStudioMenu(v=>!v)}><span className="studio-avatar">{studioProfile.name.slice(0,1)}</span><div><b>{studioProfile.name}</b><small>{studioProfile.address || 'Адресу не вказано'}</small></div><ChevronDown size={16}/></button>{studioMenu && <div className="studio-options"><p>Поточна студія: {studioProfile.name}</p><button onClick={()=>{setPage('Налаштування');setStudioMenu(false)}}>Редагувати профіль студії</button></div>}</div>
      <nav>{nav.map(([label, Icon]) => <button key={label} onClick={() => {setPage(label);setMenuOpen(false)}} className={page === label ? 'active' : ''}><Icon size={18}/>{label}</button>)}</nav>
      <div className="side-bottom"><button onClick={() => setPage('Налаштування')}><Settings size={18}/>Налаштування</button><div className="trial"><b>Пробний період</b><span>12 днів залишилось</span><div><i/></div></div><button className="upgrade" onClick={() => setPage('Тариф')}>Обрати тариф</button></div>
    </aside>
    <main><header><button aria-label="Відкрити меню" className="hamburger" onClick={() => setMenuOpen(true)}><Menu/></button><div className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Пошук клієнтів, авто, записів…"/></div><div className="header-actions"><small title={connection === 'local' ? supabaseSetupMessage : undefined} style={{color:connection === 'connected' ? '#26754c' : '#777982'}}>{connection === 'connected' ? 'БД підключена' : connection === 'checking' ? 'Перевірка БД…' : connection === 'error' ? 'Потрібно увійти' : 'Локальний режим'}</small>{user ? <button className="locale" onClick={() => void supabase?.auth.signOut()}>Вийти</button> : <button className="locale" onClick={() => setAuthOpen(true)}>Увійти</button>}<span className="locale" title="Мова інтерфейсу — українська">UA</span><div className="profile-control"><button className="avatar" aria-label="Меню профілю" aria-expanded={profileMenu} onClick={()=>setProfileMenu(v=>!v)}>{user?.email?.slice(0,2).toUpperCase() || 'Г'}</button>{profileMenu && <div className="profile-options"><b>{user?.user_metadata?.full_name || 'Ваш профіль'}</b><small>{user?.email || 'Ви не увійшли'}</small><button className="text-btn" onClick={()=>{setPage('Налаштування');setProfileMenu(false)}}>Налаштування студії</button><button className="text-btn" onClick={()=>{setProfileMenu(false);if(user) void supabase?.auth.signOut();else setAuthOpen(true)}}>{user?'Вийти з акаунта':'Увійти'}</button></div>}</div></div></header>
      {syncWarning&&<p role="alert" className="sync-warning">{syncWarning}</p>}{page === 'Огляд' && (workflow.available?<OwnerToday workflow={workflow} orders={workOrders} staff={staffList} openOrder={setFocusOrder}/>:<Dashboard name={user?.user_metadata?.full_name || "колего"} calendar={()=>setPage("Календар")} open={setPage} bookings={filtered.filter(b=>b.date===new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10))} staff={staffList} revenue={revenue} onCreate={() => setModal(true)} onStatus={(id,status)=>{void updateStatus(id,status).then(error=>{if(error)showNotice(error)})}}/>)}
      {page === 'Огляд' && !workflow.available && <Suspense fallback={null}><AttentionCenter tasks={tasks} leads={leads} inventory={inventory} invoices={invoices} open={setPage}/></Suspense>}
      {page === 'Календар' && <Calendar bookings={filtered} onCreate={date => {setBookingDate(date);setModal(true)}} onStatus={(id,status)=>{void updateStatus(id,status).then(error=>{if(error)showNotice(error)})}}/>}
      {page === 'Склад' && <Suspense fallback={null}><WarehouseControls items={inventory} receive={receiveInventory} adjust={adjustInventory}/></Suspense>}
      {page === 'Звіти' && <Suspense fallback={<p className="content">Завантаження звітів…</p>}><Reports bookings={bookings} expenses={expenses} sales={sales} invoices={invoices}/></Suspense>}
      {page === 'Клієнти' && <Clients items={clients.filter(client => `${client.name} ${client.phone} ${client.car}`.toLowerCase().includes(query.toLowerCase()))} add={addClient} remove={removeClient} bookings={bookings} edit={editClient}/>} {page === 'Послуги' && <Suspense fallback={<p className="content">Завантаження каталогу…</p>}><Catalog services={serviceList} products={inventory.map(item=>({id:item.id,name:item.name,unit:item.unit,quantity:item.quantity,price:item.sellingPrice}))} packages={servicePackages} addService={addService} updateService={updateService} removeService={removeService} addPackage={addServicePackage} removePackage={removeServicePackage}/></Suspense>} {page === 'Команда' && <><Team work={workflow.available?workflow.data.jobs.map(j=>({staffId:j.staff_id,title:j.title,vehicle:workOrders.find(o=>String(o.id)===j.work_order_id)?.vehicle||"Автомобіль",status:jobLabels[j.status],open:()=>setFocusOrder(j.work_order_id)})):undefined} items={staffList} selected={selectedTech} select={setSelectedTech} bookings={bookings} earnings={workflow.available?workflow.data.earnings.filter(e=>e.status!=='void').map(e=>({staffId:e.staff_id,amount:e.amount,accruedAt:e.accrued_at})):staffEarnings} shifts={workflow.available?workflow.data.shifts.map(s=>({staffId:s.staff_id,startedAt:s.started_at,endedAt:s.ended_at,pausedAt:s.paused_at})):staffShifts} onStatus={(id,status)=>{void updateStatus(id,status).then(error=>{if(error)showNotice(error)})}} add={addStaff} remove={removeStaff}/><Suspense fallback={null}><TeamAccess refreshVersion={syncVersion} tenantId={tenantId!}/><TeamSchedules tenantId={tenantId} staff={staffList.map(item=>({id:item.id,name:item.name,color:item.color}))} schedules={workSchedules} save={saveWorkSchedule} remove={removeWorkSchedule}/></Suspense></>} {page === 'Кабінет майстра' && <Suspense fallback={<p className="content">Завантаження кабінету…</p>}><><div className="content"><label>Перегляд кабінету майстра<Select value={selectedTech} onChange={e=>setSelectedTech(e.target.value)}><option value="">Оберіть майстра</option>{staffList.map(member=><option key={member.id} value={member.name}>{member.name}</option>)}</Select></label><p>Перегляд власника. Дії виконує майстер зі свого акаунта.</p></div>{workflow.available?<MasterWorkspace readOnly workflow={workflow} member={staffList.find(item=>item.name===selectedTech)||null} orders={workOrders} staff={staffList}/>:<MasterCabinet readOnly staff={staffList.find(item=>item.name===selectedTech)||null} orders={workOrders} shifts={staffShifts} earnings={staffEarnings} toggleShift={toggleShift} updateOrder={updateWorkOrder}/>}</></Suspense>} {page === 'Завдання' && <Suspense fallback={<p className="content">Завантаження завдань…</p>}><Tasks tasks={tasks} staff={staffList.map(item=>({id:item.id,name:item.name}))} clients={clients.map(item=>({id:item.id,name:item.name}))} add={addTask} update={updateTask} remove={removeTask}/></Suspense>} {page === 'Звернення' && <Suspense fallback={<p className="content">Завантаження звернень…</p>}><Leads items={leads} clients={clients.map(item=>({id:item.id,name:item.name,phone:item.phone}))} staff={staffList.map(item=>({id:item.id,name:item.name}))} add={addLead} update={updateLead} remove={removeLead}/></Suspense>} {page === 'Замовлення' && <Suspense fallback={<p className="content">Завантаження замовлень…</p>}><WorkOrders workflow={workflow.available?workflow:undefined} items={workOrders} clients={clients.map(item=>({id:item.id,name:item.name,car:item.car}))} staff={staffList} add={addWorkOrder} update={updateWorkOrder} remove={removeWorkOrder} recordPayment={recordWorkOrderPayment} approve={approveWorkOrder}/></Suspense>} {page === 'Продажі' && <Suspense fallback={<p className="content">Завантаження продажів…</p>}><Sales items={sales} clients={clients.map(item=>({id:item.id,name:item.name}))} products={inventory.map(item=>({id:item.id,name:item.name,unit:item.unit,quantity:item.quantity,price:item.sellingPrice}))} add={addSale}/></Suspense>} {page === 'Рахунки' && <Suspense fallback={<p className="content">Завантаження рахунків…</p>}><Invoices items={invoices} clients={clients.map(item=>({id:item.id,name:item.name}))} add={addInvoice} update={updateInvoice}/></Suspense>} {page === 'Фінанси' && workflow.available && <section className="content"><Payroll workflow={workflow} staff={staffList} orders={workOrders}/></section>}{page === 'Фінанси' && <Suspense fallback={<p className="content">Завантаження фінансів…</p>}><CashFlow legacyAccruals={legacyAccruals} items={cashTransactions} clients={clients.map(item=>({id:item.id,name:item.name}))} add={addCashTransaction} remove={removeCashTransaction}/></Suspense>} {page === 'Оплати' && <Payments bookings={filtered} updatePayment={updatePayment}/>} {page === 'Витрати' && <Expenses items={expenses} add={addExpense} remove={removeExpense}/>} {page === 'Склад' && <Inventory items={inventory} movements={inventoryMovements} add={addInventory} writeOff={writeOffInventory} updateMinimum={updateInventoryMinimum}/>} {page === 'Аналітика' && <Suspense fallback={<p className="content">Завантаження аналітики…</p>}><Analytics bookings={bookings} expenses={expenses} cashTransactions={cashTransactions}/></Suspense>} {page === 'Онлайн-запис' && <Suspense fallback={<p className="content">Завантаження заявок…</p>}><BookingRequests bookings={bookings} update={updateStatus} link={studioProfile.slug ? `${window.location.origin}/?book=${studioProfile.slug}` : ''}/></Suspense>} {page === 'Тариф' && <Billing plan={plan} select={setPlan}/>} {page === 'Налаштування' && <SettingsPage selectedTenantId={tenantId}/>}
    </main>{focusOrder&&workOrders.find(o=>String(o.id)===focusOrder)&&<OrderWorkDialog order={workOrders.find(o=>String(o.id)===focusOrder)!} workflow={workflow} staff={staffList} close={()=>setFocusOrder(null)}/>} {modal && <BookingModal initialDate={bookingDate} bookings={bookings} clients={clients} services={serviceList} staff={staffList} close={() => setModal(false)} save={createBooking}/>} {authOpen && <AuthModal close={() => setAuthOpen(false)}/>} {tenantOpen && <TenantModal close={() => setTenantOpen(false)} created={id => {setTenantId(id);setConnection('connected')}}/>}
  </div>
}

function AuthModal({close}:{close:()=>void}) {
  const [mode,setMode] = useState<'login'|'register'>('login'), [name,setName] = useState(''), [email,setEmail] = useState(''), [password,setPassword] = useState(''), [message,setMessage] = useState(''), [loading,setLoading] = useState(false)
  async function submit(e:FormEvent) { e.preventDefault(); if (!supabase) return; setLoading(true); setMessage(''); const result = mode === 'login' ? await supabase.auth.signInWithPassword({email,password}) : await supabase.auth.signUp({email,password,options:{data:{full_name:name}}}); setLoading(false); if (result.error) { setMessage(result.error.message); return } if (mode === 'register' && !result.data.session) setMessage('Перевірте email і підтвердьте реєстрацію, потім увійдіть.'); else close() }
  return <div className="overlay"><form className="modal" onSubmit={submit}><button type="button" className="modal-close" onClick={close}><X size={20}/></button><p>Detailflow</p><h2>{mode === 'login' ? 'Вхід до студії' : 'Створити акаунт'}</h2>{mode === 'register' && <label>Ваше ім’я<input required value={name} onChange={e=>setName(e.target.value)}/></label>}<label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@studio.ua"/></label><label>Пароль<input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Мінімум 8 символів"/></label>{message && <small style={{color:'#c14b62',fontWeight:650}}>{message}</small>}<button className="primary" type="submit" disabled={loading}>{loading ? 'Зачекайте…' : mode === 'login' ? 'Увійти' : 'Створити акаунт'}</button><button type="button" className="text-btn" onClick={()=>setMode(value=>value==='login'?'register':'login')}>{mode === 'login' ? 'Немає акаунта? Зареєструватися' : 'Вже є акаунт? Увійти'}</button></form></div>
}

function TenantModal({close,created}:{close:()=>void,created:(id:string)=>void}) {
  const [name,setName] = useState(''), [slug,setSlug] = useState(''), [message,setMessage] = useState(''), [loading,setLoading] = useState(false)
  const normalizeSlug = (value:string) => value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,63)
  async function submit(e:FormEvent) { e.preventDefault(); if (!supabase) return; const cleanSlug = normalizeSlug(slug); if (!/^[a-z0-9-]{3,63}$/.test(cleanSlug)) {setMessage('Введіть адресу від 3 символів: латинські літери, цифри та дефіси.');return} setLoading(true); const { data,error } = await supabase.rpc('bootstrap_tenant',{tenant_name:name.trim(),tenant_slug:cleanSlug,tenant_timezone:'Europe/Kyiv'}); setLoading(false); if (error) {setMessage(error.code === '23505' ? 'Така публічна адреса вже зайнята. Оберіть іншу.' : error.message);return} created(data); close() }
  return <div className="overlay"><form className="modal" onSubmit={submit}><h2>Створіть вашу студію</h2><p>Це створить окремий tenant — інші студії не бачитимуть ваші дані.</p><label>Назва студії<input required autoFocus value={name} onChange={e=>{setName(e.target.value); if(!slug) setSlug(normalizeSlug(e.target.value))}} placeholder="Detail Lab"/></label><label>Публічна адреса<input required pattern="[a-z0-9-]{3,63}" value={slug} onChange={e=>setSlug(normalizeSlug(e.target.value))} placeholder="detail-lab-kyiv"/><small>Латиниця, цифри та дефіси; наприклад: detail-test. Використаємо у сторінці запису.</small></label>{message && <small style={{color:'#c14b62',fontWeight:650}}>{message}</small>}<button className="primary" disabled={loading} type="submit">{loading?'Створюємо…':'Створити студію'}</button></form></div>
}

function Dashboard({bookings,staff,revenue,onCreate,onStatus,name,calendar,open}:{bookings:Booking[],staff:Staff[],revenue:number,onCreate:()=>void,onStatus:(id:number|string,s:Status)=>void,name:string,calendar:()=>void,open:(page:string)=>void}) {
  const done=bookings.filter(b=>b.status==='Завершено'), active=bookings.filter(b=>b.status==='В роботі'), pending=bookings.filter(b=>b.status==='Очікує підтвердження'), future=bookings.filter(b=>!['Завершено','Скасовано','Не прийшов'].includes(b.status)), planned=future.reduce((sum,b)=>sum+b.price-b.discount,0)
  const next=[...future].filter(b=>b.status!=='В роботі').sort((a,b)=>a.time.localeCompare(b.time))[0]
  const freeStaff=staff.filter(member=>!bookings.some(b=>b.tech===member.name&&['В роботі','Підтверджено'].includes(b.status)))
  const statusNote=active.length?`${active.length} ${active.length===1?'робота триває':'роботи тривають'}`:pending.length?`${pending.length} очікують підтвердження`:'Немає активних робіт'
  return <section className="content dashboard-page"><div className="page-title"><div><p>{new Date().toLocaleDateString('uk-UA',{weekday:'long',day:'numeric',month:'long'})}</p><h1>Вітаємо, {name}</h1></div><button className="primary" onClick={onCreate}><Plus size={18}/> Новий запис</button></div><div className="metrics"><Metric title="Виконано сьогодні" value={money(revenue)} change={done.length?`${done.length} завершених робіт`:'Ще немає завершених робіт'}/><Metric title="Заплановано на сьогодні" value={money(planned)} change={`${future.length} активних записів`}/><Metric title="Статус зміни" value={active.length?`${active.length} в роботі`:`${freeStaff.length} вільні`} change={statusNote}/></div><div className="dashboard-grid"><div className="panel schedule"><div className="panel-head"><div><h2>Розклад на сьогодні</h2><span>{bookings.length} записів · {active.length} у роботі</span></div><button className="text-btn" onClick={calendar}>Весь календар →</button></div><Schedule bookings={[...bookings].sort((a,b)=>a.time.localeCompare(b.time))} onStatus={onStatus}/>{!bookings.length&&<div className="dashboard-empty"><b>На сьогодні записів немає</b><span>Створіть запис вручну або поділіться посиланням на онлайн-запис.</span><button className="text-btn" onClick={onCreate}>Створити запис →</button></div>}</div><aside className="right-stack"><div className="panel dashboard-next"><span className="dashboard-kicker">Наступний запис</span>{next?<><b>{next.time} · {next.client}</b><p>{next.service} · {next.tech}</p><small>{next.car} · {money(next.price-next.discount)}</small><button className="text-btn" onClick={calendar}>Відкрити у календарі →</button></>:<><b>Записів у черзі немає</b><p>Усі заплановані роботи вже завершені або скасовані.</p><button className="text-btn" onClick={onCreate}>Новий запис →</button></>}</div><div className="panel team-load"><div className="panel-head"><div><h2>Команда сьогодні</h2><span>Активні записи за майстрами</span></div><button className="text-btn" onClick={()=>open('Команда')}>Команда →</button></div>{staff.length?staff.map(member=>{const memberBookings=bookings.filter(b=>b.tech===member.name&&!['Скасовано','Не прийшов'].includes(b.status)), busy=memberBookings.reduce((sum,b)=>sum+b.durationMinutes,0), percent=Math.min(100,Math.round(busy/480*100));return <div className="load" key={String(member.id)}><i className="person-dot" style={{background:member.color}}/><div><b>{member.name}</b><small>{memberBookings.length?`${memberBookings.length} записів · ${Math.round(busy/60*10)/10} год`:'Вільний сьогодні'}</small></div><strong>{percent}%</strong><div className="bar"><i style={{width:`${percent}%`,background:member.color}}/></div></div>}):<p className="dashboard-empty-copy">Додайте майстрів, щоб бачити їх завантаження.</p>}</div></aside></div></section>
}
function Metric({title,value,change}:{title:string,value:string,change:string}) { return <div className="metric"><span>{title}</span><b>{value}</b><small>{change}</small></div> }
function Schedule({bookings,onStatus}:{bookings:Booking[],onStatus:(id:number|string,s:Status)=>void}) { return <div className="schedule-list">{bookings.map(b=><article className="booking" key={b.id}><time>{b.time}</time><span className="booking-line"/><div className="booking-main"><b>{b.client}</b><span>{b.car}</span></div><div className="booking-service"><b>{b.service}</b><span>{b.tech} · {b.durationMinutes >= 480 ? `${b.durationMinutes / 60} год` : `${b.durationMinutes} хв`}</span></div><strong>{money(b.price)}</strong><Select value={b.status} onChange={e=>onStatus(b.id,e.target.value as Status)} className={`status ${b.status}`}><option>Очікує підтвердження</option><option>Підтверджено</option><option>В роботі</option><option>Завершено</option><option>Скасовано</option><option>Не прийшов</option></Select></article>)}</div> }
function Calendar({bookings,onCreate,onStatus}:{bookings:Booking[],onCreate:(date:string)=>void,onStatus:(id:number|string,s:Status)=>void}) {
  const dateKey=(value:Date)=>{const local=new Date(value.getTime()-value.getTimezoneOffset()*60_000);return local.toISOString().slice(0,10)}
  const [techFilter,setTechFilter]=useState(''),[statusFilter,setStatusFilter]=useState('')
  const [selectedDate,setSelectedDate]=useState(dateKey(new Date())), [weekAnchor,setWeekAnchor]=useState(dateKey(new Date()))
  const anchor=new Date(`${weekAnchor}T12:00:00`), monday=new Date(anchor); monday.setDate(anchor.getDate()-(anchor.getDay()+6)%7)
  const days=Array.from({length:7},(_,index)=>{const day=new Date(monday);day.setDate(monday.getDate()+index);return {key:dateKey(day),label:day.toLocaleDateString('uk-UA',{weekday:'short',day:'numeric'})}})
  const selectedBookings=bookings.filter(item=>item.date===selectedDate && (!techFilter || item.tech===techFilter) && (!statusFilter || item.status===statusFilter)).sort((a,b)=>a.time.localeCompare(b.time)), title=`Тиждень ${monday.toLocaleDateString('uk-UA',{day:'numeric',month:'long'})} – ${days[6] ? new Date(`${days[6].key}T12:00:00`).toLocaleDateString('uk-UA',{day:'numeric',month:'long'}) : ''}`
  function moveWeek(offset:number){const next=new Date(monday);next.setDate(monday.getDate()+offset*7);const nextKey=dateKey(next);setWeekAnchor(nextKey);setSelectedDate(nextKey)}
  return <section className="content"><div className="page-title"><div><p>{title}</p><h1>Календар записів</h1></div><div style={{display:'flex',gap:10,alignItems:'center'}}><button className="text-btn" onClick={()=>moveWeek(-1)}>← Тиждень</button><button className="text-btn" onClick={()=>{const today=dateKey(new Date());setWeekAnchor(today);setSelectedDate(today)}}>Сьогодні</button><button className="text-btn" onClick={()=>moveWeek(1)}>Тиждень →</button><button className="primary" onClick={()=>onCreate(selectedDate)}><Plus size={18}/> Новий запис</button></div></div><div className="calendar-filters"><label>Дата<DateInput type="date" required value={selectedDate} onChange={e=>{if(e.target.value){setSelectedDate(e.target.value);setWeekAnchor(e.target.value)}}}/></label><label>Майстер<Select value={techFilter} onChange={e=>setTechFilter(e.target.value)}><option value="">Усі майстри</option>{[...new Set(bookings.map(item=>item.tech))].map(name=><option key={name}>{name}</option>)}</Select></label><label>Статус<Select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">Усі статуси</option>{['Очікує підтвердження','Підтверджено','В роботі','Завершено','Скасовано','Не прийшов'].map(status=><option key={status}>{status}</option>)}</Select></label></div><div className="panel calendar"><div className="calendar-days">{days.map(day=><button type="button" className={day.key===selectedDate?'today':''} onClick={()=>setSelectedDate(day.key)} key={day.key}>{day.label}</button>)}</div><div className="panel-head" style={{padding:'18px 18px 0'}}><div><h2>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('uk-UA',{weekday:'long',day:'numeric',month:'long'})}</h2><span>{selectedBookings.length ? `${selectedBookings.length} записів` : 'Вільний день'}</span></div></div>{selectedBookings.length?<Schedule bookings={selectedBookings} onStatus={onStatus}/>:<p style={{padding:20,color:'#777982'}}>На цей день записів немає. Створіть новий запис для обраної дати.</p>}</div></section>
}
function Clients({items,add,remove,bookings,edit}:{items:Client[],add:(client:Client)=>void,remove:(id:number|string)=>void,bookings:Booking[],edit:(id:number|string,name:string,phone:string,tags:string[],notes:string)=>Promise<string>}) {
  const [adding,setAdding]=useState(false),[name,setName]=useState(''),[phone,setPhone]=useState(''),[car,setCar]=useState('')
  const [selected,setSelected]=useState<Client|null>(null),[editName,setEditName]=useState(''),[editPhone,setEditPhone]=useState(''),[editTags,setEditTags]=useState(''),[editNotes,setEditNotes]=useState(''),[message,setMessage]=useState(''),[saving,setSaving]=useState(false),[tagFilter,setTagFilter]=useState(''),[segment,setSegment]=useState<'all'|'new'|'returning'|'untagged'>('all')
  const history=(client:Client)=>bookings.filter(item=>item.clientId===client.id).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time))
  const tags=[...new Set(items.flatMap(client=>client.tags||[]))].sort((a,b)=>a.localeCompare(b,'uk'))
  const visible=items.filter(client=>{const visits=history(client).filter(item=>item.status==='Завершено').length;return (!tagFilter||(client.tags||[]).includes(tagFilter))&&(segment==='all'||segment==='new'&&visits===0||segment==='returning'&&visits>1||segment==='untagged'&&!(client.tags||[]).length)})
  function submit(e:FormEvent){e.preventDefault();if(!name.trim())return;add({id:Date.now(),name:name.trim(),phone:phone||'Не вказано',car:car||'Авто не вказано',visits:0,total:0});setName('');setPhone('');setCar('');setAdding(false)}
  function open(client:Client){setSelected(client);setEditName(client.name);setEditPhone(client.phone==='Не вказано'?'':client.phone);setEditTags((client.tags||[]).join(', '));setEditNotes(client.notes||'');setMessage('')}
  async function save(e:FormEvent){e.preventDefault();if(!selected || saving)return;setSaving(true);try{const tags=editTags.split(',').map(tag=>tag.trim()).filter(Boolean);const error=await edit(selected.id,editName,editPhone,tags,editNotes);setMessage(error || 'Зміни збережено.')}catch{setMessage('Не вдалося зберегти зміни.')}finally{setSaving(false)}}
  return <section className="content"><div className="page-title"><div><p>CRM · {items.length} клієнтів</p><h1>Клієнти</h1></div><button className="primary" onClick={()=>setAdding(v=>!v)}><Plus size={18}/> Додати клієнта</button></div><div className="panel crm-filters"><label>Сегмент<Select value={segment} onChange={e=>setSegment(e.target.value as typeof segment)}><option value="all">Усі клієнти</option><option value="new">Без завершених візитів</option><option value="returning">Повторні клієнти</option><option value="untagged">Без тегів</option></Select></label><label>Тег<Select value={tagFilter} onChange={e=>setTagFilter(e.target.value)}><option value="">Усі теги</option>{tags.map(tag=><option key={tag}>{tag}</option>)}</Select></label><span>Показано: {visible.length}</span></div>
    {adding && <form className="panel settings" onSubmit={submit}><h2>Новий клієнт</h2><label>Ім’я<input required value={name} onChange={e=>setName(e.target.value)}/></label><label>Телефон<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>Автомобіль<input value={car} onChange={e=>setCar(e.target.value)}/></label><button className="primary">Зберегти клієнта</button></form>}
    <div className="panel table"><div className="table-row table-head"><span>Клієнт</span><span>Авто</span><span>Завершено візитів</span><span>Сума завершених робіт</span></div>
    {visible.map(client=>{const completed=history(client).filter(item=>item.status==='Завершено');return <div className="table-row" key={client.id}><span><button className="text-btn" onClick={()=>open(client)}>{client.name}</button><small>{client.phone}{(client.tags||[]).length?` · ${(client.tags||[]).join(', ')}`:''}</small></span><span>{client.car}</span><span>{completed.length}</span><span>{money(completed.reduce((sum,item)=>sum+item.price-item.discount,0))}<button className="text-btn" onClick={()=>open(client)}>Картка клієнта</button></span></div>})}
    {!visible.length && <p className="empty-state">Клієнтів за цим сегментом не знайдено.</p>}</div>
    {selected && <div className="overlay"><div className="modal client-detail"><button className="modal-close" aria-label="Закрити картку" onClick={()=>setSelected(null)}><X/></button><h2>Картка клієнта</h2><form className="settings" onSubmit={save}><label>Ім’я<input required value={editName} onChange={e=>setEditName(e.target.value)}/></label><label>Телефон<input value={editPhone} onChange={e=>setEditPhone(e.target.value)}/></label><label>Теги<input value={editTags} onChange={e=>setEditTags(e.target.value)} placeholder="VIP, корпоративний, повторний"/></label><label>Внутрішня нотатка<textarea value={editNotes} onChange={e=>setEditNotes(e.target.value)} placeholder="Побажання клієнта, важливі деталі авто"/></label><p>Автомобілі: {selected.car}</p><button disabled={saving} className="primary">{saving?'Збереження…':'Зберегти зміни'}</button>{message && <p role="status">{message}</p>}</form><h3>Історія записів</h3>{history(selected).map(item=><div className="client-history" key={item.id}><b>{item.date} · {item.time} · {item.service}</b><span>{item.tech} · {item.status} · {money(item.price-item.discount)}</span></div>)}{!history(selected).length && <p>Історія записів порожня.</p>}<button className="text-btn" disabled={saving} onClick={()=>{if(window.confirm('Видалити клієнта? Клієнта з історією записів база може не дозволити видалити.')){remove(selected.id);setSelected(null)}}}>Видалити клієнта</button></div></div>}
  </section>
}
function Services({items,add,remove}:{items:typeof services,add:(item:(typeof services)[number])=>void,remove:(name:string)=>void}) {
  const [adding,setAdding] = useState(false), [name,setName] = useState(''), [category,setCategory] = useState('Мийка'), [duration,setDuration] = useState('1 год'), [price,setPrice] = useState('')
  function submit(e:React.FormEvent) { e.preventDefault(); const amount = Number(price); if (!name.trim() || !amount) return; add([name.trim(),category,duration,amount]); setName(''); setPrice(''); setAdding(false) }
  return <section className="content"><div className="page-title"><div><p>Каталог</p><h1>Послуги</h1></div><button className="primary" onClick={() => setAdding(value => !value)}><Plus size={18}/> Додати послугу</button></div>{adding && <form className="panel settings" onSubmit={submit} style={{marginBottom:16}}><h2>Нова послуга</h2><label>Назва<input required value={name} onChange={e => setName(e.target.value)} placeholder="Наприклад, тонування"/></label><label>Категорія<Select value={category} onChange={e => setCategory(e.target.value)}><option>Мийка</option><option>Полірування</option><option>Кераміка</option><option>Хімчистка</option><option>Тонування</option></Select></label><label>Тривалість<input required value={duration} onChange={e => setDuration(e.target.value)} placeholder="2 год"/></label><label>Ціна, ₴<NumberInput required min="1" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="2500"/></label><button className="primary" type="submit">Зберегти послугу</button></form>}<div className="service-list">{items.map(s=><div className="panel service" key={s[0]}><span className="service-icon"><Sparkles size={20}/></span><div><b>{s[0]}</b><small>{s[1]} · {s[2]}</small></div><strong>{money(s[3])}</strong><button className="text-btn" onClick={() => remove(s[0])}>Видалити</button></div>)}</div></section>
}
function Team({items,selected,select,bookings,earnings,shifts,onStatus,add,remove,work}:{work?:{staffId:string|null;title:string;vehicle:string;status:string;open:()=>void}[];items:Staff[],selected:string,select:(name:string)=>void,bookings:Booking[],earnings:{staffId:string;amount:number;accruedAt:string}[],shifts:{staffId:string;startedAt:string;endedAt:string|null;pausedAt?:string|null}[],onStatus:(id:number|string,status:Status)=>void,add:(member:Staff,email:string)=>Promise<string>,remove:(id:number|string)=>void}) {
  const [adding,setAdding]=useState(false),[name,setName]=useState(''),[email,setEmail]=useState(''),[speciality,setSpeciality]=useState(''),[color,setColor]=useState('#A7D65C'),[message,setMessage]=useState(''),[saving,setSaving]=useState(false)
  const current=items.find(item=>item.name===selected)||items[0], month=studioMonth(new Date().toISOString())
  const currentShift=current?shifts.find(shift=>String(shift.staffId)===String(current.id)&&!shift.endedAt):undefined
  const myBookings=bookings.filter(item=>item.tech===current?.name), earned=current?earnings.filter(item=>String(item.staffId)===String(current.id)&&studioMonth(item.accruedAt)===month).reduce((sum,item)=>sum+item.amount,0):0
  async function submit(event:FormEvent){event.preventDefault();if(!name.trim()||saving)return;setSaving(true);const member:Staff={id:Date.now(),name:name.trim(),role:'Майстер',color,load:0,speciality:speciality||'Спеціалізація не вказана'};const error=await add(member,email);setSaving(false);if(error){setMessage(error);return}select(member.name);setName('');setEmail('');setSpeciality('');setAdding(false);setMessage(email?'Майстра додано, запрошення надіслано на email.':'Майстра додано. Email можна додати при наступному редагуванні.')}
  return <section className="content"><div className="page-title"><div><p>Співробітники</p><h1>Команда та кабінет майстра</h1></div><button className="primary" onClick={()=>setAdding(value=>!value)}><Plus size={18}/> Додати майстра</button></div>{adding&&<form className="panel settings team-create" onSubmit={submit}><h2>Новий майстер</h2><label>Ім’я<input required autoFocus value={name} onChange={event=>setName(event.target.value)} placeholder="Ім’я та прізвище"/></label><label>Email для доступу<input required type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="master@example.com"/></label><label>Спеціалізація<input value={speciality} onChange={event=>setSpeciality(event.target.value)} placeholder="Наприклад, мийка, хімчистка"/></label><label>Колір у календарі<input type="color" value={color} onChange={event=>setColor(event.target.value)}/></label><p className="muted">Після збереження майстер отримає лист із посиланням для реєстрації та входу до свого кабінету.</p><button className="primary" disabled={saving} type="submit">{saving?'Надсилаємо…':'Додати та надіслати запрошення'}</button></form>}{message&&<p className="task-message" role="status">{message}</p>}<div className="team-grid master-cards">{items.map(member=>{const memberEarnings=earnings.filter(item=>String(item.staffId)===String(member.id)&&studioMonth(item.accruedAt)===month).reduce((sum,item)=>sum+item.amount,0),working=shifts.find(shift=>String(shift.staffId)===String(member.id)&&!shift.endedAt);return <button type="button" className={'panel team-card master-card '+(current?.id===member.id?'selected':'')} key={String(member.id)} onClick={()=>select(member.name)}><span className="team-avatar" style={{background:member.color}}>{member.name.split(' ').map(part=>part[0]).join('').slice(0,2)}</span><div><h2>{member.name}</h2><p>{member.speciality}</p></div><span className={working?'work-state active':'work-state'}>{working?(working.pausedAt?'На перерві':'На зміні'):'Не на зміні'}</span><div className="master-card-stats"><span>Зарплата за місяць<b>{money(memberEarnings)}</b></span><span>Статус<b>{working?`з ${new Date(working.startedAt).toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'})}`:'поза зміною'}</b></span></div></button>})}</div>{current&&<div className="dashboard-grid team-detail"><div className="panel schedule"><div className="panel-head"><div><p>Профіль майстра</p><h2>{current.name}</h2><span>{current.speciality} · {currentShift?`на зміні з ${new Date(currentShift.startedAt).toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'})}`:'зараз не на зміні'}</span></div><b>{money(earned)}</b></div><p className="muted">Зарплата за поточний місяць. Відсоток за послугами та графік редагуються нижче для обраного майстра.</p>{work?<div className="workflow">{work.filter(j=>j.staffId===String(current.id)).map((j,i)=><button className="wf-queue-item" key={i} onClick={j.open}><b>{j.vehicle}</b><span>{j.title} · {j.status}</span></button>)}{!work.some(j=>j.staffId===String(current.id))&&<p className="muted">Призначених робіт поки немає.</p>}</div>:myBookings.length?<Schedule bookings={myBookings} onStatus={onStatus}/>:<p className="muted">Призначених записів поки немає.</p>}</div><div className="panel reminder"><Clock3 size={19}/><div><b>Робоча зміна</b><p>{currentShift?`Майстер відзначив початок зміни о ${new Date(currentShift.startedAt).toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'})}.`:'Майстер ще не розпочинав зміну сьогодні.'}</p></div></div></div>}</section>
}function Payments({bookings,updatePayment}:{bookings:Booking[],updatePayment:(id:number|string,method:PaymentMethod)=>void}){const receipts=bookings.filter(b=>b.status==='Завершено'||b.status==='В роботі');return <section className="content"><div className="page-title"><div><p>Фінанси</p><h1>Чеки та оплати</h1></div><b>{money(receipts.reduce((sum,item)=>sum+item.price-item.discount,0))}</b></div><div className="panel table"><div className="table-row table-head"><span>Чек</span><span>Клієнт</span><span>Метод</span><span>Сума</span></div>{receipts.length ? receipts.map(b=><div className="table-row" key={b.id}><span>#{String(b.id)}<small>{b.status==='Завершено'?'Оплачено':'Очікує завершення'}</small></span><span><b>{b.client}</b><small>{b.service}{b.discount ? ` · знижка ${money(b.discount)}` : ''}</small></span><span><Select value={b.paymentMethod} onChange={e=>updatePayment(b.id,e.target.value as PaymentMethod)} className="status"><option>Картка</option><option>Готівка</option><option>Переказ</option></Select></span><span><b>{money(b.price-b.discount)}</b></span></div>):<p style={{padding:20,color:'#777982'}}>Чеки з’являться після початку або завершення послуги.</p>}</div></section>}
function Billing({plan,select}:{plan:string,select:(name:string)=>void}) {
  const plans = [{name:'Start',price:'690 ₴/міс.',note:'до 3 майстрів'},{name:'Studio',price:'1 490 ₴/міс.',note:'до 10 майстрів'},{name:'Pro',price:'2 990 ₴/міс.',note:'без обмежень'}]
  return <section className="content"><div className="page-title"><div><p>Платформа</p><h1>Тариф і білінг</h1></div></div><div className="panel reminder" style={{marginBottom:20}}><Clock3 size={19}/><div><b>Пробний період активний</b><p>12 днів до першого списання. План можна змінити в будь-який момент.</p></div></div><div className="team-grid">{plans.map(item => <div className="panel team-card" key={item.name} style={{outline:plan===item.name?'2px solid #3869e9':'none'}}><h2>{item.name}</h2><b style={{fontSize:22}}>{item.price}</b><small>{item.note}</small><p>Записи, CRM, календар і нагадування</p><button className={plan===item.name?'primary':'text-btn'} onClick={() => select(item.name)}>{plan===item.name?'Обрано':'Обрати тариф'}</button></div>)}</div><div className="panel settings" style={{marginTop:20,maxWidth:650}}><h2>Спосіб оплати</h2><p style={{margin:0,color:'#777982',fontSize:13}}>Онлайн-оплата тимчасово готується. Обраний тариф: {plan}.</p></div></section>
}
function Inventory({items,movements,add,writeOff,updateMinimum}:{items:InventoryItem[],movements:InventoryMovement[],add:(item:InventoryItem)=>void,writeOff:(id:number|string,quantity:number,note:string)=>Promise<boolean>,updateMinimum:(id:number|string,minimum:number)=>void}) {
  const [open,setOpen]=useState(false),[writeOffOpen,setWriteOffOpen]=useState(false),[query,setQuery]=useState(''),[name,setName]=useState(''),[quantity,setQuantity]=useState(''),[unit,setUnit]=useState('шт'),[minimum,setMinimum]=useState('0'),[cost,setCost]=useState(''),[sellingPrice,setSellingPrice]=useState(''),[writeOffItem,setWriteOffItem]=useState(''),[writeOffQuantity,setWriteOffQuantity]=useState(''),[writeOffNote,setWriteOffNote]=useState(''),[writeOffError,setWriteOffError]=useState('')
  const low=items.filter(item=>item.quantity<=item.minQuantity), filtered=items.filter(item=>item.name.toLowerCase().includes(query.toLowerCase())), selected=items.find(item=>String(item.id)===writeOffItem)
  function submit(e:React.FormEvent){e.preventDefault();if(!name.trim()||Number(quantity)<0)return;add({id:Date.now(),name:name.trim(),unit,quantity:Number(quantity),minQuantity:Number(minimum)||0,lastUnitCost:cost?Number(cost):null,sellingPrice:sellingPrice?Number(sellingPrice):null});setName('');setQuantity('');setCost('');setSellingPrice('');setOpen(false)}
  async function submitWriteOff(e:React.FormEvent){e.preventDefault();const value=Number(writeOffQuantity);if(!selected||!value||value<=0||value>selected.quantity){setWriteOffError('Вкажіть кількість, що не перевищує поточний залишок.');return}const success=await writeOff(selected.id,value,writeOffNote);if(success){setWriteOffItem('');setWriteOffQuantity('');setWriteOffNote('');setWriteOffError('');setWriteOffOpen(false)}else setWriteOffError('Не вдалося зберегти списання. Спробуйте ще раз.')}
  const movementLabel={purchase:'Закупівля',write_off:'Списання',adjustment:'Коригування'} as const
  return <section className="content"><div className="page-title"><div><p>Операційний облік</p><h1>Склад</h1></div><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="text-btn" onClick={()=>setWriteOffOpen(v=>!v)}>Списати матеріал</button><button className="primary" onClick={()=>setOpen(v=>!v)}><Plus size={18}/> Додати товар</button></div></div><div className="metrics"><Metric title="Позицій на складі" value={String(items.length)} change={`${low.length} потребують уваги`}/><Metric title="Низький залишок" value={String(low.length)} change="На рівні або нижче мінімуму"/><Metric title="Оцінка запасів" value={money(items.reduce((sum,item)=>sum+item.quantity*(item.lastUnitCost||0),0))} change="За собівартістю; без ціни — не враховано"/></div>{open&&<form className="panel settings" onSubmit={submit}><h2>Початковий залишок</h2><label>Назва товару<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Наприклад, шампунь pH neutral"/></label><label>Кількість<NumberInput required min="0" step="0.001" type="number" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><label>Одиниця<Select value={unit} onChange={e=>setUnit(e.target.value)}><option>шт</option><option>л</option><option>мл</option><option>кг</option><option>уп.</option></Select></label><label>Мінімальний залишок<NumberInput min="0" step="0.001" type="number" value={minimum} onChange={e=>setMinimum(e.target.value)}/></label><label>Собівартість одиниці, ₴<NumberInput min="0" step="0.01" type="number" value={cost} onChange={e=>setCost(e.target.value)}/></label><label>Ціна продажу, ₴<NumberInput min="0" step="0.01" type="number" value={sellingPrice} onChange={e=>setSellingPrice(e.target.value)} placeholder="Необов’язково"/></label><button className="primary" type="submit">Зберегти на склад</button></form>}{writeOffOpen&&<form className="panel settings" onSubmit={submitWriteOff} style={{marginTop:16}}><h2>Списання матеріалу</h2><p style={{margin:0,color:'#777982'}}>Використовуйте після виконаної послуги або при псуванні. Операція буде збережена в історії.</p><label>Товар<Select required value={writeOffItem} onChange={e=>{setWriteOffItem(e.target.value);setWriteOffError('')}}><option value="">Оберіть товар</option>{items.filter(item=>item.quantity>0).map(item=><option key={item.id} value={String(item.id)}>{item.name} — {item.quantity} {item.unit}</option>)}</Select></label><label>Кількість до списання<NumberInput required min="0.001" step="0.001" type="number" value={writeOffQuantity} onChange={e=>{setWriteOffQuantity(e.target.value);setWriteOffError('')}} placeholder={selected?`Максимум: ${selected.quantity} ${selected.unit}`:'Спочатку оберіть товар'}/></label><label>Причина / послуга<input value={writeOffNote} onChange={e=>setWriteOffNote(e.target.value)} placeholder="Наприклад, дітейлінг BMW X5"/></label>{writeOffError&&<p style={{margin:0,color:'#c14b62'}}>{writeOffError}</p>}<button className="primary" type="submit">Підтвердити списання</button></form>}<div className="panel" style={{marginTop:16,padding:14}}><div className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Пошук товару на складі"/></div></div><div className="panel table"><div className="table-row table-head"><span>Товар</span><span>Залишок</span><span>Мінімум</span><span>Собівартість</span><span>Ціна продажу</span></div>{filtered.map(item=><div className="table-row" key={item.id}><span><b>{item.name}</b><small>{item.quantity<=item.minQuantity?'Потрібно поповнити':'В наявності'}</small></span><span><b style={{color:item.quantity<=item.minQuantity?'#c14b62':undefined}}>{item.quantity} {item.unit}</b></span><span><NumberInput aria-label={`Мінімальний залишок для ${item.name}`} min="0" step="0.001" type="number" value={item.minQuantity} onChange={e=>updateMinimum(item.id,Number(e.target.value))} style={{maxWidth:90,padding:'7px 8px'}}/> {item.unit}</span><span>{item.lastUnitCost===null?'—':money(item.lastUnitCost)}</span><span>{item.sellingPrice===null?'—':money(item.sellingPrice)}</span></div>)}{!items.length&&<p style={{padding:20,color:'#777982'}}>Склад порожній. Додайте першу позицію або закупівлю матеріалів.</p>}{items.length>0&&!filtered.length&&<p style={{padding:20,color:'#777982'}}>За цим запитом товарів не знайдено.</p>}</div><div className="panel table" style={{marginTop:16}}><div className="panel-head"><div><h2>Історія руху</h2><span>Останні 20 операцій</span></div></div><div className="table-row table-head"><span>Дата та товар</span><span>Операція</span><span>Кількість</span><span>Примітка</span></div>{movements.map(movement=><div className="table-row" key={movement.id}><span><b>{movement.itemName}</b><small>{new Date(movement.createdAt).toLocaleString('uk-UA',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</small></span><span>{movementLabel[movement.type]}</span><span style={{color:movement.quantity<0?'#c14b62':'#26754c'}}><b>{movement.quantity>0?'+':''}{movement.quantity} {movement.unit}</b></span><span>{movement.note||'—'}</span></div>)}{!movements.length&&<p style={{padding:20,color:'#777982'}}>Рухи з’являться після закупівель, коригувань або списань.</p>}</div></section>
}
function Expenses({items,add,remove}:{items:Expense[],add:(item:Expense)=>void,remove:(id:number|string)=>void}) {
  const [adding,setAdding] = useState(false), [title,setTitle] = useState(''), [category,setCategory] = useState('Матеріали'), [amount,setAmount] = useState(''), [method,setMethod] = useState('Картка'), [note,setNote] = useState(''), [stockQuantity,setStockQuantity] = useState(''), [stockUnit,setStockUnit] = useState('шт')
  const total = items.reduce((sum,item) => sum + item.amount,0)
  function submit(e:React.FormEvent) {
    e.preventDefault()
    const value = Number(amount), quantity = Number(stockQuantity)
    if (!title.trim() || !value || (category === 'Матеріали' && (!quantity || quantity < 0))) return
    add({id:Date.now(),date:localDate(),category,title:title.trim(),amount:value,method,note,stockQuantity:category === 'Матеріали' ? quantity : undefined,stockUnit:category === 'Матеріали' ? stockUnit : undefined})
    setTitle('');setAmount('');setNote('');setStockQuantity('');setStockUnit('шт');setAdding(false)
  }
  return <section className="content"><div className="page-title"><div><p>Фінанси</p><h1>Витрати студії</h1></div><button className="primary" onClick={() => setAdding(value => !value)}><Plus size={18}/> Додати витрату</button></div><div className="metrics"><Metric title="Витрати за період" value={money(total)} change={`${items.length} операції`}/><Metric title="Матеріали" value={money(items.filter(item => item.category === 'Матеріали').reduce((sum,item)=>sum+item.amount,0))} change="Контроль запасів"/><Metric title="Найбільша стаття" value={items.length ? money(Math.max(...items.map(item=>item.amount))) : money(0)} change="За поточний період"/></div>{adding && <form className="panel settings" onSubmit={submit} style={{marginBottom:16,maxWidth:720}}><h2>Нова витрата</h2><label>Опис<input autoFocus required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Наприклад, закупівля мікрофібри"/></label><label>Категорія<Select value={category} onChange={e=>setCategory(e.target.value)}><option>Матеріали</option><option>Оренда</option><option>Зарплата</option><option>Маркетинг</option><option>Комунальні</option><option>Інше</option></Select></label>{category === 'Матеріали' && <><label>Кількість на склад<NumberInput required min="0.001" step="0.001" type="number" value={stockQuantity} onChange={e=>setStockQuantity(e.target.value)} placeholder="Наприклад, 5"/></label><label>Одиниця виміру<Select value={stockUnit} onChange={e=>setStockUnit(e.target.value)}><option>шт</option><option>л</option><option>мл</option><option>кг</option><option>уп.</option></Select></label></>}<label>Сума, ₴<NumberInput required min="1" step="0.01" type="number" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Спосіб оплати<Select value={method} onChange={e=>setMethod(e.target.value)}><option>Картка</option><option>Готівка</option><option>Переказ</option></Select></label><label>Примітка<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Необов’язково"/></label><button className="primary" type="submit">Зберегти витрату</button></form>}<div className="panel table"><div className="table-row table-head"><span>Дата та опис</span><span>Категорія</span><span>Оплата</span><span>Сума</span></div>{items.map(item=><div className="table-row" key={item.id}><span><b>{item.title}</b><small>{item.date}{item.stockQuantity ? ` · на склад: ${item.stockQuantity} ${item.stockUnit}` : ''}{item.note ? ` · ${item.note}` : ''}</small></span><span>{item.category}</span><span>{item.method}</span><span><b>{money(item.amount)}</b><button className="text-btn" onClick={() => remove(item.id)}>Видалити</button></span></div>)}</div></section>
}
function SettingsPage({selectedTenantId=null}:{selectedTenantId?:string|null}){
  const [setupCounts,setSetupCounts]=useState({services:0,staff:0,clients:0})
  const [saved,setSaved] = useState(false), [profileStatus,setProfileStatus] = useState('')
  const [studioName,setStudioName] = useState(''), [address,setAddress] = useState(''), [timezone,setTimezone] = useState('Europe/Kyiv'), [phone,setPhone] = useState(''), [email,setProfileEmail] = useState(''), [slug,setSlug] = useState('')
  const [sms,setSms] = useState(true), [emailReminders,setEmailReminders] = useState(false), [reminder24,setReminder24] = useState(true), [reminder2,setReminder2] = useState(true), [repeat,setRepeat] = useState('6')
  const [tenantId,setTenantId] = useState<string | null>(null), [remindersLoaded,setRemindersLoaded] = useState(false), [savingProfile,setSavingProfile] = useState(false)
  useEffect(() => {
    const client = supabase
    if (!client) return
    void client.auth.getUser().then(async ({data}) => {
      if (!data.user) return
      if (!selectedTenantId) return
      const membership = {data:{tenant_id:selectedTenantId}}
      setTenantId(membership.data.tenant_id)
      const [serviceCount,staffCount,clientCount]=await Promise.all([
        client.from('services').select('id',{count:'exact',head:true}).eq('tenant_id',membership.data.tenant_id).eq('active',true),
        client.from('staff_profiles').select('id',{count:'exact',head:true}).eq('tenant_id',membership.data.tenant_id).eq('active',true),
        client.from('clients').select('id',{count:'exact',head:true}).eq('tenant_id',membership.data.tenant_id)
      ])
      setSetupCounts({services:serviceCount.count||0,staff:staffCount.count||0,clients:clientCount.count||0})
      const tenant = await client.from('tenants').select('name,address,timezone,phone,email,slug').eq('id',membership.data.tenant_id).maybeSingle()
      if (tenant.data) { setStudioName(tenant.data.name || ''); setAddress(tenant.data.address || ''); setTimezone(tenant.data.timezone || 'Europe/Kyiv'); setPhone(tenant.data.phone || ''); setProfileEmail(tenant.data.email || ''); setSlug(tenant.data.slug || '') }
      const settings = await client.from('reminder_settings').select('sms_enabled,email_enabled,reminder_24h_enabled,reminder_2h_enabled').eq('tenant_id',membership.data.tenant_id).maybeSingle()
      if (settings.data) { setSms(settings.data.sms_enabled); setEmailReminders(settings.data.email_enabled); setReminder24(settings.data.reminder_24h_enabled); setReminder2(settings.data.reminder_2h_enabled) }
      setRemindersLoaded(true)
    })
  }, [selectedTenantId])
  useEffect(() => {
    if (!supabase || !tenantId || !remindersLoaded) return
    void supabase.from('reminder_settings').update({sms_enabled:sms,email_enabled:emailReminders,reminder_24h_enabled:reminder24,reminder_2h_enabled:reminder2}).eq('tenant_id',tenantId)
  }, [tenantId,remindersLoaded,sms,emailReminders,reminder24,reminder2])
  async function saveProfile(e:FormEvent) {
    e.preventDefault(); setProfileStatus('')
    if (!studioName.trim()) { setProfileStatus('Вкажіть назву студії.'); return }
    if (!supabase || !tenantId) { setProfileStatus('Увійдіть у акаунт, щоб зберегти зміни.'); return }
    setSavingProfile(true)
    const {error}=await supabase.from('tenants').update({name:studioName.trim(),address:address.trim() || null,timezone,phone:phone.trim() || null,email:email.trim() || null}).eq('id',tenantId).select('id').single()
    setSavingProfile(false)
    if (error) { setProfileStatus('Не вдалося зберегти профіль. Спочатку виконайте SQL-міграцію 004.'); return }
    setSaved(true); setProfileStatus('Профіль студії збережено.')
  }
  const bookingLink = slug ? `${window.location.origin}/?book=${slug}` : ''
  return <section className="content"><div className="page-title"><div><p>Студія</p><h1>Налаштування та онбординг</h1></div></div><div className="dashboard-grid"><form className="panel settings studio-settings" onSubmit={saveProfile}><h2>Профіль студії</h2><label>Назва студії<input required value={studioName} onChange={e=>setStudioName(e.target.value)} placeholder="Назва вашої студії"/></label><label>Адреса<input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Місто, вулиця, номер"/></label><label>Телефон студії<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+380…"/></label><label>Email студії<input type="email" value={email} onChange={e=>setProfileEmail(e.target.value)} placeholder="studio@example.com"/></label><label>Часовий пояс<Select value={timezone} onChange={e=>setTimezone(e.target.value)}><option>Europe/Kyiv</option><option>Europe/Warsaw</option></Select></label>{profileStatus&&<small style={{color:profileStatus.includes('збережено')?'#26754c':'#c14b62',fontWeight:650}}>{profileStatus}</small>}<button className="primary" disabled={savingProfile} type="submit">{savingProfile?'Зберігаємо…':saved?'Збережено':'Зберегти зміни'}</button></form><div className="right-stack"><div className="panel"><div className="panel-head"><div><h2>Запуск студії</h2><span>Послуг: {setupCounts.services} · Майстрів: {setupCounts.staff} · Клієнтів: {setupCounts.clients}</span></div></div><div className="schedule-list"><div className="booking"><time>•</time><span className="booking-line"/><div className="booking-main"><b>Профіль студії</b><span>Назва, адреса та часовий пояс</span></div></div><div className="booking"><time>•</time><span className="booking-line"/><div className="booking-main"><b>Каталог послуг</b><span>Послуг у каталозі: {setupCounts.services}</span></div></div><div className="booking"><time>•</time><span className="booking-line"/><div className="booking-main"><b>Команда</b><span>Майстрів у команді: {setupCounts.staff}</span></div></div><div className="booking"><time>4</time><span className="booking-line"/><div className="booking-main"><b>Імпорт клієнтів</b><span>Необов’язково — можна зробити пізніше</span></div></div></div></div><ClientImport key={tenantId} tenantId={tenantId} onComplete={()=>{if(supabase&&tenantId)void supabase.from('clients').select('id',{count:'exact',head:true}).eq('tenant_id',tenantId).then(({count,error})=>{if(!error)setSetupCounts(v=>({...v,clients:count||0}))})}}/></div></div><div className="panel settings" style={{marginTop:20,maxWidth:760}}><h2>Нагадування клієнтам</h2><label><span>SMS-нагадування</span><input type="checkbox" checked={sms} onChange={e => setSms(e.target.checked)}/></label><label><span>Email-нагадування</span><input type="checkbox" checked={emailReminders} onChange={e => setEmailReminders(e.target.checked)}/></label><label><span>За 24 години до запису</span><input type="checkbox" checked={reminder24} onChange={e => setReminder24(e.target.checked)}/></label><label><span>За 2 години до запису</span><input type="checkbox" checked={reminder2} onChange={e => setReminder2(e.target.checked)}/></label><label>Повторний візит для кераміки, місяців (ще не підключено)<NumberInput disabled title="Автоматичні повторні візити ще не підключено" type="number" min="1" max="24" value={repeat} onChange={e => setRepeat(e.target.value)}/></label><small style={{color:'#777982'}}>Активно: {[sms && 'SMS',emailReminders && 'email'].filter(Boolean).join(' та ') || 'канали вимкнені'} · {[reminder24 && 'за 24 год',reminder2 && 'за 2 год'].filter(Boolean).join(', ') || 'час не вибрано'}.</small></div></section>
}
function BookingModal({initialDate,bookings,clients,services,staff,close,save}:{initialDate:string,bookings:Booking[],clients:Client[],services:typeof import('./data').services,staff:Staff[],close:()=>void,save:(b:Booking)=>Promise<string>}) {
  const [client,setClient] = useState(''), [phone,setPhone] = useState(''), [car,setCar] = useState(''), [showMatches,setShowMatches] = useState(false)
  const [service,setService] = useState(services[0]?.[0] || ''), [tech,setTech] = useState('')
  const [date,setDate] = useState(initialDate || new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)), [time,setTime] = useState('17:30'), [error,setError] = useState(''), [saving,setSaving]=useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!client.trim()||saving) return
    const s = services.find(x => x[0] === service)
    if(!s){setError('Додайте та оберіть послугу.');return}
    const durationMinutes = parseDuration(s[2])
    const start = Number(time.slice(0, 2)) * 60 + Number(time.slice(3)); const end = start + durationMinutes
    const overlaps = tech && bookings.some(item => {
      if (item.tech !== tech || item.date !== date || item.status === 'Скасовано' || item.status === 'Не прийшов' || item.status === 'Очікує підтвердження') return false
      const itemStart = Number(item.time.slice(0, 2)) * 60 + Number(item.time.slice(3))
      return start < itemStart + item.durationMinutes && end > itemStart
    })
    if (overlaps) { setError('Цей майстер уже зайнятий у вибраний час. Оберіть інший слот.'); return }
    setSaving(true)
    const result=await save({ id: Date.now(), date, time, client, car: car || 'Авто не вказано', service, tech, price: s[3], discount: 0, paymentMethod: 'Картка', durationMinutes, status: 'Підтверджено', phone: phone || 'Не вказано' })
    setSaving(false);if(result)setError(result)
  }
  const matches = clients.filter(item => `${item.name} ${item.phone} ${item.car}`.toLowerCase().includes(client.toLowerCase())).slice(0,5)
  function chooseClient(item:Client) { setClient(item.name); setPhone(item.phone === 'Не вказано' ? '' : item.phone); setCar(item.car === 'Авто не вказано' ? '' : item.car); setShowMatches(false) }
  return <div className="overlay"><form className="modal" onSubmit={submit}>
    <button type="button" className="modal-close" onClick={close}><X size={20}/></button><p>Адміністратор · CRM</p><h2>Новий запис</h2>
    <label>Клієнт<input autoFocus required value={client} onFocus={() => setShowMatches(true)} onChange={e => {setClient(e.target.value);setShowMatches(true)}} placeholder="Почніть вводити ім’я або телефон"/>{showMatches && client.trim() && <span style={{display:'grid',gap:5,marginTop:2,padding:6,border:'1px solid #dfe3ea',borderRadius:10,background:'#fff',boxShadow:'0 10px 24px rgba(30,32,39,.10)'}}>{matches.length ? matches.map(item => <button type="button" key={String(item.id)} onMouseDown={e => e.preventDefault()} onClick={() => chooseClient(item)} style={{border:0,borderRadius:7,padding:'10px 12px',background:'#f7f8fa',color:'#20222b',textAlign:'left',display:'grid',gap:3,cursor:'pointer',fontFamily:'inherit'}}><b style={{fontSize:13}}>{item.name}</b><small style={{fontSize:11,color:'#777982'}}>{item.phone} · {item.car}</small></button>) : <small style={{padding:'7px 8px',fontSize:11,color:'#777982'}}>Новий клієнт — буде створений і збережений після підтвердження запису.</small>}</span>}</label>
    <label>Телефон<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+380…"/></label>
    <label>Автомобіль<input value={car} onChange={e => setCar(e.target.value)} placeholder="Марка, модель, номер"/></label>
    <label>Послуга<Select value={service} onChange={e => setService(e.target.value)}>{services.map(s => <option key={s[0]} value={s[0]}>{s[0]} · {s[2]} · {money(s[3])}</option>)}</Select></label>
    <label>Дата<DateInput type="date" value={date} onChange={e => setDate(e.target.value)}/></label><label>Час<DateInput type="time" value={time} onChange={e => setTime(e.target.value)}/></label>
    <label>Майстер<Select value={tech} onChange={e => setTech(e.target.value)}><option value="">Не призначено — у спільний список</option>{staff.map(t => <option key={String(t.id)}>{t.name}</option>)}</Select></label>{error && <small style={{color:'#c14b62',fontWeight:650}}>{error}</small>}
    <button className="primary" type="submit">Підтвердити запис</button>
  </form></div>
}

export { Dashboard, Calendar, Clients, Team, Inventory, Expenses, BookingModal, Billing, SettingsPage }
