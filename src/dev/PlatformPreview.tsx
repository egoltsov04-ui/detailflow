import {useMemo,useState} from 'react'
import ClientWorkspace,{type ClientCard} from '../ClientWorkspace'
import Receipts,{type Receipt} from '../Receipts'
import type {WorkOrder} from '../WorkOrders'
export default function PlatformPreview(){
 const [tab,setTab]=useState('clients')
 const stores=useMemo(()=>{
  let clients:ClientCard[]=[{id:'client-test',name:'Тестовий клієнт',phone:'+380000000000',email:'qa@example.com',notes:'Зателефонувати перед видачею автомобіля',tags:['Постійний'],vehicles:[{id:'car-1',make:'BMW',model:'X5',plate:'TEST 001',year:'2022',notes:''},{id:'car-2',make:'Tesla',model:'Model 3',plate:'TEST 002',year:'2023',notes:''}]}]
  let receipts:Receipt[]=[]
  return {clients:{load:()=>clients,save:(c:ClientCard)=>{clients=c.id?clients.map(x=>x.id===c.id?c:x):[...clients,{...c,id:crypto.randomUUID()}]}},receipts:{load:()=>receipts,issue:(id:string,discount:number)=>{const receipt:Receipt={id:'receipt-test',number:1001,work_order_id:id,subtotal:1500,discount,total:1500-discount,created_at:new Date().toISOString(),snapshot:{studio:'Detailflow · Test Studio',address:'Тестова адреса',phone:'+380000000000',client:'Тестовий клієнт',client_id:'client-test',client_phone:'+380000000000',vehicle:'BMW X5 · TEST 001',order:'Мийка XL',lines:[{name:'Мийка · XL',amount:1500,staff_id:'staff-test'}]}};receipts=[receipt];return receipt},payments:()=>[{amount:500,method:'card',paid_on:'2026-09-29'}]}}
 },[])
 const order:WorkOrder={id:'order-test',clientId:'client-test',clientName:'Тестовий клієнт',staffId:'staff-test',staffName:'Тестовий майстер',title:'Мийка XL',vehicle:'BMW X5 · TEST 001',serviceSummary:'Мийка XL',status:'ready',total:1500,deposit:500,dueAt:'',notes:'',createdAt:new Date().toISOString(),statusChangedAt:new Date().toISOString(),checklist:[],compensationPercent:null,compensationFixed:null,submittedForReviewAt:'',reviewNote:''}
 return <><div className="content"><button className="text-btn" onClick={()=>setTab('clients')}>CRM · нові картки</button><button className="text-btn" onClick={()=>setTab('receipts')}>Чеки · друк і знижка</button></div>{tab==='clients'?<ClientWorkspace tenantId="test" bookings={[]} onSaved={()=>{}} previewStore={stores.clients}/>:<Receipts tenantId="test" orders={[order]} staff={[{id:'staff-test',name:'Тестовий майстер'}]} onIssued={()=>{}} previewStore={stores.receipts}/>}</>
}
