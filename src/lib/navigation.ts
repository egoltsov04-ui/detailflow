export const pages:Record<string,string>={
 'Огляд':'/app/overview','Календар':'/app/work/calendar','Замовлення':'/app/work/kanban','Список робіт':'/app/work/list','Онлайн-запис':'/app/work/requests',
 'Клієнти':'/app/clients','Звернення':'/app/clients/requests','Фотоархів':'/app/clients/media',
 'Чеки':'/app/finance/documents','Рахунки':'/app/finance/invoices','Оплати':'/app/finance/payments','Витрати':'/app/finance/expenses','Продажі':'/app/finance/sales',
 'Склад':'/app/warehouse','Команда':'/app/team','Зміни й зарплата':'/app/team/payroll','Завдання':'/app/team/tasks','Кабінет майстра':'/app/team/preview',
 'Аналітика':'/app/analytics','Налаштування':'/app/settings','Послуги':'/app/settings/services','Тариф':'/app/settings/billing','Пости':'/app/settings/posts'
}
export const aliases:Record<string,string>={'Роботи':'Календар','Фінанси':'Оплати','Аналітика та фінанси':'Аналітика','Звіти':'Аналітика'}
export const legacyRoutes:Record<string,string>={
 '/app':'/app/overview','/overview':'/app/overview','/calendar':'/app/work/calendar','/orders':'/app/work/kanban','/work-orders':'/app/work/kanban',
 '/clients':'/app/clients','/leads':'/app/clients/requests','/media':'/app/clients/media','/finance':'/app/finance/payments','/payments':'/app/finance/payments','/expenses':'/app/finance/expenses','/sales':'/app/finance/sales','/invoices':'/app/finance/invoices','/receipts':'/app/finance/documents',
 '/team':'/app/team','/tasks':'/app/team/tasks','/warehouse':'/app/warehouse','/inventory':'/app/warehouse','/analytics':'/app/analytics','/reports':'/app/analytics','/settings':'/app/settings','/services':'/app/settings/services','/billing':'/app/settings/billing','/booking-requests':'/app/work/requests'
}
export function canonicalPage(page:string){return aliases[page]||page}
export function pageFromUrl(path:string,search=''){
 const q=new URLSearchParams(search);if(q.has('payment'))return 'Тариф'
 const old=q.get('page');if(old&&pages[canonicalPage(old)])return canonicalPage(old)
 const normalized=path.replace(/\/$/,'')||'/',target=legacyRoutes[normalized]||legacyRoutes[normalized.replace(/^\/app/,'')]||normalized
 return Object.entries(pages).find(([,url])=>url===target)?.[0]||'Огляд'
}
export function sectionFor(page:string){const path=pages[canonicalPage(page)]||'';return path.split('/')[2]||'overview'}
export const sectionTabs:Record<string,{page:string;label:string}[]>={
 work:[{page:'Календар',label:'Календар'},{page:'Замовлення',label:'Канбан'},{page:'Список робіт',label:'Список'},{page:'Онлайн-запис',label:'Онлайн-запис'}],
 clients:[{page:'Клієнти',label:'Клієнти й авто'},{page:'Звернення',label:'Звернення'},{page:'Фотоархів',label:'Фотоархів'}],
 finance:[{page:'Чеки',label:'Чеки й рахунки'},{page:'Оплати',label:'Оплати'},{page:'Витрати',label:'Витрати'},{page:'Продажі',label:'Продажі'}],
 team:[{page:'Команда',label:'Майстри'},{page:'Зміни й зарплата',label:'Зміни й зарплата'},{page:'Завдання',label:'Завдання'}],
 settings:[{page:'Налаштування',label:'Дані студії'},{page:'Послуги',label:'Послуги'},{page:'Тариф',label:'Тариф і білінг'},{page:'Пости',label:'Пости студії'}]
}
