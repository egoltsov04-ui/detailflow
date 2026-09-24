import { useState } from 'react'
import { ArrowDown, ArrowRight, CalendarDays, CarFront, Check, CheckCheck, ChevronDown, CircleDollarSign, ClipboardCheck, Clock3, Layers3, Menu, Package, ShieldCheck, Users, X } from 'lucide-react'
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
    <a className="lp-skip" href="#lp-main">Перейти до вмісту</a>
    <header className="lp-header"><div className="lp-wrap lp-header-inner">
      <a className="lp-brand" href="/" aria-label="Detailflow — головна"><i/>detailflow<span>для детейлінгу</span></a>
      <button type="button" className="lp-menu-toggle" aria-label={menu ? 'Закрити меню' : 'Відкрити меню'} aria-expanded={menu} aria-controls="lp-nav" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
      <nav id="lp-nav" className={menu ? 'lp-nav is-open' : 'lp-nav'} aria-label="Головна навігація" onClick={() => setMenu(false)}>
        <a href="#features">Можливості</a><a href="#workflow">Як це працює</a><a href="#questions">Запитання</a>
        <a className="lp-login" href="/login">Увійти <ArrowRight size={16}/></a><a className="lp-button lp-button-small" href="/register">Зареєструвати студію</a>
      </nav>
    </div></header>
    <main id="lp-main">
      <section className="lp-wrap lp-hero">
        <div className="lp-hero-copy"><p className="lp-eyebrow"><span/> Робочий простір детейлінг-студії</p>
          <h1>Кожне авто.<br/>Кожен майстер.<br/><em>Усе під контролем.</em></h1>
          <p className="lp-lead">Від першого запису до перевірки роботи та нарахування майстру. Detailflow об’єднує щоденну роботу вашої студії в одній системі.</p>
          <div className="lp-actions"><a className="lp-button" href="/register">Підключити студію <ArrowRight size={19}/></a><a className="lp-secondary" href="#workspace">Подивитися, як працює <ArrowDown size={17}/></a></div>
          <p className="lp-note"><ShieldCheck size={16}/> Власний кабінет для власника та кожного майстра</p>
        </div>
        <div className="lp-hero-visual" aria-label="Приклад роботи студії"><div className="lp-visual-label"><span className="lp-dot"/> Ваша студія. Один робочий простір.</div><StudioPreview/>
          <div className="lp-complete"><span><CheckCheck size={21}/></span><div><strong>Роботу перевірено</strong><small>Нарахування майстру підтверджено</small></div><b>+ 900 ₴</b></div><p className="lp-demo-label">Ілюстрація інтерфейсу · демонстраційні дані</p>
        </div>
      </section>
      <div className="lp-wrap lp-flow-strip"><span>Менше перемикань.<br/><b>Більше порядку.</b></span><div><CalendarDays/> Запис</div><ArrowRight/><div><Users/> Призначення</div><ArrowRight/><div><ClipboardCheck/> Перевірка</div><ArrowRight/><div><CircleDollarSign/> Нарахування</div></div>
      <section className="lp-wrap lp-section" id="features"><div className="lp-section-top"><div><p className="lp-eyebrow">Інструменти для щоденної роботи</p><h2>Вся студія.<br/>Без зайвих перемикань.</h2></div><p>Замовлення, команда й гроші пов’язані між собою. Ви бачите процес цілком і знаєте, що потребує уваги.</p></div>
        <div className="lp-features">{features.map(({ icon: Icon, title, text }, i) => <article className="lp-feature" key={title}><div><Icon size={23}/><span>0{i + 1}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>
      <section className="lp-workspaces" id="workspace"><div className="lp-wrap lp-section"><div className="lp-section-top"><div><p className="lp-eyebrow">Одна команда — різні задачі</p><h2>Кожному —<br/>свій робочий простір.</h2></div><div className="lp-role-tabs" role="tablist" aria-label="Кабінети"><button id="owner-tab" role="tab" aria-selected={role === 'owner'} aria-controls="workspace-panel" tabIndex={role === 'owner' ? 0 : -1} onClick={() => setRole('owner')} onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'End') { e.preventDefault(); setRole('master'); document.getElementById('master-tab')?.focus() } }}>Власнику</button><button id="master-tab" role="tab" aria-selected={role === 'master'} aria-controls="workspace-panel" tabIndex={role === 'master' ? 0 : -1} onClick={() => setRole('master')} onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'Home') { e.preventDefault(); setRole('owner'); document.getElementById('owner-tab')?.focus() } }}>Майстру</button></div></div>
        <div className="lp-role-panel" id="workspace-panel" role="tabpanel" aria-labelledby={`${role}-tab`} tabIndex={0}>
          <div className="lp-role-copy"><span className="lp-tag">{role === 'owner' ? 'Керування студією' : 'Особистий кабінет'}</span><h3>{role === 'owner' ? 'Бачте результат, а не збирайте звіти в чатах.' : 'Відкрив зміну. Побачив задачі. Почав роботу.'}</h3><p>{role === 'owner' ? 'Розподіляйте роботу між майстрами та контролюйте кожен етап — від призначення до видачі авто.' : 'Усі призначення, інформація про авто та чеклісти доступні в одному місці, зокрема з телефона.'}</p><ul>{(role === 'owner' ? ['Призначення майстрів і контроль статусів', 'Перевірка роботи перед нарахуванням', 'Умови оплати окремо для кожного майстра'] : ['Початок і завершення своєї зміни', 'Завдання та передача роботи на перевірку', 'Перегляд підтверджених нарахувань']).map(text => <li key={text}><Check size={17}/>{text}</li>)}</ul><a className="lp-secondary" href={role === 'owner' ? '/register' : '/login?role=master'}>{role === 'owner' ? 'Зареєструвати студію' : 'Увійти як майстер'}<ArrowRight size={17}/></a></div>
          <div className="lp-role-preview">{role === 'owner' ? <StudioPreview/> : <MasterPreview/>}<p className="lp-demo-label">Приклад інтерфейсу</p></div>
        </div>
      </div></section>
      <section className="lp-wrap lp-section" id="workflow"><p className="lp-eyebrow">Від заявки до першого замовлення</p><h2>Почнімо з вашої студії.</h2><div className="lp-steps">{[
        ['Залиште заявку', 'Вкажіть назву студії, контакти та зручний месенджер.'], ['Отримайте доступ', 'Підтвердіть email. Менеджер зв’яжеться з вами та активує акаунт.'], ['Зберіть команду', 'Додайте послуги, запросіть майстрів і налаштуйте умови оплати.'], ['Керуйте роботою', 'Створюйте замовлення, призначайте задачі та перевіряйте результат.'],
      ].map(([title, text], i) => <article key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section className="lp-wrap lp-section lp-faq" id="questions"><div><p className="lp-eyebrow">Перед початком</p><h2>Є запитання?<br/>Ось відповіді.</h2></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={19}/></summary><p>{answer}</p></details>)}</div></section>
      <section className="lp-wrap lp-final"><div><p className="lp-eyebrow">Наступний крок — простіший робочий день</p><h2>Дайте студії<br/>власний Detailflow.</h2><p>Залиште заявку — менеджер допоможе розпочати.</p></div><div><a className="lp-button" href="/register">Зареєструвати студію <ArrowRight size={19}/></a><a className="lp-secondary" href="/login">Уже з нами? Увійти</a></div></section>
    </main>
    <footer className="lp-wrap lp-footer"><a className="lp-brand" href="/"><i/>detailflow</a><p>Порядок у роботі. Увага до деталей.</p><span>© {new Date().getFullYear()} Detailflow</span></footer>
  </div>
}

function StudioPreview() {
  return <div className="lp-studio-preview"><div className="lp-preview-top"><span><Layers3 size={17}/> Робота студії</span><small>Сьогодні</small></div><div className="lp-preview-metrics"><div><small>Авто в роботі</small><b>4 <CarFront size={19}/></b></div><div><small>Команда на зміні</small><b>3 <Users size={19}/></b></div></div><div className="lp-preview-board"><div><p><span/> У роботі <b>2</b></p><article><CarFront size={26}/><h4>BMW 5 Series</h4><p>Полірування кузова</p><div><span className="lp-avatar">ОМ</span><small>Олександр · майстер</small></div><span className="lp-progress"><i/></span><small>2 з 3 завдань виконано</small></article></div><div><p><span/> На перевірці <b>1</b></p><article><CarFront size={26}/><h4>Audi Q7</h4><p>Хімчистка салону</p><div><span className="lp-avatar">ІК</span><small>Іван · майстер</small></div><span className="lp-review"><CheckCheck size={15}/> Завдання виконано</span><small>Очікує перевірки власника</small></article></div></div></div>
}
function MasterPreview() {
  return <div className="lp-master-preview"><div className="lp-preview-top"><span>Кабінет майстра</span><span className="lp-tag"><span className="lp-dot"/> На зміні</span></div><h4>Привіт, Олександр</h4><p><Clock3 size={15}/> Зміну розпочато о 09:00</p><div className="lp-master-job"><span className="lp-tag">Моє завдання</span><h4>BMW 5 Series</h4><p>Полірування кузова</p><ul><li><Check size={17}/> Підготовча мийка</li><li><Check size={17}/> Полірування</li><li><span className="lp-unchecked"/> Фінішна перевірка</li></ul><div className="lp-preview-action"><ClipboardCheck size={17}/> Передати на перевірку</div></div><div className="lp-master-earned"><span>Підтверджені нарахування</span><b>2 400 ₴</b></div></div>
}
