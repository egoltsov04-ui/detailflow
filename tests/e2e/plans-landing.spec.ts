import {test,expect} from '@playwright/test'
import {mockService} from './fixtures'
test('landing sections, real screenshots, plan links and responsive dots',async({page},info)=>{
 await mockService(page,'guest');await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/')
 await expect(page.getByRole('heading',{name:'Облік студії без таблиць'})).toBeVisible()
 const sections=page.locator('[data-nav-label]'),nav=page.locator('.lp-section-nav')
 await expect(sections).toHaveCount(7);await expect(nav.locator('button')).toHaveCount(7)
 for(const id of ['solo','studio','pro'])await expect(page.locator('.billing-plan a[href="/register?plan='+id+'"]')).toHaveCount(1)
 for(const image of await page.locator('main img').all()){await image.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true)}
 if(info.project.name==='1440'){
  await expect(nav).toBeVisible();await nav.getByRole('button',{name:'Порівняння',exact:true}).click()
  await expect.poll(()=>page.locator('#features').evaluate(e=>Math.round(e.getBoundingClientRect().top))).toBeGreaterThan(70)
  await expect.poll(()=>page.locator('#features').evaluate(e=>Math.round(e.getBoundingClientRect().top))).toBeLessThan(140)
  await expect(nav.getByRole('button',{name:'Порівняння',exact:true})).toHaveAttribute('aria-current','true')
 }else await expect(nav).toBeHidden()
 await page.evaluate(()=>scrollTo(0,0));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:info.outputPath('landing.png'),fullPage:true})
})
test('selected plan stays hidden in the unchanged registration form',async({page})=>{await mockService(page,'guest');await page.goto('/register?plan=solo');await expect(page.getByRole('heading',{name:'Заявка на підключення'})).toBeVisible();await expect(page.locator('input[type=hidden][name=selected_plan]')).toHaveValue('solo')})
test('Solo menu and direct links show a clear upgrade screen',async({page})=>{
 await mockService(page,'owner',{plan:'solo'});await page.goto('/app/work/calendar');await expect(page.locator('.app-shell')).toBeVisible();await expect(page.getByRole('button',{name:'Канбан',exact:true})).toHaveCount(0)
 for(const path of ['warehouse','team','analytics','work/kanban']){await page.goto('/app/'+path);await expect(page.getByRole('heading',{name:'Доступно на тарифі Студія'})).toBeVisible();await expect(page.getByRole('link',{name:'Звернутися в Telegram'})).toBeVisible()}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
test('landing English contains no untranslated new page text',async({page})=>{
 await mockService(page,'guest');await page.addInitScript(()=>localStorage.setItem('detailflow.locale','en'));await page.goto('/');await expect(page.getByRole('heading',{name:'Run your studio without spreadsheets'})).toBeVisible()
 const text=await page.locator('.landing').innerText();expect(text).not.toMatch(/[А-Яа-яІіЄєЇїҐґ]/)
})
test('desktop dots reserve content space at 1024 pixels',async({page})=>{
 await page.setViewportSize({width:1024,height:900});await mockService(page,'guest');await page.goto('/');await expect(page.locator('.lp-section-nav')).toBeVisible()
 const right=await page.locator('.lp-section-nav').boundingBox();for(const section of await page.locator('[data-nav-label]').all()){const box=await section.boundingBox();expect(box!.x+box!.width).toBeLessThan(right!.x)}
})
