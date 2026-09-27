export type BookingService = { id:string; name:string; category?:string|null; price:number; duration_minutes:number }
export type BookingStaff = { id:string; full_name:string; specialty:string|null }
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
export function availableStaff(data:BookingData,start:Date,duration:number,preferred='',now=Date.now()):BookingStaff[] {
  if(!Number.isFinite(start.getTime())||!Number.isFinite(duration)||duration<=0||start.getTime()<now+30*60_000||start.getTime()>now+30*86400_000)return []
  const end=new Date(start.getTime()+duration*60_000),zone=data.studio.timezone||'Europe/Kyiv',day=studioDay(start,zone)
  if(studioDay(end,zone)!==day)return []
  const weekday=new Date(`${day}T12:00:00Z`).getUTCDay(),format=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
  const from=minutes(format.format(start)),to=minutes(format.format(end))
  return data.staff.filter(member=>{
    if(preferred&&member.id!==preferred)return false
    const shifts=data.schedules.filter(s=>s.staff_id===member.id)
    const today=shifts.length?shifts.filter(s=>s.weekday===weekday):[{starts_at:'09:00',ends_at:'19:00'}]
    return today.some(s=>from>=minutes(s.starts_at)&&to<=minutes(s.ends_at))&&!data.appointments.some(b=>(!b.staff_id||b.staff_id===member.id)&&start<new Date(b.ends_at)&&end>new Date(b.starts_at))
  })
}
export function bookingTotals(services:BookingService[]) {
  return {price:services.reduce((sum,s)=>sum+Number(s.price),0),duration:services.reduce((sum,s)=>sum+Number(s.duration_minutes),0)}
}
