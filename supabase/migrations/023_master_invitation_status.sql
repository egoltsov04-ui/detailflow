-- Invitation delivery and registration status shown to the studio owner.
alter table public.staff_profiles
  add column if not exists invite_email text,
  add column if not exists invite_sent_at timestamptz,
  add column if not exists invite_accepted_at timestamptz;

create or replace function public.mark_master_invite_accepted()
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.staff_profiles
  set invite_accepted_at = coalesce(invite_accepted_at, now())
  where user_id = auth.uid() and active = true;
end;
$$;
grant execute on function public.mark_master_invite_accepted() to authenticated;
