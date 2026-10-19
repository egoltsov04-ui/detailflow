# Security review for staging

Date: 2026-10-20

## Scope

Static review of the public online booking endpoint and the existing server-side authorization checks for staff invitations, administrator recovery, booking-request updates, push subscriptions, and reminder processing. Automated database tests run against local PGlite fixtures. No production account, production database, Vercel settings, or real customer data was accessed.

## Change prepared

Public online booking now requires a trusted client IP header and applies server-side limits before returning schedule data or creating a booking. The database stores only keyed HMAC-SHA256 bucket hashes, not raw IP addresses. Limits are 600 schedule reads per IP per hour and 180 per studio/IP per hour; booking submissions are limited to 120 per IP and 15 per studio/IP per hour. A missing or invalid trusted IP, or an unavailable rate-limit RPC, fails closed with a temporary-unavailable response. Unknown studio slugs are rejected before creating counters.

The counter table has RLS enabled and no read or write grants for `anon` or `authenticated`. Its RPC is callable only by `service_role`, and also checks the JWT role. Stale counters older than two days are opportunistically removed.

## Review notes

- Staff invitation and recovery handlers require an authenticated active owner or authorized studio administrator, validate the target account state, and apply resend throttling.
- Booking-request updates verify the signed-in user's active studio membership and update only a request belonging to that studio.
- Push subscription handlers validate the endpoint and account ownership; push delivery skips blocked recipients and handles expired endpoints.
- Reminder processing requires the cron secret and uses database queue operations for retry and delivery state.
- The public booking route uses the server service key only in the API layer. The browser bundle does not reference `SUPABASE_SERVICE_ROLE_KEY`.
- Public booking persists a client, optional vehicle, appointment, and service rows in separate database calls. A failure while adding service rows removes the pending appointment, but a newly created client or vehicle can remain. This is a cleanup/data-consistency risk to address with a transactional RPC if it appears in real traffic; it does not grant cross-studio access.
- Static checks and fixtures cannot establish the live Supabase RLS state. Run the read-only RLS inventory on staging and test access with separate owner, admin, master, and anonymous accounts before importing real customer records.

## Verification

- `npm run lint`: passed.
- `npm test`: 70/70 passed, including rate-limit ACL, role, quota, and public-booking behavior tests.
- `git diff --check`: passed after the final trusted-IP refinement.
- `npm run build`: could not complete in this Windows sandbox because Vite's `optimizeSafeRealPathSync` child process was rejected with `spawn EPERM`; TypeScript lint and the full test suite pass, but confirm the Vercel Preview build before rollout.
- The new migration `supabase/migrations/060_public_booking_rate_limit.sql` has not been applied to Supabase. Apply and validate it on staging before deploying the API change there. Until then, public booking will return temporary-unavailable because its limiter RPC is required.

## Remaining staging checks

1. Apply migration 060 to staging and verify its table has RLS enabled and grants match the checks above.
2. Test one successful public booking, rejected requests after the quotas, and that one studio cannot affect another studio's scoped quota.
3. Run the project's existing read-only RLS inventory and retain its output with the staging release notes.
4. Confirm preview environment variables point only to staging and contain the staging service key; verify the built browser assets contain no service-role key.
5. Exercise owner, administrator, master, support, and anonymous access against staging, including a second studio to verify tenant isolation.

