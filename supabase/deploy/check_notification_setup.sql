-- Read-only diagnostics: never return secret values, HTTP headers or job commands.
do $$
declare has_cron boolean; has_net boolean; has_secret boolean:=false;
begin
 select exists(select 1 from pg_extension where extname='pg_cron') into has_cron;
 select exists(select 1 from pg_extension where extname='pg_net') into has_net;
 if to_regclass('vault.decrypted_secrets') is not null then
  execute 'select exists(select 1 from vault.decrypted_secrets where name=$1 and length(decrypted_secret)>=20)'
   into has_secret using 'detailflow_cron_secret';
 end if;
 raise notice 'pg_cron=%, pg_net=%, notification_secret_present=%',has_cron,has_net,has_secret;
 if has_cron then
  perform 1 from cron.job where jobname='detailflow-notifications' and active;
  raise notice 'notification_schedule_active=%',found;
 else
  raise notice 'notification_schedule_active=false';
 end if;
end $$;
