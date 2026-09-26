export type CsvTable = { headers: string[]; rows: string[][] }
export type ClientImportRow = { name: string; phone: string; vehicle: string }
export type ImportMapping = { name: number; phone: number; vehicle: number }
export function normalizePhone(value: string): string {
  let digits = value.replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('0')) digits = '38' + digits
  if (digits.startsWith('00')) digits = digits.slice(2)
  return digits
}
export function parseClientCsv(text: string): CsvTable {
  if (text.length > 2_000_000) throw new Error('Файл завеликий. Максимум — 2 МБ.')
  if (/[\uFFFD\u0000]/.test(text)) throw new Error('Не вдалося прочитати кодування. Збережіть файл як CSV UTF-8.')
  text = text.replace(/^\uFEFF/, '')
  const separators = [',', ';', '\t']
  const counts = [0, 0, 0]; let quoted = false
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') { if (quoted && text[i + 1] === '"') i++; else quoted = !quoted }
    else if (!quoted) { if ('\r\n'.includes(text[i])) break; const n = separators.indexOf(text[i]); if (n >= 0) counts[n]++ }
  }
  const separator = separators[counts.indexOf(Math.max(...counts))]
  const records: string[][] = []; let row: string[] = [], field = '', inQuotes = false, closed = false
  function cell() { row.push(field.trim()); field = ''; closed = false }
  function record() { cell(); if (row.some(Boolean)) records.push(row); row = []; if (records.length > 1001) throw new Error('За один раз можна імпортувати до 1000 рядків.') }
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) { if (char === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false; closed = true } } else field += char; continue }
    if (char === separator) cell()
    else if (char === '\r' || char === '\n') { record(); if (char === '\r' && text[i + 1] === '\n') i++ }
    else if (char === '"' && !field && !closed) inQuotes = true
    else { if (closed || char === '"') throw new Error('Некоректні лапки в CSV. Збережіть таблицю у форматі CSV UTF-8.'); field += char }
  }
  if (inQuotes) throw new Error('У CSV є незакриті лапки.')
  if (field || row.length || closed) record()
  if (records.length < 2) throw new Error('Додайте рядок заголовків і хоча б одного клієнта.')
  const [headers, ...rows] = records
  if (headers.length > 50 || rows.some(r => r.length !== headers.length)) throw new Error('Кількість колонок у рядках відрізняється. Перевірте формат CSV.')
  return { headers, rows }
}
export function suggestMapping(headers: string[]): ImportMapping {
  const normalized = headers.map(h => h.toLowerCase().replace(/[\s_’'`-]/g, ''))
  const find = (aliases: string[]) => normalized.findIndex(h => aliases.includes(h))
  return { name: find(['імя', 'імятапрізвище', 'піб', 'клієнт', 'имя', 'фио', 'клиент', 'name', 'fullname', 'client']), phone: find(['телефон', 'номер', 'номертелефону', 'phone', 'telephone', 'mobile']), vehicle: find(['авто', 'автомобіль', 'автомобиль', 'car', 'vehicle']) }
}
export function validateClientRows(table: CsvTable, mapping: ImportMapping): { rows: ClientImportRow[]; errors: string[] } {
  if (mapping.name < 0 || mapping.phone < 0) return { rows: [], errors: ['Оберіть колонки імені та телефону.'] }
  const indices = [mapping.name, mapping.phone, mapping.vehicle].filter(i => i >= 0)
  if (new Set(indices).size !== indices.length || indices.some(i => i >= table.headers.length)) return { rows: [], errors: ['Для кожного поля оберіть окрему колонку.'] }
  const rows: ClientImportRow[] = [], errors: string[] = []
  table.rows.forEach((row, index) => {
    const name = row[mapping.name].trim(), originalPhone = row[mapping.phone].trim(), phone = normalizePhone(originalPhone), vehicle = mapping.vehicle < 0 ? '' : row[mapping.vehicle].trim()
    if (!name || name.length > 160) errors.push(`Рядок ${index + 2}: ім’я обов’язкове, до 160 символів.`)
    else if (!/^[+\d\s().-]+$/.test(originalPhone) || phone.length < 7 || phone.length > 15) errors.push(`Рядок ${index + 2}: перевірте номер телефону.`)
    else if (vehicle.length > 500) errors.push(`Рядок ${index + 2}: опис авто має бути до 500 символів.`)
    else rows.push({ name, phone: '+' + phone, vehicle })
  })
  return { rows, errors }
}

export type ExistingImportClient = { id: string; phone: string | null }
export type ExistingImportVehicle = { id: string; client_id: string; notes: string | null; make?: string | null; model?: string | null; plate_number?: string | null }
export type ClientImportStore = {
  load: () => Promise<{ clients: ExistingImportClient[]; vehicles: ExistingImportVehicle[] }>
  clients: (rows: { id: string; full_name: string; phone: string }[]) => Promise<number>
  vehicles: (rows: { id: string; client_id: string; notes: string }[]) => Promise<number>
}
export type ImportResult = { clients: number; vehicles: number; matched: number; error: string }
async function stableId(value: string) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
  hash[6] = (hash[6] & 15) | 80; hash[8] = (hash[8] & 63) | 128
  const hex = Array.from(hash.slice(0, 16), b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
export async function importClientRows(tenantId: string, rows: ClientImportRow[], store: ClientImportStore): Promise<ImportResult> {
  const result: ImportResult = { clients: 0, vehicles: 0, matched: 0, error: '' }
  try {
    if (!tenantId || !rows.length || rows.length > 1000) throw new Error('Invalid import')
    const existing = await store.load(), byPhone = new Map(existing.clients.filter(c => c.phone).map(c => [normalizePhone(c.phone!), c.id]))
    const normalizeCar = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
    const cars = new Set(existing.vehicles.flatMap(v => [v.notes, [v.make, v.model, v.plate_number].filter(Boolean).join(' ')].filter(Boolean).map(label => v.client_id + ':' + normalizeCar(label!))))
    const newClients: { id: string; full_name: string; phone: string }[] = [], newVehicles: { id: string; client_id: string; notes: string }[] = []
    for (const row of rows) {
      const phone = normalizePhone(row.phone); let clientId = byPhone.get(phone)
      if (clientId) result.matched++
      else { clientId = await stableId(`detailflow:client:${tenantId}:${phone}`); byPhone.set(phone, clientId); newClients.push({ id: clientId, full_name: row.name, phone: row.phone }) }
      const carKey = clientId + ':' + normalizeCar(row.vehicle)
      if (row.vehicle && !cars.has(carKey)) { cars.add(carKey); newVehicles.push({ id: await stableId(`detailflow:vehicle:${tenantId}:${carKey}`), client_id: clientId, notes: row.vehicle }) }
    }
    for (let i = 0; i < newClients.length; i += 100) result.clients += await store.clients(newClients.slice(i, i + 100))
    for (let i = 0; i < newVehicles.length; i += 100) result.vehicles += await store.vehicles(newVehicles.slice(i, i + 100))
  } catch { result.error = 'Імпорт перервано. Частина даних могла зберегтися. Перевірте з’єднання й повторіть імпорт: збережені клієнти зі збігом телефону та однакові авто не дублюються.' }
  return result
}
