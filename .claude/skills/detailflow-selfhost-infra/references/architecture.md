# Целевая архитектура

## Сервер

Contabo Cloud VPS 6, EU, Ubuntu LTS, 6 vCPU, 12 GB RAM, 100 GB NVMe. Всё в Docker Compose.

```text
Интернет
  |
Caddy (80/443, автоматический HTTPS)
  |-- app.<домен>   -> статика Vite (папка dist)  и  /api/* -> detailflow-api (Node)
  |-- api.<домен>   -> Kong (шлюз Supabase): /auth, /rest, /storage, /realtime
  |
Docker-сеть
  |-- detailflow-api   Node-сервер с обработчиками из api/
  |-- Supabase: db (Postgres), kong, auth (GoTrue), rest (PostgREST), realtime, storage, meta, studio (закрыт)
```

## Хранение фото

Contabo Object Storage (S3-совместимое, около 2.49 EUR за 250 GB), приватный бакет, доступ через подписанные ссылки. Supabase Storage настраивается на S3-бэкенд (`STORAGE_BACKEND=s3`, endpoint, ключи, регион). Совместимость Contabo S3 с Supabase Storage в официальных примерах не указана: проверить на staging загрузкой, чтением по подписанной ссылке и удалением до миграции файлов. Если не работает, запасной вариант: файловый бэкенд на диске сервера плюс бэкап, или другой S3-провайдер.

## Бэкапы

- Ежедневно: `pg_dump` базы, шифрование (age), выгрузка в Backblaze B2 (регион EU, Amsterdam, около $6.95 за TB, первые 10 GB бесплатно).
- Раз в неделю: копия бакета с фото (rclone, шифрование crypt или зеркало с версионированием).
- Хранить 7 ежедневных, 4 еженедельных, 3 ежемесячных копии.
- Ключ шифрования хранить отдельно от сервера (менеджер паролей и офлайн копия).
- Раз в месяц проверка восстановления на чистой базе, результат записывать.

## Почта

SMTP для Supabase Auth (приглашения, сброс пароля) и SendPulse API для уведомлений приложения. Домен: SPF, DKIM, DMARC. Проверить доставляемость на Gmail и Ukr.net.

## Окружения

- Локально (WSL2 + Docker Desktop): полный стек для разработки и E2E.
- Staging: отдельный стек на том же сервере или временный, отдельные ключи и домен `staging.<домен>`. Не пересекается с боевой базой.
- Production: основной стек.

## Переменные окружения (минимум)

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `APP_URL`, SendPulse, VAPID public/private, WayForPay (если включено), S3 endpoint/ключи, B2 ключи, пароль Postgres, `JWT_SECRET`. Сгенерировать новые секреты для нового стека, не переносить старые.
