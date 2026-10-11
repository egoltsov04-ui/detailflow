import {useEffect,useState} from 'react'
import {Card,FormField} from '../components/UI'
import {t} from '../i18n/core'
import type {WorkOrder} from '../WorkOrders'
import type {WorkflowController} from './useWorkflow'
import type {Job} from './model'
import JobEvidence from './JobEvidence'

export const isReturned=(job:Job)=>!!job.review_note&&['waiting','in_progress'].includes(job.status)
export default function MasterJobCard({job,order,workflow,readOnly=false}:{job:Job;order:WorkOrder;workflow:WorkflowController;readOnly?:boolean}){
 const [now,setNow]=useState(Date.now()),[busy,setBusy]=useState(false),[error,setError]=useState(''),[note,setNote]=useState(job.note)
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[])
 useEffect(()=>setNote(job.note),[job.note])
 const shift=workflow.data.shifts.find(s=>s.staff_id===job.staff_id&&!s.ended_at),working=!!shift&&!shift.paused_at
 const frozen=readOnly||busy||!!workflow.error||['review','approved'].includes(job.status)||['issued','cancelled'].includes(order.status)
 const running=job.status==='in_progress',returned=isReturned(job),start=['assigned','waiting'].includes(job.status),finished=['review','approved'].includes(job.status)
 const planned=order.plannedMinutes??job.planned_minutes,elapsed=order.startedAt?Math.max(0,(now-Date.parse(order.startedAt))/60000):0,remaining=planned==null?null:planned-elapsed
 const minutes=Math.ceil(Math.abs(remaining??0)),clock=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0')
 async function act(action:string,payload:Record<string,unknown>={}){if(busy)return;setBusy(true);setError('');try{await workflow.act(job,action,payload)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const primary=<button className="primary" disabled={frozen||!working||(running&&(!job.checklist.length||job.checklist.some(c=>!c.done)))} onClick={()=>void act(start?'start':'submit')}>{t(start?(job.status==='waiting'?'Продовжити роботу':'Почати роботи'):'Здати на перевірку')}</button>
 return <Card as="article" className="wf-job master-stage-card">
  {returned&&<div className="master-return" role="status"><b>{t('Повернено')}</b><p>{job.review_note}</p></div>}
  <h3>{job.title}</h3><p>{order.vehicle||order.title} · {order.clientName}</p>
  {planned!=null&&<p>{t('Планова тривалість')}: {planned} {t('хв')}</p>}
  {start&&<div className="master-stage-top">{primary}</div>}
  {running&&<div className={'master-work-timer '+(remaining!==null&&remaining<0?'post-overdue':'')}><strong>{!order.startedAt?t('Оновлюємо час початку…'):remaining===null?t('Планову тривалість не задано'):t(remaining<0?'Прострочено':'Залишилось')+' '+clock}</strong>{!!planned&&<progress aria-label={t('Прогрес роботи')} max={100} value={Math.min(100,elapsed/planned*100)}/>}<button className="text-btn" disabled={frozen} onClick={()=>void act('pause')}>{t('Призупинити')}</button></div>}
  {finished&&<p className="wf-note">{t(job.status==='review'?'Очікує підтвердження':'Завершено')}</p>}
  {(running||finished)&&<div className="wf-checks">{job.checklist.map(c=><FormField key={c.id}><input type="checkbox" checked={c.done} disabled={frozen||!working} onChange={e=>void act('check',{item_id:c.id,done:e.target.checked})}/>{c.title}</FormField>)}</div>}
  <JobEvidence job={job} workflow={workflow} readOnly={frozen} phase={start?'before':running?'after':undefined} showPaint={!start}/>
  {running&&<details><summary>{t('Коментар')}</summary><FormField>{t('Коментар')}<textarea maxLength={4000} disabled={frozen} value={note} onChange={e=>setNote(e.target.value)}/></FormField><button className="text-btn" disabled={frozen||note===job.note} onClick={()=>void act('note',{note})}>{t('Зберегти коментар')}</button></details>}
  {finished&&job.note&&<p>{job.note}</p>}
  {error&&<p role="alert" className="wf-error">{t(error)}</p>}
  {!finished&&!working&&<p>{t(shift?.paused_at?'Завершіть перерву, щоб працювати.':'Розпочніть зміну, щоб працювати.')}</p>}
  {(start||running)&&<div className={'master-stage-action '+(start?'master-stage-start':'')}>{primary}</div>}
 </Card>
}
