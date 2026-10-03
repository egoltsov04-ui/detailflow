begin;
create or replace function public.support_list_studios(search_input text default '',offset_input integer default 0) returns jsonb language plpgsql security definer set search_path=public as $$begin
 if not is_support_user() then raise exception 'Потрібні права підтримки';end if;
 if offset_input<0 then raise exception 'Некоректна сторінка';end if;
 return coalesce((select jsonb_agg(x) from(select t.id,t.name,t.slug,t.timezone,t.phone,t.email,t.created_at,s.plan,s.status,s.trial_ends_at,s.current_period_end,
 (select count(*) from staff_profiles p where p.tenant_id=t.id and p.active) staff_count,
 (select count(*) from clients c where c.tenant_id=t.id) client_count
 from tenants t left join subscriptions s on s.tenant_id=t.id where concat_ws(' ',t.id::text,t.name,t.slug,t.email,t.phone) ilike '%'||left(coalesce(search_input,''),100)||'%' order by t.created_at desc,t.id offset offset_input limit 50)x),'[]');
end$$;

revoke all on function public.support_list_studios(text,integer) from public,anon;
grant execute on function public.support_list_studios(text,integer) to authenticated;
update public.push_subscriptions set locale='uk' where locale not in ('uk','en');
alter table public.push_subscriptions drop constraint if exists push_subscriptions_locale_check;
alter table public.push_subscriptions add constraint push_subscriptions_locale_check check (locale in ('uk','en'));
notify pgrst,'reload schema';
commit;
