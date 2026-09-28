/** Cash accounting: receipts and actual expenses, never order totals or accruals. */
export type FinanceCash = {id:string|number;date:string;direction:'income'|'expense';amount:number;category:string;title:string;method:string;payoutId?:string|null;isAccrual?:boolean}
export type FinanceExpense = {id:string|number;date:string;amount:number;category:string;title:string;method:string}
export type FinanceEarning = {id:string;staffId:string;amount:number;paidAmount?:number;status:string;accruedAt:string}
export type FinancePayout = {id:string;earning_id:string;amount:number;created_at:string;method:string}
export type FinanceRow = FinanceCash & {source:'cash'|'expense'|'payout';salary:boolean}
export const cents=(amount:number)=>Math.round(amount*100)
export function financeDay(value:string){
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value
  const date=new Date(value)
  if(!Number.isFinite(date.getTime()))return ''
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(p=>[p.type,p.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
export const inPeriod=(date:string,from:string,to:string)=>!!date&&(!from||date>=from)&&(!to||date<=to)
const salaryCategory=(value:string)=>/зарплат|заробіт|оплата праці/i.test(value)
export function financeLedger(cash:FinanceCash[],expenses:FinanceExpense[],payouts:FinancePayout[]=[]):FinanceRow[]{
  const payoutDates=new Map(payouts.map(p=>[p.id,financeDay(p.created_at)]))
  const rows:FinanceRow[]=cash.filter(r=>!r.isAccrual).map(r=>({...r,id:`cash:${r.id}`,date:(r.payoutId&&payoutDates.get(r.payoutId))||financeDay(r.date),source:'cash',salary:!!r.payoutId||salaryCategory(r.category)}))
  rows.push(...expenses.map(r=>({...r,id:`expense:${r.id}`,date:financeDay(r.date),direction:'expense' as const,source:'expense' as const,salary:salaryCategory(r.category)})))
  const linked=new Set(cash.filter(r=>!r.isAccrual).map(r=>r.payoutId).filter(Boolean))
  // The payout and its cash entry can arrive on different refreshes. Count once by ID.
  for(const p of payouts)if(!linked.has(p.id))rows.push({id:`payout:${p.id}`,payoutId:p.id,date:financeDay(p.created_at),direction:'expense',source:'payout',salary:true,amount:p.amount,category:'Зарплата майстрів',title:'Виплата за роботу',method:({cash:'Готівка',card:'Картка',transfer:'Переказ'} as Record<string,string>)[p.method]||p.method})
  return rows.sort((a,b)=>b.date.localeCompare(a.date)||String(a.id).localeCompare(String(b.id)))
}
export function summarizeFinance(ledger:FinanceRow[],earnings:FinanceEarning[],from:string,to:string){
  const rows=ledger.filter(r=>inPeriod(r.date,from,to)),valid=earnings.filter(e=>e.status!=='void')
  const sum=(r:FinanceRow[])=>r.reduce((n,r)=>n+cents(r.amount),0)/100
  const income=sum(rows.filter(r=>r.direction==='income')),expense=sum(rows.filter(r=>r.direction==='expense')),salaryPaid=sum(rows.filter(r=>r.direction==='expense'&&r.salary))
  const accrued=valid.filter(e=>inPeriod(financeDay(e.accruedAt),from,to)).reduce((n,e)=>n+cents(e.amount),0)/100
  const due=valid.reduce((n,e)=>n+Math.max(0,cents(e.amount)-cents(e.paidAmount??(e.status==='paid'?e.amount:0))),0)/100
  const categories=new Map<string,number>()
  for(const r of rows.filter(r=>r.direction==='expense')){const key=r.salary?'Зарплата':r.category||'Інше';categories.set(key,(categories.get(key)||0)+cents(r.amount))}
  return {rows,income,expense,salaryPaid,accrued,due,profit:(cents(income)-cents(expense))/100,operating:(cents(expense)-cents(salaryPaid))/100,categories:[...categories].map(([name,value])=>({name,value:value/100})).sort((a,b)=>b.value-a.value)}
}
export function financeSeries(rows:FinanceRow[],from:string,to:string){
  const dates=rows.map(r=>r.date).filter(Boolean).sort()
  const first=from||dates[0]||to||financeDay(new Date().toISOString()),last=to||dates.at(-1)||from||first
  if(first>last)return []
  const monthly=(Date.parse(last)-Date.parse(first))/86400000>45
  const buckets=new Map<string,{date:string;income:number;expense:number;profit:number}>()
  const cursor=new Date(`${monthly?first.slice(0,7)+'-01':first}T12:00:00Z`),end=new Date(`${last}T12:00:00Z`)
  while(cursor<=end){const date=cursor.toISOString().slice(0,monthly?7:10);buckets.set(date,{date,income:0,expense:0,profit:0});if(monthly)cursor.setUTCMonth(cursor.getUTCMonth()+1);else cursor.setUTCDate(cursor.getUTCDate()+1)}
  for(const row of rows){if(!inPeriod(row.date,first,last))continue;const bucket=buckets.get(row.date.slice(0,monthly?7:10));if(bucket)bucket[row.direction]+=cents(row.amount)}
  return [...buckets.values()].map(b=>({...b,profit:(b.income-b.expense)/100,income:b.income/100,expense:b.expense/100}))
}
