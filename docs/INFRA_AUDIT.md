# Detailflow — infrastructure audit

**Review date:** 2026-11-06
**Scope:** repository files and current local working tree only. This is not a live audit of Vercel, Supabase, SendPulse, Cloudflare R2, DNS, or production data. No provider credentials or customer data were accessed.

## Executive summary

The repository is configured for a Vite/React single-page app deployed to Vercel, with Vercel Functions for server routes and Supabase for Auth, PostgreSQL, and Storage. SendPulse API mail, Web Push, and WayForPay integration code is present. Subscription billing defaults to manual mode in the checked-in environment examples. Backup scripts for PostgreSQL and Supabase Storage to encrypted Cloudflare R2 are present, but code and instructions do not prove a successful backup or restore.

The checkout contains 61 SQL migration files, numbered 001–061. The older `docs/INFRA_SNAPSHOT.md` describes a 001–059 inventory and is dated 2026-10-18; refresh it after validating the remote migration ledger. The working tree also has uncommitted changes at the time of this review, so findings describe local files and may not match the deployed commit.

## Repository structure

```text
detailflow/
├── .github/workflows/       CI workflow
├── api/                     Vercel Function routes (booking, staff, public, WayForPay)
├── docs/                    Setup, release, security, operations, and audit documents
├── public/                  Static assets, fonts, icons, templates, demo content
├── scripts/                 Build checks, tests, notification and backup utilities
├── server/lib/              Shared server-side helpers
├── src/                     React app, components, workflows, localization, libraries
├── supabase/
│   ├── audits/               Read-only SQL audit queries
│   ├── deploy/               Deployment and verification SQL
│   ├── migrations/           001–061 SQL migrations
│   └── rollback/             Selected rollback SQL
├── tests/e2e/                End-to-end tests
├── .env.example              Production-shaped variable names with placeholders
├── .env.staging.example      Staging variable names with placeholders
├── package.json              Build, lint, unit, and E2E commands
├── vercel.json               SPA routes, response headers, function settings
└── vite.config.ts            Vite configuration
```

Generated/installed folders such as `node_modules/`, `dist/`, and `playwright-report/` are present locally but are excluded from this source tree summary.

## Components and evidence

| Area | Repository evidence | What remains externally unverified |
|---|---|---|
| Web app / hosting | Vite + React build; `vercel.json` SPA rewrites, security headers, and a 60-second limit for `api/send-reminders.ts` | Vercel project settings, deployed commit, domains, runtime version, environment values, deployment health |
| API | `api/` routes and `server/lib/` helpers | Live route behavior, production logs, access controls configured at provider level |
| Database | 61 files in `supabase/migrations/`; schema, deploy, rollback, and audit SQL | Which migrations are applied remotely, Postgres version, live schema and data |
| Authentication | Supabase client and setup documents | Auth URL allow-list, SMTP, templates, delivery, and live signup/invite/reset flows |
| File storage | App uses Supabase Storage; setup docs describe `job-photos` | Live bucket configuration, policies, object counts, retention, and signed URL behavior |
| Email / reminders | SendPulse API settings in examples; notification queue and reminder endpoint; `vercel.json` function duration | Provider sender verification, delivery/inbox placement, live cron/Vault values, Preview isolation |
| Push | VAPID variable names and push code | Production keys, browser subscription and end-to-end delivery |
| Billing | WayForPay code and env placeholders; examples set billing to `manual` | Merchant configuration, callbacks, sandbox/live transaction; payment handling is not audited here |
| Backups | `scripts/weekly-encrypted-backup.mjs`, `scripts/backup-preflight.mjs`, and R2 setup/restore guide | Installed tools, R2 bucket/token/remotes, encryption key custody, scheduled jobs, backup integrity, restore rehearsal |

## Environment variable handling

The checked-in files document names and placeholders only. Do not put secret values in Git, browser-visible `VITE_*` variables, or this report.

- Browser configuration: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and billing display/mode variables.
- Server-only configuration includes `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, SendPulse credentials, VAPID private key, and WayForPay secret.
- `APP_URL` is documented as the canonical origin for server-generated links and callbacks.
- `.env.staging.example` requires staging-specific Supabase settings and isolated or disabled mail/payment/push integrations.

The repository has no checked-in `.env.local` or `.vercel` configuration. Actual Production and Preview values must be compared inside provider settings; local placeholder files are not proof of deployed configuration.

## Findings and next verification steps

1. **Migration parity — unresolved.** Compare remote `supabase_migrations.schema_migrations` with all 61 local migration files using `supabase/audits/migration_inventory.sql`. The dated snapshot predates migrations 060 and 061.
2. **Environment separation — externally verify.** Confirm Vercel Production points only to the production Supabase project and Preview to the dedicated staging project, including service-role key, cron secret, `APP_URL`, and all provider integrations. Never print secret values into logs or chat.
3. **Auth and email — test on staging.** Verify SMTP, allowed redirect origins, signup confirmation, invitation, and password recovery using test accounts.
4. **Tenant security — run read-only inventory and behavior tests.** Review RLS flags, policies, RPC grants, and cross-tenant positive/negative access on staging before the pilot.
5. **Backups — rehearsal required.** Complete a staging database and Storage backup, then restore into an isolated staging target and verify sampled objects and application flows. A configured script is not proof of recoverability.
6. **Scheduled jobs — verify live state.** Confirm Supabase Cron/Vault targets the matching environment and that Preview cannot call Production.
7. **Deployment confidence — confirm the deployed revision.** The local working tree has uncommitted changes; compare the intended release commit to the Vercel deployment before treating these source findings as production state.

## Limits

This report does not certify production readiness, RLS correctness, migration parity, backup recoverability, service availability, or compliance. Those require read-only provider checks and controlled staging tests. It intentionally contains no secret values, customer records, or live connection details.
