import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'

type HeaderValue = string | string[] | undefined
type Headers = Record<string, HeaderValue>

// Page views and booking submissions use separate counters, so browsing never uses up the submission allowance.
export function publicBookingRateLimitKeys(headers: Headers, studioSlug: string, secret: string, submission = false) {
  const trusted = headers['x-vercel-forwarded-for'] ?? headers['x-forwarded-for']
  const value = Array.isArray(trusted) ? trusted[0] : trusted
  const candidate = value?.split(',')[0]?.trim() || ''
  if (!isIP(candidate)) throw new Error('Trusted client IP unavailable')
  const address = candidate.toLowerCase()
  const kind = submission ? 'submit:' : ''
  const hash = (scope: string) => createHmac('sha256', secret).update(`${kind}${scope}:${address}`).digest('hex')
  return {
    ipBucketHash: hash('ip'),
    studioBucketHash: hash(`studio:${studioSlug}`),
  }
}
