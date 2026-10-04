import {useEffect,useRef,useState} from 'react'
import {supabase} from '../lib/supabase'
import {t} from '../i18n/core'
import {NumberInput} from '../components/FormInputs'
import type {Job,JobMedia,PaintReading} from './model'
import type {WorkflowController} from './useWorkflow'
import './evidence.css'

export function EvidenceFile({media}:{media:JobMedia}){
 const [url,setUrl]=useState(''),[error,setError]=useState(false),[version,setVersion]=useState(0)
 useEffect(()=>{let live=true;setUrl('');setError(false);void supabase?.storage.from('job-photos').createSignedUrl(media.path,300).then(r=>{if(live){if(r.error)setError(true);else setUrl(r.data.signedUrl)}});return()=>{live=false}},[media.path,version])
 return <figure className="evidence-file">{url?<>{media.mime?.startsWith('video/')?<video controls preload="metadata" playsInline src={url}/>:<a href={url} target="_blank" rel="noreferrer"><img loading="lazy" src={url} alt={media.name}/></a>}<a href={url} target="_blank" rel="noreferrer">{media.name||t('Відкрити файл')}</a><button className="text-btn" onClick={()=>setVersion(v=>v+1)}>{t('Оновити посилання')}</button></>:error?<button onClick={()=>setVersion(v=>v+1)}>{t('Повторити завантаження')}</button>:<span>{t('Завантаження…')}</span>}</figure>
}
export default function JobEvidence({job,workflow,readOnly}:{job:Job;workflow:WorkflowController;readOnly:boolean}){
 const [pending,setPending]=useState<Record<string,unknown>|null>(null)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),[readings,setReadings]=useState<PaintReading[]>(job.paint_readings||[]),dirty=useRef(false),lock=useRef(false)
 useEffect(()=>{if(!dirty.current)setReadings(job.paint_readings||[])},[job.paint_readings])
 const frozen=readOnly||busy||['review','approved'].includes(job.status)
 async function save(payload:Record<string,unknown>){if(import.meta.env.DEV&&job.tenant_id==='qa')throw new Error(t('Матеріали перевіряються з підключеною базою'));if(!supabase)throw new Error(t('Немає підключення'));const r=await supabase.rpc('save_job_evidence',{job_input:job.id,version_input:job.version,payload});if(r.error)throw new Error(t(r.error.message))}
 async function run(action:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');setSaved(false);try{await action();setSaved(true)}catch(e){setError(e instanceof Error?e.message:t('Не вдалося зберегти. Повторіть спробу.'))}finally{lock.current=false;setBusy(false);workflow.refresh()}}
 async function upload(file:File,phase:'before'|'after'){
  if(import.meta.env.DEV&&job.tenant_id==='qa')throw new Error(t('Матеріали перевіряються з підключеною базою'))
  const allowed=['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'];if(!allowed.includes(file.type)||file.size<=0||file.size>(file.type.startsWith('image/')?8:50)*1024*1024)throw new Error(t('Фото до 8 МБ, відео до 50 МБ'))
  if(!supabase)throw new Error(t('Немає підключення'));const path=`${job.tenant_id}/${job.id}/${crypto.randomUUID()}.${file.type==='video/quicktime'?'mov':file.type.split('/')[1]}`
  const r=await supabase.storage.from('job-photos').upload(path,file,{contentType:file.type});if(r.error)throw new Error(t('Не вдалося завантажити файл'))
  // On an ambiguous response, keep the object: the attachment may already be committed.
  const attachment={action:'media',path,name:file.name,phase};setPending(attachment);await save(attachment);setPending(null)
 }
 function update(i:number,patch:Partial<PaintReading>){dirty.current=true;setSaved(false);setReadings(rows=>rows.map((r,n)=>n===i?{...r,...patch}:r))}
 return <section className="job-evidence"><h4>{t('Фото та відео роботи')}</h4><div className="evidence-phases">{(['before','after'] as const).map(phase=><section key={phase}><h4>{t(phase==='before'?'До початку робіт':'Після роботи')}</h4><div className="evidence-grid">{job.attachments.filter(a=>a.phase===phase).map(a=><EvidenceFile key={a.path} media={a}/>)}</div>{!readOnly&&<label className="evidence-upload">{t('Додати фото або відео')}<input aria-label={t(phase==='before'?'Файли до роботи':'Файли після роботи')} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" disabled={frozen||!!pending||job.attachments.length>=40} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void run(()=>upload(file,phase))}}/></label>}</section>)}</div>{job.attachments.some(a=>!a.phase)&&<details><summary>{t('Попередні фото без етапу')}</summary><div className="evidence-grid">{job.attachments.filter(a=>!a.phase).map(a=><EvidenceFile key={a.path} media={a}/>)}</div></details>}
 <details open={/полір|polish/i.test(job.title)||readings.length>0}><summary>{t('Товщина покриття, мкм')}</summary><p>{t('Для полірування: вкажіть деталь кузова та заміри до і після.')}</p>{readings.map((r,i)=><div className="paint-row" key={i}><label>{t('Деталь кузова')}<input value={r.panel} maxLength={100} disabled={frozen} onChange={e=>update(i,{panel:e.target.value})}/></label><label>{t('До, мкм')}<NumberInput min={0} max={5000} step="0.1" value={r.before??''} disabled={frozen} onChange={e=>update(i,{before:e.target.value===''?null:Number(e.target.value)})}/></label><label>{t('Після, мкм')}<NumberInput min={0} max={5000} step="0.1" value={r.after??''} disabled={frozen} onChange={e=>update(i,{after:e.target.value===''?null:Number(e.target.value)})}/></label>{!readOnly&&<button className="text-btn" disabled={frozen} onClick={()=>{dirty.current=true;setReadings(v=>v.filter((_,n)=>n!==i))}}>{t('Прибрати')}</button>}</div>)}{!readOnly&&<div className="wf-actions"><button className="text-btn" disabled={frozen||readings.length>=30} onClick={()=>{dirty.current=true;setReadings(v=>[...v,{panel:'',before:null,after:null}])}}>{t('Додати замір')}</button><button className="secondary" disabled={frozen||!dirty.current} onClick={()=>void run(async()=>{await save({action:'paint',readings});dirty.current=false})}>{t('Зберегти заміри')}</button></div>}</details>
 {!readOnly&&<small>{t('Фото: JPG, PNG, WebP до 8 МБ. Відео: MP4, WebM, MOV до 50 МБ. До 40 файлів на роботу.')}</small>}{busy&&<p role="status">{t('Завантаження…')}</p>}{saved&&<p role="status">{t('Збережено')}</p>}{error&&<p role="alert" className="wf-error">{t(error)}</p>}{pending&&!readOnly&&<button disabled={frozen} onClick={()=>void run(async()=>{await save(pending);setPending(null)})}>{t('Повторити прив’язку завантаженого файлу')}</button>}</section>
}
