# Vercel deployment

1. Push the `main` branch to GitHub and import the repository in Vercel.
2. Vercel detects Vite automatically. Keep the defaults: build command `npm run build`, output directory `dist`.
3. Before deploying, add the following environment variables for Production, Preview, and Development:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. Deploy. The dashboard and Supabase login will work after this step.

## Email reminders

`api/send-reminders.ts` sends messages through the SendPulse REST API. Add the server-only Supabase and SendPulse variables from `.env.example` in Vercel; never prefix them with `VITE_`.

On the SendPulse SMTP Test plan, `devtest@sendpulseemail.com` can be used for a temporary test. SendPulse may replace the sender with its test sender and label the subject as a development message. After you verify your own domain, replace `SENDPULSE_API_FROM_EMAIL` with that verified address.

The reminder endpoint is intentionally not scheduled on Vercel Hobby: that plan permits only one cron run per day and is not for commercial use. On Vercel Pro, add a cron schedule for `/api/send-reminders`.
