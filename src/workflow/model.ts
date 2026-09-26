export type JobStatus = 'new'|'assigned'|'in_progress'|'waiting'|'review'|'approved'
export type Job = {
 id:string;tenant_id:string;work_order_id:string;staff_id:string|null;service_id:string|null;title:string;stage:string;position:number;status:JobStatus;
 price:number;pay_mode:'percent'|'fixed'|'hourly';rate:number;checklist:{id:string;title:string;done:boolean}[];
 attachments:{path:string;name:string}[];note:string;review_note:string;worked_seconds:number;running_since:string|null;
 submitted_at:string|null;approved_at:string|null;approved_by:string|null;version:number;created_at:string;updated_at:string;
}
export type Attendance={id:string;staff_id:string;started_at:string;ended_at:string|null;paused_at:string|null;pause_seconds:number;breaks:{from:string;to:string}[]}
export type Earning={id:string;staff_id:string;work_order_id:string;job_id:string|null;amount:number;paid_amount:number;status:string;accrued_at:string;calculation:Record<string,unknown>}
export type JobEvent={id:string;job_id:string;actor_id:string|null;event:string;detail:Record<string,unknown>;created_at:string}
export type Payout={id:string;earning_id:string;amount:number;method:string;note:string;created_at:string}
export type Service={id:string;name:string;price:number}
export type WorkflowData={jobs:Job[];shifts:Attendance[];earnings:Earning[];events:JobEvent[];payouts:Payout[];services:Service[]}
export const emptyData:WorkflowData={jobs:[],shifts:[],earnings:[],events:[],payouts:[],services:[]}
export const jobLabels:Record<JobStatus,string>={new:'Потрібно призначити',assigned:'Призначено',in_progress:'Виконується',waiting:'Пауза / доопрацювання',review:'На перевірці',approved:'Підтверджено'}
export const eventLabels:Record<string,string>={assigned:'Призначення й умови збережено',start:'Розпочато роботу',pause:'Роботу призупинено',check:'Оновлено чек-лист',submit:'Здано на перевірку',return:'Повернуто на доопрацювання',approve:'Перевірено та нараховано',note:'Додано коментар',photo:'Додано фото'}
export const money=(n:number)=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:2}).format(n)+' ₴'
export function secondsWorked(job:Pick<Job,'worked_seconds'|'running_since'>,now=Date.now()){return job.worked_seconds+(job.running_since?Math.max(0,Math.floor((now-new Date(job.running_since).getTime())/1000)):0)}
export function estimate(job:Pick<Job,'price'|'pay_mode'|'rate'|'worked_seconds'|'running_since'>,now=Date.now()){
 const amount=job.pay_mode==='fixed'?job.rate:job.pay_mode==='percent'?job.price*job.rate/100:secondsWorked(job,now)*job.rate/3600
 return Math.round((amount+Number.EPSILON)*100)/100
}
export function duration(seconds:number){return `${Math.floor(seconds/3600)} год ${Math.floor(seconds%3600/60)} хв`}
export function formula(job:Pick<Job,'price'|'pay_mode'|'rate'>){return job.pay_mode==='fixed'?`Фіксовано ${money(job.rate)}`:job.pay_mode==='percent'?`${money(job.price)} × ${job.rate}%`:`${money(job.rate)} / год активної роботи`}
export function balances(rows:Earning[]){return rows.filter(r=>r.status!=='void').reduce((a,r)=>({earned:a.earned+r.amount,paid:a.paid+r.paid_amount,due:a.due+Math.max(0,r.amount-r.paid_amount)}),{earned:0,paid:0,due:0})}
export function studioMonth(iso:string){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit'}).format(new Date(iso)).slice(0,7)}
