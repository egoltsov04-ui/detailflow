import {useState,type FormEvent} from 'react'
import {X,Plus,Trash2} from 'lucide-react'
import {Select} from './components/Select'
import {NumberInput,DateInput} from './components/FormInputs'
import {studioDateTime} from './lib/formValues'
import {useStudioTimezone} from './lib/StudioTimezone'
import {resolveBookingServices,type BookingService} from './lib/bookingAvailability'
import {t,localeTag} from './i18n/core'
import type {WorkOrder} from './WorkOrders'
type Person={id:string|number;name:string;car?:string}
export default function OrderModal({services,clients,staff,close,add}:{services:BookingService[];clients:Person[];staff:Person[];close:()=>void;add:(item:WorkOrder)=>Promise<string>}){
 const timezone=useStudioTimezone(),[requestId]=useState(()=>crypto.randomUUID())
 const [clientId,setClientId]=useState(''),[staffId,setStaffId]=useState(''),[vehicle,setVehicle]=useState(''),[deposit,setDeposit]=useState('0'),[dueAt,setDueAt]=useState(''),[notes,setNotes]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false)
 const [lines,setLines]=useState([{key:crypto.randomUUID(),service:'',variant:''}])
 const client=clients.find(c=>String(c.id)===clientId),member=staff.find(s=>String(s.id)===staffId)
 let chosen:BookingService[]=[],selectionError=''
 try{chosen=lines.map(l=>resolveBookingServices(services,[l.service],l.variant?{[l.service]:l.variant}:{})[0])}catch(e){selectionError=(e as Error).message}
 const total=chosen.reduce((n,s)=>n+s.price,0),money=(n:number)=>n.toLocaleString(localeTag())+' ₴'
 async function submit(e:FormEvent){
  e.preventDefault();if(saving)return;setError('')
  if(!client){setError('Оберіть клієнта.');return}
  if(selectionError){setError(selectionError);return}
  const prepay=Number(deposit);if(!Number.isFinite(prepay)||prepay<0||prepay>total){setError('Передоплата не може бути більшою за суму замовлення.');return}
  setSaving(true)
  try{
   const now=new Date().toISOString(),summary=chosen.map(s=>s.name).join(', ')
   const result=await add({id:requestId,clientId:client.id,clientName:client.name,staffId:member?.id||null,staffName:member?.name||'',title:summary.slice(0,180),vehicle:vehicle.trim()||client.car||'',serviceSummary:summary,status:member?'assigned':'new',total,deposit:prepay,dueAt:dueAt?studioDateTime(dueAt.slice(0,10),dueAt.slice(11,16),timezone).toISOString():'',notes:notes.trim(),createdAt:now,statusChangedAt:now,checklist:chosen.map((s,i)=>({id:lines[i].key,title:s.name,done:false})),compensationPercent:null,compensationFixed:null,submittedForReviewAt:'',reviewNote:'',catalogServices:chosen.map((s,i)=>({service_id:s.id,variant_id:lines[i].variant,expected_price:s.price}))})
   if(result)setError(result)
  }catch(e){setError(e instanceof Error?e.message:'Не вдалося створити замовлення.')}finally{setSaving(false)}
 }
 return <div className="overlay"><form className="modal order-modal" onSubmit={submit} aria-label={t('Нове замовлення')}>
  <button type="button" className="modal-close" disabled={saving} onClick={close} aria-label={t('Закрити')}><X size={20}/></button><p>{t('Замовлення на роботи')}</p><h2>{t('Нове замовлення')}</h2>
  <label>{t('Клієнт')}<Select required value={clientId} onChange={e=>{setClientId(e.target.value);setVehicle('')}}><option value="">{t('Оберіть клієнта')}</option>{clients.map(c=><option key={c.id} value={String(c.id)}>{c.name}</option>)}</Select></label>
  <label>{t('Автомобіль')}<input value={vehicle} onChange={e=>setVehicle(e.target.value)} placeholder={client?.car||t('Марка, модель, номер')}/></label>
  <fieldset className="order-service-list"><legend>{t('Послуги з каталогу')}</legend>{lines.map((line,i)=>{const service=services.find(s=>s.id===line.service);return <div className="order-service-line" key={line.key}>
   <label>{t('Послуга')} {i+1}<Select required value={line.service} onChange={e=>setLines(rows=>rows.map(l=>l.key===line.key?{...l,service:e.target.value,variant:''}:l))}><option value="">{t('Оберіть послугу')}</option>{services.map(s=><option key={s.id} value={s.id}>{s.name}{!s.variants?.length?' · '+money(s.price):''}</option>)}</Select></label>
   {!!service?.variants?.length&&<label>{t('Варіант послуги')}<Select required value={line.variant} onChange={e=>setLines(rows=>rows.map(l=>l.key===line.key?{...l,variant:e.target.value}:l))}><option value="">{t('Оберіть варіант')}</option>{service.variants.map(v=><option key={v.id} value={v.id}>{v.name} · {money(v.price)}</option>)}</Select></label>}
   {service?.description&&<small>{service.description}</small>}{lines.length>1&&<button type="button" className="text-btn" onClick={()=>setLines(rows=>rows.filter(l=>l.key!==line.key))}><Trash2 size={16}/>{t('Прибрати послугу')}</button>}
  </div>})}<button type="button" className="secondary" disabled={lines.length>=20} onClick={()=>setLines(rows=>[...rows,{key:crypto.randomUUID(),service:'',variant:''}])}><Plus size={16}/>{t('Додати послугу')}</button>{!services.length&&<p>{t('Спочатку додайте послуги в каталог.')}</p>}</fieldset>
  <label>{t('Відповідальний майстер')}<Select value={staffId} onChange={e=>setStaffId(e.target.value)}><option value="">{t('Не призначено')}</option>{staff.map(s=><option key={s.id} value={String(s.id)}>{s.name}</option>)}</Select><small>{t('Можна призначити окремого майстра для кожної роботи після створення.')}</small></label>
  <div className="order-money"><div><span>{t('Разом')}</span><h2>{selectionError?'—':money(total)}</h2></div><label>{t('Передоплата, ₴')}<NumberInput type="number" min="0" max={total} step="0.01" value={deposit} onChange={e=>setDeposit(e.target.value)}/></label></div>
  <label>{t('Термін готовності')}<DateInput type="datetime-local" value={dueAt} onChange={e=>setDueAt(e.target.value)}/></label><label>{t('Внутрішня примітка')}<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label>
  {error&&<p role="alert" className="form-error">{t(error)}</p>}<button className="primary" disabled={saving||!services.length}>{saving?t('Зберігаємо…'):t('Створити замовлення')}</button>
 </form></div>
}
