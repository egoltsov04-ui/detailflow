import {test,expect} from '@playwright/test'
import {mockService} from './fixtures'
test('a new order can create its client in the same form',async({page})=>{
 const calls=await mockService(page);await page.goto('/app/work/kanban')
 await page.getByRole('button',{name:/Нове замовлення/}).first().click()
 const form=page.getByRole('dialog',{name:'Нове замовлення'})
 await form.getByRole('combobox',{name:'Клієнт'}).click();await page.getByRole('option',{name:'+ Новий клієнт'}).click()
 await form.getByLabel('Ім’я клієнта').fill('Олег Новий');await form.getByLabel('Телефон',{exact:true}).fill('+380671112233')
 await form.getByLabel('Автомобіль').fill('BMW X5 AA1234BB')
 await form.getByRole('combobox',{name:/Послуга 1/}).click();await page.getByRole('option',{name:/Комплексне полірування/}).click()
 await form.getByRole('button',{name:'Створити замовлення'}).click()
 await expect.poll(()=>calls.some(c=>c.name==='create_catalog_order')).toBe(true)
 expect(calls.find(c=>c.name==='clients'&&c.body?.full_name)?.body).toMatchObject({full_name:'Олег Новий',phone:'+380671112233'})
 expect(calls.find(c=>c.name==='create_catalog_order').body.order_input).toMatchObject({client_id:'new-client',vehicle:'BMW X5 AA1234BB'})
})
