# Staging, Auth email, URLs, and encrypted backups

This document prepares isolated test environments and backup tooling. Nothing here reads or copies Production data automatically. The backup script has not been run.

## Staging and Preview isolation

1. Create a **new Supabase project dedicated to staging**. Never use Production URL, anon key, service-role key, Auth SMTP credentials, SendPulse key, WayForPay credentials, or VAPID private key in Preview/Development.
2. Configure Vercel Production variables only with Production values. Configure Preview with the staging Supabase URL and keys and a unique `CRON_SECRET`; leave live payment credentials empty and email disabled or routed to test inboxes.
3. Copy `.env.staging.example` to a private secret store; do not rename it to a committed `.env` or put secrets in Git.
4. Check Preview isolation before deploying: `$env:VERCEL_ENV='preview'; node scripts/check-env-isolation.mjs` in PowerShell (or `VERCEL_ENV=preview node scripts/check-env-isolation.mjs` in bash). The check rejects the documented Production project ref, missing staging service key, or missing `APP_URL`. It is a guardrail, not a substitute for correct provider settings.
5. Compare migrations with Production's migration ledger read-only. Use a sanitized database seed for staging; never copy live customer data without separately approved purpose, minimized fields, access controls and retention.

### Local Supabase in Docker

Prerequisites: Docker Desktop running and Supabase CLI installed. `supabase/config.toml` is included. Before first start, check the Production Postgres major version in the Supabase dashboard and set the same value for `db.major_version` in that local config; current Production version was not observable in this task.

From the project root:

```powershell
supabase start
supabase status
```

The first start pulls the local Docker images. Local API is normally `http://127.0.0.1:54321`, DB `postgresql://postgres:postgres@127.0.0.1:54322/postgres`, Studio `http://127.0.0.1:54323`, and Inbucket mail UI `http://127.0.0.1:54324`. Local email is captured in Inbucket and is not delivered externally. Reset only the local DB to apply the checked-in migration chain from scratch:

```powershell
supabase db reset
```

Never run `supabase db reset` against a linked or remote project. Do not run `supabase link` to Production for local work. Stop local services with `supabase stop`.

## Supabase Auth SMTP

Supabase Auth mail is separate from Detailflow's SendPulse transactional API. In a managed Supabase project, set custom SMTP in **Authentication → SMTP Settings**. Add provider host, port, username, password, sender name, and a verified sender such as `no-reply@your-domain`. Store credentials only in Supabase settings or a secret manager, not SQL, Git, Vercel client variables, or this document. Require STARTTLS/TLS as supported by the provider; test invite, signup confirmation and password recovery with dedicated accounts.

For self-hosted Supabase, configure the Auth SMTP environment variables on the server:

```dotenv
SMTP_ADMIN_EMAIL=ops@your-domain.example
SMTP_HOST=smtp.provider.example
SMTP_PORT=465
SMTP_USER=provider-user
SMTP_PASS=provider-secret
SMTP_SENDER_NAME=Detailflow
```

Use the provider's documented port/encryption combination. Restart Auth after changing credentials. The SMTP password is a secret. Supabase's default test mailer is rate-limited and is not intended for production delivery. [Supabase custom SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp)

### Auth templates and URL checks

Review in Supabase Auth templates: **Confirm signup**, **Invite user**, **Reset password**, **Magic link**, and email change. Prefer `{{ .ConfirmationURL }}` or the provider-supported confirmation URL; when constructing links manually, use `{{ .SiteURL }}` / `{{ .RedirectTo }}` rather than a hard-coded Vercel domain. Confirm the link lands at `APP_URL` and the app handles the selected route and token flow. In managed Supabase, review templates in dashboard; self-hosted template URLs are configured in Auth environment. [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates)

Set the Auth Site URL to the canonical app origin and restrict Additional Redirect URLs to Production plus the exact staging/local origins needed. Do not use a wildcard broad enough to accept arbitrary hosts. [Redirect URL guidance](https://supabase.com/docs/guides/auth/redirect-urls)

## Canonical URL registry

`APP_URL` is the canonical app origin for each environment. Server-generated master/admin invites, password-recovery redirects and WayForPay return/callback URLs now share `server/lib/siteUrl.ts` and read this variable. Browser-generated public booking and Auth links use the current browser origin so Preview links stay within Preview. `WAYFORPAY_MERCHANT_DOMAIN` remains separately required because it is a provider merchant-signature field, not a link base.

The current Supabase pg_cron job cannot read Vercel environment variables. The setup SQL now reads URL from Vault secret `detailflow_app_url` and cron token from `detailflow_cron_secret`; set both to the matching environment values. This is a mirrored setting, so changing Production domain requires updating `APP_URL`, Auth Site URL/allow-list, WayForPay merchant domain if applicable, and Vault URL. The URL values are non-secret; do not store credentials in the URL. For self-hosted deployment, keep the shared `APP_URL` in the server's private environment file and have the weekly cron process inherit that same environment.

Other external origins are provider endpoints, not our site address: SendPulse API and WayForPay checkout host. `VAPID_SUBJECT` should be a mailto contact, not a site base URL.

## Encrypted weekly Postgres + Storage backup to Cloudflare R2

### Preconditions

- Do not run against Production until the owner explicitly approves a Production backup.
- Install compatible `pg_dump`, `age`, and `rclone` binaries on a protected backup host.
- Create a dedicated R2 backup bucket and an R2 API token limited to that bucket. Configure an rclone remote `r2crypt` of type `crypt` whose backend points to the R2 bucket; enable filename and content encryption. Keep crypt password/salt and R2 secret in a secret manager, outside Git.
- Configure an rclone S3 remote `supabase-src` for the **intended** Supabase project's Storage S3 endpoint with read-only object permissions. Use only the required bucket names in the allow-list.
- Generate an `age` keypair. Put only the public `AGE_RECIPIENT` on the backup host. Keep the age identity/private key offline in at least two protected locations; without it database dumps cannot be decrypted.
- Configure a protected `pg_service.conf` service called `detailflow_staging` or `detailflow_prod`; store database password in a permission-restricted `pgpass`, not command arguments.

The script `scripts/weekly-encrypted-backup.mjs` writes a custom-format PostgreSQL dump, encrypts it with age before upload, then copies each allow-listed Storage bucket through the encrypted rclone remote. The temporary local working directory is deleted after the run. R2 also encrypts data at rest, but the client-side age/rclone encryption means the provider does not receive plaintext file contents. R2 supports S3 tooling including rclone. [R2 data security](https://developers.cloudflare.com/r2/reference/data-security/) · [R2 rclone setup](https://developers.cloudflare.com/r2/examples/rclone/)

### First run: staging only

PowerShell example; configure credentials through protected service files/secret store, never by pasting secrets into shell history:

```powershell
$env:BACKUP_ENV='staging'
$env:PGSERVICE='detailflow_staging'
$env:PGSERVICEFILE='C:\secure\pg_service.conf'
$env:RCLONE_SUPABASE_REMOTE='supabase-src'
$env:RCLONE_R2_CRYPT_REMOTE='r2crypt'
$env:BACKUP_BUCKETS='job-photos'
$env:AGE_RECIPIENT='age1...public-recipient...'
node scripts/weekly-encrypted-backup.mjs
```

The script refuses Production unless `BACKUP_ENV=production` **and** `ACKNOWLEDGE_PRODUCTION_BACKUP=YES` are explicitly supplied. Do not set these for this task; no Production backup has been run. For weekly scheduling, after a successful staging backup and restore rehearsal, use a protected systemd timer/cron entry with the same service-file and secret-manager environment. Configure R2 lifecycle retention separately and verify it does not delete required recovery points.

### Restore rehearsal to staging only

1. Create a fresh empty staging project/database matching the backed-up Postgres major version. Never point the restore profile at Production.
2. Download the chosen backup from `r2crypt` and decrypt only into a restricted temporary directory: `age --decrypt --identity <offline-age-identity> --output database.dump database.dump.age`.
3. Inspect archive contents with `pg_restore --list database.dump`.
4. Restore with `pg_restore --dbname=service=detailflow_staging --no-owner --no-acl --exit-on-error database.dump` after confirming the service profile is staging. Managed Supabase system schemas/extensions may require the official managed-to-self-hosted migration procedure; stop on conflicts rather than dropping objects.
5. Copy the encrypted R2 storage backup back through rclone crypt to the isolated staging Storage S3 endpoint/buckets. Check object counts and sample downloads through signed URLs.
6. Verify test sign-in, tenant isolation, bookings, jobs, photo archive and relevant counts; then erase temporary plaintext dumps under the approved retention procedure.

Backups include personal and potentially financial data. Restrict access and document retention. Storage objects and provider environment secrets are not included in the database dump. A successful backup command is not a completed recovery test.
