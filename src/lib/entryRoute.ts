// Authentication callbacks and public booking links must bypass the marketing page.
export function entryRoute(path: string, search: string, hash: string): 'landing' | 'app' {
  const query = new URLSearchParams(search), fragment = new URLSearchParams(hash.replace(/^#/, ''))
  const callbackKeys = ['code', 'token_hash', 'access_token', 'refresh_token', 'error', 'error_code', 'type']
  if (query.has('book') || query.has('activate') || callbackKeys.some(key => query.has(key) || fragment.has(key))) return 'app'
  return path === '/' ? 'landing' : 'app'
}
