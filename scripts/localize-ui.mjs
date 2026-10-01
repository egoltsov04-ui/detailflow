import {parseSync} from 'rolldown/utils'
import {readFileSync,writeFileSync,readdirSync} from 'node:fs'
import path from 'node:path'
const dictionary=readFileSync('src/i18n/messages.ts','utf8').split('const rows=`')[1].split('`;')[0]
const keys=new Set(dictionary.trim().split('\n').map(row=>row.split('|')[0]))
let total=0
for(const file of readdirSync('src',{recursive:true}).filter(f=>f.endsWith('.tsx')&&!f.startsWith('dev')&&!f.startsWith('i18n'))){
 const full=path.join('src',file),source=readFileSync(full,'utf8'),parsed=parseSync(file,source)
 if(parsed.errors.length)throw new Error('Cannot parse '+file)
 const edits=[],seen=new Set()
 const translate=n=>{if(typeof n?.value!=='string'||!keys.has(n.value.trim())||seen.has(n.start))return;seen.add(n.start);edits.push({start:n.start,end:n.end,text:`t(${JSON.stringify(n.value)})`})}
 function display(n){if(!n)return;if(n.type==='Literal')translate(n);if(n.type==='ConditionalExpression'){display(n.consequent);display(n.alternate)}if(n.type==='LogicalExpression')display(n.right)}
 function visit(n,parent){
  if(!n||typeof n!=='object')return
  if(n.type==='JSXText'&&keys.has(n.value.replace(/\s+/g,' ').trim())){
   const original=n.value.replace(/\s+/g,' ')
   if(parent?.openingElement?.name?.name==='option'&&!parent.openingElement.attributes.some(a=>a.name?.name==='value')){
    const open=parent.openingElement;edits.push({start:open.end-1,end:open.end-1,text:` value=${JSON.stringify(original.trim())}`})
   }
   edits.push({start:n.start,end:n.end,text:`{t(${JSON.stringify(original)})}`})
  }
  if(n.type==='JSXAttribute'&&['title','placeholder','aria-label','label','description','note','data-label'].includes(n.name?.name)){
   if(n.value?.type==='Literal'&&keys.has(n.value.value)){edits.push({start:n.value.start,end:n.value.end,text:`{t(${JSON.stringify(n.value.value)})}`})}
   else if(n.value?.type==='JSXExpressionContainer')display(n.value.expression)
  }
  if(n.type==='JSXExpressionContainer'&&parent?.type!=='JSXAttribute')display(n.expression)
  if(n.type==='CallExpression'&&['setError','setMessage','setNotice'].includes(n.callee?.name))display(n.arguments[0])
  for(const [k,v] of Object.entries(n)){if(k==='parent')continue;if(Array.isArray(v))for(const child of v)if(child?.type)visit(child,n);else{}else if(v?.type)visit(v,n)}
 }
 visit(parsed.program)
 if(!edits.length)continue
 let result=source
 for(const e of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,e.start)+e.text+result.slice(e.end)
 if(!/import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*['"][^'"]*i18n\/core/.test(source)){let ref=path.relative(path.dirname(full),'src/i18n/core').replaceAll('\\','/');if(!ref.startsWith('.'))ref='./'+ref;result=`import {t} from '${ref}'\n`+result}
 writeFileSync(full,result);total+=edits.length
}
console.log('Localized display strings:',total)
