export function previousPeriod(from:string,to:string){
 const start=Date.parse(from+'T00:00:00Z'),end=Date.parse(to+'T00:00:00Z'),day=86400000
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)throw new Error('Invalid period')
 return {from:new Date(start-(end-start+day)).toISOString().slice(0,10),to:new Date(start-day).toISOString().slice(0,10)}
}
export function percentChange(current:number,previous:number){return previous===0?null:100*(current-previous)/Math.abs(previous)}
export function completeMonths<T extends {month:string;orders:number;revenue:number}>(rows:T[],from:string,to:string){
 const result:{month:string;orders:number;revenue:number}[]=[],date=new Date(from.slice(0,7)+'-01T00:00:00Z')
 while(date.toISOString().slice(0,7)<=to.slice(0,7)){const month=date.toISOString().slice(0,7);result.push(rows.find(r=>r.month===month)||{month,orders:0,revenue:0});date.setUTCMonth(date.getUTCMonth()+1)}
 return result
}
