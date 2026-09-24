import { NumberInput } from './components/FormInputs'
import { Select } from './components/Select'
import { useEffect, useState } from 'react'
import { CheckCircle2, CircleDollarSign, Save } from 'lucide-react'
import { supabase } from './lib/supabase'
import './compensation.css'

type Staff = { id: string | number; name: string; color: string }
type Service = { id: string; name: string; category: string; price: number }
type Rate = { id: string; staffId: string; serviceId: string; percent: number | null; fixedAmount: number | null }
type Profile = { id: string; percent: number | null; hourly: number }
export type CompensationData = { services: Service[]; rates: Rate[]; profiles: Profile[] }
export type CompensationStore = {
  load: (tenantId: string) => Promise<CompensationData>
  saveBase: (tenantId: string, profile: Profile) => Promise<Profile>
  saveRate: (tenantId: string, staffId: string, serviceId: string, percent: number | null, fixed: number | null, existing?: Rate) => Promise<Rate | null>
}
const mapProfile = (row: { id: string; compensation_percent: number | null; hourly_rate: number }) => ({ id: row.id, percent: row.compensation_percent === null ? null : Number(row.compensation_percent), hourly: Number(row.hourly_rate || 0) })
const mapRate = (row: { id: string; staff_id: string; service_id: string; percent: number | null; fixed_amount: number | null }): Rate => ({ id: row.id, staffId: row.staff_id, serviceId: row.service_id, percent: row.percent === null ? null : Number(row.percent), fixedAmount: row.fixed_amount === null ? null : Number(row.fixed_amount) })
const database: CompensationStore = {
  async load(tenantId) {
    if (!supabase) throw new Error('Немає підключення до бази даних.')
    const [catalog, compensation, team] = await Promise.all([
      supabase.from('services').select('id,name,category,price').eq('tenant_id', tenantId).eq('active', true).order('name'),
      supabase.from('staff_service_compensation').select('id,staff_id,service_id,percent,fixed_amount').eq('tenant_id', tenantId),
      supabase.from('staff_profiles').select('id,compensation_percent,hourly_rate').eq('tenant_id', tenantId).eq('active', true),
    ])
    if (catalog.error || compensation.error || team.error) throw new Error('Не вдалося завантажити умови.')
    return { services: catalog.data.map(s => ({ ...s, price: Number(s.price) })), rates: compensation.data.map(mapRate), profiles: team.data.map(mapProfile) }
  },
  async saveBase(tenantId, profile) {
    if (!supabase) throw new Error('Немає підключення до бази даних.')
    const { data, error } = await supabase.from('staff_profiles').update({ compensation_percent: profile.percent, hourly_rate: profile.hourly }).eq('tenant_id', tenantId).eq('id', profile.id).select('id,compensation_percent,hourly_rate').single()
    if (error || !data) throw new Error('Не вдалося зберегти базові умови. Спробуйте ще раз.')
    return mapProfile(data)
  },
  async saveRate(tenantId, staffId, serviceId, percent, fixed, existing) {
    if (!supabase) throw new Error('Немає підключення до бази даних.')
    if (percent === null && fixed === null) {
      if (existing) {
        const { error } = await supabase.from('staff_service_compensation').delete().eq('tenant_id', tenantId).eq('id', existing.id).select('id').single()
        if (error) throw new Error('Не вдалося видалити правило.')
      }
      return null
    }
    const { data, error } = await supabase.from('staff_service_compensation').upsert({ tenant_id: tenantId, staff_id: staffId, service_id: serviceId, percent, fixed_amount: fixed }, { onConflict: 'staff_id,service_id' }).select('id,staff_id,service_id,percent,fixed_amount').single()
    if (error || !data) throw new Error('Не вдалося зберегти правило. Спробуйте ще раз.')
    return mapRate(data)
  },
}
const money = (value: number) => new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(value) + ' ₴'
const inputValue = (value: number | null) => value === null ? '' : String(value)
const validPercent = (value: number | null) => value === null || (Number.isFinite(value) && value >= 0 && value <= 100)

export default function TeamCompensation({ staff, tenantId, store = database }: { staff: Staff[]; tenantId: string | null; store?: CompensationStore }) {
  const [data, setData] = useState<CompensationData | null>(null), [staffId, setStaffId] = useState(''), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  useEffect(() => { if (!staff.some(s => String(s.id) === staffId)) setStaffId(String(staff[0]?.id || '')) }, [staff, staffId])
  useEffect(() => {
    let cancelled = false
    setData(null); setError('')
    if (!tenantId) { setError('Для збереження умов увійдіть до акаунта студії.'); return }
    store.load(tenantId).then(result => { if (!cancelled) setData(result) }).catch(() => { if (!cancelled) setError('Не вдалося завантажити збережені умови. Перевірте підключення та повторіть спробу.') })
    return () => { cancelled = true }
  }, [tenantId, store, retry])
  if (!staff.length) return null
  return <section className="content team-compensation"><div className="page-title"><div><p>Оплата роботи майстрів</p><h1>Ставки та процентовка</h1></div></div>
    <div className="panel compensation-intro"><CircleDollarSign size={21}/><p>Умови зберігаються окремо для кожного майстра та застосовуються до нових призначень. Для послуги можна задати власний відсоток або фіксовану суму. Уже нарахована зарплата не зміниться.</p></div>
    {error ? <div className="panel compensation-feedback" role="alert"><p>{error}</p>{tenantId && <button className="text-btn" onClick={() => setRetry(v => v + 1)}>Спробувати ще раз</button>}</div> : !data ? <p role="status">Завантажуємо збережені умови…</p> : <CompensationEditor key={tenantId + '-' + staffId} staff={staff} staffId={staffId} select={setStaffId} data={data} saveBase={async profile => {
      const saved = await store.saveBase(tenantId!, profile)
      setData(current => current && ({ ...current, profiles: [...current.profiles.filter(p => p.id !== saved.id), saved] }))
    }} saveRate={async (service, percent, fixed) => {
      const saved = await store.saveRate(tenantId!, staffId, service.id, percent, fixed, data.rates.find(r => r.staffId === staffId && r.serviceId === service.id))
      setData(current => current && ({ ...current, rates: [...current.rates.filter(r => r.staffId !== staffId || r.serviceId !== service.id), ...(saved ? [saved] : [])] }))
    }}/>}</section>
}

function CompensationEditor({ staff, staffId, select, data, saveBase, saveRate }: { staff: Staff[]; staffId: string; select: (id: string) => void; data: CompensationData; saveBase: (profile: Profile) => Promise<void>; saveRate: (service: Service, percent: number | null, fixed: number | null) => Promise<void> }) {
  const profile = data.profiles.find(p => p.id === staffId), current = staff.find(s => String(s.id) === staffId)
  const [base, setBase] = useState(inputValue(profile?.percent ?? null)), [hourly, setHourly] = useState(profile?.hourly ? String(profile.hourly) : ''), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [failed, setFailed] = useState(false)
  const dirty = (base === '' ? null : Number(base)) !== (profile?.percent ?? null) || Number(hourly || 0) !== (profile?.hourly ?? 0)
  async function run(action: () => Promise<void>, success: string) {
    setBusy(true); setMessage(''); setFailed(false)
    try { await action(); setMessage(success) } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : 'Не вдалося зберегти умови. Спробуйте ще раз.') } finally { setBusy(false) }
  }
  return <>
    <div className="panel compensation-base"><label>Майстер<Select disabled={busy} value={staffId} onChange={e => select(e.target.value)}>{staff.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}</Select></label><label>Базовий відсоток, %<NumberInput disabled={busy || !profile} min="0" max="100" step="0.01" value={base} onChange={e => setBase(e.target.value)} placeholder="Не задано"/></label><label>Погодинна ставка, ₴<NumberInput disabled={busy || !profile} min="0" step="0.01" value={hourly} onChange={e => setHourly(e.target.value)} placeholder="Без ставки"/></label><button className="primary" disabled={busy || !profile || !dirty} onClick={() => {
      const percent = base === '' ? null : Number(base), amount = Number(hourly || 0)
      if (!validPercent(percent) || !Number.isFinite(amount) || amount < 0) { setFailed(true); setMessage('Відсоток має бути від 0 до 100, ставка — не меншою за 0.'); return }
      void run(() => saveBase({ id: staffId, percent, hourly: amount }), 'Базові умови збережено.')
    }}><Save size={16}/>{busy ? 'Зберігаємо…' : 'Зберегти'}</button></div>
    {profile ? <div className="panel compensation-saved" aria-label="Збережені умови"><div className="compensation-saved-title"><CheckCircle2 size={19}/><strong>Збережено для {current?.name}</strong>{dirty && <small>Є незбережені зміни</small>}</div><dl><div><dt>Базовий відсоток</dt><dd>{profile.percent === null ? 'Не задано' : profile.percent + ' %'}</dd></div><div><dt>Погодинна ставка</dt><dd>{profile.hourly ? money(profile.hourly) + ' / год' : 'Без ставки'}</dd></div><div><dt>Послуг з власними умовами</dt><dd>{data.rates.filter(r => r.staffId === staffId && data.services.some(s => s.id === r.serviceId)).length}</dd></div></dl></div> : <p role="alert">Профіль майстра не знайдено. Оновіть список команди.</p>}
    {message && <p className={'compensation-feedback ' + (failed ? 'is-error' : '')} role={failed ? 'alert' : 'status'}>{message}</p>}
    <div className="panel compensation-table"><h2>Оплата за послугами</h2><p className="compensation-description">Під кожною послугою — збережені умови. Порожні поля означають базовий відсоток; фіксована сума має пріоритет.</p><div className="compensation-row compensation-head"><span>Послуга та збережена оплата</span><span>Ціна для клієнта</span><span>Відсоток майстра</span><span>Або фіксовано, ₴</span></div>{data.services.map(service => <RateRow key={service.id} service={service} rate={data.rates.find(r => r.staffId === staffId && r.serviceId === service.id)} base={profile?.percent ?? null} busy={busy || !profile} save={async (percent, fixed) => { await run(() => saveRate(service, percent, fixed), 'Умови для «' + service.name + '» збережено.') }}/>) }{!data.services.length && <p className="empty-state">Додайте послуги до каталогу, щоб налаштувати оплату майстрів.</p>}</div>
  </>
}
function RateRow({ service, rate, base, busy, save }: { service: Service; rate?: Rate; base: number | null; busy: boolean; save: (percent: number | null, fixed: number | null) => Promise<void> }) {
  const [percent, setPercent] = useState(inputValue(rate?.percent ?? null)), [fixed, setFixed] = useState(inputValue(rate?.fixedAmount ?? null)), [error, setError] = useState('')
  const p = percent === '' ? null : Number(percent), f = fixed === '' ? null : Number(fixed)
  const dirty = p !== (rate?.percent ?? null) || f !== (rate?.fixedAmount ?? null)
  const effective = rate?.percent ?? base
  const savedLabel = rate?.fixedAmount != null ? money(rate.fixedAmount) + ' · фіксовано' : effective !== null ? effective + ' %' + (rate?.percent == null ? ' · базовий' : ' · індивідуальний') : 'Оплату ще не задано'
  return <div className="compensation-row"><span><b>{service.name}</b><small>{service.category}</small><strong className="compensation-effective">{savedLabel}</strong>{rate?.fixedAmount == null && effective !== null && <small>{money(service.price * effective / 100)} за поточною ціною</small>}</span><span>{money(service.price)}</span><label><span className="compensation-mobile-label">Відсоток майстра</span><NumberInput aria-label={'Відсоток: ' + service.name} disabled={busy} min="0" max="100" step="0.01" value={percent} onChange={e => { setPercent(e.target.value); setError('') }} placeholder={base === null ? 'Базовий не задано' : 'Базовий: ' + base + ' %'}/></label><span className="compensation-fixed"><label className="compensation-fixed-field"><span className="compensation-mobile-label">Фіксована сума, ₴</span><NumberInput aria-label={'Фіксована оплата: ' + service.name} disabled={busy} min="0" step="0.01" value={fixed} onChange={e => { setFixed(e.target.value); setError('') }} placeholder="Не задано"/></label><button className="text-btn" disabled={busy || !dirty} onClick={() => { if (!validPercent(p) || (f !== null && (!Number.isFinite(f) || f < 0))) { setError('Відсоток: 0–100. Сума: від 0 ₴.'); return } void save(p, f) }}>Зберегти</button></span>{error && <small className="field-error" role="alert">{error}</small>}</div>
}
