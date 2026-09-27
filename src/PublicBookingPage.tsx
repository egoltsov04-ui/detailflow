import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, MapPin, Search, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { DateInput } from './components/FormInputs'
import { studioDateTime } from './lib/formValues'
import { addBookingDays, availableStaff, bookingTotals, studioDay, type BookingData } from './lib/bookingAvailability'
import './public-booking.css'

const money=(value:number)=>new Intl.NumberFormat('uk-UA').format(value)+' ₴'
const durationLabel=(n:number)=>[n>=60?`${Math.floor(n/60)} год`:'',n%60?`${n%60} хв`:''].filter(Boolean).join(' ')
const dateLabel=(day:string)=>new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'long',weekday:'short'}).format(new Date(`${day}T12:00:00`))
export type BookingPayload={slug:string;clientName:string;phone:string;email:string;car:string;serviceIds:string[];staffId:string;startsAt:string}
type Props={slug:string;previewData?:BookingData;previewSubmit?:(payload:BookingPayload)=>Promise<void>}

export default function PublicBookingPage({slug,previewData,previewSubmit}:Props) {
  const [data,setData]=useState<BookingData|null>(previewData||null),[error,setError]=useState(''),[loading,setLoading]=useState(!previewData)
  const [selected,setSelected]=useState<string[]>([]),[staffId,setStaffId]=useState(''),[date,setDate]=useState(''),[time,setTime]=useState(''),[step,setStep]=useState(0)
  const [query,setQuery]=useState(''),[category,setCategory]=useState('Усі'),[name,setName]=useState(''),[phone,setPhone]=useState(''),[email,setEmail]=useState(''),[car,setCar]=useState('')
  const [sending,setSending]=useState(false),[done,setDone]=useState(false),[reload,setReload]=useState(0),[clock,setClock]=useState(Date.now())
  useEffect(()=>{const id=window.setInterval(()=>setClock(Date.now()),30_000);return()=>window.clearInterval(id)},[])
  useEffect(()=>{
    if(previewData)return
    let active=true;setLoading(true)
    void fetch(`/api/public/booking?slug=${encodeURIComponent(slug)}`).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error||'Студію не знайдено');if(active)setData(body)})
      .catch(reason=>active&&setError(reason instanceof Error?reason.message:'Не вдалося завантажити запис.')).finally(()=>active&&setLoading(false))
    return()=>{active=false}
  },[slug,reload,previewData])
  const today=studioDay(new Date(clock),data?.studio.timezone||'Europe/Kyiv'),lastDay=addBookingDays(today,30),chosenDate=date||today
  const services=useMemo(()=>data?.services.filter(s=>selected.includes(s.id))||[],[data,selected])
  const {price,duration}=bookingTotals(services)
  const slots=useMemo(()=>{
    if(!data||!duration||chosenDate<today||chosenDate>lastDay)return []
    return Array.from({length:48},(_,i)=>`${String(Math.floor(i/2)).padStart(2,'0')}:${i%2?'30':'00'}`).filter(slot=>{
      try{return availableStaff(data,studioDateTime(chosenDate,slot,data.studio.timezone),duration,staffId,clock).length>0}catch{return false}
    })
  },[data,duration,chosenDate,today,lastDay,staffId,clock])
  useEffect(()=>{if(!done&&time&&!slots.includes(time))setTime('')},[slots,time,done])
  const categories=['Усі',...new Set(data?.services.map(s=>s.category||'Інше')||[])]
  const listed=data?.services.filter(s=>(category==='Усі'||(s.category||'Інше')===category)&&s.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))||[]
  const specialist=data?.staff.find(s=>s.id===staffId)
  const validTime=!!time&&slots.includes(time)
  function move(next:number){setStep(next);setError('');window.scrollTo({top:0,behavior:'smooth'})}
  async function submit(event:React.FormEvent){
    event.preventDefault();if(sending||!validTime||!services.length||!data)return
    if(!name.trim()||phone.replace(/\D/g,'').length<10){setError('Вкажіть ім’я та телефон із кодом країни.');return}
    setSending(true);setError('')
    try{
      const payload={slug,clientName:name.trim(),phone,email,car,serviceIds:selected,staffId,startsAt:studioDateTime(chosenDate,time,data.studio.timezone).toISOString()}
      if(previewSubmit)await previewSubmit(payload)
      else{
        const response=await fetch('/api/public/booking',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)})
        const result=await response.json()
        if(!response.ok){if(response.status===409){setTime('');setStep(1);setReload(n=>n+1)}throw new Error(result.error||'Не вдалося надіслати заявку')}
      }
      setDone(true);window.scrollTo({top:0,behavior:'smooth'})
    }catch(reason){setError(reason instanceof Error?reason.message:'Не вдалося надіслати заявку. Спробуйте ще раз.')}finally{setSending(false)}
  }
  if(!data)return <main className="ob-page"><section className="ob-state" role="status"><Sparkles/><h1>{loading?'Готуємо онлайн-запис…':'Запис тимчасово недоступний'}</h1><p>{loading?'Завантажуємо послуги та графік студії.':error}</p>{!loading&&<button className="primary" onClick={()=>{setError('');setReload(n=>n+1)}}>Спробувати ще раз</button>}</section></main>
  const summary=<><div className="ob-summary-title"><Sparkles size={20}/><h2>Ваш візит</h2></div>{services.length?<ul className="ob-summary-services">{services.map(s=><li key={s.id}><span>{s.name}</span><b>{money(s.price)}</b></li>)}</ul>:<p>Оберіть послуги для свого авто.</p>}<div className="ob-summary-meta"><span><Clock3 size={16}/>{duration?durationLabel(duration):'Тривалість після вибору'}</span><span><UserRound size={16}/>{specialist?.full_name||'Будь-який вільний майстер'}</span>{(validTime||done)&&<strong>{dateLabel(chosenDate)} · {time}</strong>}</div><div className="ob-total"><span>Разом</span><b>{money(price)}</b></div><p className="ob-note">Оплата у студії. Додаткові роботи погоджуються з вами окремо.</p></>
  return <main className="ob-page">
    <header className="ob-header"><a href="/" className="ob-brand"><span/>detailflow</a><span>Онлайн-запис</span></header>
    <div className="ob-layout">
      <div className="ob-main">
        <section className="ob-studio"><span className="ob-eyebrow">ДОГЛЯД ЗА ВАШИМ АВТО</span><h1>{data.studio.name}</h1>{data.studio.address&&<p><MapPin size={17}/>{data.studio.address}</p>}</section>
        {done?<section className="ob-panel ob-success" role="status"><CheckCircle2 size={44}/><span className="ob-eyebrow">ОЧІКУЄ ПІДТВЕРДЖЕННЯ</span><h2>Дякуємо, {name}!</h2><p>Студія отримала вашу заявку. Час буде остаточно заброньовано після підтвердження адміністратором.</p><div className="ob-success-details"><b>{dateLabel(chosenDate)} · {time}</b><span>{services.map(s=>s.name).join(' + ')}</span><span>{car||'Автомобіль уточнимо у студії'}</span><span>{email}</span></div><p>Після підтвердження студія надішле лист. Якщо час потрібно уточнити, адміністратор зв’яжеться за номером {phone}.</p><button className="ob-secondary" onClick={()=>{setDone(false);setSelected([]);setTime('');setDate('');setStep(0);setReload(n=>n+1)}}>Ще один запис</button></section>:<>
          <nav className="ob-steps" aria-label="Етапи запису">{['Послуги','Дата і час','Ваші дані'].map((title,i)=><button key={title} type="button" aria-current={step===i?'step':undefined} disabled={i>step||sending} onClick={()=>move(i)}><span>{i<step?<Check size={15}/>:i+1}</span>{title}</button>)}</nav>
          {error&&<div className="ob-error" role="alert">{error}</div>}
          {step===0&&<section className="ob-panel"><div className="ob-section-heading"><span>01 / ПОСЛУГИ</span><h2>Що зробимо для вашого авто?</h2><p>Можна обрати кілька послуг за один візит.</p></div><label className="ob-search"><Search size={18}/><input aria-label="Пошук послуг" placeholder="Знайти послугу" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="ob-categories" aria-label="Категорії послуг">{categories.map(c=><button type="button" aria-pressed={category===c} key={c} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="ob-services">{listed.map(s=><button type="button" className="ob-service" aria-pressed={selected.includes(s.id)} key={s.id} onClick={()=>{setSelected(ids=>ids.includes(s.id)?ids.filter(id=>id!==s.id):[...ids,s.id]);setTime('')}}><span className="ob-choice">{selected.includes(s.id)?<Check size={17}/>:<span>+</span>}</span><span className="ob-service-name"><b>{s.name}</b><small>{durationLabel(s.duration_minutes)}</small></span><strong>{money(s.price)}</strong></button>)}</div>{!listed.length&&<p className="ob-empty">{data.services.length?'За цим запитом послуг немає. Спробуйте іншу назву.':'Студія ще не додала послуги для онлайн-запису.'}</p>}<div className="ob-actions"><span>{services.length?`Обрано: ${services.length} · ${money(price)}`:'Оберіть хоча б одну послугу'}</span><button className="primary" disabled={!services.length} onClick={()=>move(1)}>Обрати час <ArrowRight size={18}/></button></div></section>}
          {step===1&&<section className="ob-panel"><div className="ob-section-heading"><span>02 / ДАТА І ЧАС</span><h2>Коли вам зручно?</h2><p>Час студії: {data.studio.timezone}. Показуємо слоти для всіх обраних послуг.</p></div><h3>Майстер</h3><div className="ob-staff"><button aria-pressed={!staffId} onClick={()=>{setStaffId('');setTime('')}}><span className="ob-avatar"><Sparkles size={20}/></span><b>Будь-який вільний</b><small>Більше доступного часу</small></button>{data.staff.map(s=><button key={s.id} aria-pressed={staffId===s.id} onClick={()=>{setStaffId(s.id);setTime('')}}><span className="ob-avatar">{s.full_name.slice(0,1)}</span><b>{s.full_name}</b><small>{s.specialty||'Майстер студії'}</small></button>)}</div><div className="ob-date-heading"><h3>Дата</h3><label>Інша дата<DateInput type="date" min={today} max={lastDay} value={chosenDate} onChange={e=>{setDate(e.target.value);setTime('')}}/></label></div><div className="ob-days">{Array.from({length:7},(_,i)=>addBookingDays(today,i)).filter(d=>d<=lastDay).map(d=><button aria-pressed={chosenDate===d} key={d} onClick={()=>{setDate(d);setTime('')}}><small>{new Intl.DateTimeFormat('uk-UA',{weekday:'short'}).format(new Date(d+'T12:00:00'))}</small><b>{Number(d.slice(8))}</b><small>{new Intl.DateTimeFormat('uk-UA',{month:'short'}).format(new Date(d+'T12:00:00'))}</small></button>)}</div><h3>Час початку</h3>{loading?<p role="status">Оновлюємо доступний час…</p>:<div className="ob-slots">{slots.map(t=><button key={t} aria-pressed={t===time} onClick={()=>setTime(t)}>{t}</button>)}</div>}{!loading&&!slots.length&&<div className="ob-empty"><b>На цю дату немає вільного часу</b><p>Оберіть інший день{staffId?' або будь-якого вільного майстра':''}. Для довгих робіт зв’яжіться зі студією.</p></div>}<div className="ob-actions"><button className="ob-back" onClick={()=>move(0)}><ArrowLeft size={17}/> Послуги</button><button className="primary" disabled={!validTime||loading} onClick={()=>move(2)}>Продовжити <ArrowRight size={18}/></button></div></section>}
          {step===2&&<form className="ob-panel" onSubmit={submit}><div className="ob-section-heading"><span>03 / ВАШІ ДАНІ</span><h2>Залишилося познайомитись</h2><p>Без реєстрації. Контакти потрібні студії для підтвердження візиту.</p></div><div className="ob-fields"><label>Ваше ім’я<input required autoComplete="name" maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Як до вас звертатися"/></label><label>Телефон<input required type="tel" autoComplete="tel" maxLength={32} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+380 67 123 45 67"/></label><label>Email для підтвердження<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Автомобіль<input maxLength={180} value={car} onChange={e=>setCar(e.target.value)} placeholder="Марка, модель, держномер"/></label></div><div className="ob-review"><b>Перевірте запис</b><span>{dateLabel(chosenDate)} · {time} · {durationLabel(duration)}</span><span>{services.map(s=>s.name).join(' + ')}</span><strong>{money(price)}</strong><button type="button" className="ob-back" onClick={()=>move(1)}>Змінити дату або час</button></div><p className="ob-reassurance"><ShieldCheck size={20}/>Ви надсилаєте заявку. Підтвердження часу — від адміністратора студії.</p><div className="ob-actions"><button type="button" className="ob-back" disabled={sending} onClick={()=>move(1)}><ArrowLeft size={17}/> Назад</button><button className="primary" disabled={sending||!validTime}>{sending?'Надсилаємо…':'Надіслати заявку'} <ArrowRight size={18}/></button></div>{!validTime&&<p role="alert">Час більше не доступний. Поверніться до вибору дати.</p>}</form>}
        </>}
      </div><aside className="ob-summary">{summary}</aside>
    </div><footer className="ob-footer">Онлайн-запис працює на <a href="/">detailflow</a></footer>
  </main>
}
