import BusinessAnalytics,{type Report} from '../BusinessAnalytics'
const report:Report={timezone:'Europe/Kyiv',orders:24,revenue:42000,late_orders:2,dated_orders:20,
 clients:[{id:'1',name:'Тестовий клієнт',visits:2,revenue:4000,lifetime_visits:5,lifetime_value:12000,returning:true}],
 masters:[{staff_id:'1',name:'Майстер А',jobs:14,revenue:26000,seconds:43200,timed_jobs:12,timed_revenue:24000,orders:12,average_order:26000/12,cancelled_orders:2},{staff_id:'2',name:'Майстер Б',jobs:10,revenue:16000,seconds:0,timed_jobs:0,timed_revenue:null,orders:10,average_order:1600,cancelled_orders:0}],
 services:[{title:'Мийка · XL',jobs:14,measured:12,planned:60,actual:70,exceeded:4},{title:'Полірування',jobs:10,measured:0,planned:null,actual:null,exceeded:0}],
 demand:Array.from({length:7*10},(_,i)=>({weekday:Math.floor(i/10)+1,booking_hour:8+i%10,bookings:i%6,cancelled:i%6?1:0})),
 months:[{month:'2026-10',orders:24,revenue:42000}]}
export default function AnalyticsPreview(){return <section className="content"><p>QA · Синтетичні дані</p><BusinessAnalytics preview={report}/></section>}
