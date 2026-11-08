import {test,expect} from '@playwright/test'
import {mockService} from './fixtures'

test('staff connect Telegram from notifications with a one-time link',async({page})=>{
 const calls=await mockService(page,'owner',{telegram:true});await page.goto('/app')
 await page.getByRole('button',{name:'Сповіщення',exact:true}).click()
 await page.getByRole('button',{name:'Підключити Telegram'}).click()
 await expect(page.getByRole('link',{name:'Відкрити бота'})).toHaveAttribute('href','https://t.me/detailflow_ua_bot?start='+'f'.repeat(32))
 expect(calls.some(c=>c.name==='create_my_telegram_link')).toBe(true)
})

test('Telegram buttons stay hidden until the server has a bot',async({page})=>{
 await mockService(page,'owner');await page.goto('/app')
 await page.getByRole('button',{name:'Сповіщення',exact:true}).click()
 await expect(page.getByText('Робочі сповіщення')).toBeVisible()
 await expect(page.getByRole('button',{name:'Підключити Telegram'})).toHaveCount(0)
})

test('client subscribes to booking reminders in Telegram after online booking',async({page})=>{
 await mockService(page,'guest',{telegram:true});await page.goto('/?book=test')
 await page.locator('.ob-service').first().click();await page.getByRole('button',{name:'Обрати час'}).click()
 await page.locator('.ob-days button').nth(1).click();await page.locator('.ob-slots button').first().click()
 await page.getByRole('button',{name:'Продовжити'}).click()
 await page.getByLabel('Ваше ім’я').fill('Олена');await page.getByLabel('Телефон').fill('+380501112233');await page.getByLabel('Email для підтвердження').fill('olena@example.com')
 await page.getByRole('button',{name:'Надіслати заявку'}).click()
 await expect(page.getByRole('link',{name:'Отримувати нагадування в Telegram'})).toHaveAttribute('href','https://t.me/detailflow_ua_bot?start='+'c'.repeat(32))
})
