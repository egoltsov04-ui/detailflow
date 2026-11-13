#!/usr/bin/env python3
# Daily disk check: email the owner through the Auth SMTP (SendPulse) when the root disk is fuller than the limit.
# Usage: ALERT_EMAIL=<owner address> detailflow-disk-alert [limit_percent]   (default 80; pass 1 to send a test email)
# The address lives in the server's crontab, not in the repository.
import os, shutil, smtplib, socket, sys
from email.message import EmailMessage
limit = int(sys.argv[1]) if len(sys.argv) > 1 else 80
total, used, free = shutil.disk_usage('/')
percent = round(used * 100 / total)
if percent < limit:
    sys.exit(0)
env = {}
for line in open('/srv/supabase-production/.env'):
    if '=' in line and not line.startswith('#'):
        k, v = line.rstrip('\n').split('=', 1); env[k] = v.strip('"')
msg = EmailMessage()
msg['Subject'] = f'Detailflow: диск сервера заполнен на {percent}%'
msg['From'] = f"Detailflow <{env['SMTP_ADMIN_EMAIL']}>"
msg['To'] = os.environ['ALERT_EMAIL']
msg.set_content(f"Сервер {socket.gethostname()} (45.13.235.3): занято {percent}% диска, свободно {free // 2**30} ГБ из {total // 2**30} ГБ.\n"
                f"Порог {limit}%. Если диск заполнится, остановятся база и бэкапы. Напишите Claude на сервере: «освободи место на диске».")
with smtplib.SMTP(env['SMTP_HOST'], int(env['SMTP_PORT']), timeout=30) as s:
    s.starttls(); s.login(env['SMTP_USER'], env['SMTP_PASS']); s.send_message(msg)
print(f'alert sent: {percent}%')
