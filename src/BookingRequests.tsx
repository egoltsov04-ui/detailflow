import { useState } from 'react'
import type { Booking, Status } from './data'

export default function BookingRequests({bookings,update,link}:{bookings:Booking[];update:(id:number|string,status:Status)=>Promise<string>;link:string}) {
  const [filter,setFilter]=useState('Очікує підтвердження'),[query,setQuery]=useState(''),[busy,setBusy]=useState<number|string|null>(null),[message,setMessage]=useState(''),[copied,setCopied]=useState('')
  const publicRows=bookings.filter(b=>b.source==='public')
  const rows=publicRows.filter(b=>(!filter||b.status===filter)&&[b.client,b.phone,b.email,b.car,b.service].join(' ').toLowerCase().includes(query.toLowerCase())).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))
  async function act(booking:Booking,status:Status){
    if(busy!==null)return
    if(status==='Скасовано'&&!window.confirm('Відхилити заявку цього клієнта?'))return
    setBusy(booking.id);setMessage('')
    try{const error=await update(booking.id,status);setMessage(error||(status==='Підтверджено'?'Запис підтверджено.':'Заявку відхилено.'))}catch{setMessage('Не вдалося зберегти зміни. Спробуйте знову.')}finally{setBusy(null)}
  }
  async function copyLink(){if(!link)return;try{await navigator.clipboard.writeText(link);setCopied('Посилання скопійовано.')}catch{setCopied('Скопіюйте посилання з поля вручну.')}}
  return <section className="content"><div className="page-title"><div><p>Адміністратор · заявки з онлайн-запису</p><h1>Заявки клієнтів</h1></div></div>
    <p className="report-note">Тут адміністратор підтверджує або відхиляє заявки. Ручний запис — у календарі. Після підтвердження клієнт із вказаним email отримує лист.</p>
    <div className="panel booking-link"><h2>Посилання для клієнтів</h2><p>Надішліть його клієнту: після відправлення форма створить заявку зі статусом «Очікує підтвердження».</p>{link?<><input readOnly value={link}/><button className="primary" onClick={()=>void copyLink()}>Копіювати посилання</button>{copied&&<small>{copied}</small>}</>:<p>Завантаження адреси студії…</p>}</div>
    <div className="calendar-filters"><label>Статус<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Усі</option>{['Очікує підтвердження','Підтверджено','Скасовано','В роботі','Завершено','Не прийшов'].map(status=><option key={status}>{status}</option>)}</select></label><label>Пошук<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ім’я, телефон, email, авто"/></label></div>
    {message&&<p role="status">{message}</p>}<div className="request-list">{rows.map(b=><article className="panel request-card" key={b.id}><div><h2>{b.client}</h2><p>{b.phone} · {b.car}</p>{b.email&&<p>Email: {b.email}</p>}<p>{b.date} · {b.time} · {b.durationMinutes} хв</p><p>{b.service} · {b.tech} · {b.price-b.discount} ₴</p><b>{b.status}</b></div>{b.status==='Очікує підтвердження'&&<div className="filter-actions"><button disabled={busy!==null} className="primary" onClick={()=>void act(b,'Підтверджено')}>Підтвердити</button><button disabled={busy!==null} className="text-btn" onClick={()=>void act(b,'Скасовано')}>Відхилити</button></div>}</article>)}</div>
    {!rows.length&&<div className="panel"><h2>Заявок за цими фільтрами немає</h2><p>Нові онлайн-заявки відображатимуться зі статусом «Очікує підтвердження».</p></div>}
  </section>
}
