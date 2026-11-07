/** Canonical origin for server-generated links. Configure separately per environment. */
export function appUrl(path?: string) {
  const isPreview = process.env.VERCEL_ENV === 'preview' || process.env.DEPLOYMENT_ENV === 'staging'
  const previewHost = isPreview ? process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL : undefined
  const configured = process.env.APP_URL || (previewHost ? `https://${previewHost}` : undefined)
  if (!configured) throw new Error('Missing APP_URL (or Vercel Preview URL)')
  const base = new URL(configured)
  if (base.protocol !== 'https:' && base.hostname !== 'localhost' && base.hostname !== '127.0.0.1') {
    throw new Error('APP_URL must use HTTPS outside local development')
  }
  const productionHost = (process.env.VERCEL_PROJECT_PRODUCTION_URL || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (isPreview && productionHost && base.hostname === productionHost) {
    throw new Error('Preview APP_URL must not point to the production domain')
  }
  if (path === undefined) return base.toString().replace(/\/$/, '')
  return new URL(path, base).toString()
}
