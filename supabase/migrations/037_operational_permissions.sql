begin;
-- Keep historical salary fields private as well as the newer job rate.
revoke select on public.work_orders from authenticated;
do $$declare cols text;begin
 select string_agg(quote_ident(column_name),',') into cols from information_schema.columns where table_schema='public' and table_name='work_orders' and column_name not in ('compensation_percent','compensation_fixed');
 execute 'grant select ('||cols||') on public.work_orders to authenticated';
end$$;
create or replace function public.get_studio_orders(studio uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$begin
 if not is_tenant_member(studio) then raise exception 'Немає доступу';end if;
 return coalesce((select jsonb_agg(
 (case when can_view_finance(studio) or is_own_staff_profile(o.staff_id) then to_jsonb(o) else to_jsonb(o)-'compensation_percent'-'compensation_fixed' end)
 || jsonb_build_object('staff_profiles',jsonb_build_object('full_name',s.full_name),'clients',jsonb_build_object('full_name',c.full_name,'vehicles',coalesce((select jsonb_agg(to_jsonb(v)) from vehicles v where v.client_id=o.client_id and v.tenant_id=studio),'[]')),
 'appointments',jsonb_build_object('vehicles',(select to_jsonb(v) from appointments a join vehicles v on v.id=a.vehicle_id where a.id=o.appointment_id)),
 'receipt_total',(select total from order_receipts where work_order_id=o.id)) order by o.created_at desc,o.id)
 from work_orders o left join clients c on c.id=o.client_id left join staff_profiles s on s.id=o.staff_id
 where o.tenant_id=studio and (is_tenant_manager(studio) or is_own_staff_profile(o.staff_id) or can_read_job_order(o.id))),'[]');
end$$;
revoke all on function public.get_studio_orders(uuid) from public,anon;
grant execute on function public.get_studio_orders(uuid) to authenticated;

create or replace function public.guard_compensation_edit() returns trigger language plpgsql security definer set search_path=public as $$begin
 if auth.uid() is null or can_view_finance(new.tenant_id) then return new;end if;
 if tg_op='INSERT' then
  if new.compensation_percent is not null or coalesce(new.hourly_rate,0)<>0 then raise exception 'Немає прав змінювати оплату майстра';end if;
 elsif new.compensation_percent is distinct from old.compensation_percent or new.hourly_rate is distinct from old.hourly_rate then raise exception 'Немає прав змінювати оплату майстра';end if;
 return new;
end$$;
drop trigger if exists guard_compensation_edit on public.staff_profiles;
create trigger guard_compensation_edit before insert or update on public.staff_profiles for each row execute function public.guard_compensation_edit();
create or replace function public.guard_order_compensation() returns trigger language plpgsql security definer set search_path=public as $$begin
 if auth.uid() is null or can_view_finance(new.tenant_id) then return new;end if;
 if tg_op='INSERT' then
  if new.compensation_percent is not null or new.compensation_fixed is not null then raise exception 'Оплату майстра налаштовує власник';end if;
 elsif new.compensation_percent is distinct from old.compensation_percent or new.compensation_fixed is distinct from old.compensation_fixed then raise exception 'Оплату майстра налаштовує власник';end if;
 return new;
end$$;
drop trigger if exists guard_order_compensation on public.work_orders;
create trigger guard_order_compensation before insert or update on public.work_orders for each row execute function public.guard_order_compensation();
notify pgrst,'reload schema';
commit;
