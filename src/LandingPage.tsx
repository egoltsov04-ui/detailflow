import {useState} from 'react'
import {ArrowRight,Check,ChevronDown,Menu,X} from 'lucide-react'
import LanguageSwitcher from './i18n/LanguageSwitcher'
import {t} from './i18n/core'
import {Card,PageHeader,Table,Tabs} from './components/UI'
import {PlanCards} from './BillingPage'
import LandingSectionNav from './components/LandingSectionNav'
import './landing.css'
const questions=[
 ['Як підключити студію?','Заповніть заявку: назву студії, свої контакти та зручний месенджер. Підтвердіть email. Менеджер зв’яжеться з вами та активує доступ до робочого простору.'],
 ['Як майстер отримує доступ?','Власник додає майстра до команди та надсилає запрошення на email. За посиланням майстер створює пароль, заповнює профіль і переходить до свого кабінету. Створювати окрему студію не потрібно.'],
 ['Чи можна працювати самостійно?','Так. На тарифі Solo власник сам виконує роботи: почати, завершити, прийняти оплату. Без окремого акаунта майстра та нарахування зарплати.'],
 ['Як перенести клієнтів із таблиці?','Завантажте шаблон, заповніть контакти й автомобілі та імпортуйте CSV. Перед збереженням перевірте колонки та рядки. Наявних клієнтів зіставляємо за телефоном.'],
 ['Що буде з даними, якщо я не продовжу?','Збережені дані залишаються доступними, нові записи й активація майстрів потребують продовження.'],
]
const comparison=[
 {id:'booking',name:'Запис',before:'Окремі рядки й ручна перевірка часу',after:'Календар, онлайн-запис і завантаження постів'},
 {id:'reminders',name:'Нагадування',before:'Потрібно пам’ятати й писати вручну',after:'Черга нагадувань за 24 і 2 години'},
 {id:'receipt',name:'Чек',before:'Суму та склад робіт збираєте окремо',after:'Документ із підтвердженого замовлення'},
 {id:'history',name:'Історія клієнта',before:'Контакти, авто та роботи в різних файлах',after:'Контакти, автомобілі та візити в одній картці'},
]
const steps=[
 ['booking','01','Від запису до робіт','Оберіть послугу та час. Клієнт, авто і вартість уже в замовленні.'],
 ['master','02','Майстер виконує','Завдання, таймер, фото до й після та заміри покриття — у його кабінеті.'],
 ['review','03','Власник перевіряє','Підтвердіть результат або поверніть роботу з поясненням.'],
 ['receipt','04','Чек і нарахування','Сформуйте документ, прийміть оплату та бачте підтверджений заробіток майстра.'],
]
function Connect({small=false}:{small?:boolean}){return <a className={'lp-button'+(small?' lp-button-small':'')} href="/register">{t('Підключити студію')}<ArrowRight size={18}/></a>}
export default function LandingPage(){
 const [menu,setMenu]=useState(false),[role,setRole]=useState<'owner'|'master'>('owner')
 return <div className="landing"><a className="lp-skip" href="#lp-main">{t('Перейти до вмісту')}</a>
 <header className="lp-header"><div className="lp-wrap lp-header-inner"><a className="lp-brand" href="/" aria-label={t('Detailflow — головна')}><i/>detailflow</a><LanguageSwitcher/><button className="lp-menu-toggle" aria-label={t(menu?'Закрити меню':'Відкрити меню')} aria-expanded={menu} aria-controls="lp-nav" onClick={()=>setMenu(v=>!v)}>{menu?<X/>:<Menu/>}</button><nav id="lp-nav" className={'lp-nav'+(menu?' is-open':'')} aria-label={t('Головна навігація')} onClick={()=>setMenu(false)}><a href="#features">{t('Можливості')}</a><a href="#workflow">{t('Як це працює')}</a><a href="#pricing">{t('Тарифи')}</a><a href="#questions">{t('Запитання')}</a><a href="/login">{t('Увійти')}</a><Connect small/></nav></div></header>
 <main id="lp-main">
 <section id="hero" data-nav-label={t('Головна')} className="lp-wrap lp-hero"><div><p className="lp-eyebrow">Detailflow · {t('Для детейлінг-студій')}</p><h1>{t('Облік студії без таблиць')}</h1><p className="lp-lead">{t('Від запису до перевірки роботи й нарахування майстру. Клієнти, автомобілі та команда в одному робочому просторі.')}</p><div className="lp-actions"><Connect/><a className="lp-secondary" href="#workflow">{t('Подивитися, як працює')} ↓</a></div><p className="lp-note">{t('Імпорт з Google Таблиці за кілька кліків · Підключення через менеджера в Telegram')}</p></div><figure className="lp-product"><img src="/demo/overview.webp" width="1120" height="900" alt={t('Огляд: увага, розклад і пости студії')}/><figcaption>{t('Реальний інтерфейс · демонстраційні дані')}</figcaption></figure></section>
 <section id="import" data-nav-label={t('Імпорт')} className="lp-wrap lp-section"><Card className="lp-transfer"><div><p className="lp-eyebrow">{t('Без початку з нуля')}</p><h2>{t('Ваші клієнти вже є в таблиці?')}</h2><p>{t('Перенесіть контакти, автомобілі та примітки. Перевірте дані перед збереженням — без повторного введення кожного клієнта.')}</p></div><ol>{[['Завантажте шаблон','Excel або CSV з прикладами та поясненнями колонок.'],['Додайте свої дані','Один рядок — клієнт і його авто. Для кількох авто повторіть телефон.'],['Перевірте й імпортуйте','Зіставте колонки, виправте помилки та підтвердіть імпорт.']].map(([title,text],i)=><li key={title}><span>0{i+1}</span><div><h3>{t(title)}</h3><p>{t(text)}</p></div></li>)}</ol></Card></section>
 <section id="features" data-nav-label={t('Порівняння')} className="lp-wrap lp-section"><PageHeader><div><p className="lp-eyebrow">{t('Час перейти від таблиць до роботи')}</p><h2>{t('Таблиця vs Detailflow')}</h2></div></PageHeader><Table rows={comparison} rowKey={r=>r.id} columns={[{key:'name',label:t('Щоденна робота'),render:r=><b>{t(r.name)}</b>},{key:'before',label:t('Таблиця'),render:r=>t(r.before)},{key:'after',label:'Detailflow',render:r=><span className="lp-comparison-result"><Check size={18}/>{t(r.after)}</span>}]}/></section>
 <section id="workflow" data-nav-label={t('Як працює')} className="lp-wrap lp-section"><PageHeader><div><p className="lp-eyebrow">{t('Більше, ніж CRM')}</p><h2>{t('Увесь шлях автомобіля')}</h2></div></PageHeader><div className="lp-workflow-grid">{steps.map(([id,n,title,copy])=><Card as="article" className="lp-step" key={id}><div><span className="lp-eyebrow">{n}</span><h3>{t(title)}</h3><p>{t(copy)}</p></div><a href={'/demo/'+id+'.webp'} target="_blank" rel="noreferrer" aria-label={t('Збільшити екран')+': '+t(title)}><img loading="lazy" src={'/demo/'+id+'.webp'} width="720" height="900" alt={t(title)}/></a></Card>)}</div><Card className="lp-roles"><h3>{t('Кожному — свій робочий простір')}</h3><Tabs aria-label={t('Роль у студії')}>{(['owner','master'] as const).map(r=><button key={r} aria-pressed={role===r} onClick={()=>setRole(r)}>{t(r==='owner'?'Власник студії':'Майстер')}</button>)}</Tabs><p>{t(role==='owner'?'Бачте завантаження постів, призначайте роботи, перевіряйте результат і контролюйте фінанси та залишки матеріалів.':'Виходьте на зміну, виконуйте призначені роботи, додавайте фото й отримуйте нарахування після перевірки.')}</p></Card></section>
 <section id="pricing" data-nav-label={t('Тарифи')} className="lp-wrap lp-section"><PageHeader><div><p className="lp-eyebrow">{t('Для вашого формату роботи')}</p><h2>{t('Від одного майстра до команди')}</h2></div></PageHeader><PlanCards/><p className="lp-note">{t('Пробний період — 14 днів після активації менеджером.')}</p></section>
 <section id="questions" data-nav-label={t('Запитання')} className="lp-wrap lp-section lp-faq"><h2>{t('Запитання перед стартом')}</h2><div>{questions.map(([q,a])=><details key={q}><summary>{t(q)}<ChevronDown size={20}/></summary><p>{t(a)}</p></details>)}</div></section>
 <section id="connect" data-nav-label={t('Підключення')} className="lp-wrap lp-section"><Card className="lp-final"><div><p className="lp-eyebrow">{t('Відкрито пілот для перших студій')}</p><h2>{t('Спробуйте на своїй студії')}</h2><p>{t('Залиште заявку. Менеджер допоможе з першим налаштуванням і перенесенням клієнтів.')}</p></div><Connect/></Card></section>
 </main><footer className="lp-wrap lp-footer"><b>detailflow</b><p>{t('Робочий простір детейлінг-студії')}</p><a href="/login">{t('Увійти')}</a></footer><LandingSectionNav/></div>
}
