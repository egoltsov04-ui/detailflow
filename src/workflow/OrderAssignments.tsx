import { useRef, useState } from 'react'
import { Select } from '../components/Select'
import { canAssignJob, jobAssignmentInput } from './assignment'
import type { Job } from './model'
import type { WorkflowController } from './useWorkflow'

type Member={id:string|number;name:string}
export default function OrderAssignments({orderId,closed,workflow,staff}:{orderId:string;closed:boolean;workflow:WorkflowController;staff:Member[]}) {
  const jobs=workflow.data.jobs.filter(j=>j.work_order_id===orderId).sort((a,b)=>a.position-b.position||a.created_at.localeCompare(b.created_at))
  if(closed)return null
  if(!jobs.length)return <p className="muted">{workflow.loading?'Завантажуємо роботи для призначення…':'Роботи не завантажено. Натисніть «Оновити» або відкрийте «Роботи та перевірка».'}</p>
  return <div className="order-job-assignments">{jobs.map(job=><JobAssignment key={job.id} job={job} workflow={workflow} staff={staff}/>)}</div>
}

function JobAssignment({job,workflow:w,staff}:{job:Job;workflow:WorkflowController;staff:Member[]}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false),lock=useRef(false)
  const editable=canAssignJob(job),member=staff.find(s=>String(s.id)===job.staff_id)
  async function assign(staffId:string){
    if(lock.current||!editable||staffId===(job.staff_id||''))return
    if(staffId&&!staff.some(s=>String(s.id)===staffId))return
    lock.current=true;setBusy(true);setMessage('');setFailed(false)
    try{await w.save(job.work_order_id,jobAssignmentInput(job,staffId),job.version);setMessage(staffId?'Майстра призначено.':'Призначення знято.')}
    catch(error){setFailed(true);setMessage(error instanceof Error?error.message:'Не вдалося призначити майстра. Спробуйте ще раз.')}
    finally{lock.current=false;setBusy(false)}
  }
  return <div className="order-job-assignment" draggable={false} onDragStart={e=>e.stopPropagation()}>
    <label><span>{job.title}</span>{editable?<Select aria-label={`Майстер: ${job.title}`} disabled={busy||w.loading||!!w.error||!staff.length} value={job.staff_id||''} onChange={e=>void assign(e.target.value)}><option value="">Призначити майстра</option>{job.staff_id&&!member&&<option value={job.staff_id}>Поточний майстер недоступний</option>}{staff.map(s=><option key={s.id} value={String(s.id)}>{s.name}{w.data.shifts.some(sh=>sh.staff_id===String(s.id)&&!sh.ended_at&&!sh.paused_at)?' · на зміні':''}</option>)}</Select>:<b>{member?.name||'Майстра не призначено'}</b>}</label>
    {busy?<small role="status">Зберігаємо призначення…</small>:message&&<small role={failed?'alert':'status'}>{message}</small>}
    {editable&&!staff.length&&<small>Спочатку додайте активного майстра в розділі «Команда».</small>}
  </div>
}
