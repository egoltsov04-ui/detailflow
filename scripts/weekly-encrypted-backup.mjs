// Encrypted backup of a self-hosted Supabase stack: database dump (age) and Storage files, both to an rclone crypt remote (Backblaze B2).
// Dry run by default; pass --apply to run. Restore with scripts/restore-backup.mjs. Setup and schedule: docs/BACKUPS.md.
import { spawnSync } from 'node:child_process'
import { mkdtemp, open, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const env = process.env, apply = process.argv.includes('--apply')
const backupEnv = env.BACKUP_ENV
if (!['staging', 'production'].includes(backupEnv || '')) throw new Error('Set BACKUP_ENV=staging or BACKUP_ENV=production.')
if (backupEnv === 'production' && env.ACKNOWLEDGE_PRODUCTION_BACKUP !== 'YES') throw new Error('Production backup needs ACKNOWLEDGE_PRODUCTION_BACKUP=YES, set only after approval.')
for (const name of ['BACKUP_DB_CONTAINER', 'AGE_RECIPIENT', 'RCLONE_BACKUP_REMOTE']) if (!env[name]) throw new Error(`Set ${name}.`)

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: 'inherit', windowsHide: true, ...options })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`)
  return result
}

// The destination must encrypt file and folder names too, so B2 never sees studio ids or photo paths.
const remote = run('rclone', ['config', 'show', env.RCLONE_BACKUP_REMOTE], { stdio: 'pipe', encoding: 'utf8' }).stdout
const setting = key => remote.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*?)\\s*$`, 'im'))?.[1]?.toLowerCase()
if (setting('type') !== 'crypt' || setting('filename_encryption') !== 'standard' || setting('directory_name_encryption') !== 'true') {
  throw new Error('RCLONE_BACKUP_REMOTE must be an rclone crypt remote with filename and directory name encryption.')
}

const stamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z')
const prefix = `${(env.BACKUP_PREFIX || 'detailflow-backups').replace(/^\/+|\/+$/g, '')}/${backupEnv}/${stamp}`
const storage = env.BACKUP_STORAGE_SOURCE || ''
console.log(`${apply ? 'Backing up' : 'Dry run, would back up'} database from container ${env.BACKUP_DB_CONTAINER}${storage ? ` and Storage from ${storage}` : ''} to ${env.RCLONE_BACKUP_REMOTE}:${prefix}`)
if (!apply) process.exit(0)

const work = await mkdtemp(join(tmpdir(), 'detailflow-backup-'))
const dump = join(work, 'database.dump')
try {
  // supabase_admin keeps owners and grants of the auth and storage schemas, so the dump restores into a fresh stack as is.
  // Realtime keeps only live channel messages and its own config, which the realtime service recreates on start.
  const file = await open(dump, 'w')
  try { run('docker', ['exec', env.BACKUP_DB_CONTAINER, 'pg_dump', '-U', 'supabase_admin', '-d', 'postgres', '--format=custom', '--exclude-schema=realtime', '--exclude-schema=_realtime'], { stdio: ['ignore', file.fd, 'inherit'] }) }
  finally { await file.close() }
  run('age', ['--recipient', env.AGE_RECIPIENT, '--output', `${dump}.age`, dump])
  run('rclone', ['copyto', `${dump}.age`, `${env.RCLONE_BACKUP_REMOTE}:${prefix}/database.dump.age`])
  if (storage) run('rclone', ['copy', storage, `${env.RCLONE_BACKUP_REMOTE}:${prefix}/storage`, '--create-empty-src-dirs'])
  console.log(`Encrypted ${backupEnv} backup completed: ${prefix}`)
} finally {
  await rm(work, { recursive: true, force: true })
}
