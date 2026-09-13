import { createHmac, timingSafeEqual } from 'node:crypto'

export const plans = {
  start: { label: 'Detailflow Start — 1 місяць', amount: 690 },
  studio: { label: 'Detailflow Studio — 1 місяць', amount: 1490 },
  pro: { label: 'Detailflow Pro — 1 місяць', amount: 2990 },
} as const

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
