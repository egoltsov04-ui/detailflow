import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('migration 061 removes public execute from auth helpers and keeps app roles', async (t) => {
  const db = new PGlite()
  t.after(() => db.close())
  await db.exec('create role anon; create role authenticated; create role service_role;')
  await db.exec(`
    create function public.is_own_staff_profile(uuid) returns boolean language sql security definer as 'select false';
    create function public.is_tenant_member(uuid) returns boolean language sql security definer as 'select false';
    create function public.is_tenant_manager(uuid) returns boolean language sql security definer as 'select false';
    create function public.claim_staff_invite(text) returns uuid language sql security definer as 'select null::uuid';
    create function public.approve_work_order(uuid,text) returns uuid language sql security definer as 'select null::uuid';
  `)
  const migration = await read('supabase/migrations/061_restrict_public_function_execute.sql')
  await db.exec(migration)
  await db.exec(migration)

  const result = await db.query(`
    select p.proname,
      has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
      has_function_privilege('service_role', p.oid, 'EXECUTE') as service_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in (
      'is_own_staff_profile','is_tenant_member','is_tenant_manager',
      'claim_staff_invite','approve_work_order'
    )
  `)
  assert.equal(result.rows.length, 5)
  for (const row of result.rows) {
    assert.equal(row.anon_execute, false, `${row.proname} must not be callable by anon`)
    assert.equal(row.authenticated_execute, true, `${row.proname} must remain callable by the app`)
    assert.equal(row.service_execute, true, `${row.proname} must remain callable by trusted server functions`)
  }
})
