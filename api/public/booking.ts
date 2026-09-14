import { createClient } from '@supabase/supabase-js'

type Request = { method?: string; query?: Record<string, string | string[] | undefined>; body?: unknown }
type Response = { status: (code: number) => Response; json: (body: unknown) => void }

const required = (name: string) => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

const db = () => createClient(required('VITE_SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'))
const cleanText = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const overlap = (startA: Date, endA: Date, startB: Date, endB: Date) => startA < endB && endA > startB

export default async function handler(request: Request, response: Response) {
  try {
    const slug = cleanText(request.method === 'GET' ? request.query?.slug : (request.body as { slug?: unknown } | undefined)?.slug, 63).toLowerCase()
    if (!/^[a-z0-9-]{3,63}$/.test(slug)) return response.status(400).json({ error: 'Invalid studio address' })
    const supabase = db()
    const { data: tenant, error: tenantError } = await supabase.from('tenants').select('id,name,address,timezone').eq('slug', slug).maybeSingle()
    if (tenantError || !tenant) return response.status(404).json({ error: 'Studio not found' })

    if (request.method === 'GET') {
      const [services, staff, appointments] = await Promise.all([
        supabase.from('services').select('id,name,price,duration_minutes').eq('tenant_id', tenant.id).eq('active', true).order('created_at'),
        supabase.from('staff_profiles').select('id,full_name,specialty').eq('tenant_id', tenant.id).eq('active', true).order('created_at'),
        supabase.from('appointments').select('staff_id,starts_at,ends_at').eq('tenant_id', tenant.id).in('status', ['confirmed', 'in_progress']).gte('starts_at', new Date().toISOString())
      ])
      if (services.error || staff.error || appointments.error) throw services.error || staff.error || appointments.error
      return response.status(200).json({ studio: { name: tenant.name, address: tenant.address, timezone: tenant.timezone }, services: services.data, staff: staff.data, appointments: appointments.data })
    }

    if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
    const body = request.body as Record<string, unknown> | undefined
    const clientName = cleanText(body?.clientName, 120), phone = cleanText(body?.phone, 32), car = cleanText(body?.car, 180)
    const serviceId = cleanText(body?.serviceId, 80), staffId = cleanText(body?.staffId, 80), startsAtValue = cleanText(body?.startsAt, 64)
    if (!clientName || !phone || !serviceId || !staffId || !startsAtValue) return response.status(400).json({ error: 'Fill in name, phone, service, staff, and time' })
    const startsAt = new Date(startsAtValue)
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now() - 5 * 60_000) return response.status(400).json({ error: 'Choose a future time' })
    const [serviceResult, staffResult] = await Promise.all([
      supabase.from('services').select('id,name,price,duration_minutes').eq('tenant_id', tenant.id).eq('id', serviceId).eq('active', true).maybeSingle(),
      supabase.from('staff_profiles').select('id').eq('tenant_id', tenant.id).eq('id', staffId).eq('active', true).maybeSingle()
    ])
    if (!serviceResult.data || !staffResult.data) return response.status(400).json({ error: 'Service or specialist is unavailable' })
    const endsAt = new Date(startsAt.getTime() + Number(serviceResult.data.duration_minutes) * 60_000)
    const { data: active, error: activeError } = await supabase.from('appointments').select('starts_at,ends_at').eq('tenant_id', tenant.id).eq('staff_id', staffId).in('status', ['confirmed', 'in_progress']).gte('ends_at', startsAt.toISOString())
    if (activeError) throw activeError
    if ((active ?? []).some(item => overlap(startsAt, endsAt, new Date(item.starts_at), new Date(item.ends_at)))) return response.status(409).json({ error: 'This time is no longer available. Choose another slot.' })
    const { data: client, error: clientError } = await supabase.from('clients').upsert({ tenant_id: tenant.id, full_name: clientName, phone }, { onConflict: 'tenant_id,phone' }).select('id').single()
    if (clientError || !client) throw clientError || new Error('Unable to save client')
    let vehicleId: string | null = null
    if (car) {
      const { data: vehicle, error: vehicleError } = await supabase.from('vehicles').insert({ tenant_id: tenant.id, client_id: client.id, notes: car }).select('id').single()
      if (vehicleError) throw vehicleError
      vehicleId = vehicle.id
    }
    const { data: appointment, error: appointmentError } = await supabase.from('appointments').insert({ tenant_id: tenant.id, client_id: client.id, vehicle_id: vehicleId, staff_id: staffId, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), status: 'pending', source: 'public' }).select('id').single()
    if (appointmentError || !appointment) throw appointmentError || new Error('Unable to create request')
    const { error: serviceError } = await supabase.from('appointment_services').insert({ appointment_id: appointment.id, service_id: serviceResult.data.id, service_name: serviceResult.data.name, unit_price: serviceResult.data.price, duration_minutes: serviceResult.data.duration_minutes })
    if (serviceError) throw serviceError
    return response.status(201).json({ ok: true, message: 'Request created' })
  } catch (error) {
    return response.status(500).json({ error: error instanceof Error ? error.message : 'Unable to create request' })
  }
}
