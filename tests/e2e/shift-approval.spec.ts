import {test,expect} from '@playwright/test'
import {mockService} from './fixtures'
test('master shift start waits for confirmation',async({page})=>{
 const calls=await mockService(page,'master',{shiftRequest:'none'});await page.goto('/app')
 await page.getByRole('button',{name:'Почати зміну',exact:true}).click()
 await expect(page.locator('.wf-shift').getByText('Очікує підтвердження',{exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Скасувати запит',exact:true})).toBeVisible()
 expect(calls.some(c=>c.name==='manage_master_shift'&&c.body.action_input==='start')).toBe(true)
})
test('owner confirms a shift start request',async({page})=>{
 const calls=await mockService(page,'owner',{shiftRequest:'pending'});await page.goto('/app')
 const block=page.locator('.shift-requests');await expect(block).toBeVisible()
 await block.getByRole('button',{name:'Підтвердити',exact:true}).click()
 await expect(block).toHaveCount(0)
 expect(calls.find(c=>c.name==='decide_shift_request')?.body).toMatchObject({request_id:'shift-request',approve:true})
})
