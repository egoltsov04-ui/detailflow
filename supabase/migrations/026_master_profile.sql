alter table public.staff_profiles add column if not exists profile_completed_at timestamptz;

create or replace function public.complete_master_profile(full_name_input text, phone_input text, specialty_input text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or length(trim(coalesce(full_name_input,''))) < 2 or length(trim(coalesce(phone_input,''))) < 5 then
    raise exception 'Вкажіть ім’я та телефон';
  end if;
  update public.staff_profiles set full_name=trim(full_name_input), phone=trim(phone_input),
    specialty=nullif(trim(specialty_input),''), profile_completed_at=now(),
    invite_accepted_at=coalesce(invite_accepted_at,now())
    where user_id=auth.uid() and active;
  if not found then raise exception 'Активний профіль майстра не знайдено'; end if;
end; $$;
revoke all on function public.complete_master_profile(text,text,text) from public,anon;
grant execute on function public.complete_master_profile(text,text,text) to authenticated;

-- Existing accounts that actually signed in have accepted the invitation.
update public.staff_profiles s set invite_accepted_at=coalesce(s.invite_accepted_at,u.last_sign_in_at)
from auth.users u where u.id=s.user_id and u.last_sign_in_at is not null;
