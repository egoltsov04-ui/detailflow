import {carBrands,type CarBrand} from './carBrands.ts'

export type VehicleInfo={brand:CarBrand|null;name:string;plate:string;uaPlate:boolean}

// Cyrillic letters allowed on Ukrainian plates look exactly like these Latin ones (DSTU 4278:2019).
const toLatin:Record<string,string>={'А':'A','В':'B','С':'C','Е':'E','Н':'H','І':'I','К':'K','М':'M','О':'O','Р':'P','Т':'T','Х':'X'}
const UA_PLATE=/^[ABCEHIKMOPTX]{2}\d{4}[ABCEHIKMOPTX]{2}$/

/** Upper-cases a plate, maps Cyrillic look-alikes to Latin and drops spaces and dashes. */
export function normalizePlate(value:string){return value.toUpperCase().replace(/[\s-]+/g,'').replace(/[АВСЕНІКМОРТХ]/g,c=>toLatin[c]||c)}

/** "АА 1234 ВВ" style formatting for a standard Ukrainian plate, otherwise the cleaned original. */
export function formatPlate(value:string):{text:string;ua:boolean}{
  const n=normalizePlate(value)
  if(UA_PLATE.test(n))return {text:`${n.slice(0,2)} ${n.slice(2,6)} ${n.slice(6)}`,ua:true}
  return {text:value.trim().toUpperCase().replace(/\s+/g,' '),ua:false}
}

const looksLikePlate=(s:string)=>{const v=s.trim();return v.length>=3&&v.length<=12&&/\d/.test(v)&&/[A-Za-zА-ЯІЇЄҐа-яіїєґ]/.test(v)&&!/[a-zа-яіїєґ]{3}/.test(v)}

const aliasIndex=carBrands.flatMap(b=>b.aliases.map(a=>({a,b}))).sort((x,y)=>y.a.length-x.a.length)

/** Finds a brand by alias at a word boundary, longest alias first ("range rover" before "rover"). */
export function findBrand(text:string):CarBrand|null{
  const s=' '+text.toLowerCase().replace(/[·,/()]+/g,' ').replace(/\s+/g,' ')+' '
  for(const {a,b} of aliasIndex){if(s.includes(' '+a+' '))return b}
  return null
}

/**
 * Splits a vehicle string such as "Mercedes-Benz GLE · AA 1234 BB" or "BMW · X5 · AA1234BB · note"
 * into brand, name and plate. Unknown formats keep the original text as the name.
 */
export function parseVehicle(input:{label?:string;make?:string|null;model?:string|null;plate?:string|null}):VehicleInfo{
  let name=[input.make,input.model].filter(Boolean).join(' ').trim(),plate=(input.plate||'').trim()
  if(!name&&!plate&&input.label){
    const parts=input.label.split('·').map(p=>p.trim()).filter(Boolean)
    // the first part is make and model; a plate follows it. A lone part counts only as a standard UA plate.
    const idx=parts.length===1?(UA_PLATE.test(normalizePlate(parts[0]))?0:-1):parts.findIndex((p,i)=>i>0&&looksLikePlate(p))
    if(idx>=0){plate=parts[idx];parts.splice(idx,1)}
    name=parts.filter(p=>p.length<=40).join(' ')
  }
  const formatted=plate?formatPlate(plate):{text:'',ua:false}
  return {brand:findBrand(name||input.label||''),name:name||(!plate?input.label||'':''),plate:formatted.text,uaPlate:formatted.ua}
}
