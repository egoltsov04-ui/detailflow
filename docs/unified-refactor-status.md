# Detailflow: рефакторинг A–I

11 октября 2026. Основание: единый пользовательский промпт `6a83b309-b5cf-4dcc-bb4d-dfb9da0243b1`.

## Статус

Опубликована версия `4fb2784`. После подтверждения пользователя миграции 056–059 применены в основной базе `stxfbarigoutglfqqhwi`. Vercel сообщил успешный production-деплой `GTZuYDJ3ji1ejxkmgBveC3wbopxw`; новый лендинг и тарифы проверены на `https://detailflow-xi.vercel.app/`.

Контрольный SQL подтвердил: RLS таблицы payments включён, чтение разрешено только is_support_user(), служебные функции тарифов закрыты для authenticated, функции Solo и сводки поддержки установлены. В редакторе использован вариант «Run and enable RLS». Все активные профили сохранены. Полноценные действия под реальными аккаунтами владельца/мастера/поддержки после деплоя не выполнялись без их сессий; они проверены локальными сценариями.

## Выполнено

- **A–D:** проверены общие компоненты, восемь разделов, редиректы, OrderPanel, Огляд/посты, обращения и CRM. Исправлен шаг минимального остатка также при создании товара: 1, для литров 0,5.
- **E:** этапы работы мастера, общий с постами таймер, причина возврата и уведомление, раздельные «Мій день» и «Мої роботи». Фото/видео: миниатюры, полноэкранный просмотр, замена/удаление, прогресс, ошибки формата/размера/квоты. Главная кнопка не перекрывается мобильной навигацией. Закрытие смены по расписанию, без него через 12 часов; перерыв до 180 минут. Параметры редактируются.
- **F:** таблица студий, поиск/фильтры/сортировка/пагинация, исключение внутренних студий, очередь заявок с выбранным тарифом и журналом. Оплаты +1/+3/+12 месяцев с защитой от повторного начисления; нулевая сумма требует комментарий. История, цена засновника, сводка, фильтр приоритетной поддержки. Бесплатное продление не считается платной конверсией. TOTP, повторный пароль, блокировка после бездействия.
- **G:** Solo 390 / Студія 1190 / Pro 2490 грн, одна конфигурация лимитов и серверные проверки. Solo: аккаунт владельца → начало → завершение → оплата, без зарплаты и проверки; собственный график в настройках. Закрытые модули объясняют ограничение и ведут в Telegram. Прямой доступ пользователей к служебным функциям чужих тарифов/мест закрыт.
- **H–I:** семь секций лендинга, настоящие Playwright-скриншоты демо, общие карточки тарифов, скрытое сохранение выбранного тарифа, UK/EN. Точки из data-nav-label, IntersectionObserver, клавиатура, reduced motion, резерв места справа от 1024 px.

Формулы и графики студийной «Аналітики» сохранены. В её RPC добавлена только проверка тарифного доступа. Эквайринг не подключён: оплата через менеджера.

## Миграции

Единый транзакционный пакет: [unified_056_059.sql](../supabase/deploy/unified_056_059.sql).

| Файл | Содержание |
|---|---|
| 056_master_workspace.sql | Материалы, возврат, уведомления, удаление отсоединённых файлов |
| 057_support_workspace.sql | 2FA, payments с RLS, заявки, сводка, журнал |
| 058_shift_defaults.sql | 12 часов / 180 минут, закрытие по расписанию |
| 059_plans_solo.sql | Тарифы/лимиты, Solo, цена засновника, выбранный тариф |

[Общий откат](../supabase/rollback/unified_056_059.sql): 059 → 058 → 057 → 056, вместе с предыдущей версией приложения. Платежи, медиа и аудит сохраняются; новые колонки не удаляются. Индивидуальные настройки смен не возвращаются автоматически. Применение, повторный запуск, откат отдельных файлов и общего пакета проверены на PGlite.

Генератор: `node scripts/build-unified-refactor.mjs`. Источник параметров — `src/lib/plans.ts`; после будущей смены конфигурации необходимо также применить обновлённый SQL на сервере.

## Соответствие тарифов

| До | После | Цена до конца оплаченного периода |
|---|---|---|
| Start | Студія | 690 грн |
| Studio, ≤5 профилей и ≤3 администраторов | Студія | 1490 грн |
| Studio, выше лимитов | Pro | 1490 грн |
| Pro | Pro | 2990 грн |

Профили не деактивируются. Старый Start выше лимитов также получает Pro. Первоначальное сопоставление консервативно учитывает все активные профили; дальнейшее использование мест исключает владельцев/администраторов, кроме владельца Solo.

Результат в основной базе: **Boss: Start → Студія, 2 профиля**; **DetailTest: Pro → Pro, 1 профиль**; **Detailflow Support: внутренняя студия без подписки**. Количество активных профилей совпало с проверкой до миграции. До обновления у внешних студий trialing, оплаченного периода не было.

## Проверки

Production build и TypeScript клиента/API проходят. Полный браузерный прогон: 171/171; дополнительные медиа/Solo: 6/6. Финальный повтор изменённых сценариев: 54/54 (18 на каждую ширину), `.tooling/final-ui.log`. Регрессии: 66/66, `.tooling/final-regression.log`.

| Ширина | Полный прогон | Дополнительные медиа/Solo | Проверено |
|---|---:|---:|---|
| 375 px | 57/57 | 2/2 | владелец, мастер, /admin, лендинг и формы |
| 768 px | 57/57 | 2/2 | владелец, мастер, /admin, лендинг и формы |
| 1440 px | 57/57 | 2/2 | владелец, мастер, /admin, лендинг и формы |

Проверены редиректы, переполнение, обрезание текста и наложение модалок. Артефакты полного прогона — `.tooling/unified-e2e-report/`, последнего — `playwright-report/`. WebP демо — `public/demo/`.

## Сохранённые редиректы

| Старый адрес | Новый адрес |
|---|---|
| /app/work/list | /app/work/kanban |
| /app, /overview | /app/overview |
| /calendar | /app/work/calendar |
| /orders, /work-orders | /app/work/kanban |
| /booking-requests | /app/work/requests |
| /clients | /app/clients |
| /leads | /app/clients/requests |
| /media | /app/clients/media |
| /finance, /payments | /app/finance/payments |
| /expenses, /sales, /invoices | /app/finance/expenses, /app/finance/sales, /app/finance/invoices |
| /receipts | /app/finance/documents |
| /team, /tasks | /app/team, /app/team/tasks |
| /warehouse, /inventory | /app/warehouse |
| /analytics, /reports | /app/analytics |
| /settings, /services, /billing | /app/settings, /app/settings/services, /app/settings/billing |

Также сохраняются старые адреса с префиксом `/app` и `?page=`. Solo по прямому адресу закрытого модуля получает экран смены тарифа. Реестр — `src/lib/navigation.ts`, в этой итерации маршруты не удалялись.

## Ограничения

- Браузерные тесты используют демо-ответы API; SQL/RLS проверены отдельно движком PostgreSQL PGlite. После выпуска остаётся проверка настоящего Supabase Storage и физического телефона.
- TOTP поддержки пользователь настраивает при первом входе после выпуска.
- Домен, рабочая почта и автоматическая оплата остаются отложенными.
- Ранее существовавшие экспериментальные файлы intelligence и миграция 053 в этот набор изменений не входят.

## Изменённые файлы

- Кабинеты: `src/App.tsx`, `src/AccessPortal.tsx`, `src/TeamSchedules.tsx`, `src/ShiftLimits.tsx`, `src/NotificationSettings.tsx`, `src/components/PushControls.tsx`, `src/workflow/{WorkflowUI,MasterJobCard,SoloJobCard,JobEvidence}.tsx`.
- Поддержка: `src/{SupportPortal,SupportStudios,SupportSecurity,SupportSummary,SupportTimeline}.tsx`, `src/support.css`.
- Тарифы: `src/lib/plans.ts`, `src/lib/PlanContext.tsx`, `src/BillingPage.tsx`, `src/billing.css`, `scripts/build-plan-config.mjs`, `supabase/plan_configuration.sql`.
- Лендинг: `src/LandingPage.tsx`, `src/components/LandingSectionNav.tsx`, `src/landing.css`, `public/demo/{overview,booking,master,review,receipt}.webp`.
- Общие стили/языки: `src/navigation.css`, `src/workflow/workflow.css`, `src/i18n/{core,messages}.ts`.
- API: `api/send-reminders.ts`, `api/staff/{invite,administrator}.ts`, `api/wayforpay/checkout.ts`.
- БД: четыре миграции 056–059, соответствующие откаты, deploy/rollback-пакеты, `scripts/build-unified-refactor.mjs`.
- Проверки: `scripts/{master-support,plan-entitlements,staff-mail,platform-web,billing-access,catalog-orders,phase-one,platform-upgrade,ui-workflow-repairs,workflow-db,workflow-recovery}.test.mjs`, `tests/e2e/{fixtures,layout.spec,master-support.spec,media-solo.spec,plans-landing.spec,demo-capture.spec}.ts`, `package.json`.
- Этот отчёт.
