# Online booking

The owner opens **Онлайн-запис → Ваша сторінка онлайн-запису** to copy or open the studio link. Existing `/?book=<slug>` links keep working. Services/prices come from **Послуги**; availability comes from **Команда → Графік**. If a master has no schedule rows, the existing default is 09:00–19:00 daily. If any schedule is configured, only its specified days/windows are offered.

The public page has three steps: multiple services; preferred or any available master plus date/time; contacts/car and review. Duration and price are combined. The window is 30 days with 30-minute minimum notice. The server rechecks the full duration, tenant catalog, active staff and confirmed/in-progress appointments. Pending requests do not reserve capacity. The owner must confirm them; the database's overlap guard remains the final protection at confirmation.

Submission creates one pending public appointment and multiple appointment service rows. Existing workflow migrations through 030 convert these to separate jobs on one order. No new SQL migration or environment variable is introduced by this change. Existing Supabase API and mail-provider configuration are required.

The email entered in the request is kept on the appointment's notes (first line `Email онлайн-запису: ...`), not written over an existing CRM contact. Confirmation and reminder emails use it, with legacy CRM fallback. All selected services and studio timezone appear in messages. Mail delivery still depends on provider configuration and is not proven by a successful UI preview.

## Validation

- `scripts/public-booking.test.mjs`: server validation, multiple services, conflicts, schedule/day boundaries, minimum notice, horizon, timezone, request contact and cleanup after service insertion failure.
- `scripts/workflow-db.test.mjs`: existing database test includes multiple appointment services becoming distinct jobs on the same order.
- Development only `/__qa/booking`: synthetic studio and submission; no production writes or emails. `/__qa` includes the same screen.
- Run application/API TypeScript checks, the above tests, and Vite build before deploying.

## Current scope

Owner-confirmed requests, payment at the studio, no customer login. Self-service cancellation/rescheduling, deposits, studio photos and configurable booking policies are not included in this iteration. Appointment/client/vehicle writes use the existing API pattern rather than a database transaction; a failed services insert cleans the empty pending appointment. An interrupted request can leave a contact/vehicle or partial pending request, and retries are not idempotent. Follow-up hardening should move creation into one atomic RPC with an idempotency key and rate limiting.
