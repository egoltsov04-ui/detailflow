import {useEffect,useState,type FormEvent} from 'react'
import {Badge,Card,FormField,PageHeader,Table} from './components/UI'
import {Select} from './components/Select'
import {NumberInput,DateInput} from './components/FormInputs'
import {supabase} from './lib/supabase'
import {t,localeTag} from './i18n/core'

type Promo={id:string;code:string;kind:'percent'|'trial_days';value:number;valid_until:string|null;max_uses:number|null;uses:number;active:boolean;note:string;usable:boolean;created_at:string}
const bonus=(p:{kind:string;value:number})=>p.kind==='percent'?`−${p.value}% ${t('на першу оплату')}`:`+${p.value} ${t('днів пробного періоду')}`
const randomCode=()=>'DF-'+Array.from(crypto.getRandomValues(new Uint8Array(4)),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join('')

/** Support creates promo codes; an owner enters one at signup and the approval applies it once. */
export default function SupportPromoCodes(){
 const [rows,setRows]=useState<Promo[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const [code,setCode]=useState(randomCode),[kind,setKind]=useState<'percent'|'trial_days'>('percent'),[value,setValue]=useState('20'),[until,setUntil]=useState(''),[max,setMax]=useState(''),[note,setNote]=useState('')
 async function load(){if(!supabase)return;const r=await supabase.rpc('support_promo_codes');if(r.error)setError(t(r.error.message));else{setRows(r.data||[]);setError('')}}
 useEffect(()=>{void load()},[])
 async function save(id:string|null,body:{code:string;kind:string;value:number;valid_until:string|null;max_uses:number|null;active:boolean;note:string}){
  if(!supabase||busy)return false;setBusy(true);setError('')
  const r=await supabase.rpc('support_save_promo_code',{id_input:id,code_input:body.code,kind_input:body.kind,value_input:body.value,valid_until_input:body.valid_until,max_uses_input:body.max_uses,active_input:body.active,note_input:body.note})
  setBusy(false);if(r.error){setError(t(r.error.message.includes('promo_codes_code_key')?'Такий промокод уже існує':r.error.message));return false}
  await load();return true
 }
 async function create(e:FormEvent){e.preventDefault()
  if(await save(null,{code:code.trim().toUpperCase(),kind,value:Number(value),valid_until:until||null,max_uses:max?Number(max):null,active:true,note:note.trim()})){setCode(randomCode());setNote('')}
 }
 return <section className="content support-promos"><PageHeader className="page-title"><div><p>{t('Підключення студій')}</p><h1>{t('Промокоди')}</h1></div></PageHeader>
  <Card as="form" className="panel support-promo-form" onSubmit={create}><h2>{t('Новий промокод')}</h2>
   <FormField>{t('Код')}<input required value={code} pattern="[A-Za-z0-9-]{4,32}" maxLength={32} onChange={e=>setCode(e.target.value.toUpperCase())}/><small>{t('Латиниця, цифри й дефіс, 4–32 символи')}</small></FormField>
   <FormField>{t('Бонус')}<Select value={kind} onChange={e=>{const k=e.target.value as 'percent'|'trial_days';setKind(k);setValue(k==='percent'?'20':'7')}}><option value="percent">{t('Знижка на першу оплату, %')}</option><option value="trial_days">{t('Додаткові дні пробного періоду')}</option></Select></FormField>
   <FormField>{kind==='percent'?t('Знижка, %'):t('Днів')}<NumberInput required min={1} max={kind==='percent'?100:90} step={1} value={value} onChange={e=>setValue(e.target.value)}/></FormField>
   <FormField>{t('Діє до (включно), необов’язково')}<DateInput type="date" value={until} onChange={e=>setUntil(e.target.value)}/></FormField>
   <FormField>{t('Ліміт використань, необов’язково')}<NumberInput min={1} step={1} value={max} placeholder={t('Без ліміту')} onChange={e=>setMax(e.target.value)}/></FormField>
   <FormField>{t('Примітка для себе')}<input maxLength={300} value={note} placeholder={t('Наприклад: Instagram, жовтень')} onChange={e=>setNote(e.target.value)}/></FormField>
   {error&&<p role="alert" className="form-error">{error}</p>}<button className="primary" disabled={busy}>{t('Створити промокод')}</button>
  </Card>
  <Card className="panel"><h2>{t('Усі промокоди')}</h2>{rows.length?<Table rows={rows} rowKey={r=>r.id} columns={[
   {key:'code',label:t('Код'),render:r=><b>{r.code}</b>},
   {key:'bonus',label:t('Бонус'),render:r=>bonus(r)},
   {key:'until',label:t('Діє до'),render:r=>r.valid_until?new Date(r.valid_until+'T12:00:00').toLocaleDateString(localeTag()):t('Безстроково')},
   {key:'uses',label:t('Використано'),render:r=>`${r.uses}${r.max_uses?' / '+r.max_uses:''}`},
   {key:'state',label:t('Стан'),render:r=><Badge tone={r.usable?'success':'neutral'}>{t(r.usable?'Діє':!r.active?'Вимкнено':'Завершився')}</Badge>},
   {key:'note',label:t('Примітка'),render:r=>r.note||'—'},
   {key:'action',label:'',render:r=><button className="text-btn" disabled={busy} onClick={()=>void save(r.id,{code:r.code,kind:r.kind,value:r.value,valid_until:r.valid_until,max_uses:r.max_uses,active:!r.active,note:r.note})}>{t(r.active?'Вимкнути':'Увімкнути')}</button>},
  ]}/>:<p>{t('Промокодів ще немає.')}</p>}</Card>
 </section>
}
