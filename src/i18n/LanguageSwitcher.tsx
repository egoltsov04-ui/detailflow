import {useState} from 'react'
import {getLocale,type Locale} from './core'
import './language.css'
export default function LanguageSwitcher(){
 const [locale,setLocale]=useState(getLocale),[pending,setPending]=useState<Locale|null>(null)
 function apply(value:Locale){try{localStorage.setItem('detailflow.locale',value)}catch{return}setLocale(value);window.location.reload()}
 return <span className="language-switcher"><select aria-label="Language / Мова" value={pending||locale} onChange={e=>setPending(e.target.value as Locale)}><option value="uk">UA</option><option value="ru">RU</option><option value="en">EN</option></select>{pending&&pending!==locale&&<span className="language-confirm" role="dialog" aria-label="Зміна мови"><span>{pending==='en'?'The page will reload. Save any unfinished forms first.':pending==='ru'?'Страница обновится. Сначала сохраните незавершённые формы.':'Сторінка оновиться. Спочатку збережіть незавершені форми.'}</span><button type="button" className="primary" onClick={()=>apply(pending)}>{pending==='en'?'Apply':pending==='ru'?'Применить':'Застосувати'}</button><button type="button" className="text-btn" onClick={()=>setPending(null)}>{pending==='en'?'Cancel':pending==='ru'?'Отмена':'Скасувати'}</button></span>}</span>
}
