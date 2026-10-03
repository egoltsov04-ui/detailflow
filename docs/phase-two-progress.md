# Phase two — 2026-10-04

Domain, paid hosting and production email remain paused by the owner.

## Implemented

- Finance → Studio analytics: inclusive dates in the studio timezone, up to three years.
- Completed order value, average order value, repeat customer share and historical customer value through the selected end date. Orders are counted once, independent of job count. This is not cash revenue or a predictive LTV model.
- Approved job value and active timer hours per specialist. Hourly value excludes jobs without measured time.
- Planned versus actual minutes by service; plans are captured for new catalog jobs and variants. Legacy jobs have no invented planned time. Existing snapshots survive catalog duration edits.
- Late completions against due dates; missing deadlines excluded from the denominator.
- Monthly order totals and a weekday/hour demand heatmap, excluding cancelled bookings. Counts are not capacity utilization.
- Native XLSX export with explicit string cells to prevent formula injection; downloadable landscape PDF with embedded Ukrainian font and multi-page tables.
- Equal-length previous-period comparisons and monthly bars, including zero months.
- Distinct orders, average attributable order value and cancellations per specialist. Cancellation attribution does not imply fault.
- Optional manual planned minutes; appointment-derived estimates when the source is unambiguous. Explicit plans are preserved.
- Support: subscription history inside the tariff dialog, reason, previous/new plan, expiry, time and operator. Twenty rows per page; restricted to active support accounts.

## Deployment

Apply migrations 048 and 049 (or `supabase/deploy/phase_two_048_049.sql`) before deploying the frontend. They add one nullable snapshot column, a snapshot trigger and two permission-checked report functions; no customer rows are deleted and no subscription is extended.

Migrations 048–049 applied successfully to the main Supabase project on 2026-10-04 after explicit approval. Frontend publication follows the same release.

## Completion validation

- Migration 050 applied successfully to the main database on 2026-10-04; no customer records deleted or subscriptions extended.
- Database role tests cover owner, finance-enabled administrator, administrator without finance permission and master. These are automated database tests, not interactive sign-ins as each production user.
- 62 regression checks covered; the final failing fixture reused an existing idempotency ID and was corrected and rerun successfully. Frontend/API TypeScript and production build passed.
- 10,000-order fixture aggregates all 10,001 visits correctly (about 125–202 ms locally; not a production latency guarantee). Client display starts at 50 rows; exports include all rows.
- XLSX verified with openpyxl; PDF read and rendered independently, including Ukrainian characters and the final row of a 10-page report. Mobile 390 px and English/Ukrainian report UI inspected.

Historical jobs without a recorded plan or timer retain missing values. The report does not invent historical duration, predict LTV or equate completed work value with cash profit. Paid infrastructure and production email remain paused.
