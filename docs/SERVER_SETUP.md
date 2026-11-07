# Сервер Detailflow: состояние и следующие шаги

Этот файл читает сессия Claude Code, которая работает на самом сервере (Remote Control). Работай по скиллу `detailflow-selfhost-infra` и его чек-листу из 20 пунктов.

## Сделано (2026-11-07, владелец вручную по инструкции)

- Contabo Cloud VPS 6, EU, Ubuntu 24.04, IPv4 `45.13.235.3`, IPv6 `2a02:c207:2373:5088::1/64`. Auto Backup выключен (бэкапы в B2). Цена в панели $10.80 в месяц: владелец проверяет, нет ли лишней платной опции.
- Система обновлена; `ufw` (открыты 22, 80, 443), `fail2ban`, `unattended-upgrades`, `tmux`, `git`, `curl`.
- Пользователь `deploy` с sudo без пароля, вход только по SSH-ключу владельца. Вход root и вход по паролю отключены (`/etc/ssh/sshd_config.d/00-detailflow.conf`).
- Claude Code установлен под `deploy`, репозиторий в `/srv/detailflow` (deploy key GitHub, только чтение), Remote Control запущен в `tmux` (сессия `claude`).
- Домен `detailflow.com.ua` (Hostiq.ua, до 07.11.2027), A-записи `@`, `api`, `staging`, `api-staging` на IP сервера заводятся в панели Hostiq.
- Домен `detailflow.com.ua` зарегистрирован 2026-11-07, NS у Cloudflare (`eva`, `graham`), Hostiq передаёт записи в Cloudflare, режим «DNS only» (серое облако), иначе Caddy не получит сертификат. На 2026-11-07 18:40 Киев записи в Cloudflare есть, но реестр `.com.ua` ещё не делегировал зону: `dig +short NS detailflow.com.ua` пусто.
- Backblaze B2: бакет `detailflowv1` (EU Central), lifecycle 90 дней, Object Lock 30 дней. Application Key ещё не создан.

## Следующие шаги, по порядку

Каждый шаг заканчивается проверкой; production только после подтверждения владельца в чате.

1. **Remote Control как служба.** Сделано 2026-11-07: `/etc/systemd/system/claude-remote.service` (User=deploy, `claude remote-control --name detailflow-server`), включён, стартует при загрузке. Переход с `tmux`: `sudo reboot` (или `tmux kill-session -t claude && sudo systemctl start claude-remote`), проверка `systemctl status claude-remote`.
2. **Docker.** Сделано 2026-11-07: Docker 29.9.3 и Compose v5.7.0 из репозитория Docker, `deploy` в группе `docker` (действует после нового входа), ротация логов в `/etc/docker/daemon.json` (10 МБ x 3).
3. **Файрвол.** Сделано: наружу слушают только 80 и 443 (общий Caddy, `deploy/selfhost/edge`), шлюз Supabase staging только на `127.0.0.1:8100` (Studio через SSH-туннель), pooler без портов. Проверить снаружи после DNS: `nmap -p 5432,6543,8000,8100,3000 45.13.235.3` должен показать закрыто.
4. **Staging-стек.** Сделано 2026-11-07: Supabase в `/srv/supabase-staging` (контейнеры `supabase-staging-*`, сеть `supabase-staging_default`, новые секреты, `.env` 600), схема и миграции 001-063 (45 таблиц, у всех RLS), pg_cron + pg_net + Vault и задача `detailflow-notifications`, API `detailflow-staging-api-1` (`/api/health` 200), фронтенд собран с `https://api-staging.detailflow.com.ua`, в `dist/` нет service-ключа. Осталось: сертификаты (ждут делегирования DNS, Caddy повторяет сам), Auth SMTP (данные от владельца), аккаунт support, вход и заказ в браузере.
5. **Проверки staging:** вход, заказ, онлайн-запись, фото, pg_cron + Vault, push и письма (ключи SendPulse и VAPID через владельца), заголовки, HTTPS. Добавить в Caddy HSTS и Content-Security-Policy.
6. **Бэкапы:** владелец создаёт Application Key только к `detailflowv1` (Read and Write), ключ сразу в `/etc/detailflow/backup.env` и rclone; учения восстановления с настоящим B2 по `docs/BACKUPS.md`, запись в журнал.
7. **Мониторинг:** внешняя проверка `https://detailflow.com.ua/` и `/api/health` (UptimeRobot или Better Stack) с уведомлениями владельцу; место на диске.
8. **Production-стек** рядом со staging, затем перенос данных (этап 8 скилла) и переключение.
