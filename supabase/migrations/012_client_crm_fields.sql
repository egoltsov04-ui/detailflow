alter table public.clients
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists notes text,
  add column if not exists source text;
