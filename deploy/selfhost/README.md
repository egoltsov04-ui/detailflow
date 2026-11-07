# Self-hosted Detailflow

Caddy serves `dist/` and proxies `/api/*` to the Node server (`server/node.ts`, the same `api/` handlers as on Vercel).
Supabase runs from the official `supabase/docker` stack next to it, on the `supabase_default` Docker network.
Only Caddy publishes ports. The API port must stay internal: the booking rate limit trusts `X-Forwarded-For` from Caddy.

## Start (local or staging)

1. Supabase: `sh setup.sh -y --skip-deps --project-dir supabase-stack` from `supabase/docker` (checked with `self-hosted/v0.8.4`), then `docker compose up -d` in that folder. Edge functions and the pooler are not used.
2. Database, in this order, as `postgres`: `supabase/schema.sql`, then `supabase/migrations/*` sorted, with `028` replaced by `supabase/deploy/workflow_028_030.sql` and `029`, `030` skipped (they are inside that file).
3. Schedule: `create extension pg_cron; create extension pg_net;`, save `detailflow_cron_secret` and `detailflow_app_url` (HTTPS) with `vault.create_secret`, then run `supabase/deploy/configure_notification_cron.sql`. Shift auto-close runs inside the same call.
4. Support account: sign up the service email, then run `supabase/deploy/grant_support_account.sql` with that email.
5. Frontend: `VITE_SUPABASE_URL=<public Supabase URL> VITE_SUPABASE_ANON_KEY=<ANON_KEY> npm run build`.
6. App: fill `.env` from `.env.example`, then `docker compose up -d --build` here.

Behind a TLS-inspecting proxy, build the API image with `docker build -f deploy/selfhost/Dockerfile.api --secret id=extra_ca,src=<ca.pem> -t detailflow-api .` and start with `--no-build`.

## Checked locally on 2026-11-07

- All migrations 001-063 apply on `supabase/postgres:17.6.1.136` without errors.
- Real signup, support approval, owner login in the browser, Огляд with live data.
- Through Caddy: `/api/health` 200, public booking page and submission (201), a second request for the same master and time is refused (409), confirming a request from the UI calls `/api/booking-requests/update` (200).
- `send-reminders`: wrong secret 401; pg_cron fires every minute through pg_net and reaches the Node server (503 only because SendPulse and VAPID keys are not set locally).
- Storage `job-photos`: upload, signed URL read, private bucket, delete.
- Headers from `vercel.json` and the 41 old-address redirects (307).
