import {test,expect,type Page} from '@playwright/test'
import {mockService} from './fixtures'
const noOverflow=async(page:Page)=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
for(const name of ['Мої роботи','Зміни й зарплата'])test('master tab '+name,async({page},info)=>{await mockService(page,'master');await page.goto('/app');await page.getByRole('button',{name,exact:true}).click();await expect(page.locator('.wf-master')).toBeVisible();await noOverflow(page);await page.screenshot({path:info.outputPath('screen.png'),fullPage:true})})
for(const status of ['assigned','in_progress','waiting','review','approved'])test('master stage '+status,async({page},info)=>{
 await mockService(page,'master',{status,reason:status==='waiting'?'Приберіть сліди на капоті':''});await page.goto('/app');await page.getByRole('button',{name:'Мої роботи',exact:true}).click()
 if(status==='waiting')await page.getByRole('button',{name:'Повернені',exact:true}).click()
 await page.getByRole('button',{name:'Відкрити замовлення',exact:true}).click();const card=page.locator('.master-stage-card');await expect(card).toBeVisible()
 if(status==='assigned'||status==='waiting'){const action=card.getByRole('button',{name:status==='assigned'?'Почати роботи':'Продовжити роботу',exact:true}).filter({visible:true});await expect(action).toBeVisible();const box=await action.boundingBox();expect(box!.y+box!.height).toBeLessThanOrEqual(info.project.use.viewport!.height!);expect(box!.height).toBeGreaterThanOrEqual(44);if(status==='waiting')await expect(card.getByText('Приберіть сліди на капоті')).toBeVisible();await action.click();await expect(card.getByText(/Залишилось/)).toBeVisible()}
 if(status==='review'||status==='approved'){await expect(card.getByText(status==='review'?'Очікує підтвердження':'Завершено',{exact:true})).toBeVisible();await expect(card.locator('.master-stage-action')).toHaveCount(0);await expect(card.locator('input[type=file]')).toHaveCount(0)}
 if(status==='in_progress'){await expect(card.getByText(/Залишилось/)).toBeVisible();await card.getByRole('button',{name:'Здати на перевірку',exact:true}).click();await expect(card.getByText('Очікує підтвердження',{exact:true})).toBeVisible()}
 await noOverflow(page);await page.screenshot({path:info.outputPath('stage.png'),fullPage:true})
})
test('return notification opens work and daily view avoids history',async({page})=>{await mockService(page,'master',{status:'waiting',reason:'Повторіть перевірку'});await page.goto('/app');await expect(page.getByRole('button',{name:'Відкрити замовлення',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Сповіщення',exact:true}).click();await page.locator('.master-return-notification').click();await expect(page.locator('.master-return')).toContainText('Повторіть перевірку')})
test('support summary, table, payment and password confirmation',async({page},info)=>{
 const calls=await mockService(page,'super_admin');await page.goto('/admin');await expect(page.getByRole('heading',{name:'Стан платформи',exact:true})).toBeVisible();await expect(page.getByText('1 970 ₴',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Студії та підписки',exact:true}).click();await expect(page.locator('.ui-table')).toBeVisible();await page.getByRole('button',{name:'Нова студія без підписки',exact:true}).click();await page.getByRole('button',{name:'Додати оплачений період',exact:true}).click();await page.getByLabel('Сума, ₴',{exact:true}).fill('690');await page.getByRole('button',{name:'Зберегти оплату та продовжити'}).click();await expect(page.getByRole('heading',{name:'Підтвердіть зміну доступу'})).toBeVisible();expect(calls.some(c=>c.name==='support_add_payment')).toBe(false)
 await page.getByLabel('Пароль',{exact:true}).fill('Test-password');await page.getByRole('button',{name:'Підтвердити',exact:true}).click();await page.getByLabel('Код автентифікації').fill('123456');await page.getByRole('button',{name:'Підтвердити',exact:true}).click();await expect(page.getByText('Оплату збережено, доступ продовжено',{exact:true})).toBeVisible();expect(calls.filter(c=>c.name==='support_add_payment')).toHaveLength(1);await noOverflow(page);await page.screenshot({path:info.outputPath('support.png'),fullPage:true})
})
test('support requires TOTP before loading studios',async({page})=>{const calls=await mockService(page,'super_admin',{aal:'aal1'});await page.goto('/admin');await expect(page.getByRole('heading',{name:'Захищений вхід підтримки'})).toBeVisible();expect(calls.some(c=>c.name==='support_studios_page'||c.name==='support_platform_summary')).toBe(false);await noOverflow(page)})
test('support workspace tabs, status badges and studio table stay styled and readable',async({page},info)=>{
 await mockService(page,'super_admin');await page.goto('/admin');await page.getByRole('button',{name:'Студії та підписки',exact:true}).click()
 const table=page.locator('.support-workspace .ui-table');await expect(table).toBeVisible()
 const surface=await page.evaluate(()=>innerWidth<=767)?table.locator('tbody tr'):table
 expect(await surface.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(34, 38, 47)')
 const searchField=page.locator('.support-search .ui-field'),searchFieldBox=await searchField.boundingBox(),searchInputBox=await searchField.locator('input').boundingBox();expect(searchInputBox&&searchFieldBox&&searchInputBox.y).toBeGreaterThan(searchFieldBox?.y||0)
 const badge=page.locator('.support-badge').first(),badgeBox=await badge.boundingBox(),cellBox=await badge.locator('xpath=ancestor::td').boundingBox();expect(badgeBox&&cellBox&&badgeBox.x+badgeBox.width).toBeLessThanOrEqual((cellBox?.x||0)+(cellBox?.width||0)+1)
 await page.screenshot({path:info.outputPath('support-studios.png'),fullPage:true})
 await page.getByRole('button',{name:'Нова студія без підписки',exact:true}).click()
 const founder=page.getByRole('button',{name:'Ціна засновника',exact:true});await founder.click();await expect(page.getByText(/спеціальна ціна підписки/)).toBeVisible()
 expect(await founder.evaluate(el=>getComputedStyle(el).borderColor)).not.toBe('rgb(118, 118, 118)');await noOverflow(page)
 await page.screenshot({path:info.outputPath('support-founder-price.png'),fullPage:true})
})
test('support TOTP setup keeps the QR visible until the first code is verified',async({page})=>{
 await mockService(page,'super_admin',{aal:'aal1',totpSetup:true})
 await page.goto('/admin');await page.getByRole('textbox',{name:'Пароль',exact:true}).fill('Test-password');await page.getByRole('button',{name:'Підтвердити',exact:true}).click()
 const qr=page.getByRole('img',{name:'QR-код двофакторного входу'});await expect(qr).toBeVisible();await expect(page.getByLabel('Код автентифікації')).toBeVisible()
 await page.waitForTimeout(11000);await expect(qr).toBeVisible();await expect(page.getByLabel('Код автентифікації')).toBeVisible()
})
test('master cannot access admin',async({page})=>{await mockService(page,'master');await page.goto('/admin');await expect(page.getByText(/403/)).toBeVisible();await expect(page.locator('.support-studios')).toHaveCount(0)})
