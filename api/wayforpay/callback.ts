import { createClient } from '@supabase/supabase-js'
import { hmacMd5, merchantAccount, safeEqual } from '../lib/wayforpay.js'

type Callback = { merchantAccount?: string; orderReference?: string; merchantSignature?: string; amount?: string | number; currency?: string; authCode?: string; cardPan?: string; transactionStatus?: string; reasonCode?: string | number }
type Request = { method?: string; body?: unknown }
type Response = { status: (code: number) => Response; json: (body: unknown) => void }
const required = (name: string) => { const value = process.env[name]; if (!value) throw new Error(`Missing required environment variable: ${name}`); return value }

export default async function handler(request: Request, response: Response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
  try {
    const payload = (typeof request.body === 'string' ? JSON.parse(request.body) : request.body) as Callback
    const expected = hmacMd5([payload.merchantAccount, payload.orderReference, payload.amount, payload.currency, payload.authCode, payload.cardPan, payload.transactionStatus, payload.reasonCode])
    if (!payload.orderReference || payload.merchantAccount !== merchantAccount() || !payload.merchantSignature || !safeEqual(payload.merchantSignature, expected)) return response.status(400).json({ error: 'Invalid WayForPay signature' })
    const db = createClient(required('VITE_SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'))
    const approved = payload.transactionStatus === 'Approved'
    const { data: order, error } = await db.from('payment_orders').update({ status: approved ? 'approved' : 'declined', provider_status: payload.transactionStatus || null, provider_payload: payload, paid_at: approved ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('order_reference', payload.orderReference).select('tenant_id,plan').single()
    if (error || !order) throw error || new Error('Payment order not found')
    if (approved) await db.from('subscriptions').update({ plan: order.plan, status: 'active', provider: 'wayforpay', provider_subscription_id: payload.orderReference, updated_at: new Date().toISOString() }).eq('tenant_id', order.tenant_id)
    const time = Math.floor(Date.now() / 1000)
    return response.status(200).json({ orderReference: payload.orderReference, status: 'accept', time, signature: hmacMd5([payload.orderReference, 'accept', time]) })
  } catch (error) { return response.status(500).json({ error: error instanceof Error ? error.message : 'Unable to process payment' }) }
}
