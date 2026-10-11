import {test,expect} from '@playwright/test'
import {mockService,studio} from './fixtures'
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX9sAAAAASUVORK5CYII=','base64')
test('media preview, replacement, removal and format validation',async({page},info)=>{
 const calls=await mockService(page,'master',{status:'in_progress',attachments:[{path:studio+'/job/demo.png',name:'demo.png',mime:'image/png',phase:'after'}]});await page.goto('/app');await page.getByRole('button',{name:'Мої роботи',exact:true}).click();await page.getByRole('button',{name:'Відкрити замовлення',exact:true}).click()
 await page.getByRole('button',{name:'Відкрити файл: demo.png',exact:true}).click();await expect(page.locator('.evidence-viewer img')).toBeVisible();await page.locator('.evidence-viewer').getByRole('button',{name:'Закрити',exact:true}).click()
 await page.getByLabel('Файли після роботи',{exact:true}).setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('bad')});await expect(page.getByRole('alert')).toContainText('Оберіть JPG')
 await page.getByLabel('Замінити: demo.png',{exact:true}).setInputFiles({name:'after.png',mimeType:'image/png',buffer:png});await expect(page.getByRole('button',{name:'Відкрити файл: after.png',exact:true})).toBeVisible()
 await page.locator('.evidence-file-actions').getByRole('button',{name:'Видалити',exact:true}).click();await page.getByRole('button',{name:'Підтвердити',exact:true}).click();await expect(page.locator('.evidence-file')).toHaveCount(0)
 expect(calls.filter(c=>c.name==='save_job_evidence').map(c=>c.body.payload.action)).toEqual(['media','remove']);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('media.png'),fullPage:true})
})
test('Solo executes work without salary or review and has own schedule',async({page})=>{
 const calls=await mockService(page,'owner',{plan:'solo',status:'assigned'});await page.goto('/app/work/calendar');await page.getByRole('button',{name:'Відкрити замовлення',exact:true}).first().click();await page.getByRole('button',{name:'Почати',exact:true}).click();await expect(page.getByRole('button',{name:'Завершити',exact:true})).toBeVisible();await page.getByRole('button',{name:'Завершити',exact:true}).click();await expect(page.getByText('Завершено',{exact:true})).toBeVisible();expect(calls.filter(c=>c.name==='solo_work_action').map(c=>c.body.action_input)).toEqual(['start','complete']);await expect(page.getByRole('button',{name:'Здати на перевірку',exact:true})).toHaveCount(0)
 await page.goto('/app/settings');await expect(page.getByRole('heading',{name:'Мій робочий графік'})).toBeVisible();await expect(page.getByLabel('Нагадування про повторний візит',{exact:true})).toBeDisabled()
})
