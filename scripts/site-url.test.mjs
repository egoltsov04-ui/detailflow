import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appUrl } from '../server/lib/siteUrl.ts'
const keys = ['APP_URL', 'VERCEL_ENV', 'DEPLOYMENT_ENV', 'VERCEL_BRANCH_URL', 'VERCEL_URL', 'VERCEL_PROJECT_PRODUCTION_URL']
function withEnv(values, callback) {
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  for (const key of keys) delete process.env[key]
  Object.assign(process.env, values)
  try { callback() } finally {
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key]
      else process.env[key] = before[key]
    }
  }
}

test('Preview URLs use Vercel branch URL without APP_URL', () => withEnv({
  VERCEL_ENV: 'preview',
  VERCEL_BRANCH_URL: 'detailflow-git-staging-example.vercel.app',
}, () => assert.equal(appUrl('/login'), 'https://detailflow-git-staging-example.vercel.app/login')))

test('Preview rejects an APP_URL pointing to the production domain', () => withEnv({
  VERCEL_ENV: 'preview',
  APP_URL: 'https://detailflow.example.com',
  VERCEL_PROJECT_PRODUCTION_URL: 'detailflow.example.com',
}, () => assert.throws(() => appUrl('/login'), /must not point to the production domain/)))

