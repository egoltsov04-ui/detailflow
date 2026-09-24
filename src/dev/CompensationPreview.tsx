import TeamCompensation, { type CompensationData, type CompensationStore } from '../TeamCompensation'

const staff = ['Макс Джой', 'Армен', 'Руслан', 'Олександр з дуже довгим прізвищем', 'Віктор', 'Олена', 'Ігор'].map((name, i) => ({ id: String(i + 1), name, color: '#a7d65c' }))
const initial: CompensationData = {
  profiles: staff.map((s, i) => ({ id: s.id, percent: i === 0 ? 20 : i === 1 ? null : 30, hourly: i === 2 ? 150 : 0 })),
  services: [{ id: 'wash', name: 'Преміум мийка', category: 'Мийка', price: 1000 }, { id: 'polish', name: 'Полірування кузова та захист керамікою', category: 'Детейлінг', price: 5000 }],
  rates: [{ id: 'rule-1', staffId: '1', serviceId: 'polish', percent: null, fixedAmount: 1500 }],
}
let state = initial, failNext = false
function checkFailure() { if (failNext) { failNext = false; throw new Error('Тестова помилка збереження. Умови не змінено.') } }
const store: CompensationStore = {
  async load() { return structuredClone(state) },
  async saveBase(_tenant, profile) { checkFailure(); state = { ...state, profiles: [...state.profiles.filter(p => p.id !== profile.id), profile] }; return structuredClone(profile) },
  async saveRate(_tenant, staffId, serviceId, percent, fixedAmount) {
    checkFailure()
    const rate = percent === null && fixedAmount === null ? null : { id: staffId + serviceId, staffId, serviceId, percent, fixedAmount }
    state = { ...state, rates: [...state.rates.filter(r => r.staffId !== staffId || r.serviceId !== serviceId), ...(rate ? [rate] : [])] }
    return structuredClone(rate)
  },
}
export default function CompensationPreview() {
  return <><button className="text-btn" onClick={() => { failNext = true }}>Тест: помилка наступного збереження</button><TeamCompensation staff={staff} tenantId="qa-only" store={store}/></>
}
