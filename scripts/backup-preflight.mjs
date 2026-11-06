import { spawnSync } from 'node:child_process'

const required = [
  'BACKUP_ENV',
  'PGSERVICE',
  'PGSERVICEFILE',
  'RCLONE_SUPABASE_REMOTE',
  'RCLONE_R2_CRYPT_REMOTE',
  'BACKUP_BUCKETS',
  'AGE_RECIPIENT',
]
const missing = required.filter((name) => !process.env[name])

if (missing.length) {
  console.error(`Backup preflight: missing environment settings: ${missing.join(', ')}`)
  process.exit(1)
}

if (process.env.BACKUP_ENV !== 'staging') {
  console.error('Backup preflight is staging-only. Set BACKUP_ENV=staging.')
  process.exit(1)
}

const failed = []
for (const [command, args] of [
  ['pg_dump', ['--version']],
  ['age', ['--version']],
  ['rclone', ['version']],
]) {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true })
  if (result.error || result.status !== 0) {
    failed.push(command)
    continue
  }
  const version = (result.stdout || result.stderr).split(/\r?\n/, 1)[0]
  console.log(`${command}: ${version}`)
}

if (failed.length) {
  console.error(`Backup preflight: install or repair these tools and ensure they are on PATH: ${failed.join(', ')}`)
  process.exit(1)
}

console.log('Backup preflight passed. The backup script will separately verify the staging database, Storage endpoint, and encrypted R2 target before reading data.')
