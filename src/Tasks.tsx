import { FormEvent, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type Task = { id:string|number; title:string; description:string; status:TaskStatus; priority:TaskPriority; dueDate:string; staffId:string|number|null; staffName:string; clientId:string|number|null; clientName:string; createdAt:string }
type Person = { id:string|number; name:string }

const columns:{status:TaskStatus;title:string;hint:string}[] = [
  {status:'todo',title:'Нові',hint:'Ще не розпочаті'},
  {status:'in_progress',title:'У роботі',hint:'Виконуються зараз'},
  {status:'blocked',title:'Потребують уваги',hint:'Блокери або термінові'},
  {status:'done',title:'Виконано',hint:'Завершені завдання'}
]
const priorityLabel:Record<TaskPriority,string> = {low:'Низький',normal:'Звичайний',high:'Високий',urgent:'Терміново'}
const priorityClass:Record<TaskPriority,string> = {low:'low',normal:'normal',high:'high',urgent:'urgent'}
const statusLabel:Record<TaskStatus,string> = {todo:'Нові',in_progress:'У роботі',blocked:'Потребують уваги',done:'Виконано'}

export default function Tasks({tasks,staff,clients,add,update,remove}:{tasks:Task[];staff:Person[];clients:Person[];add:(task:Task)=>Promise<string>;update:(id:Task['id'],patch:Partial<Pick<Task,'status'|'priority'|'dueDate'|'staffId'|'clientId'|'title'|'description'>>)=>Promise<string>;remove:(id:Task['id'])=>Promise<string>}) {
  const [open,setOpen]=useState(false),[filter,setFilter]=useState<'all'|'mine'|'overdue'>('all'),[query,setQuery]=useState(''),[message,setMessage]=useState('')
  const today=new Date().toISOString().slice(0,10)
  const visible=useMemo(()=>tasks.filter(task=>{
    const matchesQuery=[task.title,task.description,task.staffName,task.clientName].join(' ').toLowerCase().includes(query.toLowerCase())
    if(!matchesQuery)return false
    if(filter==='overdue')return task.status!=='done'&&Boolean(task.dueDate)&&task.dueDate<today
    return true
  }),[tasks,filter,query,today])
  async function setStatus(task:Task,status:TaskStatus){const error=await update(task.id,{status});setMessage(error||'Статус завдання оновлено.')}
  async function deleteTask(id:Task['id']){if(!window.confirm('Видалити це завдання?'))return;const error=await remove(id);setMessage(error||'Завдання видалено.')}
  return <section className="content tasks-page"><div className="page-title"><div><p>Операційна робота студії</p><h1>Завдання команди</h1></div><button className="primary" onClick={()=>setOpen(true)}><Plus size={18}/> Створити завдання</button></div>
    <div className="panel task-toolbar"><div className="filter-actions"><button className={filter==='all'?'primary':'text-btn'} onClick={()=>setFilter('all')}>Усі · {tasks.length}</button><button className={filter==='mine'?'primary':'text-btn'} onClick={()=>setFilter('mine')}>За майстрами</button><button className={filter==='overdue'?'primary':'text-btn'} onClick={()=>setFilter('overdue')}>Прострочені · {tasks.filter(task=>task.status!=='done'&&Boolean(task.dueDate)&&task.dueDate<today).length}</button></div><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Пошук завдань, клієнта або майстра"/></div>
    {message&&<p role="status" className="task-message">{message}</p>}
    <div className="task-board">{columns.map(column=>{const rows=visible.filter(task=>task.status===column.status);return <section className={'task-column '+column.status} key={column.status}><div className="task-column-head"><div><h2>{column.title}</h2><small>{column.hint}</small></div><b>{rows.length}</b></div><div className="task-list">{rows.map(task=><TaskCard key={task.id} task={task} updateStatus={setStatus} remove={deleteTask}/>)}</div>{!rows.length&&<p className="task-empty">Немає завдань</p>}</section>})}</div>
    {open&&<TaskModal staff={staff} clients={clients} close={()=>setOpen(false)} add={async task=>{const error=await add(task);if(!error)setOpen(false);return error}}/>}
  </section>
}

function TaskCard({task,updateStatus,remove}:{task:Task;updateStatus:(task:Task,status:TaskStatus)=>Promise<void>;remove:(id:Task['id'])=>Promise<void>}) {
  const overdue=task.status!=='done'&&Boolean(task.dueDate)&&task.dueDate<new Date().toISOString().slice(0,10)
  return <article className="task-card"><div className="task-card-top"><span className={'priority-badge '+priorityClass[task.priority]}>{priorityLabel[task.priority]}</span><button className="text-btn" aria-label="Видалити завдання" onClick={()=>void remove(task.id)}>×</button></div><b>{task.title}</b>{task.description&&<p>{task.description}</p>}<div className="task-meta">{task.staffName&&<span>Майстер: {task.staffName}</span>}{task.clientName&&<span>Клієнт: {task.clientName}</span>}{task.dueDate&&<span className={overdue?'overdue':''}>До {new Date(`${task.dueDate}T12:00:00`).toLocaleDateString('uk-UA',{day:'numeric',month:'short'})}</span>}</div><select aria-label={`Статус: ${task.title}`} value={task.status} onChange={event=>void updateStatus(task,event.target.value as TaskStatus)}>{columns.map(column=><option value={column.status} key={column.status}>{statusLabel[column.status]}</option>)}</select></article>
}

function TaskModal({staff,clients,close,add}:{staff:Person[];clients:Person[];close:()=>void;add:(task:Task)=>Promise<string>}) {
  const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[priority,setPriority]=useState<TaskPriority>('normal'),[dueDate,setDueDate]=useState(''),[staffId,setStaffId]=useState(''),[clientId,setClientId]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false)
  async function submit(event:FormEvent){event.preventDefault();if(saving)return;setSaving(true);const member=staff.find(item=>String(item.id)===staffId),client=clients.find(item=>String(item.id)===clientId);const result=await add({id:Date.now(),title:title.trim(),description:description.trim(),status:'todo',priority,dueDate,staffId:member?.id||null,staffName:member?.name||'',clientId:client?.id||null,clientName:client?.name||'',createdAt:new Date().toISOString()});setSaving(false);if(result)setError(result)}
  return <div className="overlay"><form className="modal task-modal" onSubmit={submit}><button type="button" className="modal-close" onClick={close}><X size={20}/></button><p>Операційне завдання</p><h2>Нове завдання</h2><label>Назва<input required autoFocus maxLength={180} value={title} onChange={event=>setTitle(event.target.value)} placeholder="Наприклад, замовити мікрофібри"/></label><label>Опис<textarea value={description} onChange={event=>setDescription(event.target.value)} placeholder="Що саме потрібно зробити?"/></label><label>Пріоритет<select value={priority} onChange={event=>setPriority(event.target.value as TaskPriority)}>{Object.entries(priorityLabel).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label>Дедлайн<input type="date" value={dueDate} onChange={event=>setDueDate(event.target.value)}/></label><label>Відповідальний<select value={staffId} onChange={event=>setStaffId(event.target.value)}><option value="">Не призначено</option>{staff.map(item=><option value={String(item.id)} key={item.id}>{item.name}</option>)}</select></label><label>Клієнт<select value={clientId} onChange={event=>setClientId(event.target.value)}><option value="">Без прив’язки до клієнта</option>{clients.map(item=><option value={String(item.id)} key={item.id}>{item.name}</option>)}</select></label>{error&&<p role="alert">{error}</p>}<button className="primary" disabled={saving}>{saving?'Зберігаємо…':'Створити завдання'}</button></form></div>
}
