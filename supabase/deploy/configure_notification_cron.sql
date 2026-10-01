-- Run AFTER the phase-one deployment, in the main Supabase project.
-- First enable pg_cron and pg_net in Database > Extensions.
-- In Vault, save the EXISTING Vercel CRON_SECRET as detailflow_cron_secret.
-- This file does not create, print or replace any secret.
begin;
do $$begin
 if not exists(select 1 from pg_extension where extname='pg_cron')
 or not exists(select 1 from pg_extension where extname='pg_net') then
  raise exception 'Enable pg_cron and pg_net in Supabase first';
 end if;
 if not exists(select 1 from vault.decrypted_secrets where name='detailflow_cron_secret' and length(decrypted_secret)>=20) then
  raise exception 'Save the existing Vercel CRON_SECRET in Vault as detailflow_cron_secret first';
 end if;
end$$;
select cron.schedule('detailflow-notifications','* * * * *',$job$
 select net.http_post(
  url:='https://detailflow-xi.vercel.app/api/send-reminders',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='detailflow_cron_secret')),
  body:='{}'::jsonb,
  timeout_milliseconds:=55000
 );
$job$);
commit;
-- Inspect the named job without displaying its command or credentials.
select jobid,jobname,schedule,active from cron.job where jobname='detailflow-notifications';
