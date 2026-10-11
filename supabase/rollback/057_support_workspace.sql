-- Run only with the previous application version. Payment records and the
-- is_internal column are retained so rollback never erases a payment/audit.
begin;
drop trigger if exists audit_support_application on public.studio_access_requests;
create or replace function public.is_support_user() returns boolean language sql stable security definer set search_path=public as $$select auth.uid() is not null and exists(select 1 from tenant_memberships where user_id=auth.uid() and role='super_admin' and active)$$;
create or replace function public.support_set_subscription(studio uuid,plan_input text,status_input text,end_input timestamptz,note_input text) returns void language plpgsql security definer set search_path=public as $$
declare prior jsonb;subscription_id uuid;begin
 if not is_support_user() then raise exception 'Потрібні права підтримки';end if;
 if plan_input is null or status_input is null or note_input is null or plan_input not in ('start','studio','pro') or status_input not in ('trialing','active','past_due','cancelled') or length(trim(note_input))<5 or length(note_input)>2000 then raise exception 'Оберіть тариф, статус та вкажіть причину зміни';end if;
 if status_input in ('active','trialing') and (end_input is null or end_input<=now() or end_input>now()+interval '2 years') then raise exception 'Вкажіть майбутню дату завершення, не більше двох років';end if;
 perform 1 from tenants where id=studio for update;
 if not found then raise exception 'Студію не знайдено';end if;
 select to_jsonb(s) into prior from subscriptions s where tenant_id=studio for update;
 insert into subscriptions(tenant_id,plan,status,trial_ends_at,current_period_end)
 values(studio,plan_input,status_input,case when status_input='trialing' then end_input end,case when status_input='active' then end_input end)
 on conflict(tenant_id) do update set plan=excluded.plan,status=excluded.status,
 trial_ends_at=case when excluded.status='trialing' then excluded.trial_ends_at else subscriptions.trial_ends_at end,
 current_period_end=case when excluded.status='active' then excluded.current_period_end else subscriptions.current_period_end end,updated_at=now()
 returning id into subscription_id;
 insert into audit_logs(tenant_id,actor_id,entity_type,entity_id,action,before_data,after_data) values(studio,auth.uid(),'subscriptions', subscription_id,'support_adjustment',prior,jsonb_build_object('plan',plan_input,'status',status_input,'end',end_input,'reason',trim(note_input)));
end$$;

create or replace function public.support_review_application(request_id uuid,approve boolean,note text default '') returns uuid
language plpgsql security definer set search_path=public as $$
declare application public.studio_access_requests; studio_id uuid; owner_email text;
begin
 if not public.is_support_user() then raise exception 'Потрібні права підтримки'; end if;
 select * into application from public.studio_access_requests where id=request_id for update;
 if application.id is null then raise exception 'Заявку не знайдено'; end if;
 if application.status='approved' and approve then return application.tenant_id; end if;
 if application.status not in ('pending','contacted') then raise exception 'Заявку вже розглянуто'; end if;
 if not approve then
  if length(trim(note))=0 then raise exception 'Вкажіть причину відмови'; end if;
  update public.studio_access_requests set status='rejected',review_note=left(trim(note),2000),reviewed_by=auth.uid(),reviewed_at=now() where id=request_id;
  return null;
 end if;
 select email into owner_email from auth.users where id=application.user_id and email_confirmed_at is not null;
 if owner_email is null then raise exception 'Власник ще не підтвердив email'; end if;
 if exists(select 1 from public.tenant_memberships where user_id=application.user_id) then raise exception 'Акаунт уже має робочий профіль. Перевірте його перед активацією'; end if;
 studio_id=gen_random_uuid();
 insert into public.tenants(id,name,slug,phone,email) values(studio_id,application.studio_name,'studio-'||replace(studio_id::text,'-',''),application.phone,owner_email);
 insert into public.tenant_memberships(tenant_id,user_id,role) values(studio_id,application.user_id,'owner');
 insert into public.reminder_settings(tenant_id) values(studio_id);
 insert into public.subscriptions(tenant_id,plan,status,trial_ends_at) values(studio_id,'start','trialing',now()+interval '14 days');
 update public.studio_access_requests set status='approved',tenant_id=studio_id,reviewed_by=auth.uid(),review_note=left(trim(note),2000),reviewed_at=now() where id=request_id;
 return studio_id;
end;
$$;
revoke all on public.payments from authenticated;
revoke all on function public.support_studios_page(text,integer,text,text,boolean) from authenticated;
revoke all on function public.support_platform_summary(date,date) from authenticated;
revoke all on function public.support_add_payment(uuid,uuid,numeric,text,date,integer,text) from authenticated;
revoke all on function public.support_studio_timeline(uuid,integer) from authenticated;
revoke all on function public.support_applications_queue() from authenticated;
revoke all on function public.support_contact_application(uuid,text) from authenticated;
notify pgrst,'reload schema';
commit;
