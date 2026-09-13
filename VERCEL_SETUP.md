# Vercel deployment

1. Push the `main` branch to GitHub and import the repository in Vercel.
2. Vercel detects Vite automatically. Keep the defaults: build command `npm run build`, output directory `dist`.
3. Before deploying, add the following environment variables for Production, Preview, and Development:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. Deploy. The dashboard and Supabase login will work after this step.

## Email reminders

`api/send-reminders.ts` is ready but is intentionally not scheduled on Vercel Hobby: that plan permits only one cron run per day and is not for commercial use. On Vercel Pro, add SMTP and server-only Supabase secrets from `.env.example`, then add a cron schedule for `/api/send-reminders`.
