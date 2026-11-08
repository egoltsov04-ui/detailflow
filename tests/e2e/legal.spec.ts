import {test,expect} from '@playwright/test'
import {mockService} from './fixtures'
test('registration needs consent and records it',async({page})=>{
 await mockService(page,'guest');await page.goto('/register')
 await page.getByLabel('Ваше ім’я').fill('Олег');await page.getByLabel('Назва студії').fill('Shine');await page.getByLabel('Телефон').fill('+380671112233')
 await page.getByLabel('Нік / контакт у месенджері').fill('@shine');await page.getByLabel('Email').fill('o@shine.test');await page.getByLabel('Пароль').fill('Strong-pass-1')
 const consent=page.getByRole('checkbox',{name:/Погоджуюсь з/})
 await expect(consent).not.toBeChecked()
 await page.getByRole('button',{name:'Надіслати заявку'}).click()
 expect(await consent.evaluate((e:HTMLInputElement)=>e.validity.valueMissing)).toBe(true)
 await consent.check()
 const [request]=await Promise.all([page.waitForRequest(r=>r.url().includes('/auth/v1/signup')),page.getByRole('button',{name:'Надіслати заявку'}).click()])
 expect(request.postDataJSON().data).toMatchObject({terms_version:'2026-11-08',studio_name:'Shine'})
 expect(Date.parse(request.postDataJSON().data.terms_accepted_at)).toBeGreaterThan(0)
})
test('legal pages open and are linked from the landing',async({page})=>{
 await mockService(page,'guest');await page.goto('/')
 for(const [name,h1] of [['Політика конфіденційності','Політика конфіденційності Detailflow'],['Умови користування','Умови користування Detailflow (публічна оферта)']]){
  await page.goto('/');await page.locator('.lp-legal').getByRole('link',{name}).click()
  await expect(page.getByRole('heading',{level:1,name:h1})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }
})
