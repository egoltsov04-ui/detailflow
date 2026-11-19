-- Rollback of 074: a cancelled order sets its booking to cancelled again, also over no_show.
begin;
create or replace function public.sync_workflow_appointment() returns trigger language plpgsql security definer set search_path=public as $$
declare target public.appointment_status;
begin
 if new.appointment_id is null or new.status is not distinct from old.status then return new; end if;
 target:=case when new.status in ('in_progress','waiting','review') then 'in_progress'::appointment_status
 when new.status in ('ready','issued') then 'completed'::appointment_status
 when new.status='cancelled' then 'cancelled'::appointment_status else null end;
 if target is not null then update appointments set status=target where id=new.appointment_id and status is distinct from target; end if;
 return new;
end $$;
commit;
