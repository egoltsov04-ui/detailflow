# Сервер Detailflow: состояние и следующие шаги

Этот файл читает сессия Claude Code, которая работает на самом сервере (Remote Control). Работай по скиллу `detailflow-selfhost-infra` и его чек-листу из 20 пунктов.

## Сделано (2026-11-07, владелец вручную по инструкции)

- Contabo Cloud VPS 6, EU, Ubuntu 24.04, IPv4 `45.13.235.3`, IPv6 `2a02:c207:2373:5088::1/64`. Auto Backup выключен (бэкапы в B2). Цена в панели $10.80 в месяц: владелец проверяет, нет ли лишней платной опции.
- Система обновлена; `ufw` (открыты 22, 80, 443), `fail2ban`, `unattended-upgrades`, `tmux`, `git`, `curl`.
- Пользователь `deploy` с sudo без пароля, вход только по SSH-ключу владельца. Вход root и вход по паролю отключены (`/etc/ssh/sshd_config.d/00-detailflow.conf`).
- Claude Code установлен под `deploy`, репозиторий в `/srv/detailflow` (deploy key GitHub, только чтение), Remote Control запущен в `tmux` (сессия `claude`).
- Домен `detailflow.com.ua` (Hostiq.ua, до 07.11.2027), DNS у Hostiq: A-записи `@`, `api`, `staging`, `api-staging` на IP сервера (проверить, что разошлись: `dig +short detailflow.com.ua`).
- Backblaze B2: бакет `detailflowv1` (EU Central), lifecycle 90 дней, Object Lock 30 дней. Application Key ещё не создан.

## Следующие шаги, по порядку

Каждый шаг заканчивается проверкой; production только после подтверждения владельца в чате.

1. **Remote Control как служба.** systemd-юнит под `deploy`, чтобы сессия переживала перезагрузку, вместо `tmux`.
2. **Docker** из официального репозитория Docker, `deploy` в группе `docker`.
3. **Важно про файрвол:** Docker публикует порты в обход `ufw`. Наружу открыт только Caddy (80, 443). У стеков Supabase убрать публикацию портов gateway (8000) и pooler (5432, 6543) или привязать к `127.0.0.1`. После запуска проверить снаружи, что эти порты закрыты.
4. **Staging-стек:** Supabase (`deploy/selfhost/README.md`, `self-hosted/v0.8.4`) в `/srv/supabase-staging` с уникальными именами контейнеров и сетью, новые секреты; миграции 001-063; приложение из `deploy/selfhost` с `APP_SITE=staging.detailflow.com.ua`, `SUPABASE_SITE=api-staging.detailflow.com.ua`. Студия staging, Auth SMTP, Site URL.
5. **Проверки staging:** вход, заказ, онлайн-запись, фото, pg_cron + Vault, push и письма (ключи SendPulse и VAPID через владельца), заголовки, HTTPS. Добавить в Caddy HSTS и Content-Security-Policy.
6. **Бэкапы:** владелец создаёт Application Key только к `detailflowv1` (Read and Write), ключ сразу в `/etc/detailflow/backup.env` и rclone; учения восстановления с настоящим B2 по `docs/BACKUPS.md`, запись в журнал.
7. **Мониторинг:** внешняя проверка `https://detailflow.com.ua/` и `/api/health` (UptimeRobot или Better Stack) с уведомлениями владельцу; место на диске.
8. **Production-стек** рядом со staging, затем перенос данных (этап 8 скилла) и переключение.
