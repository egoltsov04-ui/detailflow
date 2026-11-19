import {t} from '../i18n/core'
import {parseVehicle,type VehicleInfo} from '../lib/vehicle'
import {carBrands,type CarBrand} from '../lib/carBrands'

/** One-colour brand mark (loaded on demand from /brands) or the brand letters in a circle. */
export function BrandMark({brand}:{brand:CarBrand|null}){
  if(!brand)return null
  if(brand.logo)return <span className="brand-mark" aria-hidden="true" style={{WebkitMaskImage:`url(/brands/${brand.key}.svg)`,maskImage:`url(/brands/${brand.key}.svg)`}}/>
  return <span className="brand-mark brand-letters" aria-hidden="true">{brand.letters}</span>
}

/** Licence plate: Ukrainian layout (blue band with flag and UA) for standard plates, plain plate otherwise. */
export function Plate({text,ua}:{text:string;ua:boolean}){
  if(!text)return null
  return <span className={'plate'+(ua?' plate-ua':'')} role="img" aria-label={`${t('Номерний знак')} ${text}`}>{ua&&<span className="plate-band" aria-hidden="true"/>}<span className="plate-text" aria-hidden="true">{text}</span></span>
}

/** Vehicle shown the same way everywhere: brand mark, make and model, plate. Falls back to plain text. */
export function VehicleTag({label,make,model,plate,className='',as:Tag='span'}:{label?:string;make?:string|null;model?:string|null;plate?:string|null;className?:string;as?:'span'|'b'|'h2'|'h3'|'div'}){
  const v:VehicleInfo=parseVehicle({label,make,model,plate})
  if(!v.name&&!v.plate)return null
  return <Tag className={'vehicle-tag '+className}><BrandMark brand={v.brand}/>{v.name&&<span className="vehicle-name">{v.name}</span>}<Plate text={v.plate} ua={v.uaPlate}/></Tag>
}

/** Brand suggestions for car fields (`list="car-brands"`), rendered once at the app root. */
export function CarBrandOptions(){return <datalist id="car-brands">{carBrands.map(b=><option key={b.key} value={b.title}/>)}</datalist>}
