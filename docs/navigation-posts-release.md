# Навігація, Огляд і пости — 10.10.2026

## Зміни

- Вісім основних розділів. Роботи: календар, канбан, список і заявки онлайн-запису. Клієнти: CRM, звернення, фотоархів. Фінанси: чеки/рахунки, оплати, витрати, продажі. Команда: майстри, зміни/зарплата, завдання. Налаштування: студія, послуги, тариф, пости.
- Огляд: надходження сьогодні/за сім днів, зайняті пости, потребують уваги, розклад сьогодні. Кнопки передають період, статус, прострочення або зайняті пости у відповідний розділ.
- Календар, канбан і список показують спільні замовлення. Календар зберігає також записи, які ще не перетворені на замовлення; список розкриває ті самі дії та перевірку робіт.
- На телефоні: п’ять кнопок унизу; для адміністратора без фінансових прав фінанси приховані. У майстра: «Мій день», «Мої роботи», «Зміни й зарплата». Профіль і журнал змін залишаються доступними.
- Аналітика збережена: графіки, формули, журнал, рекомендації та «Як розраховані показники». Форми операцій перенесені у Фінанси; зарплат — у Команду. Посилання з Огляду задають період.
- Раніше опубліковані виправлення тарифних карток, мобільного складу, знижки та переносу тексту чека збережені.

## Пости

Міграцію `054_studio_posts.sql` виконано в основному Supabase `stxfbarigoutglfqqhwi`; перевірено таблицю, RLS, поля замовлення та функцію призначення.

Налаштування → Пости студії: задайте кількість (0–100), збережіть, за потреби перейменуйте. У картці замовлення виберіть пост. Зайнятий пост недоступний для іншого активного замовлення; прибрати зайнятий пост не можна.

Час початку фіксується при переході роботи у виконання. План береться із тривалостей робіт, включно з варіантом послуги; якщо тривалість невідома, показується пояснення. Таймер — календарний час від початку, включно з паузами; він не змінює облік робочого часу й зарплати. Завершені/видані/скасовані замовлення звільняють пост. Дані оновлюються кожні 5 секунд на видимій вкладці та при поверненні до вікна, таймер — щосекунди.

## Перевірки

- 63 автоматичних тести успішні; TypeScript клієнта/API й production-збірка успішні.
- У тестовій PostgreSQL перевірено повторне застосування міграції, тривалість варіантів, конфлікт зайнятого поста, заборону видалення зайнятого поста, права майстра, початок/паузу/відновлення роботи без скидання часу.
- Браузер: синтетичні дані, 320/390/1440 px, українська й англійська, Огляд/пости, календар/порожній день, розкриття списку, нижнє меню, три вкладки майстра. Реальні замовлення під час UI-перевірки не змінювалися.
- Старий `/app/orders?status=review` відкриває `/app/work/kanban?status=review`. Гостьовий доступ залишився закритим формою входу.

## Змінені файли

- `src/App.tsx`
- `src/components/AppNavigation.tsx`
- `src/lib/navigation.ts`
- `src/lib/useAppNavigation.ts`
- `src/navigation.css`
- `src/StudioOverview.tsx`
- `src/StudioPosts.tsx`
- `src/WorkOrders.tsx`
- `src/FinanceHub.tsx`
- `src/workflow/WorkflowUI.tsx`
- `src/i18n/messages.ts`
- `src/dev/ServicePreview.tsx`
- `supabase/migrations/054_studio_posts.sql`
- `scripts/navigation.test.mjs`
- `scripts/catalog-orders.test.mjs`
- `package.json`
- `vercel.json`

## Редиректи

Серверні редиректи 307 зберігають query-параметри. Клієнт також підтримує старий `?page=…`, `/app`, історію Back/Forward та закладки. Публічний запис, вхід, реєстрація й адмінський вхід не змінені.

| Старий URL | Новий URL |
| --- | --- |
| `/overview` | `/app/overview` |
| `/calendar` | `/app/work/calendar` |
| `/orders` | `/app/work/kanban` |
| `/work-orders` | `/app/work/kanban` |
| `/clients` | `/app/clients` |
| `/leads` | `/app/clients/requests` |
| `/media` | `/app/clients/media` |
| `/finance` | `/app/finance/payments` |
| `/payments` | `/app/finance/payments` |
| `/expenses` | `/app/finance/expenses` |
| `/sales` | `/app/finance/sales` |
| `/invoices` | `/app/finance/invoices` |
| `/receipts` | `/app/finance/documents` |
| `/team` | `/app/team` |
| `/tasks` | `/app/team/tasks` |
| `/warehouse` | `/app/warehouse` |
| `/inventory` | `/app/warehouse` |
| `/analytics` | `/app/analytics` |
| `/reports` | `/app/analytics` |
| `/settings` | `/app/settings` |
| `/services` | `/app/settings/services` |
| `/billing` | `/app/settings/billing` |
| `/booking-requests` | `/app/work/requests` |
| `/app/calendar` | `/app/work/calendar` |
| `/app/orders` | `/app/work/kanban` |
| `/app/work-orders` | `/app/work/kanban` |
| `/app/leads` | `/app/clients/requests` |
| `/app/media` | `/app/clients/media` |
| `/app/finance` | `/app/finance/payments` |
| `/app/payments` | `/app/finance/payments` |
| `/app/expenses` | `/app/finance/expenses` |
| `/app/sales` | `/app/finance/sales` |
| `/app/invoices` | `/app/finance/invoices` |
| `/app/receipts` | `/app/finance/documents` |
| `/app/tasks` | `/app/team/tasks` |
| `/app/inventory` | `/app/warehouse` |
| `/app/reports` | `/app/analytics` |
| `/app/services` | `/app/settings/services` |
| `/app/billing` | `/app/settings/billing` |
| `/app/booking-requests` | `/app/work/requests` |
