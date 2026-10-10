import {useRef,useState} from 'react'
import {Select} from './components/Select'
import {NumberInput,DateInput} from './components/FormInputs'
import {FormField,Card} from './components/UI'
import {t} from './i18n/core'
import {localDate} from './lib/formValues'
import type {WorkOrder,WorkOrderPayment} from './WorkOrders'
export default function OrderActions({order,update,remove,pay,post}:{order:WorkOrder;update:(id:WorkOrder['id'],patch:Partial<WorkOrder>)=>Promise<string>;remove:(id:WorkOrder['id'])=>Promise<string>;pay:(order:WorkOrder,payment:WorkOrderPayment)=>Promise<string>;post?:React.ReactNode}){
 const [paying,setPaying]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[amount,setAmount]=useState(''),[method,setMethod]=useState<WorkOrderPayment['method']>('Картка'),[date,setDate]=useState(localDate()),[request,setRequest]=useState(()=>crypto.randomUUID())
 const lock=useRef(false)
 const remaining=Math.max(0,order.total-order.deposit)
 async function run(action:()=>Promise<string>){if(lock.current)return;lock.current=true;setBusy(true);try{setError(await action())}catch{setError(t('Не вдалося зберегти. Повторіть спробу.'))}finally{lock.current=false;setBusy(false)}}
 return <Card className="panel order-panel-actions">{post}<div className="wf-actions">{remaining>0&&order.status!=='cancelled'&&<button className="primary" disabled={busy} onClick={()=>{setAmount(String(remaining));setPaying(!paying)}}>{t('Внести оплату')}</button>}{order.status==='ready'&&<button className="primary" disabled={busy} onClick={()=>void run(()=>update(order.id,{status:'issued'}))}>{t('Видати авто')}</button>}{!['ready','issued'].includes(order.status)&&<button className="text-btn" disabled={busy} onClick={()=>void run(()=>remove(order.id))}>{t('Видалити замовлення')}</button>}</div>{paying&&<form onSubmit={e=>{e.preventDefault();void run(async()=>{const value=Number(amount.replace(',','.'));if(!Number.isFinite(value)||value<=0||value>remaining)return t('Перевірте суму оплати');const message=await pay(order,{requestId:request,amount:value,method,date,note:''});if(!message){setPaying(false);setRequest(crypto.randomUUID())}return message})}}><FormField>{t('Сума, ₴')}<NumberInput required min={0.01} max={remaining} step={0.01} value={amount} onChange={e=>setAmount(e.target.value)}/></FormField><FormField>{t('Дата')}<DateInput required value={date} onChange={e=>setDate(e.target.value)}/></FormField><FormField>{t('Спосіб оплати')}<Select value={method} onChange={e=>setMethod(e.target.value as typeof method)}>{['Картка','Готівка','Переказ'].map(x=><option key={x} value={x}>{t(x)}</option>)}</Select></FormField><button className="primary" disabled={busy}>{t('Підтвердити оплату')}</button></form>}{error&&<p role="alert">{t(error)}</p>}</Card>
}
