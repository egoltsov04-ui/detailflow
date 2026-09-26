import { readFile, writeFile, mkdir } from 'node:fs/promises'
const files=['028_job_workflow.sql','029_workflow_media_realtime.sql','030_workflow_calendar_access.sql']
const blocks=await Promise.all(files.map(async name=>'-- '+name+'\n'+(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8')).replace(/^begin;\s*$/gm,'').replace(/^commit;\s*$/gm,'')))
const target=new URL('../supabase/deploy/workflow_028_030.sql',import.meta.url)
await mkdir(new URL('../supabase/deploy/',import.meta.url),{recursive:true})
await writeFile(target,'-- Apply once after migration 027, in the main Detailflow Supabase project.\n-- One transaction: either the entire workflow becomes available or nothing changes.\nbegin;\n'+blocks.join('\n\n')+'\ncommit;\n')
console.log('Prepared supabase/deploy/workflow_028_030.sql')
