import {writeFile,readFile} from 'node:fs/promises'
import {subscriptionPlans} from '../src/lib/plans.ts'
const sql=`-- GENERATED from src/lib/plans.ts by scripts/build-plan-config.mjs.\ncreate or replace function public.plan_configuration() returns jsonb language sql immutable set search_path=public as $$select '${JSON.stringify(subscriptionPlans).replaceAll("'","''")}'::jsonb$$;\nrevoke all on function public.plan_configuration() from public,anon;\ngrant execute on function public.plan_configuration() to authenticated,service_role;\n`
await writeFile(new URL('../supabase/plan_configuration.sql',import.meta.url),sql)
// Keep the deployable migration aligned with the same source before publishing.
const path=new URL('../supabase/migrations/059_plans_solo.sql',import.meta.url)
const migration=await readFile(path,'utf8')
await writeFile(path,migration.replace(/-- GENERATED[\s\S]*?grant execute on function public\.plan_configuration\(\) to authenticated,service_role;\s*/,()=>sql+'\n'))
