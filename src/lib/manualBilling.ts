/** Calendar-month extension preserves remaining access and clamps month-end dates. */
export function extendAccess(current:string,months:number,today:string):string {
 const base=current>today?current:today
 const [year,month,day]=base.split('-').map(Number)
 const target=new Date(Date.UTC(year,month-1+months,1))
 const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate()
 target.setUTCDate(Math.min(day,last))
 return target.toISOString().slice(0,10)
}
export function managerLink(contact:string,message:string):string {
 const name=contact.trim().replace(/^https:\/\/t\.me\//,'').replace(/^@/,'')
 return /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(name)?`https://t.me/${name}?text=${encodeURIComponent(message)}`:''
}
