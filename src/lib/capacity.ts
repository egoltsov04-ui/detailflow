import {studioDateTime} from './formValues.ts'
export type Interval={start:number;end:number}
// A recurring shift can land in a missing DST hour. Do not invent capacity then.
export function shiftInterval(day:string,start:string,end:string,timezone:string):Interval|null{
 try{
  const from=studioDateTime(day,start.slice(0,5),timezone).getTime()/60000
  const to=studioDateTime(day,end.slice(0,5),timezone).getTime()/60000
  return to>from?{start:from,end:to}:null
 }catch{return null}
}
export function mergeIntervals(rows:Interval[]):Interval[]{
 const sorted=rows.filter(r=>Number.isFinite(r.start)&&Number.isFinite(r.end)&&r.end>r.start).map(r=>({...r})).sort((a,b)=>a.start-b.start),out:Interval[]=[]
 for(const row of sorted){const last=out.at(-1);if(last&&row.start<=last.end)last.end=Math.max(last.end,row.end);else out.push(row)}return out
}
export function dayCapacity(shifts:Interval[],bookings:Interval[],slotMinutes=30){
 const schedule=mergeIntervals(shifts),busy=mergeIntervals(bookings),free:Interval[]=[],occupied:Interval[]=[]
 for(const shift of schedule){let cursor=shift.start;for(const booking of busy){const start=Math.max(shift.start,booking.start),end=Math.min(shift.end,booking.end);if(end<=start)continue;if(start>cursor)free.push({start:cursor,end:start});occupied.push({start,end});cursor=Math.max(cursor,end)}if(cursor<shift.end)free.push({start:cursor,end:shift.end})}
 const total=schedule.reduce((n,r)=>n+r.end-r.start,0),used=occupied.reduce((n,r)=>n+r.end-r.start,0)
 return {total,used,free,slots:slotMinutes>0?free.reduce((n,r)=>n+Math.floor((r.end-r.start)/slotMinutes),0):0,percent:total?Math.round(used/total*100):0}
}
export const clockMinutes=(clock:string)=>Number(clock.slice(0,2))*60+Number(clock.slice(3,5))
export const minuteClock=(minute:number)=>`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`
