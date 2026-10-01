import test from 'node:test'
import assert from 'node:assert/strict'
import { financeDay, financeLedger, financeSeries, summarizeFinance } from '../src/lib/finance.ts'
const cash=(id,amount,direction='income',rest={})=>({id,amount,direction,date:'2026-09-15',category:'Послуги',title:'Операція',method:'Картка',...rest})
const expense={id:'rent',date:'2026-09-15',amount:200,category:'Оренда',title:'Оренда',method:'Переказ'}
const earning={id:'e1',staffId:'master',amount:300,paidAmount:100,status:'accrued',accruedAt:'2026-09-15T10:00:00Z'}
const payout={id:'p1',earning_id:'e1',amount:100,created_at:'2026-09-15T10:00:00Z',method:'cash'}
test('cash profit counts expenses and actual payouts once, not salary accruals',()=>{
 const ledger=financeLedger([cash('receipt',1000),cash('salary',100,'expense',{payoutId:'p1'}),cash('legacy',300,'expense',{isAccrual:true})],[expense],[payout])
 const report=summarizeFinance(ledger,[earning],'2026-09-01','2026-09-30')
 assert.equal(report.income,1000);assert.equal(report.expense,300);assert.equal(report.profit,700)
 assert.equal(report.salaryPaid,100);assert.equal(report.accrued,300);assert.equal(report.due,200)
 assert.equal(report.rows.length,3);assert.deepEqual(report.categories,[{name:'Оренда',value:200},{name:'Зарплата',value:100}])
})
test('payout arriving before cash refresh gives the same total after refresh',()=>{
 const before=summarizeFinance(financeLedger([],[],[payout]),[],'','')
 const after=summarizeFinance(financeLedger([cash('pay',100,'expense',{payoutId:'p1'})],[],[payout]),[],'','')
 assert.equal(before.expense,100);assert.equal(before.profit,after.profit)
})
test('salary accrual period differs from payout period and void earnings do not count',()=>{
 const ledger=financeLedger([],[],[{...payout,created_at:'2026-10-01T10:00:00Z'}])
 const earnings=[earning,{...earning,id:'void',status:'void',amount:9999}]
 const sep=summarizeFinance(ledger,earnings,'2026-09-01','2026-09-30'),oct=summarizeFinance(ledger,earnings,'2026-10-01','2026-10-31')
 assert.equal(sep.accrued,300);assert.equal(sep.salaryPaid,0);assert.equal(oct.accrued,0);assert.equal(oct.salaryPaid,100);assert.equal(oct.due,200)
})
test('money uses cents, manual salary is included, and Kyiv midnight is respected',()=>{
 assert.equal(financeDay('2026-09-30T21:30:00Z'),'2026-10-01')
 const result=summarizeFinance(financeLedger([cash('a',0.1),cash('b',0.2),cash('c',0.1,'expense',{category:'Зарплата'})],[]),[],'','')
 assert.equal(result.income,.3);assert.equal(result.profit,.2);assert.equal(result.salaryPaid,.1)
})
test('chart fills zero days and aggregates long periods by month with negative profit',()=>{
 const rows=financeLedger([cash('a',100),cash('b',200,'expense')],[])
 const series=financeSeries(rows,'2026-09-14','2026-09-16')
 assert.equal(series.length,3);assert.equal(series[0].income,0);assert.equal(series[1].profit,-100)
 const months=financeSeries(rows,'2026-08-01','2026-10-31')
 assert.equal(months.length,3);assert.equal(months[1].profit,-100)
 assert.deepEqual(financeSeries(rows,'2026-10-01','2026-09-01'),[])
})
test('date bounds are inclusive and empty period has no fictitious income',()=>{
 const ledger=financeLedger([cash('a',100),cash('b',200,'income',{date:'2026-09-16'})],[])
 assert.equal(summarizeFinance(ledger,[],'2026-09-15','2026-09-15').income,100)
 assert.equal(summarizeFinance(ledger,[],'2026-10-01','2026-10-31').profit,0)
 assert.equal(summarizeFinance([],[],'','').due,0)
})
test('linked payout keeps Kyiv date across refreshes at the month boundary',()=>{
 const p={...payout,created_at:'2026-09-30T22:00:00Z'}
 const before=financeLedger([],[],[p]),after=financeLedger([cash('p',100,'expense',{payoutId:'p1',date:'2026-09-30'})],[],[p])
 assert.equal(before[0].date,'2026-10-01');assert.equal(after[0].date,before[0].date)
 assert.equal(summarizeFinance(after,[],'2026-09-01','2026-09-30').salaryPaid,0)
 assert.equal(summarizeFinance([], [{...earning,status:'paid',paidAmount:undefined}],'','').due,0)
})

test('financial dates and earnings use the studio zone at month boundaries',()=>{
 const stamp='2026-09-30T22:30:00Z',p={...payout,created_at:stamp},e={...earning,accruedAt:stamp}
 assert.equal(financeDay(stamp,'Europe/Kyiv'),'2026-10-01')
 assert.equal(financeDay(stamp,'Europe/London'),'2026-09-30')
 const london=financeLedger([],[],[p],'Europe/London'),kyiv=financeLedger([],[],[p],'Europe/Kyiv')
 assert.equal(summarizeFinance(london,[e],'2026-09-01','2026-09-30','Europe/London').accrued,300)
 assert.equal(summarizeFinance(kyiv,[e],'2026-09-01','2026-09-30','Europe/Kyiv').accrued,0)
 assert.equal(london[0].date,'2026-09-30');assert.equal(kyiv[0].date,'2026-10-01')
})
