import {useState} from 'react'
import Catalog from '../Catalog'
import type {CatalogService} from '../ServiceEditor'
import PublicBookingPage from '../PublicBookingPage'
import type {ServiceOptions} from '../lib/bookingAvailability'
export default function ServiceVariantsPreview(){
 const [view,setView]=useState('owner'),[services,setServices]=useState<CatalogService[]>([['Мийка','Мийка','60 хв',600]]),[options,setOptions]=useState<Record<string,ServiceOptions>>({'Мийка':{description:'Двофазна мийка кузова та очищення дисків.',variants:[{id:'m',name:'M',price:600,duration_minutes:60},{id:'l',name:'L',price:800,duration_minutes:90},{id:'xl',name:'XL',price:1000,duration_minutes:120}]}})
 return <><nav className="wf-tabs"><button onClick={()=>setView('owner')}>Каталог власника</button><button onClick={()=>setView('client')}>Як бачить клієнт</button></nav>{view==='owner'?<Catalog services={services} serviceOptions={options} products={[]} packages={[]} addService={async(s,o)=>{setServices(all=>[...all,s]);setOptions(all=>({...all,[s[0]]:o!}));return ''}} updateService={async(old,s,o)=>{setServices(all=>all.map(r=>r[0]===old?s:r));setOptions(all=>({...all,[s[0]]:o!}));return ''}} removeService={name=>setServices(all=>all.filter(s=>s[0]!==name))} addPackage={async()=>''} removePackage={async()=>''}/>:<PublicBookingPage slug="variant-test" previewData={{studio:{name:'Тестова студія',address:null,timezone:'Europe/Kyiv'},services:services.map(s=>({id:s[0],name:s[0],category:s[1],price:s[3],duration_minutes:60,...options[s[0]]})),staff:[{id:'m',full_name:'Майстер',specialty:null}],appointments:[],schedules:[]}} previewSubmit={async()=>{}}/>}</>
}
