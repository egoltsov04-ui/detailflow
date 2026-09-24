# Compensation and dropdown checks

Base compensation is persisted in `staff_profiles.compensation_percent` and `staff_profiles.hourly_rate`. Service overrides are in `staff_service_compensation`. The editor now displays confirmed saved values separately from drafts. Base updates are tenant-scoped and require a returned row; failed requests keep the saved summary unchanged. Clearing both service fields removes the override and restores inheritance.

Browser checks on the local `/__qa` fixture (no production database requests):

- Save a base percentage, change sections, reopen: persisted fixture value loads again.
- Switch between masters with different percentages, no percentage, and hourly rates.
- Save zero, then clear the percentage: zero and unset stay distinct.
- Save a service percentage: the summary and calculation update for that master.
- Inject a save failure: visible error, prior saved conditions preserved, draft retained.
- Dropdown mouse selection, keyboard arrows/Enter, search, Escape inside a modal, required-field validation and form submission.
- 390 px mobile and 1440 px desktop: saved summary readable; dropdown fits viewport.

TypeScript client/API checks, seven existing regression tests, and production build passed. Production Supabase writes and the final Vercel deployment have not been verified through a live account.
