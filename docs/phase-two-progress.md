# Phase two — 2026-10-04

Domain, paid hosting and production email remain paused by the owner.

## Implemented

- Finance → Studio analytics: inclusive dates in the studio timezone, up to three years.
- Completed order value, average order value, repeat customer share and historical customer value through the selected end date. Orders are counted once, independent of job count. This is not cash revenue or a predictive LTV model.
- Approved job value and active timer hours per specialist. Hourly value excludes jobs without measured time.
- Planned versus actual minutes by service; plans are captured for new catalog jobs and variants. Legacy jobs have no invented planned time. Existing snapshots survive catalog duration edits.
- Late completions against due dates; missing deadlines excluded from the denominator.
- Monthly order totals and a weekday/hour demand heatmap, excluding cancelled bookings. Counts are not capacity utilization.
- Excel-compatible SpreadsheetML `.xml` export, with explicit string cells to prevent formula injection. Print/PDF uses the browser print dialog.
- Support: subscription history inside the tariff dialog, reason, previous/new plan, expiry, time and operator. Twenty rows per page; restricted to active support accounts.

## Deployment

Apply migrations 048 and 049 (or `supabase/deploy/phase_two_048_049.sql`) before deploying the frontend. They add one nullable snapshot column, a snapshot trigger and two permission-checked report functions; no customer rows are deleted and no subscription is extended.

Migrations 048–049 applied successfully to the main Supabase project on 2026-10-04 after explicit approval. Frontend publication follows the same release.

## Remaining acceptance / scope

- Production verification with owner, finance-enabled administrator and master accounts.
- Native XLSX export and saved PDF layout verification across long multi-page reports; current Excel export is XML, not XLSX.
- Per-master cancellations and average attributable order value, richer monthly charts and comparison with the preceding period.
- Plan snapshots for non-catalog/manual and appointment-derived jobs where an unambiguous source duration is unavailable.
- Analytics data volume/performance acceptance on large studios; customer rows currently aggregate the selected period into one report.

Phase two is in progress, not declared complete.
