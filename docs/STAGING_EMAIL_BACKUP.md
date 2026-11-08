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

## Encrypted backups

Moved to Backblaze B2 for the self-hosted stack: setup, schedule, restore and the restore-test log are in [BACKUPS.md](BACKUPS.md).
