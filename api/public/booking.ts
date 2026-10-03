import { readAllPages } from '../../src/lib/pagination.js'
import { createClient } from '@supabase/supabase-js'
import { availableStaff, bookingTotals, resolveBookingServices, type BookingData, type BookingService } from '../../src/lib/bookingAvailability.js'

type Request = { method?:string; query?:Record<string,string|string[]|undefined>; body?:unknown }
type Response = { status:(code:number)=>Response; json:(body:unknown)=>void }
const required=(name:string)=>{const value=process.env[name];if(!value)throw new Error(`Missing ${name}`);return value}
const clean=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):''

export function createPublicBookingHandler(makeClient:typeof createClient=createClient) {
 return async function handler(request:Request,response:Response) {
  try {
    if(!['GET','POST'].includes(request.method||''))return response.status(405).json({error:'Метод не підтримується.'})
    const body=request.body as Record<string,unknown>|undefined
    const slug=clean(request.method==='GET'?request.query?.slug:body?.slug,63).toLowerCase()
    if(!/^[a-z0-9-]{3,63}$/.test(slug))return response.status(400).json({error:'Некоректна адреса студії.'})
    const supabase=makeClient(required('VITE_SUPABASE_URL'),required('SUPABASE_SERVICE_ROLE_KEY'))
    const {data:tenant,error:tenantError}=await supabase.from('tenants').select('id,name,address,timezone').eq('slug',slug).maybeSingle()
    if(tenantError)throw tenantError
    if(!tenant)return response.status(404).json({error:'Студію не знайдено.'})
    const access=await supabase.rpc('subscription_allows_new_work',{studio:tenant.id})
    if(access.error)throw access.error
    if(!access.data)return response.status(409).json({error:'Онлайн-запис тимчасово недоступний. Зв’яжіться зі студією, щоб домовитися про візит.'})
    const now=Date.now(),horizon=new Date(now+31*86400_000).toISOString()
    const [services,staff,appointments,schedules]=await Promise.all([
      supabase.from('services').select('*').eq('tenant_id',tenant.id).eq('active',true).order('created_at'),
      supabase.from('staff_profiles').select('id,full_name,specialty,all_services,staff_services(service_id)').eq('tenant_id',tenant.id).eq('active',true).order('created_at'),
      readAllPages((from,to)=>supabase.from('appointments').select('staff_id,starts_at,ends_at').eq('tenant_id',tenant.id).in('status',['confirmed','in_progress']).gte('ends_at',new Date(now).toISOString()).lte('starts_at',horizon).order('id').range(from,to)),
      supabase.from('work_schedules').select('staff_id,weekday,starts_at,ends_at').eq('tenant_id',tenant.id)
    ])
    if(services.error||staff.error||appointments.error||schedules.error)throw services.error||staff.error||appointments.error||schedules.error
    const data:BookingData={studio:{name:tenant.name,address:tenant.address,timezone:tenant.timezone||'Europe/Kyiv'},services:(services.data||[]).map(s=>({id:s.id,name:s.name,category:s.category,price:Number(s.price),duration_minutes:s.duration_minutes,description:s.description||'',variants:Array.isArray(s.variants)?s.variants:[]})),staff:staff.data||[],appointments:appointments.data||[],schedules:schedules.data||[]}
    if(request.method==='GET')return response.status(200).json(data)
    const clientName=clean(body?.clientName,120),phone=clean(body?.phone,32).replace(/[^+\d]/g,''),email=clean(body?.email,254).toLowerCase(),car=clean(body?.car,180),preferred=clean(body?.staffId,80)
    const raw=body?.serviceIds??[body?.serviceId]
    if(!Array.isArray(raw)||!raw.length||raw.length>20||raw.some(id=>typeof id!=='string'))return response.status(400).json({error:'Оберіть від 1 до 20 послуг.'})
    const ids=[...new Set(raw as string[])],variantIds=body?.variantIds??{}
    if(!variantIds||Array.isArray(variantIds)||typeof variantIds!=='object'||Object.values(variantIds).some(v=>typeof v!=='string'))return response.status(400).json({error:'Оберіть коректні варіанти послуг.'})
    let chosen:BookingService[]
    try{chosen=resolveBookingServices(data.services,ids,variantIds as Record<string,string>)}catch(error){return response.status(400).json({error:error instanceof Error?error.message:'Оберіть варіанти послуг.'})}
    const startsAt=new Date(clean(body?.startsAt,64)),totals=bookingTotals(chosen)
    if(!clientName||phone.replace(/\D/g,'').length<10||phone.replace(/\D/g,'').length>15||!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return response.status(400).json({error:'Вкажіть ім’я, дійсний телефон та email.'})
    if(chosen.length!==ids.length||chosen.some(s=>!Number.isFinite(Number(s.duration_minutes))||Number(s.duration_minutes)<=0||!Number.isFinite(s.price)||s.price<0)||totals.duration>24*60)return response.status(400).json({error:'Обрані послуги недоступні. Оновіть сторінку.'})
    const member=availableStaff(data,startsAt,totals.duration,preferred,now,ids)[0]
    if(!member)return response.status(409).json({error:'Обраний час більше не доступний. Оберіть інший день, час або майстра.'})
    const endsAt=new Date(startsAt.getTime()+totals.duration*60_000)
    // Public requests must never overwrite an existing customer's name or email.
    const {error:clientError}=await supabase.from('clients').upsert({tenant_id:tenant.id,full_name:clientName,phone,email},{onConflict:'tenant_id,phone',ignoreDuplicates:true})
    if(clientError)throw clientError
    const {data:client,error:lookupError}=await supabase.from('clients').select('id').eq('tenant_id',tenant.id).eq('phone',phone).single()
    if(lookupError||!client)throw lookupError||new Error('Missing client')
    let vehicleId:string|null=null
    if(car){
      const {data:vehicle,error}=await supabase.from('vehicles').insert({tenant_id:tenant.id,client_id:client.id,notes:car}).select('id').single()
      if(error)throw error
      vehicleId=vehicle.id
    }
    const {data:appointment,error:appointmentError}=await supabase.from('appointments').insert({tenant_id:tenant.id,client_id:client.id,vehicle_id:vehicleId,staff_id:member.id,starts_at:startsAt.toISOString(),ends_at:endsAt.toISOString(),status:'pending',source:'public',notes:`Email онлайн-запису: ${email}
Онлайн-заявка: ${clientName} · ${phone} · ${email}${preferred?'':'. Будь-який вільний майстер.'}`}).select('id').single()
    if(appointmentError||!appointment)throw appointmentError||new Error('Missing appointment')
    const {error:serviceError}=await supabase.from('appointment_services').insert(chosen.map(s=>({appointment_id:appointment.id,service_id:s.id,service_name:s.name,unit_price:s.price,duration_minutes:s.duration_minutes,quantity:1})))
    if(serviceError){
      // The whole multi-row insert rolls back; remove its empty parent request too.
      const cleanup=await supabase.from('appointments').delete().eq('id',appointment.id).eq('tenant_id',tenant.id).eq('status','pending')
      if(cleanup.error)console.error('Public booking cleanup failed',cleanup.error.code)
      throw serviceError
    }
    return response.status(201).json({ok:true,status:'pending'})
  }catch(error){
    if((error as {message?:string})?.message?.includes('Період доступу завершено'))return response.status(409).json({error:'Онлайн-запис тимчасово недоступний. Зв’яжіться зі студією, щоб домовитися про візит.'})
    console.error('Public booking failed',error instanceof Error?error.name:(error as {code?:string})?.code)
    return response.status(500).json({error:'Не вдалося обробити запис. Спробуйте пізніше або зв’яжіться зі студією.'})
  }
 }
}
export default createPublicBookingHandler()
