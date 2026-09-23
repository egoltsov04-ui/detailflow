-- Public owner applications and role-aware first entry.
create table if not exists public.studio_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  studio_name text not null,
  phone text,
  messenger text,
  contact text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.studio_access_requests enable row level security;
drop policy if exists "users read own studio access request" on public.studio_access_requests;
create policy "users read own studio access request" on public.studio_access_requests for select using (user_id = auth.uid());

-- Save the owner application included during registration. Staff are attached by
-- the server invitation endpoint and therefore never receive a studio form.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  if new.raw_user_meta_data ->> 'requested_role' = 'owner' then
    insert into public.studio_access_requests (user_id, studio_name, phone, messenger, contact)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'studio_name', 'Нова студія'), new.raw_user_meta_data ->> 'phone', new.raw_user_meta_data ->> 'messenger', new.raw_user_meta_data ->> 'contact');
  end if;
  return new;
end;
$$;
