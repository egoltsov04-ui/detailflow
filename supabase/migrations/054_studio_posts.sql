begin;
create table if not exists public.studio_posts(
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.tenants(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 80), position integer not null check(position>0), unique(studio_id,position)
);
alter table public.studio_posts enable row level security;
drop policy if exists posts_read on public.studio_posts;
create policy posts_read on public.studio_posts for select to authenticated using(public.is_tenant_manager(studio_id));
grant select on public.studio_posts to authenticated;
revoke insert,update,delete on public.studio_posts from anon,authenticated;
alter table public.work_orders add column if not exists post_id uuid references public.studio_posts(id) on delete set null;
alter table public.work_orders add column if not exists started_at timestamptz;
alter table public.work_orders add column if not exists planned_duration_minutes integer check(planned_duration_minutes>0 and planned_duration_minutes<=525600);
create unique index if not exists one_live_order_per_post on public.work_orders(post_id) where post_id is not null and status not in ('ready','issued','cancelled');
create or replace function public.configure_studio_posts(studio uuid,count_input integer,names_input jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_tenant_manager(studio) then raise exception 'Немає доступу';end if;
 if count_input is null or count_input<0 or count_input>100 then raise exception 'Вкажіть від 0 до 100 постів';end if;
 perform 1 from tenants where id=studio for update;
 if exists(select 1 from studio_posts p join work_orders o on o.post_id=p.id where p.studio_id=studio and p.position>count_input and o.status not in ('ready','issued','cancelled')) then raise exception 'Спочатку звільніть пости, які потрібно прибрати';end if;
 delete from studio_posts where studio_id=studio and position>count_input;
 insert into studio_posts(studio_id,name,position) select studio,'Пост '||n,n from generate_series(1,count_input) n on conflict(studio_id,position) do nothing;
 update studio_posts set name=trim(names_input->>id::text) where studio_id=studio and names_input ? id::text;
end$$;
create or replace function public.guard_order_post() returns trigger language plpgsql security definer set search_path=public as $$
declare planned integer;
begin
 if (tg_op='INSERT' and new.post_id is not null) or (tg_op='UPDATE' and (new.post_id is distinct from old.post_id or new.planned_duration_minutes is distinct from old.planned_duration_minutes)) then
  if auth.uid() is not null and not is_tenant_manager(new.tenant_id) then raise exception 'Пост призначає власник або адміністратор';end if;
 end if;
 if new.post_id is not null and not exists(select 1 from studio_posts where id=new.post_id and studio_id=new.tenant_id) then raise exception 'Пост належить іншій студії';end if;
 if new.status='in_progress' and new.started_at is null then new.started_at=now();end if;
 if new.planned_duration_minutes is null or (new.started_at is null and (tg_op='INSERT' or new.planned_duration_minutes is not distinct from old.planned_duration_minutes)) then
  select case when count(*)=count(planned_minutes) then sum(planned_minutes)::integer end into planned from work_order_jobs where work_order_id=new.id;
  if planned>0 and planned<=525600 then new.planned_duration_minutes=planned;end if;
 end if;
 return new;
end$$;
drop trigger if exists guard_order_post on public.work_orders;
create trigger guard_order_post before insert or update on public.work_orders for each row execute function public.guard_order_post();
create or replace function public.assign_order_post(order_input uuid,post_input uuid,minutes_input integer default null) returns void language plpgsql security definer set search_path=public as $$
declare o work_orders;
begin
 select * into o from work_orders where id=order_input for update;
 if not found or not is_tenant_manager(o.tenant_id) then raise exception 'Немає доступу';end if;
 if o.status in ('ready','issued','cancelled') then raise exception 'Завершене замовлення не займає пост';end if;
 if minutes_input is not null and (minutes_input<1 or minutes_input>525600) then raise exception 'Перевірте тривалість';end if;
 update work_orders set post_id=post_input,planned_duration_minutes=coalesce(minutes_input,planned_duration_minutes) where id=order_input;
exception when unique_violation then raise exception 'Пост уже зайнятий іншим замовленням';
end$$;
revoke all on function public.configure_studio_posts(uuid,integer,jsonb),public.assign_order_post(uuid,uuid,integer) from public,anon;
grant execute on function public.configure_studio_posts(uuid,integer,jsonb),public.assign_order_post(uuid,uuid,integer) to authenticated;
commit;
