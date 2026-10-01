import PublicBookingPage from '../PublicBookingPage'
import { addBookingDays, studioDay, type BookingData } from '../lib/bookingAvailability'
const day=addBookingDays(studioDay(new Date(),'Europe/Kyiv'),1)
const sample:BookingData={
 studio:{name:'Detail Lab Kyiv',address:'Київ, вул. Прикладна, 12',timezone:'Europe/Kyiv'},
 services:[{id:'wash',name:'Преміум мийка',category:'Мийка',price:850,duration_minutes:60,description:'Делікатна двофазна мийка кузова, очищення дисків та сушіння мікрофіброю.',variants:[{id:'m',name:'M — седан',price:850,duration_minutes:60,description:'Легкові та компактні авто'},{id:'l',name:'L — кросовер',price:1100,duration_minutes:90,description:'Середні кросовери'},{id:'xl',name:'XL — позашляховик',price:1400,duration_minutes:120,description:'Великі SUV та мінівени'}]},{id:'interior',name:'Догляд за салоном',category:'Мийка',price:1200,duration_minutes:90},{id:'polish',name:'Відновлювальне полірування кузова',category:'Полірування',price:6500,duration_minutes:240},{id:'ceramic',name:'Керамічний захист',category:'Кераміка',price:9000,duration_minutes:180}],
 staff:[{id:'ruslan',full_name:'Руслан',specialty:'Мийка та догляд'},{id:'maks',full_name:'Максим',specialty:'Майстер детейлінгу'}],schedules:['ruslan','maks'].flatMap(staff_id=>Array.from({length:7},(_,weekday)=>({staff_id,weekday,starts_at:'09:00',ends_at:'19:00'}))),appointments:[{staff_id:'ruslan',starts_at:day+'T09:00:00Z',ends_at:day+'T11:00:00Z'}]
}
export default function PublicBookingPreview(){return <PublicBookingPage slug="detail-lab" previewData={sample} previewSubmit={async()=>{}}/>}
