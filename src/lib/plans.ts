export const subscriptionPlans = [
 {id:'solo',name:'Solo',audience:'Майстер, що працює сам',price:390,staffLimit:1,adminLimit:0,storageGB:2,limit:'1 майстер — власник',features:{team_module:false,warehouse:false,finance_full:false,analytics_full:false,repeat_visit_reminders:false,priority_support:false}},
 {id:'studio',name:'Студія',audience:'Команда з 2–5 майстрів',price:1190,staffLimit:5,adminLimit:3,storageGB:10,limit:'До 5 активних майстрів',features:{team_module:true,warehouse:true,finance_full:true,analytics_full:true,repeat_visit_reminders:true,priority_support:false}},
 {id:'pro',name:'Pro',audience:'6+ майстрів та адміністратори',price:2490,staffLimit:null,adminLimit:null,storageGB:50,limit:'Без ліміту активних майстрів',features:{team_module:true,warehouse:true,finance_full:true,analytics_full:true,repeat_visit_reminders:true,priority_support:true}},
] as const
export type PlanId=typeof subscriptionPlans[number]['id']
export type PlanFeature=keyof typeof subscriptionPlans[number]['features']
export const planFeatures=['Календар і онлайн-запис','CRM та імпорт клієнтів','Чеки та нагадування за 24 і 2 години'] as const
export const planFor=(id:string|null|undefined)=>subscriptionPlans.find(p=>p.id===id)
export const canManageBilling=(role:string|null|undefined)=>role==='owner'||role==='admin'
export function effectivePrice(sub:{plan:string;price_override?:number|null;price_locked?:boolean;legacy_price?:number|null;legacy_price_until?:string|null;current_period_end?:string|null;trial_ends_at?:string|null},now=Date.now()){
 if(sub.price_override!=null&&(sub.price_locked||Date.parse(sub.current_period_end||sub.trial_ends_at||'')>now))return Number(sub.price_override)
 if(sub.legacy_price!=null&&sub.legacy_price_until&&Date.parse(sub.legacy_price_until)>now)return Number(sub.legacy_price)
 return planFor(sub.plan)?.price??0
}
