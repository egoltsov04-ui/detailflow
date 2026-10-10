# Detailflow — навигация и UI: отчёт проверки

Дата: 10 октября 2026.

## Изменения

- Единая панель OrderPanel: назначение и условия работ, пост, проверка, оплата и выдача. Канбан, календарь, Огляд, CRM и финансовые списки открывают эту панель. Список мастера показывает состояние работ; действия доступны внутри панели.
- Удалена вкладка «Список». В «Видано» остаются последние 7 дней; архив доступен через поиск шапки и историю клиента.
- Звернення: тёмные колонки, адаптивные фильтры, кнопка создания записи с клиентом, телефоном и источником. Статус «Успішне» сохраняется после успешного создания записи. Источник сохраняется в примечании записи, без новых полей модели.
- Общие Card, Table, Modal/Drawer, FormField, Tabs, PageHeader; формы переведены на общие оболочки. При подтверждении второе окно временно скрывает и блокирует первое, а после закрытия восстанавливает его.
- Склад: таблицы превращаются в карточки на телефоне; значения и единицы в одной ячейке; шаг минимума 1, для литров 0,5.
- CRM: поиск, фильтры «Давно не були» / «Нові» / «Постійні», таблица итогов, Drawer с контактами, тегами, автомобилями, историей и обращениями. Порог неактивности по умолчанию 90 дней, сохраняется для студии в этом браузере.
- Чек: выбор заказа сравнивает строковые идентификаторы корректно; скидка ограничена неоплаченным остатком, с пояснением при полной оплате. Проверены форма и готовый документ.
- Поддержка: сохранение тарифа делает upsert подписки; проверен сценарий одобренной новой студии без строки подписки.
- Забытые смены: настраиваемые лимиты смены/перерыва и конец рабочего дня, автоматическая пауза текущей работы, предупреждение владельцу за последние 7 дней. Проверка выполняется при обновлении кабинета и серверным обработчиком cron.
- Графики и расчёты аналитики не изменены. Схема изменена только для параметров и отметок автоматического закрытия смен; подписка исправлена функцией upsert.

## База

`055_ui_workflow_repairs.sql` выполнена в основном проекте Supabase `stxfbarigoutglfqqhwi`. SQL Editor: «Success. No rows returned».

## Проверки

| Ширина | Playwright |
|---|---|
| 375 px | 41 / 41 |
| 768 px | 41 / 41 |
| 1440 px | 41 / 41 |

Итого: **123 / 123**. Регрессионные проверки: **64 / 64**. TypeScript приложения и API: без ошибок. Production-сборка: успешна (остаётся предупреждение о размере PDF/fontkit chunk).

Отчёт Playwright: `playwright-report/html/index.html`; JSON: `playwright-report/results.json`; скриншоты: `playwright-report/artifacts/`.

В дополнительном тесте склада исправлен локатор: поле реализовано как текстовый ввод с десятичной клавиатурой, а не нативный spinbutton. Финальный полный прогон прошёл без ошибок.

Playwright запускает реальные компоненты приложения с изолированными ответами API и тестовыми данными. Проверены 22 маршрута владельца, 6 публичных страниц, кабинет мастера и поддержка. Проверки выявляют горизонтальное переполнение, несколько видимых модальных окон, обрезание текста в скрывающих переполнение контейнерах и ошибки JavaScript. Скриншоты сохраняются для страниц и ключевых открытых форм. Это эмуляция Chromium, а не проверка на физическом iPhone; сетевые сценарии с рабочими аккаунтами не подменяются утверждением о live end-to-end проверке.

SQL-тесты используют PGlite и реальные миграции: повторный запуск, разрешения, отсутствующая подписка, три причины закрытия смены, ограничение отработанного времени, повторный cron и отсутствие автоматического начисления зарплаты.

## Редиректы

Новый: `/app/work/list` → `/app/work/kanban` (307 в Vercel, замена URL внутри приложения).
Ранее введённые редиректы сохранены:

| Старый URL | Новый URL |
|---|---|
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
| `/app/work/list` | `/app/work/kanban` |

Параметр `?page=Список робіт` также открывает канбан. `/app` авторизованного владельца открывает `/app/overview`; маршруты входа мастера и поддержки сохранены.

## Изменённые файлы

- `.gitignore`
- `api/send-reminders.ts`
- `package-lock.json`
- `package.json`
- `playwright.config.ts`
- `scripts/ui-workflow-repairs.test.mjs`
- `src/AccessPortal.tsx`
- `src/AccountAccess.tsx`
- `src/App.tsx`
- `src/AttentionCenter.tsx`
- `src/BillingPage.tsx`
- `src/BookingRequests.tsx`
- `src/CashFlow.tsx`
- `src/Catalog.tsx`
- `src/ClientImport.tsx`
- `src/ClientWorkspace.tsx`
- `src/Invoices.tsx`
- `src/Leads.tsx`
- `src/MasterCabinet.tsx`
- `src/MasterProfileForm.tsx`
- `src/MediaArchive.tsx`
- `src/NotificationSettings.tsx`
- `src/OrderActions.tsx`
- `src/OrderModal.tsx`
- `src/PublicBookingPage.tsx`
- `src/Receipts.tsx`
- `src/Sales.tsx`
- `src/ServiceEditor.tsx`
- `src/ShiftLimits.tsx`
- `src/StaffCalendar.tsx`
- `src/StudioAdministrators.tsx`
- `src/StudioLoad.tsx`
- `src/StudioOverview.tsx`
- `src/StudioPosts.tsx`
- `src/StudioRecommendations.tsx`
- `src/StudioSetup.tsx`
- `src/SupportPortal.tsx`
- `src/SupportStudios.tsx`
- `src/Tasks.tsx`
- `src/TeamAccess.tsx`
- `src/TeamCompensation.tsx`
- `src/TeamSchedules.tsx`
- `src/TeamSkills.tsx`
- `src/WarehouseControls.tsx`
- `src/WorkOrders.tsx`
- `src/components/Dialogs.tsx`
- `src/components/UI.tsx`
- `src/components/ui.css`
- `src/data.ts`
- `src/dev/ServicePreview.tsx`
- `src/i18n/messages.ts`
- `src/lib/navigation.ts`
- `src/workflow/JobEvidence.tsx`
- `src/workflow/WorkflowUI.tsx`
- `src/workflow/model.ts`
- `src/workflow/useWorkflow.ts`
- `supabase/migrations/055_ui_workflow_repairs.sql`
- `tests/e2e/fixtures.ts`
- `tests/e2e/layout.spec.ts`
- `vercel.json`
- `docs/ui-workflow-audit.md` — этот отчёт.
