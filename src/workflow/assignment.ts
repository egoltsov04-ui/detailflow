import type { Job } from './model'

export function canAssignJob(job:Job):boolean {
  return ['new','assigned'].includes(job.status)&&!job.worked_seconds&&!job.running_since
}

// Use the same versioned RPC and automatic service compensation as JobEditor.
export function jobAssignmentInput(job:Job,staffId:string):Record<string,unknown> {
  if(!canAssignJob(job))throw new Error('Виконавця можна змінити лише до початку роботи.')
  return {id:job.id,title:job.title,stage:job.stage,position:job.position,service_id:job.service_id||'',staff_id:staffId,price:job.price,pay_mode:'auto',checklist:job.checklist.map(c=>({title:c.title}))}
}
