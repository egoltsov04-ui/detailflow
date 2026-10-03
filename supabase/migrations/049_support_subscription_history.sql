create or replace function public.support_subscription_history(studio uuid, page_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not is_support_user() then raise exception 'Access denied' using errcode='42501';end if;
 if page_offset<0 then raise exception 'Invalid page';end if;
 return coalesce((select jsonb_agg(to_jsonb(r)) from (
  select a.id,a.created_at,a.actor_id,coalesce(p.full_name,'—') actor_name,
   a.before_data->>'plan' previous_plan,a.after_data->>'plan' plan,
   a.after_data->>'status' status,a.after_data->>'end' access_end,a.after_data->>'reason' reason
  from audit_logs a left join profiles p on p.id=a.actor_id
  where a.tenant_id=studio and a.entity_type='subscriptions' and a.action='support_adjustment'
  order by a.created_at desc,a.id desc limit 20 offset page_offset
 ) r),'[]'::jsonb);
end $$;
revoke all on function public.support_subscription_history(uuid,integer) from public,anon;
grant execute on function public.support_subscription_history(uuid,integer) to authenticated;
