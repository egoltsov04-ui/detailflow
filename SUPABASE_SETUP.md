# Supabase setup

1. Create a Supabase project on the free plan.
2. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql) in full.
3. Then run [`supabase/migrations/001_booking_integrity.sql`](supabase/migrations/001_booking_integrity.sql) in full.
4. In **Authentication → Providers**, enable Email. Keep email confirmation enabled for production.
5. In **Project Settings → API**, copy the Project URL and anon public key into a local `.env` file based on `.env.example`.
6. Never expose the `service_role` key in Vite, Git, or the browser.

The free plan is appropriate for development. Production needs regular backups and a paid hosting plan that supports commercial use.
