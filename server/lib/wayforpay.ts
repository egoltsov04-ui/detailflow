import {subscriptionPlans} from '../../src/lib/plans.ts'
import { createHmac, timingSafeEqual } from 'node:crypto'

export const plans = Object.fromEntries(subscriptionPlans.map(p=>[p.id,{label:`Detailflow ${p.name} — 1 місяць`,amount:p.price,staffLimit:p.staffLimit}])) as Record<(typeof subscriptionPlans)[number]['id'],{label:string;amount:number;staffLimit:number|null}>

export type PlanCode = keyof typeof plans

const required = (name: string) => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const merchantAccount = () => required('WAYFORPAY_MERCHANT_ACCOUNT')
export const merchantDomain = () => required('WAYFORPAY_MERCHANT_DOMAIN')
export const appUrl = () => required('WAYFORPAY_APP_URL').replace(/\/$/, '')

export const hmacMd5 = (values: Array<string | number | null | undefined>) =>
  createHmac('md5', required('WAYFORPAY_SECRET_KEY')).update(values.map(value => value ?? '').join(';'), 'utf8').digest('hex')

export const safeEqual = (left: string, right: string) => {
  const a = Buffer.from(left, 'utf8')
  const b = Buffer.from(right, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}
