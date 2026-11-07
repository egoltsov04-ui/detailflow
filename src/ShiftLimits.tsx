import {useStudioTimezone} from './lib/StudioTimezone'
import {useEffect,useState} from 'react'
import {supabase} from './lib/supabase'
import {Card,FormField} from './components/UI'
import {NumberInput,DateInput} from './components/FormInputs'
import {t,localeTag} from './i18n/core'
import type {Attendance} from './workflow/model'
import type {WorkflowController} from './workflow/useWorkflow'
export function ShiftWarnings({shifts,staff}:{shifts:Attendance[];staff:{id:string|number;name:string}[]}){
 const timezone=useStudioTimezone()
 const rows=shifts.filter(s=>s.auto_closed_reason&&s.ended_at&&Date.parse(s.auto_closed_at||s.ended_at)>Date.now()-7*86400000)
 if(!rows.length)return null
 return <Card className="panel shift-warnings" role="status"><h2>{t('Автоматично завершені зміни')}</h2><p>{t('Майстер не закрив зміну вчасно. Перевірте робочий час перед нарахуванням.')}</p>{rows.map(s=><p key={s.id}><b>{staff.find(p=>String(p.id)===s.staff_id)?.name||t('Майстер')}</b> · {new Date(s.ended_at!).toLocaleString(localeTag(),{timeZone:timezone})} · {t(s.auto_closed_reason==='break_limit'?'Перевищено ліміт перерви':s.auto_closed_reason==='studio_closed'?'Кінець робочого дня':'Перевищено ліміт зміни')}</p>)}</Card>
}
/** Owner/admin confirms that a master is actually at the studio; the shift counts from this moment. */
export function ShiftRequests({workflow,staff}:{workflow:WorkflowController;staff:{id:string|number;name:string}[]}){
 const timezone=useStudioTimezone(),[reasons,setReasons]=useState<Record<string,string>>({}),[busy,setBusy]=useState(''),[error,setError]=useState('')
 const rows=workflow.data.shift_requests.filter(r=>r.status==='pending')
 if(!rows.length)return null
 const decide=async(id:string,approve:boolean)=>{if(busy)return;setBusy(id);setError('');try{await workflow.decideShift(id,approve,reasons[id])}catch(e){setError(e instanceof Error?e.message:'Не вдалося зберегти')}finally{setBusy('')}}
 return <Card className="panel shift-requests"><h2>{t('Запити на початок зміни')}</h2><p>{t('Підтвердіть, коли майстер на місці. Зміна рахується з моменту підтвердження.')}</p>{error&&<p role="alert">{t(error)}</p>}{rows.map(r=>{const name=staff.find(p=>String(p.id)===r.staff_id)?.name||t('Майстер');return <div className="shift-request" key={r.id}><div><b>{name}</b><span>{t('Запит о')} {new Date(r.requested_at).toLocaleTimeString(localeTag(),{timeZone:timezone,hour:'2-digit',minute:'2-digit'})}</span></div><FormField>{t('Причина відмови, необов’язково')}<input maxLength={300} value={reasons[r.id]||''} onChange={e=>setReasons(v=>({...v,[r.id]:e.target.value}))}/></FormField><div className="page-actions"><button className="primary" disabled={!!busy} onClick={()=>void decide(r.id,true)}>{t('Підтвердити')}</button><button className="secondary" disabled={!!busy} onClick={()=>void decide(r.id,false)}>{t('Відхилити')}</button></div></div>})}</Card>
}
export default function ShiftLimits({studio}:{studio:string}){
 const [hours,setHours]=useState('12'),[pause,setPause]=useState('180'),[close,setClose]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[loaded,setLoaded]=useState(false),[approval,setApproval]=useState(true)
 useEffect(()=>{let live=true;setLoaded(false);void supabase?.from('tenants').select('shift_max_hours,break_max_minutes,shift_close_time,shift_approval').eq('id',studio).single().then(r=>{if(!live)return;if(r.error){setMessage(t('Не вдалося завантажити ліміти змін'));return}setHours(String(r.data.shift_max_hours));setPause(String(r.data.break_max_minutes));setClose(r.data.shift_close_time?.slice(0,5)||'');setApproval(r.data.shift_approval!==false);setLoaded(true)});return()=>{live=false}},[studio])
 return <Card as="form" className="panel settings" onSubmit={async e=>{e.preventDefault();if(busy||!supabase||!loaded)return;setBusy(true);try{const r=await supabase.rpc('save_shift_limits',{studio,hours_input:Number(hours),break_input:Number(pause),close_input:close||null,approval_input:approval});setMessage(r.error?.message||t('Ліміти збережено'))}finally{setBusy(false)}}}><h2>{t('Автоматичне завершення зміни')}</h2><p>{t('Після першого досягнутого ліміту перерва та зміна закриваються, поточна робота стає на паузу.')}</p><FormField>{t('Максимальна зміна, год')}<NumberInput min={1} max={24} required value={hours} onChange={e=>setHours(e.target.value)}/></FormField><FormField>{t('Максимальна перерва, хв')}<NumberInput min={15} max={480} step={15} required value={pause} onChange={e=>setPause(e.target.value)}/></FormField><FormField>{t('Кінець дня студії, необов’язково')}<DateInput type="time" value={close} onChange={e=>setClose(e.target.value)}/></FormField><label className="shift-approval-toggle"><span>{t('Підтвердження початку зміни')}<small>{t('Майстер починає зміну лише після підтвердження власника або адміністратора.')}</small></span><input type="checkbox" checked={approval} onChange={e=>setApproval(e.target.checked)}/></label>{message&&<p role="status">{t(message)}</p>}<button className="primary" disabled={busy||!loaded}>{t('Зберегти')}</button></Card>
}
