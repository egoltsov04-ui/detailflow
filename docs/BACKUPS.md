# Бэкапы Detailflow (self-hosted, Backblaze B2)

Что сохраняется: вся база Supabase (студии, клиенты, заказы, пользователи и пароли Auth, метаданные Storage, расписание pg_cron, секреты Vault) и файлы Storage (фото работ). Схемы `realtime` и `_realtime` не сохраняются: там только живые сообщения каналов, сервис создаёт их сам.

Шифрование двойное: дамп шифруется `age` до выгрузки, а rclone `crypt` шифрует содержимое, имена файлов и папок. В B2 не видно ни данных, ни id студий, ни путей фото.

Скрипты: `scripts/weekly-encrypted-backup.mjs` (бэкап) и `scripts/restore-backup.mjs` (восстановление). Оба по умолчанию только показывают, что сделают; реальное действие с флагом `--apply`. `scripts/backup-preflight.mjs` проверяет настройки и наличие `docker`, `age`, `rclone`.

## Что делает владелец (один раз)

Сделано 2026-11-07: бакет `detailflowv1`, приватный, `s3.eu-central-003.backblazeb2.com`, шифрование B2 включено, Lifecycle 90 дней до скрытия и 1 день до удаления, Object Lock со сроком 30 дней. Application Key ещё не создан: создаётся при настройке сервера.

1. **Backblaze B2:** отдельный приватный бакет только для бэкапов, регион EU. Application Key с доступом только к этому бакету.
2. **Хранение копий:** в настройках бакета Lifecycle Rule на весь бакет: скрывать файлы через 90 дней, удалять скрытые через 1 день. Префикс указать нельзя: имена зашифрованы. Object Lock на 30 дней: даже с ключом сервера копию нельзя удалить раньше срока.
3. **Ключи, хранить в менеджере паролей и офлайн, не на сервере:**
   - приватный ключ `age` (файл от `age-keygen`);
   - два пароля rclone crypt;
   - файл `.env` стека Supabase. В нём `JWT_SECRET`, ключи API и `VAULT_ENC_KEY`: без того же `VAULT_ENC_KEY` секреты Vault (адрес и секрет расписания) не расшифруются, и их придётся записать заново.

Без приватного ключа `age` или паролей rclone бэкап не восстановить никак.

## Настройка на сервере

```bash
age-keygen -o age-key.txt            # публичная часть (age1...) идёт в AGE_RECIPIENT, сам файл уносим с сервера
rclone config                         # remote "b2": type b2, key id и key из B2
                                      # remote "backup": type crypt, remote = b2:<бакет>, filename_encryption = standard, directory_name_encryption = true
```

`/etc/detailflow/backup.env` (права 600):

```dotenv
BACKUP_ENV=production
ACKNOWLEDGE_PRODUCTION_BACKUP=YES
BACKUP_DB_CONTAINER=supabase-db
AGE_RECIPIENT=age1...
RCLONE_BACKUP_REMOTE=backup
# только в еженедельной задаче: папка Storage стека (файловый бэкенд) или rclone-путь к S3-бакету с фото
BACKUP_STORAGE_SOURCE=/srv/supabase/volumes/storage
```

Расписание (crontab root): база каждый день, база и фото раз в неделю.

```cron
17 3 * * *  cd /srv/detailflow && set -a && . /etc/detailflow/backup.env && set +a && BACKUP_STORAGE_SOURCE= node scripts/weekly-encrypted-backup.mjs --apply >> /var/log/detailflow-backup.log 2>&1
47 3 * * 0  cd /srv/detailflow && set -a && . /etc/detailflow/backup.env && set +a && node scripts/weekly-encrypted-backup.mjs --apply >> /var/log/detailflow-backup.log 2>&1
```

## Восстановление

Только в **свежий** стек: скрипт отказывается работать, если в базе уже есть таблицы Detailflow.

1. Поднять стек Supabase с сохранённым `.env` (`docker compose up -d`), дождаться `healthy` у auth и storage.
2. Положить ключ `age` во временный файл, настроить rclone, как выше.
3. Найти нужную копию: `rclone lsd backup:detailflow-backups/production`.
4. Проверить и восстановить:
   ```bash
   RESTORE_DB_CONTAINER=supabase-db AGE_IDENTITY=./age-key.txt RCLONE_BACKUP_REMOTE=backup RESTORE_STORAGE_TARGET=/srv/supabase/volumes/storage node scripts/restore-backup.mjs detailflow-backups/production/<время>
   ```
   Затем то же самое с `--apply`. Скрипт сам перезагружает схему PostgREST и печатает время и число студий, пользователей и файлов.
5. Поднять приложение (`deploy/selfhost`), проверить вход, заказ, онлайн-запись, фото. Удалить файл ключа.

Раз в месяц повторять восстановление на отдельном стеке и дописывать строку в журнал ниже.

## Журнал проверок восстановления

| Дата | Где | Объём | Время | Результат |
|---|---|---|---|---|
| 2026-11-07 | локальный self-hosted стек (`self-hosted/v0.8.4`, Postgres 17.6), B2 заменён локальной папкой за тем же rclone crypt | дамп 0.7 МБ, 2 студии, 2 пользователя, 1 фото | чистый стек 13 с, восстановление 1 с | Удалены база и файлы, поднят чистый стек, восстановлено. Владелец входит со старым паролем, RPC и онлайн-запись работают, фото открывается по подписанной ссылке, pg_cron и секреты Vault на месте. Найдено и исправлено: служебные схемы realtime ломали восстановление, PostgREST требовал перезагрузки схемы. |

Настоящий B2 и время на реальном объёме ещё не проверены: первая строка с B2 появится после создания бакета.
