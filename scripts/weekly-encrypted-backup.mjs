import { spawnSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const env = process.env
const backupEnv = env.BACKUP_ENV
if (!['staging', 'production'].includes(backupEnv || '')) throw new Error('Set BACKUP_ENV=staging or BACKUP_ENV=production.')
if (backupEnv === 'production' && env.ACKNOWLEDGE_PRODUCTION_BACKUP !== 'YES') {
  throw new Error('Production backup is blocked until explicitly approved: set ACKNOWLEDGE_PRODUCTION_BACKUP=YES only after approval.')
}
if (!env.PGSERVICE || !env.PGSERVICEFILE) throw new Error('Set PGSERVICE and PGSERVICEFILE to a protected pg_service.conf profile.')
if (!env.RCLONE_SUPABASE_REMOTE || !env.RCLONE_R2_CRYPT_REMOTE) throw new Error('Configure rclone source and encrypted R2 remotes.')
if (!env.BACKUP_BUCKETS) throw new Error('Set BACKUP_BUCKETS to a comma-separated allow-list of storage buckets.')
if (!env.AGE_RECIPIENT) throw new Error('Set AGE_RECIPIENT to the public age encryption recipient.')

const run = (command, args, extraEnv = {}) => {
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...env, ...extraEnv }, windowsHide: true })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`)
}

const stamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z')
const prefix = `${(env.BACKUP_PREFIX || 'detailflow-backups').replace(/^\/+|\/+$/g, '')}/${backupEnv}/${stamp}`
const work = await mkdtemp(join(tmpdir(), 'detailflow-backup-'))
const dump = join(work, 'database.dump')
const encryptedDump = `${dump}.age`
try {
  run('pg_dump', [`--dbname=service=${env.PGSERVICE}`, '--format=custom', '--no-owner', '--no-acl', '--file', dump], { PGSERVICEFILE: env.PGSERVICEFILE })
  run('age', ['--recipient', env.AGE_RECIPIENT, '--output', encryptedDump, dump])
  run('rclone', ['copyto', encryptedDump, `${env.RCLONE_R2_CRYPT_REMOTE}:${prefix}/database.dump.age`])

  const buckets = [...new Set(env.BACKUP_BUCKETS.split(',').map(value => value.trim()).filter(Boolean))]
  for (const bucket of buckets) {
    if (!/^[a-z0-9][a-z0-9._-]{0,62}$/i.test(bucket)) throw new Error(`Invalid bucket name in BACKUP_BUCKETS: ${bucket}`)
    run('rclone', ['copy', `${env.RCLONE_SUPABASE_REMOTE}:${bucket}`, `${env.RCLONE_R2_CRYPT_REMOTE}:${prefix}/storage/${bucket}`, '--create-empty-src-dirs'])
  }
  console.log(`Encrypted ${backupEnv} backup completed: ${prefix}`)
} finally {
  await rm(work, { recursive: true, force: true })
}
