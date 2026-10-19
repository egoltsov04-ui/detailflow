import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('public booking rate limits are private, atomic, and separate browse from submit quotas', async (t) => {
  const db = new PGlite()
  t.after(() => db.close())
  await db.exec('create role anon; create role authenticated; create role service_role;')
  await db.exec(await read('supabase/migrations/060_public_booking_rate_limit.sql'))

  const acl = await db.query(`
    select has_table_privilege('anon','public.public_booking_rate_limits','select') as anon_read,
           has_table_privilege('authenticated','public.public_booking_rate_limits','select') as user_read,
           has_function_privilege('anon','public.consume_public_booking_rate_limit(text,text,boolean)','execute') as anon_call,
           has_function_privilege('authenticated','public.consume_public_booking_rate_limit(text,text,boolean)','execute') as user_call,
           has_function_privilege('service_role','public.consume_public_booking_rate_limit(text,text,boolean)','execute') as server_call,
           (select relrowsecurity from pg_class where oid='public.public_booking_rate_limits'::regclass) as rls_enabled
  `)
  assert.deepEqual(acl.rows[0], { anon_read: false, user_read: false, anon_call: false, user_call: false, server_call: true, rls_enabled: true })

  await db.query("select set_config('request.jwt.claim.role','service_role',false)")
  await db.exec('set role service_role')
  const call = async (ip, studio, submit) => (await db.query(
    'select consume_public_booking_rate_limit($1,$2,$3) allowed', [ip, studio, submit],
  )).rows[0].allowed

  for (let i = 0; i < 15; i++) assert.equal(await call('a'.repeat(64), 'b'.repeat(64), true), true)
  assert.equal(await call('a'.repeat(64), 'b'.repeat(64), true), false)
  assert.equal(await call('a'.repeat(64), 'c'.repeat(64), true), true)

  for (let i = 1; i <= 180; i++) assert.equal(await call('d'.repeat(64), 'e'.repeat(64), false), true)
  assert.equal(await call('d'.repeat(64), 'e'.repeat(64), false), false)
})
