import {test,expect} from '@playwright/test'
import {mockService,baseOrder,studio} from './fixtures'

test('bay states show order details, elapsed time and open the shared order',async({page},info)=>{
 await mockService(page)
 const start=Date.now()
 await page.route('**/rest/v1/studio_posts*',route=>route.fulfill({json:Array.from({length:4},(_,i)=>({id:i?'post-'+i:'post',studio_id:studio,name:'Пост '+(i+1),position:i+1}))}))
 await page.route('**/rest/v1/rpc/get_studio_orders',route=>route.fulfill({json:[
  {...baseOrder,status:'in_progress',started_at:new Date(start-30*60000).toISOString()},
  {...baseOrder,id:'late',post_id:'post-1',status:'in_progress',started_at:new Date(start-150*60000).toISOString()},
  {...baseOrder,id:'assigned',post_id:'post-2',status:'assigned',started_at:null}
 ]}))
 await page.goto('/app')
 const cards=page.locator('.post-card')
 await expect(cards).toHaveCount(4)
 await expect(cards.nth(0)).toContainText('Mercedes-Benz GLE')
 await expect(cards.nth(0).locator('.post-timing')).toContainText('01:30')
 await expect(cards.nth(1)).toHaveClass(/is-overdue/)
 await expect(cards.nth(1).locator('.post-timing')).toContainText('Прострочено')
 await expect(cards.nth(2).locator('.post-status')).toHaveText('Очікує початку')
 await expect(cards.nth(3)).toContainText('Готовий до роботи')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.locator('.studio-posts').screenshot({path:info.outputPath('studio-bays.png')})
 await cards.first().click()
 await expect(page.getByRole('dialog')).toBeVisible()
})

test('billing presents current plan, real limits and renewal link',async({page},info)=>{
 await mockService(page)
 await page.goto('/app/settings/billing')
 const current=page.locator('.billing-plan-current')
 await expect(current).toContainText('Ваш тариф')
 await expect(current.locator('.plan-price')).toContainText('1')
 await expect(current.getByRole('link',{name:'Продовжити тариф'})).toHaveAttribute('href',new RegExp(studio))
 await expect(page.locator('.billing-plan').first()).toContainText('Команда та склад — у тарифах Студія і Pro.')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.locator('.billing-plans').screenshot({path:info.outputPath('plans.png')})
})
