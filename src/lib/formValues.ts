export type DateKind = 'date' | 'datetime-local' | 'time'
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
// Convert studio wall-clock time to UTC, including winter/summer offsets.
export function studioDateTime(day:string,time:string,timeZone='Europe/Kyiv'): Date {
  if(!validDate(day)||!validTime(time))throw new Error('Некоректна дата або час')
  const [y,m,d]=day.split('-').map(Number),[h,n]=time.split(':').map(Number),wall=Date.UTC(y,m-1,d,h,n)
  const formatter=new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
  const asWall=(stamp:number)=>{const fields=Object.fromEntries(formatter.formatToParts(new Date(stamp)).map(p=>[p.type,p.value]));return Date.UTC(Number(fields.year),Number(fields.month)-1,Number(fields.day),Number(fields.hour),Number(fields.minute))}
  let stamp=wall
  for(let i=0;i<3;i++)stamp+=wall-asWall(stamp)
  if(asWall(stamp)!==wall)throw new Error('Цей час пропущено через перехід на літній час. Оберіть інший.')
  return new Date(stamp)
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y,m,d]=value.split('-').map(Number), date=new Date(y,m-1,d)
  return y>=1000 && date.getFullYear()===y && date.getMonth()===m-1 && date.getDate()===d
}
export function validTime(value: string): boolean { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) }
export function displayDate(value: string, kind: DateKind): string {
  if (!value) return ''
  if(kind==='time')return value.slice(0,5)
  const [date,time]=value.split('T')
  if(!validDate(date))return value
  return date.split('-').reverse().join('.')+(kind==='datetime-local'?` ${time?.slice(0,5)||'09:00'}`:'')
}
export function parseDate(value: string, kind: DateKind): string | null {
  if(!value.trim())return ''
  if(kind==='time')return validTime(value.trim())?value.trim():null
  const match=value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}:\d{2}))?$/)
  if(!match)return null
  const iso=`${match[3]}-${match[2]}-${match[1]}`
  if(!validDate(iso))return null
  return kind==='date'?(match[4]?null:iso):validTime(match[4]||'')?`${iso}T${match[4]}`:null
}
export function dateError(value: string | null, min?: string, max?: string): string {
  if(value===null)return 'Вкажіть дійсну дату / час у зазначеному форматі.'
  if(value && min && value<min)return 'Значення раніше за дозволений початок.'
  if(value && max && value>max)return 'Значення пізніше за дозволене завершення.'
  return ''
}
export function normalizeNumber(value: string): string { return value.replace(/[\s\u00a0\u202f]/g,'').replace(',','.') }
export function numberError(value: string, min?: number|string, max?: number|string, step?: number|string): string {
  if(value==='')return ''
  if(!/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)||!Number.isFinite(Number(value)))return 'Введіть число, наприклад 1250,50.'
  const number=Number(value)
  if(min!==undefined&&number<Number(min))return `Мінімальне значення: ${min}.`
  if(max!==undefined&&number>Number(max))return `Максимальне значення: ${max}.`
  if(step!=='any'){
    const increment=Number(step??1), units=(number-Number(min??0))/increment
    if(increment>0&&Math.abs(units-Math.round(units))>1e-7)return `Вкажіть значення з кроком ${increment}.`
  }
  return ''
}
export function stepNumber(value: string, direction: number, min?: number|string, max?: number|string, step?: number|string): string {
  const increment=step==='any'?1:Number(step??1), base=Number(min??0)
  const current=value!==''&&Number.isFinite(Number(value))?Number(value):base
  const units=(current-base)/increment
  const next=base+(direction>0?Math.floor(units+1e-8)+1:Math.ceil(units-1e-8)-1)*increment
  return String(Number(Math.min(Number(max??Infinity),Math.max(Number(min??-Infinity),next)).toFixed(8)))
}
