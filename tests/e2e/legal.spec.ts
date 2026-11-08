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
test('company and legal pages open from the landing footer',async({page})=>{
 await mockService(page,'guest')
 for(const [name,h1] of [['Політика конфіденційності','Політика конфіденційності'],['Умови користування','Умови користування'],['Обмін і повернення','Умови обміну та повернення'],['Про нас','Про Detailflow'],['Контакти','Контакти']]){
  await page.goto('/');await page.locator('.site-footer').getByRole('link',{name,exact:true}).click()
  await expect(page.getByRole('heading',{level:1,name:h1})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }
 await page.goto('/terms');await expect(page.getByRole('heading',{name:'Додаток. Обробка персональних даних клієнтів студії'})).toBeVisible()
 await expect(page.getByText('безкоштовний пробний період 5 днів')).toBeVisible()
})
test('support bubble offers Telegram and email',async({page})=>{
 await mockService(page,'guest');await page.goto('/contacts')
 await page.getByRole('button',{name:'Підтримка'}).click()
 const card=page.getByRole('dialog',{name:'Підтримка'})
 await expect(card.getByRole('link',{name:'Написати в Telegram'})).toHaveAttribute('href',/^https:\/\/t\.me\//)
 await expect(card.getByRole('link',{name:'support.detailflow@gmail.com'})).toHaveAttribute('href','mailto:support.detailflow@gmail.com')
 await page.keyboard.press('Escape');await expect(card).toHaveCount(0)
})
test.describe('on an iPhone in Safari',()=>{
 test.use({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'})
 test('the app explains how to add it to the Home Screen once',async({page})=>{
  await mockService(page,'owner');await page.addInitScript(()=>{if(!sessionStorage.getItem('hint-test')){sessionStorage.setItem('hint-test','1');localStorage.removeItem('detailflow.iosInstallHint')}});await page.goto('/app')
  const hint=page.getByRole('complementary',{name:'Встановити Detailflow на iPhone'})
  await expect(hint).toBeVisible();await hint.getByRole('button',{name:'Зрозуміло'}).click();await expect(hint).toHaveCount(0)
  await page.reload();await expect(page.getByRole('complementary',{name:'Встановити Detailflow на iPhone'})).toHaveCount(0)
 })
})
