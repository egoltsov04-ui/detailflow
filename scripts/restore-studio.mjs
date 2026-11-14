// Restores ONE studio from a backup made by scripts/weekly-encrypted-backup.mjs, other studios stay as they are.
// Usage: node scripts/restore-studio.mjs <backup prefix> <studio uuid> [--apply] [--skip-photos]
// Env: RESTORE_DB_CONTAINER, AGE_IDENTITY, RCLONE_BACKUP_REMOTE, RESTORE_STORAGE_TARGET (Storage folder of the stack),
// plus the backup settings (source /etc/detailflow/backup*.env): before --apply a fresh backup of the live stack is made.
// Dry run by default: prints rows per table now and in the backup. Steps and limits: docs/BACKUPS.md.
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, open, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const env = process.env, args = process.argv.slice(2), apply = args.includes('--apply'), skipPhotos = args.includes('--skip-photos')
const [prefix, studio] = args.filter(a => !a.startsWith('--'))
if (!prefix || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(studio || '')) throw new Error('Usage: restore-studio.mjs <backup prefix> <studio uuid> [--apply] [--skip-photos]')
for (const name of ['RESTORE_DB_CONTAINER', 'AGE_IDENTITY', 'RCLONE_BACKUP_REMOTE']) if (!env[name]) throw new Error(`Set ${name}.`)
if (apply && env.BACKUP_DB_CONTAINER !== env.RESTORE_DB_CONTAINER) throw new Error('Source the backup env of the same stack: BACKUP_DB_CONTAINER must equal RESTORE_DB_CONTAINER.')

const run = (command, argv, options = {}) => {
  const result = spawnSync(command, argv, { stdio: 'inherit', maxBuffer: 1 << 30, ...options })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${argv[0]} failed with exit code ${result.status}`)
  return result
}
const psql = (input, user = 'postgres') => run('docker', ['exec', '-i', env.RESTORE_DB_CONTAINER, 'psql', '-U', user, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-qtA'], { input, stdio: ['pipe', 'pipe', 'inherit'], encoding: 'utf8' }).stdout.trim()

// Billing, delivery logs and history stay live: rolling them back would undo payments or resend reminders.
const KEEP_LIVE = new Set(['subscriptions', 'payment_orders', 'studio_access_requests', 'audit_logs', 'notification_jobs', 'reminders'])
// Studio rows in tables without tenant_id, found through their parent.
const CHILDREN = { appointment_services: ['appointment_id', 'appointments'], staff_services: ['staff_id', 'staff_profiles'], telegram_chats: ['appointment_id', 'appointments'] }
const BY_STUDIO_ID = ['studio_posts']
const TENANT_FIELDS = ['name', 'address', 'timezone', 'phone', 'email', 'onboarding_completed_at', 'shift_max_hours', 'break_max_minutes', 'shift_close_time', 'shift_approval']

if (psql(`select count(*) from public.tenants where id='${studio}'`) !== '1') throw new Error('Studio not found in the live database.')
const tenantTables = psql("select string_agg(c.table_name,',' order by c.table_name) from information_schema.columns c join pg_tables t on t.tablename=c.table_name and t.schemaname='public' where c.table_schema='public' and c.column_name='tenant_id'").split(',').filter(t => !KEEP_LIVE.has(t))

const work = await mkdtemp(join(tmpdir(), 'detailflow-studio-restore-'))
try {
  const dump = join(work, 'database.dump')
  run('rclone', ['copyto', `${env.RCLONE_BACKUP_REMOTE}:${prefix}/database.dump.age`, `${dump}.age`])
  run('age', ['--decrypt', '--identity', env.AGE_IDENTITY, '--output', dump, `${dump}.age`])
  await rm(`${dump}.age`)
  const file = await open(dump, 'r')
  let text
  try { text = run('docker', ['exec', '-i', env.RESTORE_DB_CONTAINER, 'pg_restore', '--data-only', '-f', '-'], { stdio: [file.fd, 'pipe', 'inherit'], encoding: 'utf8' }).stdout }
  finally { await file.close() }

  // COPY blocks of the dump: one line per row, tab-separated, so a row is matched by one field without decoding it.
  const blocks = new Map()
  for (const m of text.matchAll(/^COPY (\S+) \(([^)]*)\) FROM stdin;\n([\s\S]*?)^\\\.$/gm)) blocks.set(m[1].replaceAll('"', ''), { columns: m[2], names: m[2].split(', ').map(c => c.replaceAll('"', '')), rows: m[3] ? m[3].replace(/\n$/, '').split('\n') : [] })
  const pick = (table, column, keep) => { const b = blocks.get(table); if (!b) return { columns: '', rows: [] }; const i = b.names.indexOf(column); if (i < 0) throw new Error(`${table} has no ${column} in the backup`); return { ...b, rows: b.rows.filter(r => keep(r.split('\t')[i])) } }
  const ids = rows => new Set(rows.rows.map(r => r.split('\t')[rows.names.indexOf('id')]))

  const restore = new Map()
  for (const t of tenantTables) restore.set(t, pick(`public.${t}`, 'tenant_id', v => v === studio))
  for (const t of BY_STUDIO_ID) restore.set(t, pick(`public.${t}`, 'studio_id', v => v === studio))
  for (const [t, [col, parent]] of Object.entries(CHILDREN)) { const parents = ids(restore.get(parent)); restore.set(t, pick(`public.${t}`, col, v => parents.has(v))) }
  const objects = pick('storage.objects', 'name', v => v.startsWith(`${studio}/`))
  objects.rows = objects.rows.filter(r => r.split('\t')[objects.names.indexOf('bucket_id')] === 'job-photos')
  const tenantRow = pick('public.tenants', 'id', v => v === studio)
  if (tenantRow.rows.length !== 1) throw new Error('This studio is not in the backup (created later?).')

  const liveWhere = t => t in CHILDREN ? `${CHILDREN[t][0]} in (select id from public.${CHILDREN[t][1]} where tenant_id='${studio}')` : BY_STUDIO_ID.includes(t) ? `studio_id='${studio}'` : `tenant_id='${studio}'`
  const live = Object.fromEntries(psql([...restore.keys()].map(t => `select '${t}', count(*) from public.${t} where ${liveWhere(t)};`).join('\n')).split('\n').map(l => l.split('|')))
  console.log(`Studio ${studio}, backup ${prefix}\n${'table'.padEnd(28)}now  backup`)
  for (const [t, r] of restore) if (Number(live[t]) || r.rows.length) console.log(`${t.padEnd(28)}${String(live[t]).padStart(3)}  ${String(r.rows.length).padStart(6)}`)
  console.log(`${'photos (storage.objects)'.padEnd(28)}${psql(`select count(*) from storage.objects where bucket_id='job-photos' and name like '${studio}/%'`).padStart(3)}  ${String(objects.rows.length).padStart(6)}`)
  const members = restore.get('tenant_memberships'), userCol = members.names?.indexOf('user_id') ?? -1
  const missing = userCol < 0 ? [] : psql(`select string_agg(u, ',') from unnest(array[${members.rows.map(r => `'${r.split('\t')[userCol]}'`).join(',') || "''"}]::text[]) u where u<>'' and not exists(select 1 from auth.users where id::text=u)`).split(',').filter(Boolean)
  if (missing.length) console.log(`Accounts deleted since the backup, their memberships are skipped: ${missing.length}`)
  if (missing.length) members.rows = members.rows.filter(r => !missing.includes(r.split('\t')[userCol]))

  const photoSource = `${env.RCLONE_BACKUP_REMOTE}:${prefix}/storage/stub/stub/job-photos/${studio}`
  const hasPhotoCopy = run('rclone', ['lsf', `${env.RCLONE_BACKUP_REMOTE}:${prefix}/storage/`], { stdio: 'pipe', encoding: 'utf8' }).stdout.trim() !== ''
  if (!hasPhotoCopy) console.log(skipPhotos ? 'This backup has no photo copy: photos stay as they are now (--skip-photos).' : 'This backup has no photo copy. Pick a backup with photos, or pass --skip-photos to keep the current photos.')
  if (!apply) { console.log('Dry run. Repeat with --apply to restore.'); process.exit(0) }
  if (!hasPhotoCopy && !skipPhotos) throw new Error('Refusing: no photo copy in this backup and no --skip-photos.')
  if (!skipPhotos && !env.RESTORE_STORAGE_TARGET) throw new Error('Set RESTORE_STORAGE_TARGET or pass --skip-photos.')

  console.log('Fresh backup of the live stack before the restore:')
  run('node', [new URL('./weekly-encrypted-backup.mjs', import.meta.url).pathname, '--apply'])
  const photoDir = !skipPhotos && join(env.RESTORE_STORAGE_TARGET, 'stub', 'stub', 'job-photos', studio)
  const staged = photoDir && `${photoDir}.restore-${Date.now()}`
  if (staged) objects.rows.length ? run('rclone', ['copy', photoSource, staged]) : await mkdir(staged, { recursive: true })

  // One transaction as superuser: triggers (guards, audit, FK cascades) are off, so rows are replaced exactly as in the backup.
  // Afterwards every foreign key is checked; rows of live tables that point at removed rows follow their ON DELETE rule.
  const copy = (table, b) => b.rows.length ? `copy ${table} (${b.columns}) from stdin;\n${b.rows.join('\n')}\n\\.\n` : ''
  const sql = [
    'begin;', 'set local session_replication_role = replica;',
    ...Object.keys(CHILDREN).map(t => `delete from public.${t} where ${liveWhere(t)};`),
    ...[...restore.keys()].filter(t => !(t in CHILDREN)).map(t => `delete from public.${t} where ${liveWhere(t)};`),
    ...(skipPhotos ? [] : [`delete from storage.objects where bucket_id='job-photos' and name like '${studio}/%';`]),
    ...[...restore].map(([t, b]) => copy(`public.${t}`, b)),
    ...(skipPhotos ? [] : [copy('storage.objects', objects)]),
    `create temp table restored_tenant (like public.tenants) on commit drop;`, copy('restored_tenant', tenantRow),
    `update public.tenants t set ${TENANT_FIELDS.map(f => `${f}=r.${f}`).join(',')} from restored_tenant r where t.id=r.id;`,
    `do $$declare k record; n bigint; changed boolean; pass int:=0; cond text;
begin loop changed:=false; pass:=pass+1;
 for k in select c.conrelid::regclass child, c.confrelid::regclass parent, c.confdeltype del, c.conname,
  (select string_agg(format('ch.%I',a.attname),',' order by i) from unnest(c.conkey) with ordinality x(n,i) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=x.n) ccols,
  (select string_agg(format('p.%I',a.attname),',' order by i) from unnest(c.confkey) with ordinality x(n,i) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=x.n) pcols,
  (select string_agg(format('%I',a.attname),',') from unnest(c.conkey) x(n) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=x.n) cnames
  from pg_constraint c where c.contype='f' and c.connamespace='public'::regnamespace loop
  cond:=format('row(%s) is not null and not exists(select 1 from %s p where row(%s)=row(%s))',k.ccols,k.parent,k.pcols,k.ccols);
  if k.del='c' then execute format('delete from %s ch where %s',k.child,cond); get diagnostics n=row_count;
  elsif k.del='n' then execute format('update %s ch set (%s)=row(%s) where %s',k.child,k.cnames,(select string_agg('null',',') from regexp_split_to_table(k.cnames,',')),cond); get diagnostics n=row_count;
  else execute format('select count(*) from %s ch where %s',k.child,cond) into n;
   if n>0 then raise exception 'Restore would break % (% rows in %), nothing changed', k.conname, n, k.child; end if; end if;
  if n>0 then changed:=true; raise notice 'follow-up on %: % rows', k.conname, n; end if;
 end loop; exit when not changed or pass>10; end loop; end$$;`,
    `insert into public.audit_logs(tenant_id,entity_type,entity_id,action,after_data) values('${studio}','tenant','${studio}','restore_from_backup',jsonb_build_object('backup','${prefix.replaceAll("'", '')}'));`,
    'commit;'].join('\n')
  psql(sql, 'supabase_admin')
  psql("notify pgrst, 'reload schema'")
  if (staged) {
    await stat(photoDir).then(() => run('mv', [photoDir, `${staged}.old`]), () => {})
    run('mv', [staged, photoDir]); await rm(`${staged}.old`, { recursive: true, force: true })
  }
  console.log(`Studio restored from ${prefix}.`)
} finally {
  await rm(work, { recursive: true, force: true })
}
