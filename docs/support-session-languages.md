# Support, languages and session restoration

Applied 2026-10-03: migration 047_support_studio_search.sql in the primary Supabase project stxfbarigoutglfqqhwi. SQL Editor returned success.

- Support can search studio IDs, names, slugs, emails and phones. Pasting a Telegram renewal request extracts its UUID before searching. Permissions remain restricted to active support users.
- Studio cards show the full copyable ID, actual access expiration, plan, active staff count and contacts. Subscription editing retains its audit reason, plan limit guard and remaining paid days.
- The supported interface and push languages are Ukrainian and English. Legacy Russian preferences fall back to Ukrainian. User-entered content is preserved.
- Existing sessions persist and refresh using Supabase auth. The home page restores the workspace for a signed-in user; public booking and authentication callback routes remain separate. Explicit sign-out wins over a pending session read. Support still uses /admin.
- QA: 56 automated checks, client/API TypeScript checks, production build; Ukrainian/English support UI, mobile subscription form, local renewal and pasted-message search checked in browser.
- No real subscription was extended and no email was sent during these checks.
