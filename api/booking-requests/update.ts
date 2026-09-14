import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '../lib/sendpulse.js'

type Request = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown }
type Response = { status: (code: number) => Response; json: (body: unknown) => void }
const required = (name: string) => { const value = process.env[name]; if (!value) throw new Error(`Missing ${name}`); return value }

export default async function handler(request: Request, response: Response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
  try {
    const token = typeof request.headers.authorization === 'string' ? request.headers.authorization.replace(/^Bearer\s+/i, '') : ''
    if (!token) return response.status(401).json({ error: 'Sign in required' })
    const auth = createClient(required('VITE_SUPABASE_URL'), required('VITE_SUPABASE_ANON_KEY'))
    const { data: authData, error: authError } = await auth.auth.getUser(token)
    if (authError || !authData.user) return response.status(401).json({ error: 'Invalid session' })
    const body = request.body as { appointmentId?: unknown; status?: unknown } | undefined
    const appointmentId = typeof body?.appointmentId === 'string' ? body.appointmentId : ''
    const status = body?.status === 'confirmed' || body?.status === 'cancelled' ? body.status : ''
    if (!appointmentId || !status) return response.status(400).json({ error: 'Invalid request' })
    const db = createClient(required('VITE_SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'))
    const { data: appointment, error: appointmentError } = await db.from('appointments').select('id,tenant_id,starts_at,clients(full_name,email),appointment_services(service_name),tenants(name)').eq('id', appointmentId).eq('status', 'pending').maybeSingle()
    if (appointmentError || !appointment) return response.status(404).json({ error: 'Pending request not found' })
    const { data: membership } = await db.from('tenant_memberships').select('tenant_id').eq('tenant_id', appointment.tenant_id).eq('user_id', authData.user.id).in('role', ['owner', 'admin']).maybeSingle()
    if (!membership) return response.status(403).json({ error: 'Only an owner or admin can process requests' })
    const { data: updated, error: updateError } = await db.from('appointments').update({ status }).eq('id', appointmentId).eq('status', 'pending').select('id').maybeSingle()
    if (updateError || !updated) return response.status(409).json({ error: 'This request was already processed' })
    if (status === 'cancelled') return response.status(200).json({ ok: true, notification: 'not_sent' })
    const client = Array.isArray(appointment.clients) ? appointment.clients[0] : appointment.clients
    const service = Array.isArray(appointment.appointment_services) ? appointment.appointment_services[0] : appointment.appointment_services
    const tenant = Array.isArray(appointment.tenants) ? appointment.tenants[0] : appointment.tenants
    if (!client?.email) return response.status(200).json({ ok: true, notification: 'not_sent' })
    const start = new Date(appointment.starts_at).toLocaleString('uk-UA', { dateStyle: 'long', timeStyle: 'short' })
    const text = `Вітаємо, ${client.full_name}! Ваш запис підтверджено. Студія: ${tenant?.name || 'Detailflow'}. Послуга: ${service?.service_name || 'детейлінг'}. Час: ${start}.`
    try {
      await sendEmail({ to: [{ email: client.email }], subject: `Запис підтверджено — ${tenant?.name || 'Detailflow'}`, text, html: `<p>${text}</p>`, fromName: tenant?.name || 'Detailflow' })
      return response.status(200).json({ ok: true, notification: 'sent' })
    } catch {
      return response.status(200).json({ ok: true, notification: 'failed' })
    }
  } catch (error) {
    return response.status(500).json({ error: error instanceof Error ? error.message : 'Unable to process request' })
  }
}
