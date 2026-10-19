begin;

-- The public booking endpoint uses a server-side service key. Keep abuse
-- counters private and callable only from that trusted server endpoint.
create table if not exists public.public_booking_rate_limits (
  bucket_hash text primary key check (bucket_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now()
);
alter table public.public_booking_rate_limits enable row level security;
revoke all on public.public_booking_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.public_booking_rate_limits to service_role;

create or replace function public.consume_public_booking_rate_limit(
  ip_bucket_hash text,
  studio_bucket_hash text,
  is_submission boolean
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  role_value text;
  now_value timestamptz := clock_timestamp();
  per_ip_limit integer;
  per_studio_limit integer;
  current_count integer;
  allowed boolean := true;
  bucket record;
begin
  role_value = coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
  if role_value <> 'service_role' then
    raise exception 'Service access required' using errcode = '42501';
  end if;
  if ip_bucket_hash is null or ip_bucket_hash !~ '^[0-9a-f]{64}$'
     or studio_bucket_hash is null or studio_bucket_hash !~ '^[0-9a-f]{64}$'
     or ip_bucket_hash = studio_bucket_hash then
    raise exception 'Invalid rate-limit key' using errcode = '22023';
  end if;

  -- Browsing gets a higher allowance than creating booking requests.
  per_ip_limit = case when is_submission then 120 else 600 end;
  per_studio_limit = case when is_submission then 15 else 180 end;

  for bucket in select ip_bucket_hash bucket_hash, per_ip_limit request_limit
                union all
                select studio_bucket_hash, per_studio_limit loop
    insert into public.public_booking_rate_limits(bucket_hash, window_started_at, request_count, updated_at)
    values(bucket.bucket_hash, now_value, 1, now_value)
    on conflict (bucket_hash) do update set
      window_started_at = case
        when public_booking_rate_limits.window_started_at <= now_value - interval '1 hour' then now_value
        else public_booking_rate_limits.window_started_at
      end,
      request_count = case
        when public_booking_rate_limits.window_started_at <= now_value - interval '1 hour' then 1
        else public_booking_rate_limits.request_count + 1
      end,
      updated_at = now_value
    returning request_count into current_count;
    if current_count > bucket.request_limit then allowed = false; end if;
  end loop;

  -- Opportunistically bound stale hash retention. No raw IP is stored.
  if random() < 0.02 then
    delete from public.public_booking_rate_limits where updated_at < now_value - interval '2 days';
  end if;
  return allowed;
end;
$$;

revoke all on function public.consume_public_booking_rate_limit(text,text,boolean) from public, anon, authenticated;
grant execute on function public.consume_public_booking_rate_limit(text,text,boolean) to service_role;

commit;
