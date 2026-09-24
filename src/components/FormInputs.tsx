import { ChangeEvent, InputHTMLAttributes, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Minus, Plus, X } from 'lucide-react'
import { DateKind, dateError, displayDate, localDate, normalizeNumber, numberError, parseDate, stepNumber, validDate } from '../lib/formValues'
import './form-inputs.css'

type Props=InputHTMLAttributes<HTMLInputElement>
function labelInput(input:HTMLInputElement|null){
  if(!input||input.hasAttribute('aria-label')||input.hasAttribute('aria-labelledby'))return
  const label=input.closest('label'),text=label&&Array.from(label.childNodes).filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join(' ').trim()
  if(text)input.setAttribute('aria-label',text)
}
function emit(input: HTMLInputElement, value: string, onChange: Props['onChange']) {
  // Keep the existing controlled-input contract used by the application's forms.
  const target=new Proxy(input,{get:(node,key)=>key==='value'?value:key==='valueAsNumber'?Number(value):Reflect.get(node,key,node)})
  onChange?.({target,currentTarget:target} as ChangeEvent<HTMLInputElement>)
}

export function NumberInput({value='',onChange,min,max,step,disabled,readOnly,className='',onBlur,onKeyDown,...props}: Props) {
  const input=useRef<HTMLInputElement>(null), [error,setError]=useState(''), id=useId()
  useLayoutEffect(()=>labelInput(input.current),[])
  const raw=String(value), invalid=numberError(raw,min,max,step)
  useEffect(()=>{input.current?.setCustomValidity(invalid);if(!invalid)setError('')},[invalid])
  function change(next:string){if(!input.current)return;input.current.setCustomValidity(numberError(next,min,max,step));emit(input.current,next,onChange)}
  function increment(direction:number){change(stepNumber(raw,direction,min,max,step));input.current?.focus()}
  return <span className={`number-control ${className}`}>
    <span className="number-field"><input {...props} ref={input} type="text" inputMode="decimal" value={raw} disabled={disabled} readOnly={readOnly} aria-invalid={!!error} aria-describedby={[props['aria-describedby'],error?id:undefined].filter(Boolean).join(' ')||undefined}
      onChange={e=>change(normalizeNumber(e.target.value))} onBlur={e=>{setError(invalid);onBlur?.(e)}} onInvalid={()=>setError(invalid)}
      onKeyDown={e=>{onKeyDown?.(e);if(!e.defaultPrevented&&!disabled&&!readOnly&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();increment(e.key==='ArrowUp'?1:-1)}}}/>
      {!readOnly&&<span className="number-steps"><button type="button" aria-label="Зменшити значення" disabled={disabled||(min!==undefined&&raw!==''&&Number(raw)<=Number(min))} onClick={()=>increment(-1)}><Minus size={14}/></button><button type="button" aria-label="Збільшити значення" disabled={disabled||(max!==undefined&&raw!==''&&Number(raw)>=Number(max))} onClick={()=>increment(1)}><Plus size={14}/></button></span>}
    </span>{error&&<small className="field-error" id={id}>{error}</small>}
  </span>
}

const weekdays=['Пн','Вт','Ср','Чт','Пт','Сб','Нд']
export function DateInput({type='date',value='',onChange,min,max,disabled,readOnly,className='',onBlur,...props}: Props) {
  const kind=type as DateKind, input=useRef<HTMLInputElement>(null), root=useRef<HTMLSpanElement>(null), popup=useRef<HTMLDivElement>(null), trigger=useRef<HTMLButtonElement>(null)
  useLayoutEffect(()=>labelInput(input.current),[])
  const [text,setText]=useState(displayDate(String(value),kind)),[open,setOpen]=useState(false),[error,setError]=useState(''),[month,setMonth]=useState(()=>new Date()),[picked,setPicked]=useState(''),[time,setTime]=useState('09:00'),[position,setPosition]=useState({top:0,left:0}), id=useId()
  useEffect(()=>{setText(displayDate(String(value),kind));setError('')},[value,kind])
  useEffect(()=>{input.current?.setCustomValidity(dateError(parseDate(text,kind),min?String(min):undefined,max?String(max):undefined))},[text,kind,min,max])
  function commit(next:string,close=true){if(!input.current)return;const problem=dateError(next,min?String(min):undefined,max?String(max):undefined);if(problem){setError(problem);return}setText(displayDate(next,kind));setError('');input.current.setCustomValidity('');emit(input.current,next,onChange);if(close){setOpen(false);trigger.current?.focus()}}
  function show(){const date=String(value).slice(0,10), day=validDate(date)?date:localDate();setMonth(new Date(`${day}T12:00:00`));setPicked(day);setTime(kind==='time'?String(value).slice(0,5)||'09:00':String(value).split('T')[1]?.slice(0,5)||'09:00');setOpen(true)}
  useLayoutEffect(()=>{
    if(!open)return
    const place=()=>{const box=root.current?.getBoundingClientRect(),p=popup.current;if(!box||!p)return;const width=p.offsetWidth,height=p.offsetHeight;setPosition({left:Math.max(8,Math.min(box.left,window.innerWidth-width-8)),top:Math.max(8,Math.min(box.bottom+8,window.innerHeight-height-8))})}
    place();const observer=new ResizeObserver(place);if(popup.current)observer.observe(popup.current)
    const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node)&&!popup.current?.contains(e.target as Node))setOpen(false)}
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);trigger.current?.focus()}}
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape,true);window.addEventListener('resize',place);window.addEventListener('scroll',place,true)
    const initial=popup.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]:not(:disabled),.time-option.selected')||popup.current?.querySelector<HTMLButtonElement>('.calendar-day:not(:disabled),.time-option:not(:disabled)')
    initial?.focus()
    return()=>{observer.disconnect();document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape,true);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true)}
  },[open])
  const first=new Date(month.getFullYear(),month.getMonth(),1), offset=(first.getDay()+6)%7
  const days=Array.from({length:42},(_,index)=>new Date(month.getFullYear(),month.getMonth(),index-offset+1))
  const allowed=(day:string)=>!(min&&day<String(min).slice(0,10))&&!(max&&day>String(max).slice(0,10))
  function choose(day:string){setPicked(day);if(kind==='date')commit(day)}
  return <span className={`date-control ${className}`} ref={root}>
    <span className="date-field"><input {...props} ref={input} type="text" value={text} disabled={disabled} readOnly={readOnly} placeholder={props.placeholder||(kind==='time'?'ГГ:ХХ':kind==='date'?'ДД.ММ.РРРР':'ДД.ММ.РРРР ГГ:ХХ')} aria-invalid={!!error} aria-describedby={error?id:props['aria-describedby']}
      onChange={e=>{setText(e.target.value);const parsed=parseDate(e.target.value,kind);const problem=dateError(parsed,min?String(min):undefined,max?String(max):undefined);input.current?.setCustomValidity(problem);if(parsed!==null&&!problem)emit(e.target,parsed,onChange)}}
      onInvalid={()=>setError(dateError(parseDate(text,kind),min?String(min):undefined,max?String(max):undefined))}
      onBlur={e=>{setError(dateError(parseDate(text,kind),min?String(min):undefined,max?String(max):undefined));onBlur?.(e)}}/>
      <button ref={trigger} type="button" disabled={disabled||readOnly} aria-label={kind==='time'?'Обрати час':'Відкрити календар'} aria-expanded={open} aria-haspopup="dialog" onClick={()=>open?setOpen(false):show()}>{kind==='time'?<Clock3 size={18}/>:<CalendarDays size={18}/>}</button>
    </span>{error&&<small className="field-error" id={id}>{error}</small>}
    {open&&createPortal(<div className="date-popover" role="dialog" aria-label={kind==='time'?'Вибір часу':'Вибір дати'} ref={popup} style={position} onKeyDown={e=>{
      if(e.key==='Tab'){const controls=Array.from(popup.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select')||[]);const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}
    }}>
      <div className="date-popover-title"><b>{kind==='time'?'Оберіть час':'Оберіть дату'}</b><button type="button" aria-label="Закрити вибір дати" onClick={()=>{setOpen(false);trigger.current?.focus()}}><X size={18}/></button></div>
      {kind!=='time'&&<><div className="calendar-navigation"><button type="button" aria-label="Попередній місяць" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><ChevronLeft size={18}/></button><select aria-label="Місяць" value={month.getMonth()} onChange={e=>setMonth(new Date(month.getFullYear(),Number(e.target.value),1))}>{Array.from({length:12},(_,i)=><option key={i} value={i}>{new Date(2026,i,1).toLocaleDateString('uk-UA',{month:'long'})}</option>)}</select><select aria-label="Рік" value={month.getFullYear()} onChange={e=>setMonth(new Date(Number(e.target.value),month.getMonth(),1))}>{Array.from({length:Math.max(2100,month.getFullYear())-Math.min(2000,month.getFullYear())+1},(_,i)=>Math.min(2000,month.getFullYear())+i).map(year=><option key={year}>{year}</option>)}</select><button type="button" aria-label="Наступний місяць" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><ChevronRight size={18}/></button></div>
      <div className="calendar-weekdays">{weekdays.map(day=><span key={day}>{day}</span>)}</div><div className="calendar-grid">{days.map(day=>{const key=localDate(day);return <button type="button" key={key} className={`calendar-day ${day.getMonth()!==month.getMonth()?'outside':''} ${key===picked?'selected':''}`} aria-label={day.toLocaleDateString('uk-UA',{day:'numeric',month:'long',year:'numeric'})} aria-pressed={key===picked} aria-current={key===localDate()?'date':undefined} disabled={!allowed(key)} onClick={()=>choose(key)} onKeyDown={e=>{const delta=({ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7} as Record<string,number>)[e.key];if(delta){e.preventDefault();const next=new Date(day);next.setDate(next.getDate()+delta);if(allowed(localDate(next))){setPicked(localDate(next));if(next.getMonth()!==month.getMonth()||next.getFullYear()!==month.getFullYear())setMonth(next);requestAnimationFrame(()=>popup.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus())}}}}>{day.getDate()}</button>})}</div>
      <div className="date-shortcuts"><button type="button" disabled={!allowed(localDate())} onClick={()=>choose(localDate())}>Сьогодні</button><button type="button" disabled={!allowed(localDate(new Date(Date.now()+86400000)))} onClick={()=>choose(localDate(new Date(Date.now()+86400000)))}>Завтра</button></div></>}
      {kind==='time'&&<div className="time-options">{Array.from({length:48},(_,i)=>`${String(Math.floor(i/2)).padStart(2,'0')}:${i%2?'30':'00'}`).map(t=><button className={`time-option ${String(value).slice(0,5)===t?'selected':''}`} type="button" key={t} disabled={!!dateError(t,min?String(min):undefined,max?String(max):undefined)} onClick={()=>commit(t)}>{t}</button>)}</div>}
      {kind==='datetime-local'&&<div className="calendar-time"><label>Час<input aria-label="Час готовності" type="text" inputMode="numeric" placeholder="09:00" value={time} onChange={e=>setTime(e.target.value)}/></label><button type="button" className="primary" disabled={parseDate(`${displayDate(picked,'date')} ${time}`,kind)===null||!!dateError(`${picked}T${time}`,min?String(min):undefined,max?String(max):undefined)} onClick={()=>commit(`${picked}T${time}`)}>Обрати</button></div>}
      {!props.required&&<button className="calendar-clear" type="button" onClick={()=>commit('')}>Очистити</button>}
    </div>,document.body)}
  </span>
}
