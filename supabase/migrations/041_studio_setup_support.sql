begin;
alter table public.tenants add column if not exists onboarding_completed_at timestamptz;
create or replace function public.is_support_user() returns boolean language sql stable security definer set search_path=public as $$select auth.uid() is not null and exists(select 1 from tenant_memberships where user_id=auth.uid() and role='super_admin' and active)$$;
create or replace function public.support_list_studios(search_input text default '',offset_input integer default 0) returns jsonb language plpgsql security definer set search_path=public as $$begin
 if not is_support_user() then raise exception 'Потрібні права підтримки';end if;
 if offset_input<0 then raise exception 'Некоректна сторінка';end if;
 return coalesce((select jsonb_agg(x) from(select t.id,t.name,t.slug,t.timezone,t.phone,t.email,t.created_at,s.plan,s.status,s.trial_ends_at,s.current_period_end,
 (select count(*) from staff_profiles p where p.tenant_id=t.id and p.active) staff_count,
 (select count(*) from clients c where c.tenant_id=t.id) client_count
 from tenants t left join subscriptions s on s.tenant_id=t.id where concat_ws(' ',t.name,t.slug,t.email) ilike '%'||left(search_input,100)||'%' order by t.created_at desc,t.id offset offset_input limit 50)x),'[]');
end$$;
create or replace function public.support_set_subscription(studio uuid,plan_input text,status_input text,end_input timestamptz,note_input text) returns void language plpgsql security definer set search_path=public as $$
declare prior jsonb;begin
 if not is_support_user() then raise exception 'Потрібні права підтримки';end if;
 if plan_input not in ('start','studio','pro') or status_input not in ('trialing','active','past_due','cancelled') or length(trim(note_input))<5 or length(note_input)>2000 then raise exception 'Оберіть тариф, статус та вкажіть причину зміни';end if;
 if status_input in ('active','trialing') and (end_input is null or end_input<=now() or end_input>now()+interval '2 years') then raise exception 'Вкажіть майбутню дату завершення, не більше двох років';end if;
 select to_jsonb(s) into prior from subscriptions s where tenant_id=studio for update;
 if prior is null then raise exception 'Підписку не знайдено';end if;
 update subscriptions set plan=plan_input,status=status_input,trial_ends_at=case when status_input='trialing' then end_input else trial_ends_at end,current_period_end=case when status_input='active' then end_input else current_period_end end,updated_at=now() where tenant_id=studio;
 insert into audit_logs(tenant_id,actor_id,entity_type,entity_id,action,before_data,after_data) values(studio,auth.uid(),'subscriptions', (prior->>'id')::uuid,'support_adjustment',prior,jsonb_build_object('plan',plan_input,'status',status_input,'end',end_input,'reason',trim(note_input)));
end$$;
create or replace function public.studio_setup(studio uuid,profile_input jsonb default null,complete_input boolean default false) returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;zone text;begin
 if not is_tenant_owner(studio) then raise exception 'Потрібні права власника';end if;
 perform 1 from tenants where id=studio for update;
 if profile_input is not null then
  zone=profile_input->>'timezone';
  if length(trim(coalesce(profile_input->>'name','')))<2 or length(trim(coalesce(profile_input->>'address','')))<3 or length(regexp_replace(coalesce(profile_input->>'phone',''),'\D','','g'))<10 or not exists(select 1 from pg_timezone_names where name=zone) then raise exception 'Заповніть назву, адресу, телефон і часовий пояс';end if;
  update tenants set name=left(trim(profile_input->>'name'),120),address=left(trim(profile_input->>'address'),500),phone=left(trim(profile_input->>'phone'),40),timezone=zone where id=studio;
 end if;
 select jsonb_build_object('name',name,'address',coalesce(address,''),'phone',coalesce(phone,''),'timezone',timezone,'completed',onboarding_completed_at is not null,
 'services',(select count(*) from services where tenant_id=studio and active),'staff',(select count(*) from staff_profiles where tenant_id=studio and active),'schedules',(select count(*) from work_schedules where tenant_id=studio)) into result from tenants where id=studio;
 if complete_input then
  if length(result->>'address')<3 or length(regexp_replace(result->>'phone','\D','','g'))<10 or (result->>'services')::int=0 or (result->>'staff')::int=0 or (result->>'schedules')::int=0 then raise exception 'Додайте контакти, послугу, майстра та його графік';end if;
  update tenants set onboarding_completed_at=coalesce(onboarding_completed_at,now()) where id=studio;
  result=jsonb_set(result,'{completed}','true');
 end if;
 return result;
end$$;
revoke all on function public.support_list_studios(text,integer),public.support_set_subscription(uuid,text,text,timestamptz,text),public.studio_setup(uuid,jsonb,boolean) from public,anon;
grant execute on function public.support_list_studios(text,integer),public.support_set_subscription(uuid,text,text,timestamptz,text),public.studio_setup(uuid,jsonb,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
