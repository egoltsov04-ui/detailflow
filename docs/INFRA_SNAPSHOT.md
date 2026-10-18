# Detailflow infrastructure snapshot

**Captured:** 2026-10-18. This is a repository/configuration snapshot, not a live audit of Vercel or Supabase dashboards. Production secrets, data, usage, Postgres version, and the full migration ledger were not read.

## Runtime and deployment

- Frontend: React 19.3.0 + TypeScript + Vite 8.3.0; static build output is `dist/` (`npm run build`). It is not a Next.js application; there is no Next.js dependency/configuration.
- Backend: Vercel Functions in `api/**/*.ts`, running Node.js request handlers. `vercel.json` gives `api/send-reminders.ts` a 60-second maximum duration. Routes include health, staff invitations/admin, public booking, booking request updates, push, reminders, and WayForPay checkout/callback/return.
- Production documented in the repository: Vercel project `detail-flow1/detailflow`, site `https://detailflow-xi.vercel.app/`; Supabase project ref `stxfbarigoutglfqqhwi`. The last documented successful production deploy is commit `4fb2784`. Local `main` is one commit ahead (`5ad8178`) and that commit is not documented as deployed.
- Package lock resolves `@supabase/supabase-js` 2.116.0. Node runtime selected by Vercel was not inspectable here; pin/verify it in Vercel project settings and CI before pilot.

## Environment variables (names only; values are secrets/config and are not copied here)

| Variable | Use / exposure | Environments |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL; public build-time config | Production, Preview, Development must each point to their own project |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase client key; protected by RLS | Per environment, never reuse production value for Preview/Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side service key; bypasses RLS | Server only; separate project key per environment; never prefix with `VITE_` |
| `APP_URL` | Canonical origin for invite/reset links and WayForPay callbacks | Set separately per deployment environment; must be HTTPS outside localhost |
| `CRON_SECRET` | Authenticates `/api/send-reminders` | Separate random secret per environment |
| `SENDPULSE_API_KEY`, `SENDPULSE_API_FROM_EMAIL`, `SENDPULSE_API_FROM_NAME`, `SENDPULSE_API_BASE_URL` | Reminder/staff mail provider integration | Disable or sandbox for Preview; verified sender required in Production |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push; private key server-only | Separate keys for staging and Production; `VAPID_SUBJECT` should be a stable `mailto:` contact |
| `WAYFORPAY_MERCHANT_ACCOUNT`, `WAYFORPAY_SECRET_KEY`, `WAYFORPAY_MERCHANT_DOMAIN` | Payment checkout/callback. Current billing mode in `.env.example` is manual | Keep disabled in Preview; use provider sandbox credentials if enabled |
| `BILLING_MODE`, `VITE_BILLING_MODE`, `VITE_BILLING_TELEGRAM` | Server and public billing mode / support handle | Per environment; both billing-mode variables must agree; manual billing is default |

No actual `.env.local`, Vercel project config, or Supabase CLI link is present in this checkout. Confirm actual Production/Preview/Development values in provider dashboards. Do not paste secret values into Git or this report.

## Integrations and data flows

- Supabase Auth: email/password, invites, password reset; emails for Auth are configured separately from SendPulse API mail. Custom SMTP is not confirmed. Auth templates live in the Supabase dashboard (managed project) and were not readable here.
- Supabase PostgreSQL: application data and security-definer RPCs; browser client uses anon key + RLS, selected Vercel functions use service role after validating user/session and authorization.
- Supabase Storage bucket `job-photos`: workflow uploads happen directly from the browser via `supabase.storage.from(...).upload(...)` or `createSignedUploadUrl`; bytes do not pass through Vercel functions. Viewing uses short-lived signed URLs (300 seconds). File metadata/evidence is recorded in Postgres.
- SendPulse: API mail for application invitations/reminders. Prior project notes say a test message was accepted and arrived in Gmail Spam; production sender/domain and inbox placement are not verified.
- Web Push: VAPID + browser service worker, subscriptions stored in Supabase. Device delivery on live production devices is not confirmed.
- WayForPay: checkout/callback code exists, but billing mode is currently manual by default and real transaction flow is not verified.

## Cron and background work

| Job | Trigger | Action | Evidence / status |
|---|---|---|---|
| `detailflow-notifications` | Supabase `pg_cron` every minute, then `pg_net` HTTPS POST | Calls `/api/send-reminders` with `CRON_SECRET`; handler processes reminder queue and calls `close_overdue_shifts` | Setup guide records earlier successful HTTP 200, but live schedule/secrets are not inspectable now. Existing SQL formerly hard-coded Vercel URL; updated setup SQL reads `detailflow_app_url` from Vault. |
| UI refresh / shift cleanup | Browser polling while app is open (workflow refresh) | Reads state and invokes `close_overdue_shifts` RPC | Not a durable scheduler; depends on an active client session. |
| Vercel scheduled functions | None declared in `vercel.json` | — | No Vercel Cron configuration found. |
| Weekly encrypted backups | Not scheduled | `scripts/weekly-encrypted-backup.mjs` prepared for manual/staging validation first | Must not be scheduled for Production until explicit approval and restore test. |

## Migration inventory and confidence

Repository contains SQL migration files `001_booking_integrity.sql` through `059_plans_solo.sql` (all numbered files are present). Feature groups: 001–016 booking, inventory, billing, CRM and finance; 017–030 staff workflow and calendar/media; 031–044 access, invitations, schedules and notifications; 045–055 catalog/orders, permissions, analytics, job evidence, recommendations, studio posts and workflow repairs; 056–059 master/support workspace, shift defaults and plan entitlements.

**Production application status is not fully verified.** Prior user confirmations and release notes document application of 032, bundles 033–039 and 040–044, 048–049, and 056–059. Do not infer that every other file is applied from its presence in Git. In particular, the current working tree has untracked `supabase/migrations/053_intelligence_data.sql`; it is not part of the tracked release commit. Before staging/prod parity work, compare Supabase `supabase_migrations.schema_migrations` to this inventory using the read-only query in `supabase/audits/migration_inventory.sql` and review the diff.

## RLS snapshot

- `supabase/schema.sql` enables RLS on its 17 base tables and defines tenant-membership policies. Later migrations enable RLS on additional tables (for example `studio_recommendations`, `recommendation_feedback`, `studio_posts`, and support `payments`). Storage policies protect `job-photos` and access functions.
- This is evidence from source SQL only. Actual production RLS flags, policies, grants, table additions and RPC definitions were not queried. RLS being enabled is not proof that policies correctly isolate tenants.
- Run the read-only inventory in `supabase/audits/rls_inventory.sql` on staging and production; then perform cross-studio positive/negative tests before pilot.

## Known gaps / risks before real-data pilot

1. Confirm every production migration and Postgres major version from Supabase; staging/local versions must match.
2. Create a dedicated staging Supabase project and configure separate keys for Vercel Preview and local development. The repository cannot enforce dashboard values by itself; use `node scripts/check-env-isolation.mjs` with `VERCEL_ENV=preview` or `DEPLOYMENT_ENV=staging` in CI.
3. Confirm custom Supabase Auth SMTP, templates, redirect allow-list and delivery with test accounts.
4. Confirm cron is active and points to the correct environment; never allow Preview to call Production.
5. Verify backup/restore for both Postgres and Storage. Database dumps do not contain media bytes or provider secrets.
6. Complete tenant isolation and service-role attack-path review against staging.
7. Pin Node.js runtime and review current lockfile/dependency advisories before pilot.
8. Production build succeeds, but Vite warns that some JavaScript chunks exceed 500 kB; measure mobile load time on a real device and consider splitting before broad launch.
