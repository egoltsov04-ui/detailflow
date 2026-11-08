// Restores a backup made by scripts/weekly-encrypted-backup.mjs into a FRESH self-hosted Supabase stack.
// Usage: node scripts/restore-backup.mjs <backup prefix, e.g. detailflow-backups/staging/2026-11-07T12-00-00Z> [--apply]
// Dry run by default. Refuses a database that already has Detailflow tables, so it can never overwrite a live studio database.
import { spawnSync } from 'node:child_process'
import { mkdtemp, open, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const env = process.env, apply = process.argv.includes('--apply'), prefix = process.argv.slice(2).find(a => !a.startsWith('--'))
if (!prefix) throw new Error('Pass the backup prefix printed by the backup script.')
for (const name of ['RESTORE_DB_CONTAINER', 'AGE_IDENTITY', 'RCLONE_BACKUP_REMOTE']) if (!env[name]) throw new Error(`Set ${name}.`)

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: 'inherit', windowsHide: true, ...options })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`)
  return result
}
const sql = query => run('docker', ['exec', env.RESTORE_DB_CONTAINER, 'psql', '-U', 'supabase_admin', '-d', 'postgres', '-tAc', query], { stdio: 'pipe', encoding: 'utf8' }).stdout.trim()

if (sql("select to_regclass('public.tenants') is not null") === 't') throw new Error(`Restore blocked: ${env.RESTORE_DB_CONTAINER} already has Detailflow data. Restore only into a fresh stack.`)
const storage = env.RESTORE_STORAGE_TARGET || ''
console.log(`${apply ? 'Restoring' : 'Dry run, would restore'} ${env.RCLONE_BACKUP_REMOTE}:${prefix} into container ${env.RESTORE_DB_CONTAINER}${storage ? ` and Storage into ${storage}` : ''}`)
if (!apply) process.exit(0)

const started = Date.now(), work = await mkdtemp(join(tmpdir(), 'detailflow-restore-'))
const dump = join(work, 'database.dump')
try {
  run('rclone', ['copyto', `${env.RCLONE_BACKUP_REMOTE}:${prefix}/database.dump.age`, `${dump}.age`])
  run('age', ['--decrypt', '--identity', env.AGE_IDENTITY, '--output', dump, `${dump}.age`])
  // --clean replaces the empty auth and storage tables the fresh stack created with the backed-up ones.
  const file = await open(dump, 'r')
  try { run('docker', ['exec', '-i', env.RESTORE_DB_CONTAINER, 'pg_restore', '-U', 'supabase_admin', '-d', 'postgres', '--clean', '--if-exists', '--single-transaction', '--exit-on-error'], { stdio: [file.fd, 'inherit', 'inherit'] }) }
  finally { await file.close() }
  // PostgREST cached the empty schema of the fresh stack; without a reload every RPC returns 404.
  sql("notify pgrst, 'reload schema'")
  if (storage) run('rclone', ['copy', `${env.RCLONE_BACKUP_REMOTE}:${prefix}/storage`, storage])
  console.log(`Restored in ${Math.round((Date.now() - started) / 1000)} s. Studios: ${sql('select count(*) from public.tenants')}, users: ${sql('select count(*) from auth.users')}, files: ${sql('select count(*) from storage.objects')}`)
} finally {
  await rm(work, { recursive: true, force: true })
}
