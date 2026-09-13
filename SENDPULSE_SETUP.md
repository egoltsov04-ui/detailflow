# SendPulse REST API

This project sends appointment reminders from the Vercel server function through the SendPulse REST API. The browser never receives the SendPulse key.

## Configure Vercel

In **Vercel → detailflow → Environment Variables**, create these variables for **All Environments**:

- `SENDPULSE_API_KEY` — a static API key from **SendPulse → Account settings → API → API keys**;
- `SENDPULSE_API_FROM_EMAIL` — a verified sender address;
- `SENDPULSE_API_FROM_NAME` — `Detailflow`;
- `SENDPULSE_API_BASE_URL` — `https://api.sendpulse.com` (optional);
- `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` — required by the reminder endpoint.

Do not use the `VITE_` prefix for any of these names and never commit the values to Git.

## Test plan

The SendPulse SMTP Test plan provides `devtest@sendpulseemail.com` as a temporary sender. In test mode, SendPulse can replace the sender with `SP test <devtest@sendpulseemail.com>` and add a development prefix to the subject. This is expected. Once your own domain is verified, set `SENDPULSE_API_FROM_EMAIL` to your own verified sender; an unverified sender is rejected by SendPulse.

## Test from Terminal

Create a local `.env` based on `.env.example` (it is ignored by Git), add `SENDPULSE_TEST_TO=your-email@example.com`, then run this **in Terminal, not in Supabase SQL Editor**:

```bash
node --env-file=.env scripts/sendpulse-test.mjs
```

The script first calls `GET /user/info` to validate the key, then sends a single test message using `POST /smtp/emails`. It prints a clear error if SendPulse returns a non-2xx status, including rate-limit responses.

## Production scheduling

Vercel Hobby is not appropriate for the hourly reminder schedule. When the project moves to Vercel Pro, configure the protected `/api/send-reminders` schedule using `CRON_SECRET`.
