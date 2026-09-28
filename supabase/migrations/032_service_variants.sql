-- Safe to re-run. Existing services keep their prices and durations.
begin;
alter table public.services add column if not exists description text not null default '';
alter table public.services add column if not exists variants jsonb not null default '[]'::jsonb;

create or replace function public.valid_service_variants(value jsonb)
returns boolean language plpgsql immutable set search_path=public as $$
declare v jsonb; ids text[]:='{}'; names text[]:='{}';
begin
 if value is null or jsonb_typeof(value)<>'array' then return false; end if;
 if jsonb_array_length(value)>20 then return false; end if;
 for v in select * from jsonb_array_elements(value) loop
   if jsonb_typeof(v)<>'object' or jsonb_typeof(v->'id') is distinct from 'string' or jsonb_typeof(v->'name') is distinct from 'string' then return false; end if;
   if length(v->>'id') not between 1 and 80 or length(trim(v->>'name')) not between 1 and 80 then return false; end if;
   if (v->>'id')=any(ids) or lower(trim(v->>'name'))=any(names) then return false; end if;
   if jsonb_typeof(v->'price') is distinct from 'number' or jsonb_typeof(v->'duration_minutes') is distinct from 'number' then return false; end if;
   if (v->>'price')::numeric<0 or (v->>'price')::numeric>99999999.99 or round((v->>'price')::numeric,2)<>(v->>'price')::numeric then return false; end if;
   if (v->>'duration_minutes')::numeric not between 1 and 1440 or trunc((v->>'duration_minutes')::numeric)<>(v->>'duration_minutes')::numeric then return false; end if;
   if v ? 'description' and (jsonb_typeof(v->'description') is distinct from 'string' or length(v->>'description')>500) then return false; end if;
   ids:=array_append(ids,v->>'id'); names:=array_append(names,lower(trim(v->>'name')));
 end loop;
 return true;
exception when others then return false;
end $$;
alter table public.services drop constraint if exists services_variants_valid;
alter table public.services add constraint services_variants_valid check(public.valid_service_variants(variants));
alter table public.services drop constraint if exists services_description_length;
alter table public.services add constraint services_description_length check(length(description)<=2000);
notify pgrst, 'reload schema';
commit;
