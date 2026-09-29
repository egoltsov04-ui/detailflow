import { createClient } from '@supabase/supabase-js'
import { hmacMd5, merchantAccount, safeEqual } from '../../server/lib/wayforpay.js'

type Callback = { merchantAccount?: string; orderReference?: string; merchantSignature?: string; amount?: string | number; currency?: string; authCode?: string; cardPan?: string; transactionStatus?: string; reasonCode?: string | number }
type Request = { method?: string; body?: unknown }
type Response = { status: (code: number) => Response; json: (body: unknown) => void }
const required = (name: string) => { const value = process.env[name]; if (!value) throw new Error(`Missing required environment variable: ${name}`); return value }

export function createCallbackHandler(makeClient:typeof createClient=createClient){return async function handler(request: Request, response: Response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
  try {
    const payload = (typeof request.body === 'string' ? JSON.parse(request.body) : request.body) as Callback
    const expected = hmacMd5([payload.merchantAccount, payload.orderReference, payload.amount, payload.currency, payload.authCode, payload.cardPan, payload.transactionStatus, payload.reasonCode])
    if (!payload.orderReference || payload.merchantAccount !== merchantAccount() || !payload.merchantSignature || !safeEqual(payload.merchantSignature, expected)) return response.status(400).json({ error: 'Invalid WayForPay signature' })
    const db = makeClient(required('VITE_SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'))
    const amount=Number(payload.amount)
    if(!Number.isFinite(amount)||amount<=0||payload.currency!=='UAH')return response.status(400).json({error:'Invalid payment amount or currency'})
    const {error}=await db.rpc('apply_subscription_payment',{reference_input:payload.orderReference,amount_input:amount,currency_input:payload.currency,status_input:payload.transactionStatus||''})
    if(error)throw error
    const time = Math.floor(Date.now() / 1000)
    return response.status(200).json({ orderReference: payload.orderReference, status: 'accept', time, signature: hmacMd5([payload.orderReference, 'accept', time]) })
  } catch (error) { return response.status(500).json({ error: error instanceof Error ? error.message : 'Unable to process payment' }) }
}
}
export default createCallbackHandler()
