import BusinessAnalytics,{type Report} from '../BusinessAnalytics'

// Seeded values keep visual QA realistic while producing identical screenshots on every run.
const random=(()=>{let state=0xD37A1F10;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296}})()
const months=Array.from({length:12},(_,i)=>{const date=new Date();date.setDate(1);date.setMonth(date.getMonth()-(11-i));const month=date.toISOString().slice(0,7),orders=18+Math.floor(random()*34);return{month,orders,revenue:orders*(2200+Math.floor(random()*1900))}})
const clientNames=['Олександр Марченко','Ірина Савчук','Дмитро Коваль','Наталія Шевченко','Артем Лисенко','Вікторія Бондар','Олег Романюк','Марія Ткаченко','Тарас Бойко','Катерина Дорошенко','Юлія Мельник','Павло Гнатюк']
const clients=Array.from({length:12},(_,i)=>{const visits=1+Math.floor(random()*8),avg=1400+Math.floor(random()*6100),revenue=visits*avg;return{id:`client-${i+1}`,name:clientNames[i],visits,revenue,lifetime_visits:visits+Math.floor(random()*12),lifetime_value:revenue+Math.floor(random()*26000),returning:visits>1}})
const report:Report={timezone:'Europe/Kyiv',orders:184,revenue:486320,late_orders:7,dated_orders:171,
 clients,
 masters:[{staff_id:'1',name:'Руслан Коваленко',jobs:72,revenue:198400,seconds:214200,timed_jobs:68,timed_revenue:187600,orders:66,average_order:3006,cancelled_orders:3},{staff_id:'2',name:'Максим Бондар',jobs:61,revenue:176800,seconds:189000,timed_jobs:58,timed_revenue:169000,orders:57,average_order:3101,cancelled_orders:4},{staff_id:'3',name:'Андрій Мельник',jobs:51,revenue:111120,seconds:160800,timed_jobs:47,timed_revenue:103600,orders:48,average_order:2315,cancelled_orders:2}],
 services:[{title:'Комплексна мийка · XL',jobs:64,measured:61,planned:75,actual:82,exceeded:12},{title:'Полірування кузова',jobs:42,measured:40,planned:240,actual:228,exceeded:9},{title:'Керамічний захист',jobs:31,measured:28,planned:180,actual:196,exceeded:14},{title:'Догляд за салоном',jobs:47,measured:44,planned:120,actual:116,exceeded:7}],
 demand:Array.from({length:7*10},(_,i)=>({weekday:Math.floor(i/10)+1,booking_hour:8+i%10,bookings:Math.floor(random()*8),cancelled:Math.floor(random()*2)})),
 months}
export default function AnalyticsPreview(){return <section className="content"><p>QA · Синтетичні демонстраційні дані</p><BusinessAnalytics preview={report}/></section>}
