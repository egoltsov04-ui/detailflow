-- Promo codes: support creates them in /admin; an owner enters one at signup; approval applies it once.
-- Kinds: percent (discount on the first payment) and trial_days (extra free days). No direct table access for users.
begin;
create table if not exists public.promo_codes(
 id uuid primary key default gen_random_uuid(),
 code text not null unique check(code ~ '^[A-Z0-9-]{4,32}$'),
 kind text not null check(kind in ('percent','trial_days')),
 value integer not null check((kind='percent' and value between 1 and 100) or (kind='trial_days' and value between 1 and 90)),
 valid_until date,
 max_uses integer check(max_uses is null or max_uses>0),
 uses integer not null default 0 check(uses>=0),
 active boolean not null default true,
 note text not null default '' check(char_length(note)<=300),
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now()
);
alter table public.promo_codes enable row level security;
revoke all on public.promo_codes from public,anon,authenticated;
alter table public.studio_access_requests add column if not exists promo_code text check(promo_code is null or char_length(promo_code)<=32);
alter table public.studio_access_requests add column if not exists promo_id uuid references public.promo_codes(id) on delete set null;

create or replace function public.promo_code_usable(p public.promo_codes) returns boolean language sql stable set search_path=public as $$
 select p.active and (p.valid_until is null or p.valid_until>=current_date) and (p.max_uses is null or p.uses<p.max_uses)
$$;

-- Signup form check. Answers only whether a code works and what it gives; never lists codes.
create or replace function public.check_promo_code(code_input text) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare p public.promo_codes;
begin
 select * into p from public.promo_codes where code=upper(btrim(coalesce(code_input,'')));
 if p.id is null or not promo_code_usable(p) then return jsonb_build_object('valid',false); end if;
 return jsonb_build_object('valid',true,'kind',p.kind,'value',p.value);
end $$;

create or replace function public.support_promo_codes() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not coalesce(is_support_user(),false) then raise exception 'Потрібні права підтримки' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('usable',promo_code_usable(p)) order by p.created_at desc) from public.promo_codes p),'[]');
end $$;

-- Create a code (id null) or change an existing one. Kind and value stay fixed once a code has been used.
create or replace function public.support_save_promo_code(id_input uuid,code_input text,kind_input text,value_input integer,valid_until_input date,max_uses_input integer,active_input boolean,note_input text default '') returns uuid language plpgsql security definer set search_path=public as $$
declare p public.promo_codes; new_id uuid;
begin
 perform require_support_write();
 if id_input is null then
  insert into public.promo_codes(code,kind,value,valid_until,max_uses,active,note,created_by)
  values(upper(btrim(code_input)),kind_input,value_input,valid_until_input,max_uses_input,coalesce(active_input,true),coalesce(btrim(note_input),''),auth.uid()) returning id into new_id;
  return new_id;
 end if;
 select * into p from public.promo_codes where id=id_input for update;
 if p.id is null then raise exception 'Промокод не знайдено'; end if;
 if p.uses>0 and (kind_input<>p.kind or value_input<>p.value) then raise exception 'Промокод уже використано: змінити можна лише строк, ліміт, активність і примітку'; end if;
 update public.promo_codes set kind=kind_input,value=value_input,valid_until=valid_until_input,max_uses=max_uses_input,active=coalesce(active_input,active),note=coalesce(btrim(note_input),'') where id=p.id;
 return p.id;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  if new.raw_user_meta_data ->> 'requested_role' = 'owner' then
    insert into public.studio_access_requests (user_id, studio_name, phone, messenger, contact, selected_plan, promo_code)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'studio_name', 'Нова студія'), new.raw_user_meta_data ->> 'phone', new.raw_user_meta_data ->> 'messenger', new.raw_user_meta_data ->> 'contact',case when new.raw_user_meta_data->>'selected_plan' in ('solo','studio','pro') then new.raw_user_meta_data->>'selected_plan' else 'studio' end,
      nullif(left(upper(btrim(coalesce(new.raw_user_meta_data->>'promo_code',''))),32),''));
  end if;
  return new;
end;
$$;

create or replace function public.support_review_application(request_id uuid,approve boolean,note text default '') returns uuid
language plpgsql security definer set search_path=public as $$
declare application public.studio_access_requests; studio_id uuid; owner_email text; promo public.promo_codes;
begin
 perform require_support_write();
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
 insert into public.subscriptions(tenant_id,plan,status,trial_ends_at) values(studio_id,application.selected_plan,'trialing',now()+interval '5 days');
 -- A promo code from the signup gives extra trial days or a discount on the first payment (shown as the studio's price until it pays).
 select * into promo from public.promo_codes where code=application.promo_code for update;
 if promo.id is not null and promo_code_usable(promo) then
  if promo.kind='trial_days' then
   update public.subscriptions set trial_ends_at=trial_ends_at+make_interval(days=>promo.value) where tenant_id=studio_id;
  else
   update public.subscriptions set price_override=round((select (x->>'price')::numeric from jsonb_array_elements(plan_configuration()) x where x->>'id'=application.selected_plan)*(100-promo.value)/100),price_locked=false where tenant_id=studio_id;
  end if;
  update public.promo_codes set uses=uses+1 where id=promo.id;
  update public.studio_access_requests set promo_id=promo.id where id=request_id;
 end if;
 update public.studio_access_requests set status='approved',tenant_id=studio_id,reviewed_by=auth.uid(),review_note=left(trim(note),2000),reviewed_at=now() where id=request_id;
 return studio_id;
end;
$$;

revoke all on function public.promo_code_usable(public.promo_codes),public.check_promo_code(text),public.support_promo_codes(),public.support_save_promo_code(uuid,text,text,integer,date,integer,boolean,text) from public;
grant execute on function public.check_promo_code(text) to anon,authenticated;
grant execute on function public.support_promo_codes(),public.support_save_promo_code(uuid,text,text,integer,date,integer,boolean,text) to authenticated;
notify pgrst, 'reload schema';
commit;
