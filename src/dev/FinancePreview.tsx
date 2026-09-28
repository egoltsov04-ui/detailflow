import { useState, type ComponentProps } from 'react'
import FinanceHub from '../FinanceHub'
import CashFlow, {type CashTransaction} from '../CashFlow'
import { Expenses } from '../App'
import { financeDay } from '../lib/finance'

const today=financeDay(new Date().toISOString()),month=today.slice(0,7),day=(n:number)=>`${month}-${String(Math.min(Number(today.slice(8)),n)).padStart(2,'0')}`
const initial:CashTransaction[]=Array.from({length:12},(_,i)=>({id:`income-${i}`,date:day(i*2+1),direction:'income',amount:1200+(i%4)*750,method:'Картка',category:'Оплата замовлення',title:['Комплексна мийка · BMW X5','Полірування · Audi A6','Хімчистка · Mercedes GLE'][i%3],note:'',clientId:null,clientName:''}))
initial.push({id:'payout',payoutId:'p1',date:day(20),direction:'expense',amount:3200,method:'Переказ',category:'Зарплата майстрів',title:'Виплата зарплати · Руслан',note:'',clientId:null,clientName:''})
export default function FinancePreview(){
 const [cash,setCash]=useState(initial),[expenses,setExpenses]=useState<ComponentProps<typeof Expenses>['items']>([{id:1,date:day(1),amount:6000,category:'Оренда',title:'Оренда студії',method:'Переказ',note:''},{id:2,date:day(10),amount:1800,category:'Матеріали',title:'Хімія та мікрофібри',method:'Картка',note:''},{id:3,date:day(16),amount:900,category:'Маркетинг',title:'Реклама',method:'Картка',note:''}])
 return <><button className="text-btn" onClick={()=>{setCash([]);setExpenses([])}}>Тест порожнього стану</button><FinanceHub cash={cash} expenses={expenses} earnings={cash.length?[{id:'e1',staffId:'ruslan',amount:6400,paidAmount:3200,status:'accrued',accruedAt:day(20)+'T12:00:00Z'}]:[]} cashEditor={<CashFlow items={cash} clients={[]} add={async r=>{setCash(a=>[r,...a]);return ''}} remove={async id=>{setCash(a=>a.filter(r=>r.id!==id));return ''}}/>} expenseEditor={<Expenses items={expenses} add={r=>setExpenses(a=>[r,...a])} remove={id=>setExpenses(a=>a.filter(r=>r.id!==id))}/>} payroll={<p className="panel">Тестові нарахування: 6 400 ₴ · виплачено: 3 200 ₴. Дії виплати можна перевірити на стенді «Процес» → «Зарплата».</p>}/></>
}
