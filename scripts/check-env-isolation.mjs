const env = process.env
const deployment = env.VERCEL_ENV || env.DEPLOYMENT_ENV || ''
const supabaseUrl = env.VITE_SUPABASE_URL || ''
const productionRef = 'stxfbarigoutglfqqhwi'

if (!['preview', 'staging'].includes(deployment)) {
  console.log('Environment isolation check skipped (set VERCEL_ENV=preview or DEPLOYMENT_ENV=staging to validate).')
  process.exit(0)
}

if (!supabaseUrl) {
  console.error('Refusing preview/staging build: VITE_SUPABASE_URL is missing.')
  process.exit(1)
}

let host
try { host = new URL(supabaseUrl).hostname } catch {
  console.error('Refusing preview/staging build: VITE_SUPABASE_URL is not a valid URL.')
  process.exit(1)
}

if (host.startsWith(`${productionRef}.`) || host === productionRef) {
  console.error('Refusing preview/staging build: production Supabase URL detected.')
  process.exit(1)
}

if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Refusing preview/staging build: staging-only SUPABASE_SERVICE_ROLE_KEY is missing.')
  process.exit(1)
}

// APP_URL may be omitted for Preview if Vercel provides its branch URL.
// Never fall back to VERCEL_PROJECT_PRODUCTION_URL: that value is also set on Preview.
const previewHost = env.VERCEL_BRANCH_URL || env.VERCEL_URL || ''
const appUrlValue = env.APP_URL || (previewHost ? `https://${previewHost}` : '')
if (!appUrlValue) {
  console.error('Refusing preview/staging build: set APP_URL or enable Vercel system environment variables (VERCEL_BRANCH_URL).')
  process.exit(1)
}

try {
  const appUrl = new URL(appUrlValue)
  if (appUrl.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(appUrl.hostname)) throw new Error()
  const productionHost = (env.VERCEL_PROJECT_PRODUCTION_URL || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (productionHost && appUrl.hostname === productionHost) throw new Error('production host')
} catch {
  console.error('Refusing preview/staging build: APP_URL must be a valid HTTPS Preview URL, not the production URL.')
  process.exit(1)
}

console.log(`Environment isolation check passed for ${deployment} (${host}; ${new URL(appUrlValue).hostname}).`)
