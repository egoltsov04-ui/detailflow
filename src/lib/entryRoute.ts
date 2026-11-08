// Authentication callbacks and public booking links must bypass the marketing page.
// Public company and legal pages open for everyone, signed in or not.
export const sitePagePaths = ['/about', '/contacts', '/privacy', '/terms', '/refund']

export function entryRoute(path: string, search: string, hash: string): 'landing' | 'site' | 'app' {
  const query = new URLSearchParams(search), fragment = new URLSearchParams(hash.replace(/^#/, ''))
  const callbackKeys = ['code', 'token_hash', 'access_token', 'refresh_token', 'error', 'error_code', 'type']
  if (query.has('book') || query.has('activate') || callbackKeys.some(key => query.has(key) || fragment.has(key))) return 'app'
  if (sitePagePaths.includes(path.replace(/\/$/, '') || '/')) return 'site'
  return path === '/' ? 'landing' : 'app'
}
