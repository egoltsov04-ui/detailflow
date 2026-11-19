-- Why a booking was cancelled or the client did not come (optional, chosen by the studio),
-- and the studio's requisites printed on the work completion act (ФОП, ІПН/ЄДРПОУ, IBAN). Both optional free text.
begin;
alter table public.appointments add column if not exists status_reason text;
alter table public.appointments drop constraint if exists appointments_status_reason_length;
alter table public.appointments add constraint appointments_status_reason_length check (status_reason is null or char_length(status_reason)<=200);
alter table public.tenants add column if not exists legal_details text;
alter table public.tenants drop constraint if exists tenants_legal_details_length;
alter table public.tenants add constraint tenants_legal_details_length check (legal_details is null or char_length(legal_details)<=600);
notify pgrst, 'reload schema';
commit;
