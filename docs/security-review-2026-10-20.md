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
- The function inventory showed five callable helpers with effective `anon` execute permission: `is_own_staff_profile`, `is_tenant_member`, `is_tenant_manager`, `claim_staff_invite`, and `approve_work_order`. Their current bodies either require `auth.uid()` or reject the deprecated approval call, so the output did not establish an unauthenticated data/write exploit. The permission is broader than needed, however. Migration `061_restrict_public_function_execute.sql` revokes anonymous/public execution while preserving authenticated and service-role access; its focused repeatability/grants test passes. This migration still needs staging application.

## Verification

- `npm run lint`: passed.
- `npm test`: 71/71 passed, including migration 061 ACL and repeatability checks.
- `git diff --check`: passed after the final trusted-IP refinement.
- Local `npm run build`: could not complete in this Windows sandbox because Vite's `optimizeSafeRealPathSync` child process was rejected with `spawn EPERM`. The user confirmed the Vercel Preview deployment reached Ready and public booking worked.
- Migration `supabase/migrations/060_public_booking_rate_limit.sql` was successfully applied to the linked staging project with `supabase db push`, as reported by the user. The live table grants and RLS state still need the read-only inventory check below.

## Staging smoke test update

On 2026-10-20, the user confirmed that the Preview deployment was Ready, a test online booking succeeded, and the owner, studio administrator, master, and support role checks worked. This is a user-reported smoke test; no live credentials were accessed by this review. The user also reported that migration 060 completed successfully with `supabase db push` against the linked staging project.

The staging RLS inventory output provided by the user showed `relrowsecurity=true` for every listed table in `public` and `storage`, including `storage.objects`. Some service-managed tables have no direct policies in this inventory; that can be correct when direct client grants are revoked. The inventory does not show policy expressions or grants, so these still require the detailed read-only follow-up in `supabase/audits/rls_policy_details.sql`.

## Remaining staging checks

1. Verify migration 060's table has RLS enabled and its grants match the checks above; the successful push confirms execution but not the resulting live ACL inventory.
2. Apply migration 061 and confirm anonymous execute access is false for the five listed helpers.
3. Run the detailed read-only policy and grants query and retain its output with the staging release notes.
4. Confirm preview environment variables point only to staging and contain the staging service key; verify the built browser assets contain no service-role key.
5. Test a second staging studio to confirm cross-tenant isolation. Role checks and a successful booking have been reported as passing, but the two-studio check was not reported.
6. Optionally validate rate-limit thresholds in staging with a controlled test client; automated tests cover the quotas without generating live booking spam.

