import {useState} from 'react'
import {supabase} from '../lib/supabase'
import {Card} from '../components/UI'
import {t} from '../i18n/core'
import type {Job} from './model'
import type {WorkflowController} from './useWorkflow'
import JobEvidence from './JobEvidence'
export default function SoloJobCard({job,workflow}:{job:Job;workflow:WorkflowController}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),finished=['approved','review'].includes(job.status)
 async function act(){if(busy)return;setBusy(true);setError('');try{const r=await supabase?.rpc('solo_work_action',{job_input:job.id,action_input:job.status==='in_progress'?'complete':'start',version_input:job.version});if(r?.error)throw r.error;workflow.refresh()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <Card className="wf-job master-stage-card"><h3>{job.title}</h3><p>{t(finished?'Завершено':job.status==='in_progress'?'В роботі':'Призначено')}</p><JobEvidence job={job} workflow={workflow} readOnly={busy||finished} phase={finished?undefined:job.status==='in_progress'?'after':'before'}/>{!finished&&<div className="master-stage-action"><button className="primary" disabled={busy} onClick={()=>void act()}>{t(job.status==='in_progress'?'Завершити':'Почати')}</button></div>}{error&&<p role="alert">{t(error)}</p>}</Card>
}
