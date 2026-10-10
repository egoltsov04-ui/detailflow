import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {pages,legacyRoutes,pageFromUrl,sectionFor} from '../src/lib/navigation.ts'
test('legacy and canonical routes resolve to existing views',()=>{
 for(const [page,url] of Object.entries(pages))assert.equal(pageFromUrl(url),page)
 for(const [old,target] of Object.entries(legacyRoutes))assert.equal(pageFromUrl(old),pageFromUrl(target))
 assert.equal(pageFromUrl('/app','?page=Замовлення'),'Замовлення')
 assert.equal(pageFromUrl('/app','?payment=ok'),'Тариф')
 assert.equal(sectionFor('Фінанси'),'finance');assert.equal(sectionFor('Роботи'),'work')
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url)))
 for(const redirect of config.redirects){assert.ok(Object.values(pages).includes(redirect.destination));assert.notEqual(redirect.source,redirect.destination)}
 assert.ok(config.rewrites.some(r=>r.source==='/app/:path*'))
})
