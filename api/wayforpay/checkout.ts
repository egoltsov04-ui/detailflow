import { createClient } from '@supabase/supabase-js'
import { appUrl, hmacMd5, merchantAccount, merchantDomain, plans, type PlanCode } from '../lib/wayforpay.js'

type Request = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown }
type Response = { status: (code: number) => Response; json: (body: unknown) => void }
const required = (name: string) => { const value = process.env[name]; if (!value) throw new Error(`Missing required environment variable: ${name}`); return value }

export default async function handler(request: Request, response: Response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
  try {
    const token = typeof request.headers.authorization === 'string' ? request.headers.authorization.replace(/^Bearer\s+/i, '') : ''
    if (!token) return response.status(401).json({ error: 'Sign in required' })
    const auth = createClient(required('VITE_SUPABASE_URL'), required('VITE_SUPABASE_ANON_KEY'))
    const { data: userData, error: userError } = await auth.auth.getUser(token)
    if (userError || !userData.user) return response.status(401).json({ error: 'Invalid session' })
    const plan = (request.body as { plan?: string } | undefined)?.plan as PlanCode
    if (!plan || !(plan in plans)) return response.status(400).json({ error: 'Unknown plan' })
    const db = createClient(required('VITE_SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'))
    const { data: membership } = await db.from('tenant_memberships').select('tenant_id,role').eq('user_id', userData.user.id).in('role', ['owner', 'admin']).limit(1).maybeSingle()
    if (!membership) return response.status(403).json({ error: 'Only a studio owner or admin can pay for a plan' })
    const product = plans[plan]
    const orderReference = `DF-${membership.tenant_id.slice(0, 8)}-${Date.now()}`
    const orderDate = Math.floor(Date.now() / 1000)
    const amount = product.amount.toFixed(2)
    const { error: orderError } = await db.from('payment_orders').insert({ tenant_id: membership.tenant_id, plan, amount: product.amount, order_reference: orderReference })
    if (orderError) throw orderError
    const signature = hmacMd5([merchantAccount(), merchantDomain(), orderReference, orderDate, amount, 'UAH', product.label, 1, amount])
    return response.status(200).json({ action: 'https://secure.wayforpay.com/pay', fields: {
      merchantAccount: merchantAccount(), merchantDomainName: merchantDomain(), merchantSignature: signature,
      merchantTransactionType: 'AUTO', merchantTransactionSecureType: 'AUTO', apiVersion: 1, language: 'UA',
      orderReference, orderDate, amount, currency: 'UAH', productName: [product.label], productCount: [1], productPrice: [amount],
      returnUrl: `${appUrl()}/?payment=return`, serviceUrl: `${appUrl()}/api/wayforpay/callback`,
    } })
  } catch (error) { return response.status(500).json({ error: error instanceof Error ? error.message : 'Unable to create payment' }) }
}
