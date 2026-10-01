import LanguageSwitcher from './i18n/LanguageSwitcher'
import {t} from './i18n/core'
import { useState } from 'react'
import { ArrowDown, ArrowRight, Calculator, CalendarDays, CarFront, Check, CheckCheck, ChevronDown, CircleDollarSign, ClipboardCheck, Clock3, Layers3, Menu, MessageSquare, Package, Sheet, ShieldCheck, Users, X } from 'lucide-react'
import './landing.css'

const features = [
  { icon: CalendarDays, title: 'Записи та замовлення', text: 'Плануйте завантаження студії. Призначайте майстрів і стежте за рухом кожного авто між етапами.' },
  { icon: Users, title: 'Команда та зміни', text: 'Запрошуйте майстрів через email, налаштовуйте графік і бачте, хто вже почав зміну.' },
  { icon: CircleDollarSign, title: 'Зрозуміла оплата', text: 'Задавайте відсоток для кожного майстра та окремі умови за послугами. Переглядайте нарахування після перевірки робіт.' },
  { icon: ClipboardCheck, title: 'Контроль якості', text: 'Майстер відмічає виконані завдання, власник перевіряє результат і підтверджує готовність.' },
  { icon: CarFront, title: 'Клієнти та автомобілі', text: 'Контакти, автомобілі й історія замовлень — в одному місці, щоб наступний візит починався без зайвих запитань.' },
  { icon: Package, title: 'Фінанси та склад', text: 'Фіксуйте оплати й витрати, контролюйте залишки матеріалів та дивіться результати студії.' },
]
const questions = [
  ['Як підключити студію?', 'Заповніть заявку: назву студії, свої контакти та зручний месенджер. Підтвердіть email. Менеджер зв’яжеться з вами та активує доступ до робочого простору.'],
  ['Як майстер отримує доступ?', 'Власник додає майстра до команди та надсилає запрошення на email. За посиланням майстер створює пароль, заповнює профіль і переходить до свого кабінету. Створювати окрему студію не потрібно.'],
  ['Що бачить майстер у своєму кабінеті?', 'Свій вихід на зміну, призначені автомобілі, завдання та нарахування. Роботу можна відмітити виконаною й передати власнику на перевірку.'],
  ['Чи можна встановити різні відсотки за послугами?', 'Так. У кожного майстра є базовий відсоток, а для окремої послуги можна задати інший відсоток або фіксовану суму. Збережені умови відображаються в налаштуваннях оплати.'],
]

export default function LandingPage() {
  const [menu, setMenu] = useState(false), [role, setRole] = useState<'owner' | 'master'>('owner')
  return <div className="landing">
    <a className="lp-skip" href="#lp-main">{t("Перейти до вмісту")}</a>
    <header className="lp-header"><div className="lp-wrap lp-header-inner">
      <a className="lp-brand" href="/" aria-label={t("Detailflow — головна")}><i/>detailflow<span>{t("для детейлінгу")}</span></a>
      <button type="button" className="lp-menu-toggle" aria-label={menu ? t("Закрити меню") : t("Відкрити меню")} aria-expanded={menu} aria-controls="lp-nav" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
      <LanguageSwitcher/><nav id="lp-nav" className={menu ? 'lp-nav is-open' : 'lp-nav'} aria-label={t("Головна навігація")} onClick={() => setMenu(false)}>
        <a href="#features">{t("Можливості")}</a><a href="#stock">{t("Склад")}</a><a href="#workflow">{t("Як це працює")}</a><a href="#questions">{t("Запитання")}</a>
        <a className="lp-login" href="/login">{t("Увійти ")}<ArrowRight size={16}/></a><a className="lp-button lp-button-small" href="/register">{t("Зареєструвати студію")}</a>
      </nav>
    </div></header>
    <main id="lp-main">
      <section className="lp-wrap lp-hero">
        <div className="lp-hero-copy"><p className="lp-eyebrow"><span/>{t(" Робочий простір детейлінг-студії")}</p>
          <h1>{t("Кожне авто.")}<br/>{t("Кожен майстер.")}<br/><em>{t("Усе під контролем.")}</em></h1>
          <p className="lp-lead">{t("Від першого запису до перевірки роботи та нарахування майстру. Detailflow об’єднує щоденну роботу вашої студії в одній системі.")}</p>
          <div className="lp-actions"><a className="lp-button" href="/register">{t("Підключити студію ")}<ArrowRight size={19}/></a><a className="lp-secondary" href="#workspace">{t("Подивитися, як працює ")}<ArrowDown size={17}/></a></div>
          <p className="lp-note"><ShieldCheck size={16}/>{t(" Власний кабінет для власника та кожного майстра")}</p>
        </div>
        <div className="lp-hero-visual" aria-label={t("Приклад роботи студії")}><div className="lp-visual-label"><span className="lp-dot"/>{t(" Ваша студія. Один робочий простір.")}</div><StudioPreview/>
          <div className="lp-complete"><span><CheckCheck size={21}/></span><div><strong>{t("Роботу перевірено")}</strong><small>{t("Нарахування майстру підтверджено")}</small></div><b>+ 900 ₴</b></div><p className="lp-demo-label">{t("Ілюстрація інтерфейсу · демонстраційні дані")}</p>
        </div>
      </section>
      <div className="lp-wrap lp-flow-strip"><span>{t("Менше перемикань.")}<br/><b>{t("Більше порядку.")}</b></span><div><CalendarDays/>{t(" Запис")}</div><ArrowRight/><div><Users/>{t(" Призначення")}</div><ArrowRight/><div><ClipboardCheck/>{t(" Перевірка")}</div><ArrowRight/><div><CircleDollarSign/>{t(" Нарахування")}</div></div>
      <section className="lp-wrap lp-section lp-switch" aria-labelledby="lp-switch-title">
        <div className="lp-switch-copy"><p className="lp-eyebrow">{t("Студія виросла. Час змінити інструменти.")}</p><h2 id="lp-switch-title">{t("Досить керувати студією")}<br/><span>{t("в Google-таблицях.")}</span></h2><p>{t("Записи — у таблиці, завдання — у чаті, зарплата — на калькуляторі. Зберіть роботу команди в одному місці й приділіть більше уваги автомобілям та клієнтам.")}</p><a className="lp-secondary" href="/register">{t("Навести лад у студії ")}<ArrowRight size={17}/></a></div>
        <div className="lp-switch-points">
          <article><span className="lp-switch-icon"><Sheet size={21}/></span><div><p className="lp-switch-before">{t("«У якій таблиці цей запис?»")}</p><h3>{t("Кожне авто має своє замовлення")}</h3><p>{t("Клієнт, послуги, майстер і статус роботи зібрані в одній картці.")}</p></div></article>
          <article><span className="lp-switch-icon"><MessageSquare size={21}/></span><div><p className="lp-switch-before">{t("«Хто це робить і що вже готово?»")}</p><h3>{t("Кожен знає свої завдання")}</h3><p>{t("Власник бачить хід робіт, а кожен майстер — свої призначення та чекліст у кабінеті.")}</p></div></article>
          <article><span className="lp-switch-icon"><Calculator size={21}/></span><div><p className="lp-switch-before">{t("«Скільки нарахувати за цю роботу?»")}</p><h3>{t("Умови оплати вже збережені")}</h3><p>{t("Відсоток або фіксована сума за послугу. Перевіряєте роботу й підтверджуєте нарахування.")}</p></div></article>
        </div>
      </section>
      <section className="lp-wrap lp-transfer" aria-labelledby="lp-transfer-title"><div><span className="lp-tag"><Sheet size={15}/>{t(" Імпорт клієнтів із CSV")}</span><h2 id="lp-transfer-title">{t("Ваша база вже в таблиці?")}<br/>{t("Перенесіть її за кілька кліків.")}</h2><p>{t("Заповніть готовий шаблон або збережіть свою Google-таблицю чи Excel у CSV та завантажте в Detailflow. Імена, телефони й автомобілі перенесуться після вашого підтвердження — без ручного введення кожного клієнта.")}</p><div className="lp-transfer-actions"><a className="lp-secondary" href="/register">{t("Почати зі своєї бази ")}<ArrowRight size={17}/></a><a className="lp-secondary" href="/templates/detailflow-clients.csv" download="detailflow-clients.csv">{t("Завантажити шаблон ")}<ArrowDown size={17}/></a></div></div><ol><li><span>01</span><div><b>{t("Завантажте CSV")}</b><p>{t("Або вставте скопійовані рядки разом із заголовками.")}</p></div></li><li><span>02</span><div><b>{t("Перевірте дані")}</b><p>{t("Оберіть колонки імені, телефону та авто в попередньому перегляді.")}</p></div></li><li><span>03</span><div><b>{t("Підтвердьте імпорт")}</b><p>{t("Клієнти зі збігом телефону зіставляються з наявною базою.")}</p></div></li></ol></section>
      <section className="lp-wrap lp-section" id="features"><div className="lp-section-top"><div><p className="lp-eyebrow">{t("Від клієнтської бази до керування студією")}</p><h2>Detailflow —<br/>{t("більше, ніж CRM.")}</h2></div><p>{t("Клієнти та записи — це початок. Далі — зміни майстрів, завдання по кожному авто, перевірка якості, нарахування та фінанси студії.")}</p></div>
        <div className="lp-features">{features.map(({ icon: Icon, title, text }, i) => <article className="lp-feature" key={title}><div><Icon size={23}/><span>0{i + 1}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>
      <section className="lp-wrap lp-section lp-stock" id="stock" aria-labelledby="lp-stock-title">
        <div className="lp-stock-copy"><p className="lp-eyebrow">{t("Склад вашої студії")}</p><h2 id="lp-stock-title">{t("Хімія та матеріали —")}<br/>{t("під контролем.")}</h2><p>{t("Відстежуйте залишки автохімії, витратних матеріалів і товарів. Бачте, що є на складі та що вже час докупити.")}</p><ul><li><Check size={17}/><span><b>{t("Залишки та мінімальний запас")}</b>{t("Встановлюйте поріг для кожної позиції й бачте матеріали, яких бракує.")}</span></li><li><Check size={17}/><span><b>{t("Прихід і списання")}</b>{t("Фіксуйте поставки та використання матеріалів з історією рухів.")}</span></li><li><Check size={17}/><span><b>{t("Інвентаризація")}</b>{t("Звіряйте облік із фактичними залишками на полиці.")}</span></li></ul><a className="lp-secondary" href="/register">{t("Підключити свою студію ")}<ArrowRight size={17}/></a></div>
        <div className="lp-stock-visual"><div className="lp-stock-preview"><div className="lp-preview-top"><span><Package size={18}/>{t(" Залишки матеріалів")}</span><small>{t("Приклад складу")}</small></div><div className="lp-stock-list" role="table" aria-label={t("Демонстраційні залишки матеріалів")}><div className="lp-stock-head" role="row"><span role="columnheader">{t("Матеріал")}</span><span role="columnheader">{t("Залишок")}</span><span role="columnheader">{t("Стан")}</span></div>{[
          {name:'Автошампунь',minimum:'Мінімум: 3 л',quantity:'8 л',low:false},
          {name:'Мікрофібра',minimum:'Мінімум: 10 шт.',quantity:'24 шт.',low:false},
          {name:'Полірувальна паста',minimum:'Мінімум: 1 л',quantity:'0,4 л',low:true},
        ].map(item=><div className="lp-stock-row" role="row" key={item.name}><span role="cell"><b>{item.name}</b><small>{item.minimum}</small></span><span role="cell">{item.quantity}</span><span role="cell"><span className={item.low?'lp-stock-status is-low':'lp-stock-status'}>{item.low?t("Докупити"):t("У запасі")}</span></span></div>)}</div><div className="lp-stock-hint"><Package size={18}/><span>{t("1 позиція нижче мінімального запасу")}</span></div></div><p className="lp-demo-label">{t("Ілюстрація складського обліку · демонстраційні дані")}</p></div>
      </section>
      <section className="lp-workspaces" id="workspace"><div className="lp-wrap lp-section"><div className="lp-section-top"><div><p className="lp-eyebrow">{t("Одна команда — різні задачі")}</p><h2>{t("Кожному —")}<br/>{t("свій робочий простір.")}</h2></div><div className="lp-role-tabs" role="tablist" aria-label={t("Кабінети")}><button id="owner-tab" role="tab" aria-selected={role === 'owner'} aria-controls="workspace-panel" tabIndex={role === 'owner' ? 0 : -1} onClick={() => setRole('owner')} onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'End') { e.preventDefault(); setRole('master'); document.getElementById('master-tab')?.focus() } }}>{t("Власнику")}</button><button id="master-tab" role="tab" aria-selected={role === 'master'} aria-controls="workspace-panel" tabIndex={role === 'master' ? 0 : -1} onClick={() => setRole('master')} onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'Home') { e.preventDefault(); setRole('owner'); document.getElementById('owner-tab')?.focus() } }}>{t("Майстру")}</button></div></div>
        <div className="lp-role-panel" id="workspace-panel" role="tabpanel" aria-labelledby={`${role}-tab`} tabIndex={0}>
          <div className="lp-role-copy"><span className="lp-tag">{role === 'owner' ? t("Керування студією") : t("Особистий кабінет")}</span><h3>{role === 'owner' ? t("Бачте результат, а не збирайте звіти в чатах.") : t("Відкрив зміну. Побачив задачі. Почав роботу.")}</h3><p>{role === 'owner' ? t("Розподіляйте роботу між майстрами та контролюйте кожен етап — від призначення до видачі авто.") : t("Усі призначення, інформація про авто та чеклісти доступні в одному місці, зокрема з телефона.")}</p><ul>{(role === 'owner' ? ['Призначення майстрів і контроль статусів', 'Перевірка роботи перед нарахуванням', 'Умови оплати окремо для кожного майстра'] : ['Початок і завершення своєї зміни', 'Завдання та передача роботи на перевірку', 'Перегляд підтверджених нарахувань']).map(text => <li key={text}><Check size={17}/>{text}</li>)}</ul><a className="lp-secondary" href={role === 'owner' ? '/register' : '/login?role=master'}>{role === 'owner' ? t("Зареєструвати студію") : t("Увійти як майстер")}<ArrowRight size={17}/></a></div>
          <div className="lp-role-preview">{role === 'owner' ? <StudioPreview/> : <MasterPreview/>}<p className="lp-demo-label">{t("Приклад інтерфейсу")}</p></div>
        </div>
      </div></section>
      <section className="lp-wrap lp-section" id="workflow"><p className="lp-eyebrow">{t("Від заявки до першого замовлення")}</p><h2>{t("Почнімо з вашої студії.")}</h2><div className="lp-steps">{[
        ['Залиште заявку', 'Вкажіть назву студії, контакти та зручний месенджер.'], ['Отримайте доступ', 'Підтвердіть email. Менеджер зв’яжеться з вами та активує акаунт.'], ['Зберіть команду', 'Додайте послуги, запросіть майстрів і налаштуйте умови оплати.'], ['Керуйте роботою', 'Створюйте замовлення, призначайте задачі та перевіряйте результат.'],
      ].map(([title, text], i) => <article key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section className="lp-wrap lp-section lp-faq" id="questions"><div><p className="lp-eyebrow">{t("Перед початком")}</p><h2>{t("Є запитання?")}<br/>{t("Ось відповіді.")}</h2></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={19}/></summary><p>{answer}</p></details>)}</div></section>
      <section className="lp-wrap lp-final"><div><p className="lp-eyebrow">{t("Наступний крок — простіший робочий день")}</p><h2>{t("Дайте студії")}<br/>{t("власний Detailflow.")}</h2><p>{t("Залиште заявку — менеджер допоможе розпочати.")}</p></div><div><a className="lp-button" href="/register">{t("Зареєструвати студію ")}<ArrowRight size={19}/></a><a className="lp-secondary" href="/login">{t("Уже з нами? Увійти")}</a></div></section>
    </main>
    <footer className="lp-wrap lp-footer"><a className="lp-brand" href="/"><i/>detailflow</a><p>{t("Порядок у роботі. Увага до деталей.")}</p><span>© {new Date().getFullYear()} Detailflow</span></footer>
  </div>
}

function StudioPreview() {
  return <div className="lp-studio-preview"><div className="lp-preview-top"><span><Layers3 size={17}/>{t(" Робота студії")}</span><small>{t("Сьогодні")}</small></div><div className="lp-preview-metrics"><div><small>{t("Авто в роботі")}</small><b>4 <CarFront size={19}/></b></div><div><small>{t("Команда на зміні")}</small><b>3 <Users size={19}/></b></div></div><div className="lp-preview-board"><div><p><span/>{t(" У роботі ")}<b>2</b></p><article><CarFront size={26}/><h4>BMW 5 Series</h4><p>{t("Полірування кузова")}</p><div><span className="lp-avatar">{t("ОМ")}</span><small>{t("Олександр · майстер")}</small></div><span className="lp-progress"><i/></span><small>{t("2 з 3 завдань виконано")}</small></article></div><div><p><span/>{t(" На перевірці ")}<b>1</b></p><article><CarFront size={26}/><h4>Audi Q7</h4><p>{t("Хімчистка салону")}</p><div><span className="lp-avatar">{t("ІК")}</span><small>{t("Іван · майстер")}</small></div><span className="lp-review"><CheckCheck size={15}/>{t(" Завдання виконано")}</span><small>{t("Очікує перевірки власника")}</small></article></div></div></div>
}
function MasterPreview() {
  return <div className="lp-master-preview"><div className="lp-preview-top"><span>{t("Кабінет майстра")}</span><span className="lp-tag"><span className="lp-dot"/>{t(" На зміні")}</span></div><h4>{t("Привіт, Олександр")}</h4><p><Clock3 size={15}/>{t(" Зміну розпочато о 09:00")}</p><div className="lp-master-job"><span className="lp-tag">{t("Моє завдання")}</span><h4>BMW 5 Series</h4><p>{t("Полірування кузова")}</p><ul><li><Check size={17}/>{t(" Підготовча мийка")}</li><li><Check size={17}/>{t(" Полірування")}</li><li><span className="lp-unchecked"/>{t(" Фінішна перевірка")}</li></ul><div className="lp-preview-action"><ClipboardCheck size={17}/>{t(" Передати на перевірку")}</div></div><div className="lp-master-earned"><span>{t("Підтверджені нарахування")}</span><b>2 400 ₴</b></div></div>
}
