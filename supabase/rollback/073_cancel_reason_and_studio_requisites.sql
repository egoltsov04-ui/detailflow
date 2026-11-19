-- Rollback of 073: removes the cancel reason and the studio requisites (their text is lost).
begin;
alter table public.appointments drop column if exists status_reason;
alter table public.tenants drop column if exists legal_details;
notify pgrst, 'reload schema';
commit;
