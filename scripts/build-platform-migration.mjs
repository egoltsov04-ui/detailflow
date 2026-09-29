import {readFileSync,readdirSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const files=readdirSync('supabase/migrations').filter(f=>/^03[3-9]_.*\.sql$/.test(f)).sort()
if(files.length!==7)throw new Error('Expected migrations 033 through 039')
const contents=files.map(file=>{
 const sql=readFileSync('supabase/migrations/'+file,'utf8').replace(/^\uFEFF/,'').trim()
 if(!/^begin;/i.test(sql)||! /commit;$/i.test(sql))throw new Error('Unexpected transaction wrapper: '+file)
 return `-- ${file} · SHA256 ${createHash('sha256').update(sql).digest('hex')}\n`+sql.replace(/^begin;/i,'').replace(/commit;$/i,'').trim()
})
const output=`-- Detailflow platform update 033–039. Apply after 032. Repeatable.
-- Run the entire file in SQL Editor. Keep this transaction intact.
-- Adds specializations, billing terms, administrator permissions, receipts, CRM and audit.
begin;
${contents.join('\n\n')}
commit;
`
writeFileSync('supabase/deploy/platform_033_039.sql',output)
console.log('Prepared supabase/deploy/platform_033_039.sql')
