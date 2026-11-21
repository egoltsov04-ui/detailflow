-- Deleting a studio failed when it had orders on posts: removing the posts clears post_id on those orders, and the
-- post guard treated that as a support user assigning a post. It also failed for orders with a deposit: removing the jobs
-- recalculated the order total to 0 below the deposit. Both now let the studio being deleted through.
begin;
create or replace function public.guard_order_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare planned integer;
begin
 -- Deleting a whole studio clears post links of its orders: not a post assignment to guard.
 if tg_op='UPDATE' and deleting_studio(old.tenant_id) then return new;end if;
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
end$function$;
create or replace function public.sync_job_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare oid uuid:=coalesce(new.work_order_id,old.work_order_id); next_status text; amount numeric;
begin
 -- Deleting a whole studio removes its orders too: no totals to recalculate.
 if deleting_studio(coalesce(new.tenant_id,old.tenant_id)) then return coalesce(new,old); end if;
 select sum(price),case when bool_and(status='approved') then 'ready' when bool_or(status='review') then 'review'
 when bool_or(status='in_progress') then 'in_progress' when bool_or(status='waiting') then 'waiting'
 when bool_or(staff_id is null) then 'new' else 'assigned' end into amount,next_status from work_order_jobs where work_order_id=oid;
 update work_orders set total=coalesce(amount,0),status=case when status in ('issued','cancelled') then status else coalesce(next_status,'new') end,
 staff_id=(select staff_id from work_order_jobs where work_order_id=oid order by created_at,id limit 1),
 updated_at=now(),approved_at=case when next_status='ready' then coalesce(approved_at,now()) else approved_at end where id=oid;
 return coalesce(new,old);
end $function$;
commit;
