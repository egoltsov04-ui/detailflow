import {dayCapacity,mergeIntervals,shiftInterval,type Interval} from './capacity.ts'
import {studioDateTime} from './formValues.ts'
export type IntelligenceData={as_of:string;timezone:string;from:string;to:string;
 orders:{id:string;client_id:string|null;value:number;at:string}[];clients:{id:string;name:string}[];
 staff:{id:string;name:string;active:boolean}[];schedules:{staff_id:string;weekday:number;starts_at:string;ends_at:string}[];
 appointments:{id:string;staff_id:string|null;start:string;end:string;status:string}[];
 shifts:{staff_id:string;start:string;end:string;breaks:{from:string;to:string}[]}[];
 sessions:{staff_id:string|null;start:string;end:string}[];
 services:{id:string;name:string;price:number;variants:{id:string;name:string;price:number}[]}[];
 outcomes:{id:string;kind:string;target:string;at:string;evidence:Record<string,unknown>}[]}
const day=86400000,min=60000,stamp=(v:string)=>Date.parse(v),clip=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v))
const sum=(rows:Interval[])=>mergeIntervals(rows).reduce((n,r)=>n+r.end-r.start,0)
const interval=(start:string,end:string,lo:number,hi:number):Interval=>({start:Math.max(stamp(start)/min,lo),end:Math.min(stamp(end)/min,hi)})
export function operationsReport(data:IntelligenceData){
 const lo=studioDateTime(data.from,'00:00',data.timezone).getTime()/min,next=new Date(data.to+'T12:00Z');next.setUTCDate(next.getUTCDate()+1)
 const hi=Math.min(stamp(data.as_of)/min,studioDateTime(next.toISOString().slice(0,10),'00:00',data.timezone).getTime()/min)
 const rows=data.staff.map(s=>{
  const shifts=data.shifts.filter(r=>r.staff_id===s.id).flatMap(r=>dayCapacity([interval(r.start,r.end,lo,hi)],r.breaks.map(b=>interval(b.from,b.to,lo,hi))).free)
  const work=data.sessions.filter(r=>r.staff_id===s.id).map(r=>interval(r.start,r.end,lo,hi)),actual=dayCapacity(shifts,work)
  const bookings=data.appointments.filter(a=>a.staff_id===s.id&&stamp(a.start)/min>=lo&&stamp(a.start)/min<hi)
  const eligible=bookings.filter(a=>a.status!=='cancelled'&&a.status!=='pending'),missed=eligible.filter(a=>a.status==='no_show').length
  return {id:s.id,name:s.name,attendance:actual.total,worked:actual.used,outside_shift:Math.max(0,sum(work)-actual.used),utilization:actual.total?actual.used/actual.total*100:null,appointments:eligible.length,no_shows:missed,no_show_rate:eligible.length?100*missed/eligible.length:null,cancelled:bookings.filter(a=>a.status==='cancelled').length}
 })
 return {rows,unassigned:data.appointments.filter(a=>!a.staff_id&&stamp(a.start)/min>=lo&&stamp(a.start)/min<hi&&a.status==='no_show').length}
}
export function futureCapacity(data:IntelligenceData){
 const now=stamp(data.as_of)/min,today=new Intl.DateTimeFormat('en-CA',{timeZone:data.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(data.as_of)),end=now+14*1440
 let total=0,used=0,invalid=0
 for(const staff of data.staff.filter(s=>s.active))for(let i=0;i<15;i++){
  const date=new Date(today+'T12:00Z');date.setUTCDate(date.getUTCDate()+i);const d=date.toISOString().slice(0,10)
  const shifts=data.schedules.filter(s=>s.staff_id===staff.id&&s.weekday===date.getUTCDay()).flatMap(s=>{const v=shiftInterval(d,s.starts_at,s.ends_at,data.timezone);if(!v){invalid++;return []}return [{start:Math.max(v.start,now),end:Math.min(v.end,end)}]})
  const bookings=data.appointments.filter(a=>a.staff_id===staff.id&&!['cancelled','no_show','pending'].includes(a.status)).map(a=>({start:stamp(a.start)/min,end:stamp(a.end)/min}))
  const capacity=dayCapacity(shifts,bookings);total+=capacity.total;used+=capacity.used
 }
 return {total,used,percent:total?100*used/total:null,invalid}
}
type Example={id:string;x:number[];value:number;returned:number;average:number}
function examples(orders:IntelligenceData['orders'],cutoff:number,labels=true):Example[]{
 const grouped=new Map<string,IntelligenceData['orders']>();for(const o of orders){if(!o.client_id)continue;const rows=grouped.get(o.client_id)||[];rows.push(o);grouped.set(o.client_id,rows)}
 return [...grouped].flatMap(([id,rows])=>{const past=rows.filter(o=>stamp(o.at)<cutoff&&stamp(o.at)>=cutoff-365*day).sort((a,b)=>stamp(a.at)-stamp(b.at));if(past.length<2)return []
  const average=past.reduce((n,o)=>n+Number(o.value),0)/past.length,future=labels?rows.filter(o=>stamp(o.at)>=cutoff&&stamp(o.at)<cutoff+90*day):[]
  return [{id,x:[1,clip((cutoff-stamp(past.at(-1)!.at))/day/180,0,3),Math.log1p(past.length)/3,Math.log1p(average)/10,clip((cutoff-stamp(past[0].at))/day/365,0,1),past.filter(o=>stamp(o.at)>=cutoff-90*day).length/10],value:future.reduce((n,o)=>n+Number(o.value),0),returned:Number(future.length>0),average}]
 })
}
const sigmoid=(v:number)=>1/(1+Math.exp(-clip(v,-25,25))),dot=(a:number[],b:number[])=>a.reduce((s,v,i)=>s+v*b[i],0)
function fit(rows:Example[],binary:boolean){const w=Array(6).fill(0);for(let iteration=0;iteration<500;iteration++){const gradient=Array(6).fill(0);for(const r of rows){const predicted=binary?sigmoid(dot(w,r.x)):dot(w,r.x),target=binary?r.returned:Math.log1p(r.value);for(let i=0;i<6;i++)gradient[i]+=(predicted-target)*r.x[i]}for(let i=0;i<6;i++)w[i]-=.08*(gradient[i]/rows.length+(i?.01*w[i]:0))}return w}
export function customerForecast(data:IntelligenceData){
 const now=stamp(data.as_of),train=examples(data.orders,now-180*day),validation=examples(data.orders,now-90*day)
 const readiness={training:train.length,validation:validation.length,history_days:data.orders.length?Math.floor((now-Math.min(...data.orders.map(o=>stamp(o.at))))/day):0}
 const empty={...readiness,ready:false,reason:'sample' as string,rows:[] as {id:string;name:string;return_probability:number;value90:number}[],mae:null as number|null,baseline_mae:null as number|null,brier:null as number|null,baseline_brier:null as number|null}
 if(train.length<50||validation.length<50||readiness.history_days<270||train.filter(r=>r.returned).length<10||train.filter(r=>!r.returned).length<10)return empty
 const classifier=fit(train,true),regressor=fit(train,false),baseReturn=train.reduce((n,r)=>n+r.returned,0)/train.length,baseValue=train.reduce((n,r)=>n+r.value,0)/train.length
 const valueCap=Math.log1p(Math.max(1,...train.map(r=>r.value))*2)
 const predictValue=(w:number[],r:Example)=>Math.max(0,Math.expm1(clip(dot(w,r.x),0,valueCap)))
 const mae=validation.reduce((n,r)=>n+Math.abs(predictValue(regressor,r)-r.value),0)/validation.length,baseline_mae=validation.reduce((n,r)=>n+Math.abs(baseValue-r.value),0)/validation.length
 const brier=validation.reduce((n,r)=>n+(sigmoid(dot(classifier,r.x))-r.returned)**2,0)/validation.length,baseline_brier=validation.reduce((n,r)=>n+(baseReturn-r.returned)**2,0)/validation.length
 const measured={...empty,mae,baseline_mae,brier,baseline_brier}
 if(!Number.isFinite(mae)||mae>=baseline_mae||brier>=baseline_brier)return {...measured,reason:'validation'}
 const learned=[...train,...validation],finalClassifier=fit(learned,true),finalRegressor=fit(learned,false)
 return {...measured,ready:true,reason:'ready',rows:examples(data.orders,now,false).map(r=>({id:r.id,name:data.clients.find(c=>c.id===r.id)?.name||'—',return_probability:sigmoid(dot(finalClassifier,r.x)),value90:predictValue(finalRegressor,r)})).sort((a,b)=>b.value90-a.value90)}
}
export function recommendationOutcomes(data:IntelligenceData){return data.outcomes.filter(o=>o.kind==='return'||o.kind==='upsell').map(o=>{
 const client=o.target.split(':')[0],at=stamp(o.at),days=Math.floor((stamp(data.as_of)-at)/day),orders=data.orders.filter(r=>r.client_id===client&&stamp(r.at)>at&&stamp(r.at)<=at+90*day)
 return {id:o.id,kind:o.kind,days,complete:days>=90,visits:orders.length,value:orders.reduce((n,r)=>n+Number(r.value),0)}
})}
