export const subscriptionPlans = [
 {id:'start',name:'Start',price:690,staffLimit:3,limit:'До 3 активних майстрів'},
 {id:'studio',name:'Studio',price:1490,staffLimit:10,limit:'До 10 активних майстрів'},
 {id:'pro',name:'Pro',price:2990,staffLimit:null,limit:'Без ліміту активних майстрів'},
] as const
export const planFeatures=['Календар і онлайн-запис','Замовлення, чек-листи та перевірка робіт','CRM та імпорт клієнтів','Кабінети майстрів, зміни та зарплата','Склад, фінанси, аналітика та чеки'] as const
export const canManageBilling=(role:string|null|undefined)=>role==='owner'||role==='admin'
