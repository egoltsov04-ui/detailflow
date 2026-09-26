import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { readAllPages } from '../lib/pagination'
import { emptyData, type Job, type WorkflowData } from './model'

export type WorkflowController={data:WorkflowData;available:boolean;loading:boolean;error:string;refresh:()=>void;act:(job:Job,action:string,payload?:Record<string,unknown>)=>Promise<void>;save:(orderId:string,input:Record<string,unknown>,version?:number)=>Promise<void>;shift:(staffId:string,action:string)=>Promise<void>;pay:(id:string,amount:number,method:string,key:string,note:string)=>Promise<void>;photo:(job:Job,file:File)=>Promise<void>;photoUrl:(path:string)=>Promise<string>}
export function useWorkflow(tenantId:string|null):WorkflowController {
 const [data,setData]=useState<WorkflowData>(emptyData),[loading,setLoading]=useState(true),[error,setError]=useState(''),[available,setAvailable]=useState(false)
 const generation=useRef(0),currentTenant=useRef(tenantId)
 currentTenant.current=tenantId
 const loadSnapshot=useCallback(async()=>{
   if(currentTenant.current!==tenantId)return
   const db=supabase,ticket=++generation.current
   const current=()=>ticket===generation.current&&currentTenant.current===tenantId
   if(!db||!tenantId){setLoading(false);return}
   const load=(table:string,order='id')=>readAllPages((from,to)=>db.from(table).select('*').eq('tenant_id',tenantId).order(order).order('id').range(from,to))
   try {
     const probe=await db.rpc('job_workflow_version')
     if(!current())return
     if(probe.error){
       if(probe.error.code==='PGRST202'){setAvailable(false);setError('');return}
       throw probe.error
     }
     setAvailable(true)
     const results=await Promise.all([load('work_order_jobs','created_at'),load('staff_shifts','started_at'),load('staff_earnings','accrued_at'),load('work_job_events','created_at'),load('staff_payouts','created_at'),load('services','name')])
     if(!current())return
     if(results.some(r=>r.error))throw new Error('snapshot')
     const [jobs,shifts,earnings,events,payouts,services]=results.map(r=>r.data||[])
     setData({jobs:jobs.map((j:any)=>({...j,price:Number(j.price),rate:Number(j.rate)})),shifts:shifts as any,earnings:earnings.map((e:any)=>({...e,amount:Number(e.amount),paid_amount:Number(e.paid_amount)})),events:events as any,payouts:payouts.map((p:any)=>({...p,amount:Number(p.amount)})),services:services.filter((s:any)=>s.active).map((s:any)=>({...s,price:Number(s.price)}))})
     setError('')
   }catch{if(current())setError('Не вдалося оновити дані. Перевірте з’єднання та натисніть «Оновити».')}
   finally{if(current())setLoading(false)}
 },[tenantId])
 const refresh=useCallback(()=>{void loadSnapshot()},[loadSnapshot])
 useEffect(()=>{setData(emptyData);setAvailable(false);setLoading(true);void loadSnapshot();return()=>{generation.current++}},[loadSnapshot])
 useEffect(()=>{
   if(!tenantId||!supabase)return
   let timer:ReturnType<typeof setTimeout>|undefined
   const changed=()=>{clearTimeout(timer);timer=setTimeout(refresh,150)}
   const channel=supabase.channel('workflow-'+tenantId)
   for(const table of ['work_order_jobs','staff_shifts','staff_earnings','work_job_events','staff_payouts','work_orders'])channel.on('postgres_changes',{event:'*',schema:'public',table,filter:`tenant_id=eq.${tenantId}`},changed)
   channel.subscribe()
   const poll=setInterval(()=>{if(document.visibilityState==='visible')refresh()},5000)
   window.addEventListener('focus',changed);window.addEventListener('online',changed);document.addEventListener('visibilitychange',changed)
   return ()=>{clearInterval(poll);clearTimeout(timer);window.removeEventListener('focus',changed);window.removeEventListener('online',changed);document.removeEventListener('visibilitychange',changed);void supabase?.removeChannel(channel)}
 },[tenantId,refresh])
 async function rpc(name:string,args:Record<string,unknown>){
   if(!supabase)throw new Error('Немає підключення')
   const result=await supabase.rpc(name,args)
   await loadSnapshot()
   if(result.error)throw new Error(result.error.message)
 }
 const act=(job:Job,action:string,payload:Record<string,unknown>={})=>rpc('act_work_job',{job_id_input:job.id,action_input:action,payload,expected_version:job.version})
 return {data,available,loading,error,refresh,act,save:(orderId,input,expected)=>rpc('save_work_job',{order_id:orderId,job_input:input,expected_version:expected??null}),shift:(staffId,action)=>rpc('manage_master_shift',{staff_id_input:staffId,action_input:action}),pay:(id,amount,method,key,note)=>rpc('record_staff_payout',{earning_id_input:id,amount_input:amount,method_input:method,request_id:key,note_input:note}),
 async photo(job,file){
   if(!supabase)throw new Error('Немає підключення')
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw new Error('Оберіть JPG, PNG або WebP до 8 МБ')
   const path=`${job.tenant_id}/${job.id}/${crypto.randomUUID()}.${file.type.split('/')[1]}`
   const upload=await supabase.storage.from('job-photos').upload(path,file,{contentType:file.type});if(upload.error)throw new Error('Не вдалося завантажити фото')
   // A lost response may follow a committed attachment; never delete its object on an ambiguous error.
   await act(job,'photo',{path,name:file.name})
 },async photoUrl(path){if(!supabase)return '';const r=await supabase.storage.from('job-photos').createSignedUrl(path,300);if(r.error)throw new Error('Фото недоступне');return r.data.signedUrl}}
}
