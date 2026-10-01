export type ServiceVariant = {id:string;name:string;price:number;duration_minutes:number;description?:string}
export type ServiceOptions = {id?:string;description:string;variants:ServiceVariant[]}
export type BookingService = { id:string; name:string; category?:string|null; price:number; duration_minutes:number;description?:string;variants?:ServiceVariant[] }
export function serviceOptionsError(options:ServiceOptions):string {
  if(options.description.length>2000)return 'Опис послуги — до 2000 символів.'
  if(!Array.isArray(options.variants)||options.variants.length>20)return 'Додайте не більше 20 варіантів.'
  const ids=new Set<string>(),names=new Set<string>()
  for(const v of options.variants){
    if(!v.id||!v.name.trim()||v.name.length>80)return 'Вкажіть назву кожного варіанта (до 80 символів).'
    if(ids.has(v.id)||names.has(v.name.trim().toLocaleLowerCase()))return 'Назви варіантів не мають повторюватися.'
    ids.add(v.id);names.add(v.name.trim().toLocaleLowerCase())
    if(!Number.isFinite(v.price)||v.price<0||v.price>99999999.99||Math.abs(v.price*100-Math.round(v.price*100))>0.00001)return 'Вкажіть коректну ціну варіанта з точністю до копійок.'
    if(!Number.isInteger(v.duration_minutes)||v.duration_minutes<1||v.duration_minutes>1440)return 'Тривалість варіанта — від 1 до 1440 хвилин.'
    if((v.description||'').length>500)return 'Опис варіанта — до 500 символів.'
  }
  return ''
}
/** Resolve prices from the studio catalog, never from the customer's payload. */
export function resolveBookingServices(catalog:BookingService[],ids:string[],variants:Record<string,string>={}):BookingService[]{
  if(Object.keys(variants).some(id=>!ids.includes(id)))throw new Error('Оновіть вибір послуг і варіантів.')
  return ids.map(id=>{
    const s=catalog.find(s=>s.id===id)
    if(!s)throw new Error('Обрана послуга недоступна. Оновіть сторінку.')
    if(!s.variants?.length){if(variants[id])throw new Error('Варіант більше недоступний. Оберіть послугу знову.');return s}
    const v=s.variants.find(v=>v.id===variants[id])
    if(!v)throw new Error(`Оберіть варіант послуги «${s.name}».`)
    return {...s,name:`${s.name} · ${v.name}`,price:Number(v.price),duration_minutes:Number(v.duration_minutes)}
  })
}
export type BookingStaff = { id:string; full_name:string; specialty:string|null;all_services?:boolean;staff_services?:{service_id:string}[] }
export type BookingBusy = { staff_id:string|null; starts_at:string; ends_at:string }
export type BookingShift = { staff_id:string; weekday:number; starts_at:string; ends_at:string }
export type BookingData = { studio:{ name:string; address:string|null; timezone:string }; services:BookingService[]; staff:BookingStaff[]; appointments:BookingBusy[]; schedules:BookingShift[] }
const minutes = (time:string) => Number(time.slice(0,2))*60+Number(time.slice(3,5))
export function studioDay(date:Date, timezone:string):string {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(p=>[p.type,p.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
export function addBookingDays(day:string,count:number):string {
  const date=new Date(`${day}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+count);return date.toISOString().slice(0,10)
}
export function availableStaff(data:BookingData,start:Date,duration:number,preferred='',now=Date.now(),serviceIds:string[]=[]):BookingStaff[] {
  if(!Number.isFinite(start.getTime())||!Number.isFinite(duration)||duration<=0||start.getTime()<now+30*60_000||start.getTime()>now+30*86400_000)return []
  const end=new Date(start.getTime()+duration*60_000),zone=data.studio.timezone||'Europe/Kyiv',day=studioDay(start,zone)
  if(studioDay(end,zone)!==day)return []
  const weekday=new Date(`${day}T12:00:00Z`).getUTCDay(),format=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
  const from=minutes(format.format(start)),to=minutes(format.format(end))
  return data.staff.filter(member=>{
    if(preferred&&member.id!==preferred)return false
    if(member.all_services===false&&serviceIds.some(id=>!member.staff_services?.some(s=>s.service_id===id)))return false
    const shifts=data.schedules.filter(s=>s.staff_id===member.id)
    const today=shifts.filter(s=>s.weekday===weekday)
    return today.some(s=>from>=minutes(s.starts_at)&&to<=minutes(s.ends_at))&&!data.appointments.some(b=>(!b.staff_id||b.staff_id===member.id)&&start<new Date(b.ends_at)&&end>new Date(b.starts_at))
  })
}
export function bookingTotals(services:BookingService[]) {
  return {price:services.reduce((sum,s)=>sum+Number(s.price),0),duration:services.reduce((sum,s)=>sum+Number(s.duration_minutes),0)}
}
