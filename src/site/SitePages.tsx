import {CalendarDays,Camera,ClipboardCheck,Clock3,Gauge,Mail,ReceiptText,Send,ShieldCheck,Users,Wallet} from 'lucide-react'
import {t} from '../i18n/core'
import {ConnectButton,SiteShell,contacts} from './SiteChrome'
import privacy from './legal/privacy.html?raw'
import terms from './legal/terms-body.html?raw'
import dpa from './legal/dpa.html?raw'
import refund from './legal/refund.html?raw'

export const sitePaths=['/about','/contacts','/privacy','/terms','/refund'] as const
export type SitePath=typeof sitePaths[number]

// Legal texts are Ukrainian only (the service works in Ukraine) and come from our own files, never from user input.
const legal:Record<'/privacy'|'/terms'|'/refund',{title:string;lead:string;html:string}>={
 '/privacy':{title:'Політика конфіденційності',lead:'Як Detailflow збирає, використовує та захищає дані.',html:privacy},
 '/terms':{title:'Умови користування',lead:'Публічна оферта: умови користування сервісом Detailflow.',html:terms+dpa},
 '/refund':{title:'Умови обміну та повернення',lead:'Як змінити тариф, скасувати підписку й повернути кошти.',html:refund},
}

function SideNav({path}:{path:SitePath}){
 const link=(href:SitePath,label:string)=><a href={href} aria-current={path===href?'page':undefined}>{t(label)}</a>
 return <aside className="site-side" data-reveal><h2>{t('Компанія')}</h2>{link('/about','Про нас')}{link('/contacts','Контакти')}<h2>{t('Правове')}</h2>{link('/privacy','Політика конфіденційності')}{link('/terms','Умови користування')}{link('/refund','Обмін і повернення')}</aside>
}

function Legal({path}:{path:'/privacy'|'/terms'|'/refund'}){
 const doc=legal[path]
 return <><div className="site-page-head" data-reveal><p className="lp-eyebrow">{t('Правове')}</p><h1>{doc.title}</h1><p>{doc.lead}</p></div><article className="site-doc" data-reveal dangerouslySetInnerHTML={{__html:doc.html}}/></>
}

const features=[[CalendarDays,'Онлайн-запис і календар постів'],[ClipboardCheck,'Замовлення від запису до видачі авто'],[Camera,'Кабінет майстра: зміни, фото до і після, заміри'],[ShieldCheck,'Перевірка робіт і нарахування майстрам'],[ReceiptText,'Чеки, оплати, витрати та склад'],[Gauge,'Аналітика студії']] as const
const principles=[['Просто','Розібратися може кожен майстер: одна панель замовлення, без зайвих кроків.'],['Чесно','Прозорі тарифи без дрібного шрифту, пробний період без картки.'],['Надійно','Дані кожної студії ізольовані, резервні копії шифруються.'],['Поруч','Підтримка в Telegram без ботів: відповідає людина, яка робить продукт.']] as const

function About(){
 return <><div className="site-page-head" data-reveal><p className="lp-eyebrow">{t('Компанія')}</p><h1>{t('Про Detailflow')}</h1><p>{t('Робочий простір для детейлінг-студій: запис, замовлення, майстри, фінанси та склад в одному місці.')}</p></div>
  <section className="site-block" data-reveal><h2>{t('Навіщо ми це робимо')}</h2><p>{t('Записи в блокноті й Telegram, таблиця з клієнтами, суперечки про зарплату майстрів і незрозуміло, яке авто зараз на якому посту, — знайомо кожній студії. Ми робимо Detailflow, щоб власник бачив усю студію на одному екрані, а майстри працювали без зайвих дзвінків.')}</p></section>
  <section className="site-block" data-reveal><h2>{t('Що вміє продукт')}</h2><ul className="site-features">{features.map(([Icon,label])=><li key={label}><Icon size={20} aria-hidden="true"/>{t(label)}</li>)}</ul></section>
  <section className="site-block" data-reveal><h2>{t('Наші принципи')}</h2><div className="site-principles">{principles.map(([title,text])=><div key={title}><h3>{t(title)}</h3><p>{t(text)}</p></div>)}</div></section>
  <section className="site-cta" data-reveal><h2>{t('Готові спробувати?')}</h2><p>{t('5 днів безкоштовно після активації. Менеджер допоможе з налаштуванням.')}</p><ConnectButton/></section></>
}

function Contacts(){
 return <><div className="site-page-head" data-reveal><p className="lp-eyebrow">{t('Компанія')}</p><h1>{t('Контакти')}</h1><p>{t('Підключення, підтримка, оплата і співпраця — пишіть, відповімо в робочий час.')}</p></div>
  <div className="site-contacts" data-reveal>
   <a className="site-contact" href={contacts.telegram} target="_blank" rel="noopener noreferrer"><Send size={22} aria-hidden="true"/><span>Telegram</span><b>{contacts.telegramName}</b><small>{t('Найшвидші відповіді')}</small></a>
   <a className="site-contact" href={'mailto:'+contacts.email}><Mail size={22} aria-hidden="true"/><span>{t('Пошта')}</span><b>{contacts.email}</b><small>{t('Питання, дані, повернення коштів')}</small></a>
   <div className="site-contact"><Clock3 size={22} aria-hidden="true"/><span>{t('Час роботи')}</span><b>{t('Пн–Пт 9:00–21:00')}</b><small>{t('Сб–Нд 10:00–20:00, за Києвом')}</small></div>
   <div className="site-contact"><Users size={22} aria-hidden="true"/><span>{t('Хто відповідає')}</span><b>{t(contacts.owner)}</b><small>{t('Засновник Detailflow')}</small></div>
  </div>
  <section className="site-cta" data-reveal><Wallet size={22} aria-hidden="true"/><h2>{t('Хочете підключити студію?')}</h2><p>{t('Залиште заявку — менеджер зв’яжеться з вами в Telegram.')}</p><ConnectButton/></section></>
}

export default function SitePages({path}:{path:SitePath}){
 return <SiteShell><div className="lp-wrap site-page"><SideNav path={path}/><div className="site-page-main">{path==='/about'?<About/>:path==='/contacts'?<Contacts/>:<Legal path={path}/>}</div></div></SiteShell>
}
