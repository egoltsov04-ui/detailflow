import {test} from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {readdirSync,statSync} from 'node:fs'
import {join} from 'node:path'

execFileSync(process.execPath,['node_modules/typescript/bin/tsc','-p','tsconfig.server.json'],{stdio:'inherit'})
const {createApiServer,routes}=await import('../build/server/server/node.js')
const walk=d=>readdirSync(d).flatMap(f=>{const p=join(d,f);return statSync(p).isDirectory()?walk(p):[p]})

test('every api/ file is mounted at its Vercel path',()=>{
 const expected=walk('api').filter(f=>f.endsWith('.ts')).map(f=>'/'+f.replace(/\\/g,'/').replace(/\.ts$/,'')).sort()
 assert.deepEqual(Object.keys(routes).sort(),expected)
})

test('the Node server passes method, body, query and headers like Vercel',async t=>{
 const seen=[]
 const server=createApiServer({
  '/api/echo':(req,res)=>{seen.push({method:req.method,body:req.body,query:req.query,auth:req.headers.authorization});res.status(201).json({ok:true})},
  '/api/fail':()=>{throw new Error('secret detail')},
 })
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close())
 const base=`http://127.0.0.1:${server.address().port}`
 const r=await fetch(base+'/api/echo/?slug=test',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer x'},body:'{"a":1}'})
 assert.equal(r.status,201);assert.deepEqual(await r.json(),{ok:true});assert.equal(r.headers.get('cache-control'),'no-store')
 assert.deepEqual(seen[0],{method:'POST',body:{a:1},query:{slug:'test'},auth:'Bearer x'})
 await fetch(base+'/api/echo',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'{"raw":true}'})
 assert.equal(seen[1].body,'{"raw":true}')
 assert.equal((await fetch(base+'/api/echo',{method:'POST',headers:{'content-type':'application/json'},body:'{bad'})).status,400)
 assert.equal((await fetch(base+'/api/echo',{method:'POST',body:'x'.repeat(1024*1024+1)})).status,413)
 assert.equal((await fetch(base+'/api/missing')).status,404)
 const failed=await fetch(base+'/api/fail');assert.equal(failed.status,500);assert.doesNotMatch(await failed.text(),/secret detail/)
})
