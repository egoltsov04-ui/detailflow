import {test,expect,type Page} from '@playwright/test'
import {pages,legacyRoutes} from '../../src/lib/navigation'
import {mockService} from './fixtures'
const runtimeErrors=new WeakMap<Page,string[]>()
test.beforeEach(({page})=>{const errors:string[]=[];runtimeErrors.set(page,errors);page.on('pageerror',e=>errors.push(e.message))})
test.afterEach(async({page})=>{expect(runtimeErrors.get(page)).toEqual([]);await expect(page.getByText('Не вдалося відкрити сторінку',{exact:true})).toHaveCount(0)})
async function layout(page:Page){
 expect(await page.locator('.overlay .modal:visible').count()).toBeLessThanOrEqual(1)
 const result=await page.evaluate(()=>{
 const clipped:string[]=[]
 for(const el of document.querySelectorAll<HTMLElement>('p,h1,h2,h3,small,label,button,td,span')){
 const r=el.getBoundingClientRect(),style=getComputedStyle(el)
 if(!r.width||!r.height||style.visibility==='hidden'||el.closest('[aria-hidden="true"],.select-native')||r.right<0||r.left>innerWidth)continue
 if((el.scrollWidth>el.clientWidth+2&&['hidden','clip'].includes(style.overflowX)&&style.textOverflow!=='ellipsis')||(el.scrollHeight>el.clientHeight+2&&['hidden','clip'].includes(style.overflowY)))clipped.push((el.textContent||'').slice(0,100))
 }
 return {width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,clipped}
 })
 expect(result.width,JSON.stringify(result)).toBeLessThanOrEqual(result.viewport)
 expect(result.clipped).toEqual([])
}
for(const [name,url] of Object.entries(pages))test('owner '+name,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mockService(page);await page.goto(url);await expect(page.locator('.app-shell')).toBeVisible();await page.waitForTimeout(250);await expect(page.getByText('Не вдалося відкрити сторінку',{exact:true})).toHaveCount(0);await layout(page);expect(errors).toEqual([]);await page.screenshot({path:info.outputPath('screen.png'),fullPage:true})
})
for(const url of ['/','/app','/login','/register','/admin','/?book=test'])test('public '+url,async({page},info)=>{await mockService(page,'guest');await page.goto(url);await expect(page.locator('h1,h2').first()).toBeVisible();await page.waitForTimeout(200);await layout(page);await page.screenshot({path:info.outputPath('screen.png'),fullPage:true})})
test('old list redirects',async({page})=>{await mockService(page);await page.goto('/app/work/list');await expect(page).toHaveURL(/\/app\/work\/kanban$/);await expect(page.getByRole('button',{name:'Список',exact:true})).toHaveCount(0)})
test('shared order, inline payment, no overlapping dialogs',async({page},info)=>{
 await mockService(page);await page.goto('/app/work/kanban');await page.getByRole('button',{name:'Відкрити замовлення',exact:true}).first().click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Внести оплату',exact:true}).click();await layout(page);await page.getByRole('button',{name:'Видалити замовлення',exact:true}).click();await expect(page.getByRole('heading',{name:'Підтвердьте дію'})).toBeVisible();await layout(page);await page.screenshot({path:info.outputPath('confirmation.png'),fullPage:true})
})
test('CRM drawer, tags, history and prefilled booking',async({page},info)=>{await mockService(page);await page.goto('/app/clients');await page.getByRole('button',{name:'Тестовий клієнт',exact:true}).click();await layout(page);await page.screenshot({path:info.outputPath('client-drawer.png'),fullPage:true});await page.getByRole('button',{name:'Новий запис',exact:true}).click();await expect(page.getByLabel('Клієнт',{exact:true})).toHaveValue('Тестовий клієнт');await expect(page.getByLabel('Телефон',{exact:true})).toHaveValue('+380000000000');await layout(page)})
test('lead conversion is prefilled',async({page})=>{await mockService(page);await page.goto('/app/clients/requests');await page.getByRole('button',{name:'Створити запис',exact:true}).click();await expect(page.getByLabel('Телефон',{exact:true})).toHaveValue('+380000000000');await expect(page.getByText('Джерело: Instagram')).toBeVisible();await layout(page)})
test('master has no billing',async({page},info)=>{const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mockService(page,'master');await page.goto('/app');await expect(page.getByText('detailflow · Кабінет майстра',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Мій календар'})).toBeVisible();await page.waitForTimeout(300);expect(errors).toEqual([]);await layout(page);await expect(page.getByText('Тариф і білінг',{exact:true})).toHaveCount(0);await page.screenshot({path:info.outputPath('master.png'),fullPage:true})})
test('archive found through header search',async({page})=>{await mockService(page);await page.goto('/app/work/kanban');await expect(page.getByText('Archived Volvo',{exact:true})).toHaveCount(0);await page.getByPlaceholder('Пошук клієнтів, авто, записів…').fill('Archived');await page.getByRole('button',{name:/Archived Volvo/}).click();await expect(page.getByRole('dialog').getByRole('heading',{name:'Archived Volvo'})).toBeVisible()})

test('receipt discount and document wrapping',async({page},info)=>{await mockService(page);await page.goto('/app/finance/documents');await page.getByRole('combobox',{name:'Підтверджене замовлення'}).click();await page.getByRole('option',{name:/BMW X5/}).click();await page.getByLabel('Знижка, ₴',{exact:true}).fill('20');await page.getByRole('heading',{name:'Чеки',exact:true}).click();await expect(page.getByText('Максимальне значення: 0.',{exact:true})).toHaveCount(0);await expect(page.getByLabel('Знижка, ₴',{exact:true})).toHaveValue('20');await layout(page);await page.screenshot({path:info.outputPath('discount.png'),fullPage:true})})
test('support subscription without prior row',async({page},info)=>{await mockService(page,'super_admin');await page.goto('/admin');await page.getByRole('button',{name:'Студії та підписки',exact:true}).click();await page.getByRole('button',{name:'Тариф і продовження',exact:true}).click();await page.getByRole('button',{name:'+1 міс.',exact:true}).click();await page.getByLabel('Причина зміни',{exact:true}).fill('Оплата підтверджена менеджером');await layout(page);await page.screenshot({path:info.outputPath('support-subscription.png'),fullPage:true})})

 test('finance opens shared order panel',async({page})=>{await mockService(page);await page.goto('/app/finance/payments');await page.getByRole('button',{name:/Mercedes-Benz GLE/}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('button',{name:'Внести оплату',exact:true})).toBeVisible();await layout(page)})
 test('master actions only inside order panel',async({page})=>{await mockService(page,'master');await page.goto('/app');await page.getByRole('button',{name:'Відкрити замовлення',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog').getByRole('heading',{name:'Комплексне полірування',exact:true})).toBeVisible();await layout(page)})

test('billing plans and manager note never overlap',async({page})=>{await mockService(page);await page.goto('/app/settings/billing');await expect(page.locator('.billing-plan')).toHaveCount(3);const cards=await page.locator('.billing-plan').all();for(const card of cards){const boxes=await card.locator(':scope > *').evaluateAll(elements=>elements.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom}}));for(let i=1;i<boxes.length;i++)expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i-1].bottom-1)}await layout(page)})

test('receipt document fits screen',async({page},info)=>{await mockService(page);await page.goto('/app/finance/documents');await page.getByRole('button',{name:'Відкрити / друкувати',exact:true}).click();await expect(page.locator('.receipt-document')).toBeVisible();await layout(page);await page.screenshot({path:info.outputPath('receipt-document.png'),fullPage:true})})
test('warehouse litre minimum increments by half',async({page})=>{const calls=await mockService(page);await page.goto('/app/warehouse');const input=page.getByRole('textbox',{name:/Мінімальний залишок/});await expect(input).toHaveValue('2');await page.getByRole('button',{name:'Збільшити значення',exact:true}).click();await expect(input).toHaveValue('2.5');await expect.poll(()=>calls.some(c=>c.name==='inventory_items'&&c.body?.min_quantity===2.5)).toBe(true);await layout(page)})
