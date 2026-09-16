import { createClient } from '@supabase/supabase-js'
import { sendEmail } from './lib/sendpulse.js'

type Request = { headers: Record<string, string | string[] | undefined>; method?: string }
type Response = { status: (code: number) => Response; json: (body: unknown) => void }

const required = (name: string) => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

export default async function handler(request: Request, response: Response) {
  if (request.method !== 'POST' && request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed' })
  if (request.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return response.status(401).json({ error: 'Unauthorized' })

  try {
    const supabase = createClient(required('VITE_SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'))
    const now = new Date()
    const inTwentyFiveHours = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString()
    const { data: appointments, error } = await supabase.from('appointments').select('id,tenant_id,starts_at,clients(full_name,email),services:appointment_services(service_name),tenants(name),reminder_settings(email_enabled,reminder_24h_enabled,reminder_2h_enabled)').eq('status', 'confirmed').gte('starts_at', now.toISOString()).lte('starts_at', inTwentyFiveHours)
    if (error) throw error

    let sent = 0, failed = 0
    for (const appointment of appointments ?? []) {
      const client = Array.isArray(appointment.clients) ? appointment.clients[0] : appointment.clients
      const settings = Array.isArray(appointment.reminder_settings) ? appointment.reminder_settings[0] : appointment.reminder_settings
      const tenant = Array.isArray(appointment.tenants) ? appointment.tenants[0] : appointment.tenants
      const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services
      const start = new Date(appointment.starts_at)
      const hoursUntil = (start.getTime() - now.getTime()) / 3_600_000
      if (!settings?.email_enabled || !client?.email) continue
      const timing = settings.reminder_24h_enabled && hoursUntil >= 23 && hoursUntil <= 25 ? { hours:24, label:'завтра' } : settings.reminder_2h_enabled && hoursUntil >= 1.75 && hoursUntil <= 2.25 ? { hours:2, label:'сьогодні' } : null
      if (!timing) continue

      const scheduledFor = new Date(start.getTime() - timing.hours * 60 * 60 * 1000).toISOString()
      const existing = await supabase.from('reminders').select('id').eq('appointment_id', appointment.id).eq('channel', 'email').eq('scheduled_for', scheduledFor).maybeSingle()
      if (existing.data) continue

      const subject = `Нагадування про запис — ${tenant?.name || 'ваша студія'}`
      const text = `Вітаємо, ${client.full_name}! Нагадуємо про запис ${timing.label}: ${start.toLocaleString('uk-UA')}. Послуга: ${service?.service_name || 'детейлінг'}.`
      try {
        const result = await sendEmail({ to: [{ email: client.email }], subject, text, html: `<p>${text}</p>`, fromName: tenant?.name || 'Detailflow' })
        const providerMessageId = typeof result.id === 'string' ? result.id : null
        await supabase.from('reminders').insert({ tenant_id: appointment.tenant_id, appointment_id: appointment.id, channel: 'email', scheduled_for: scheduledFor, sent_at: new Date().toISOString(), provider_message_id: providerMessageId })
        sent += 1
      } catch (sendError) {
        await supabase.from('reminders').insert({ tenant_id: appointment.tenant_id, appointment_id: appointment.id, channel: 'email', scheduled_for: scheduledFor, failed_at: new Date().toISOString(), error_message: sendError instanceof Error ? sendError.message.slice(0,500) : 'Email delivery failed' })
        failed += 1
      }
    }
    return response.status(200).json({ sent, failed })
  } catch (error) {
    return response.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' })
  }
}
