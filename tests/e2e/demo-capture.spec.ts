import {test,expect,type Page,type Locator} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
import {mockService} from './fixtures'
test.skip(process.env.CAPTURE_DEMO!=='1','Run explicitly when updating landing screenshots')
async function capture(page:Page,target:Locator,name:string){
 await page.evaluate(()=>document.fonts.ready)
 const png=await target.screenshot({animations:'disabled'})
 const webp=await page.evaluate(async data=>{const img=new Image();img.src=data;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;canvas.getContext('2d')!.drawImage(img,0,0);return canvas.toDataURL('image/webp',.88).split(',')[1]},'data:image/png;base64,'+png.toString('base64'))
 await mkdir('public/demo',{recursive:true});await writeFile('public/demo/'+name+'.webp',Buffer.from(webp,'base64'))
}
test('capture owner overview and workflow screens',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await mockService(page);await page.goto('/app');await expect(page.getByRole('heading',{name:'Пости студії'})).toBeVisible();await capture(page,page.locator('.app-shell > main'),'overview')
 await page.goto('/app/clients');await page.getByRole('button',{name:'Тестовий клієнт',exact:true}).click();await page.getByRole('button',{name:'Новий запис',exact:true}).click();await expect(page.getByLabel('Клієнт',{exact:true})).toHaveValue('Тестовий клієнт');await capture(page,page.locator('.modal:visible'),'booking')
 await page.goto('/app/work/kanban');await page.getByRole('button',{name:'Відкрити замовлення',exact:true}).first().click();await expect(page.getByRole('dialog')).toBeVisible();await capture(page,page.getByRole('dialog'),'review')
 await page.goto('/app/finance/documents');await page.getByRole('button',{name:'Відкрити / друкувати',exact:true}).click();await expect(page.locator('.receipt-document')).toBeVisible();await capture(page,page.locator('.receipt-document'),'receipt')
})
test('capture master work screen',async({page})=>{await page.setViewportSize({width:768,height:1000});await mockService(page,'master',{status:'in_progress'});await page.goto('/app');await page.getByRole('button',{name:'Мої роботи',exact:true}).click();await page.getByRole('button',{name:'Відкрити замовлення',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByText('Товщина покриття, мкм',{exact:true}).click();await capture(page,page.getByRole('dialog'),'master')})
