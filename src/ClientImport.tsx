import { useRef, useState } from 'react'
import { FileUp, CheckCircle2 } from 'lucide-react'
import { Select } from './components/Select'
import { supabase } from './lib/supabase'
import { readAllPages } from './lib/pagination'
import { importClientRows, parseClientCsv, suggestMapping, validateClientRows, type ClientImportStore, type CsvTable, type ImportMapping, type ImportResult } from './lib/clientImport'
import './client-import.css'

function databaseStore(tenantId: string): ClientImportStore {
  const db = supabase
  return {
    async load() {
      if (!db) throw new Error('No database')
      const [clients, vehicles] = await Promise.all([
        readAllPages((from, to) => db.from('clients').select('id,phone').eq('tenant_id', tenantId).order('id').range(from, to)),
        readAllPages((from, to) => db.from('vehicles').select('id,client_id,notes,make,model,plate_number').eq('tenant_id', tenantId).order('id').range(from, to)),
      ])
      if (clients.error || vehicles.error) throw new Error('Could not check existing clients')
      return { clients: clients.data!, vehicles: vehicles.data! }
    },
    async clients(rows) {
      if (!db) throw new Error('No database')
      const { data, error } = await db.from('clients').upsert(rows.map(r => ({ ...r, tenant_id: tenantId })), { onConflict: 'id', ignoreDuplicates: true }).select('id')
      if (error || !data) throw new Error('Could not save clients')
      return data.length
    },
    async vehicles(rows) {
      if (!db) throw new Error('No database')
      const { data, error } = await db.from('vehicles').upsert(rows.map(r => ({ ...r, tenant_id: tenantId })), { onConflict: 'id', ignoreDuplicates: true }).select('id')
      if (error || !data) throw new Error('Could not save vehicles')
      return data.length
    },
  }
}
export default function ClientImport({ tenantId, onComplete, store }: { tenantId: string | null; onComplete?: () => void; store?: ClientImportStore }) {
  const [table, setTable] = useState<CsvTable | null>(null), [mapping, setMapping] = useState<ImportMapping>({ name: -1, phone: -1, vehicle: -1 }), [error, setError] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(false), [filename, setFilename] = useState(''), [paste, setPaste] = useState(false), [text, setText] = useState(''), [result, setResult] = useState<ImportResult | null>(null)
  const request = useRef(0), lock = useRef(false)
  const preview = table ? validateClientRows(table, mapping) : { rows: [], errors: [] }
  function prepare(value: string, name: string) {
    setError(''); setResult(null); setTable(null)
    try { const parsed = parseClientCsv(value); setTable(parsed); setMapping(suggestMapping(parsed.headers)); setFilename(name) } catch (e) { setError(e instanceof Error ? e.message : 'Не вдалося прочитати файл.') }
  }
  async function upload(file?: File) {
    if (!file) return
    const ticket = ++request.current; setLoading(true); setError(''); setTable(null); setResult(null)
    try {
      if (file.size > 2_000_000) throw new Error('Файл завеликий. Максимум — 2 МБ.')
      if (!/\.csv$/i.test(file.name)) throw new Error('Збережіть таблицю як CSV UTF-8 та завантажте цей файл.')
      const contents = await file.text(); if (ticket === request.current) prepare(contents, file.name)
    } catch (e) { if (ticket === request.current) setError(e instanceof Error ? e.message : 'Не вдалося прочитати файл.') } finally { if (ticket === request.current) setLoading(false) }
  }
  async function commit() {
    if (lock.current || !tenantId || preview.errors.length || !preview.rows.length || result && !result.error) return
    lock.current = true; setBusy(true); setResult(null)
    try {
      const saved = await importClientRows(tenantId, preview.rows, store || databaseStore(tenantId)); setResult(saved)
      onComplete?.()
    } finally { setBusy(false); lock.current = false }
  }
  return <section className="panel client-import" aria-label="Імпорт клієнтів"><h2><FileUp size={20}/> Перенесення клієнтів за шаблоном</h2><p>Заповніть готову таблицю та перенесіть її в сервіс. До 1000 рядків, 2 МБ за один імпорт.</p>
    <ol className="import-guide"><li><span>1</span><div><b>Завантажте шаблон</b><p>Порожній CSV із готовими колонками для клієнтів та автомобілів.</p><a className="text-btn" href="/templates/detailflow-clients.csv" download="detailflow-clients.csv">Завантажити шаблон CSV</a></div></li><li><span>2</span><div><b>Заповніть у Excel або Google-таблицях</b><p>Залиште заголовки в першому рядку. Кожен наступний рядок — клієнт та його авто. Для кількох авто повторіть телефон клієнта в окремих рядках.</p></div></li><li><span>3</span><div><b>Збережіть CSV UTF-8 та завантажте сюди</b><p>Перевірте попередній перегляд і натисніть «Підтвердити імпорт».</p></div></li></ol>
    <details className="import-template-help"><summary>Як заповнити колонки шаблону</summary><dl><div><dt>Ім’я · обов’язково</dt><dd>Ім’я та прізвище або назва клієнта.</dd></div><div><dt>Телефон · обов’язково</dt><dd>Задайте текстовий формат колонки, щоб зберегти «+» і початкові нулі. Вкажіть міжнародний номер із кодом країни, наприклад +380…</dd></div><div><dt>Авто · необов’язково</dt><dd>Марка, модель і номер одним текстом, наприклад BMW X5 · AA 1234 AA. Якщо авто поки невідоме, залиште поле порожнім.</dd></div></dl><p>У файлі немає демонстраційних клієнтів. Переносяться лише заповнені вами рядки. Послуги, склад і фінансові дані цей шаблон не імпортує.</p></details>
    <label className="import-file-label">Завантажити заповнений шаблон або свій CSV<input type="file" accept=".csv,text/csv" disabled={busy || loading} onChange={e => { void upload(e.target.files?.[0]); e.currentTarget.value = '' }}/></label>
    <button type="button" className="text-btn" disabled={busy || loading} onClick={() => setPaste(v => !v)} aria-expanded={paste}>Або вставити дані з таблиці</button>
    {paste && <div className="import-paste"><label>Дані разом із заголовками<textarea disabled={busy || loading} rows={5} placeholder="Ім’я,Телефон,Авто" value={text} onChange={e => setText(e.target.value)}/></label><button type="button" className="text-btn" disabled={busy || loading || !text.trim()} onClick={() => prepare(text, 'Вставлені дані')}>Перевірити дані</button></div>}
    {loading && <p role="status">Читаємо файл…</p>}{error && <p className="import-error" role="alert">{error}</p>}
    {table && <div className="import-review"><h3>{filename}</h3><p>Рядків у файлі: {table.rows.length}. Обов’язкові поля: ім’я та телефон. Інші колонки, крім авто, не переносяться.</p><div className="import-mapping">{(['name', 'phone', 'vehicle'] as const).map(field => <label key={field}>{({ name: 'Ім’я клієнта', phone: 'Телефон', vehicle: 'Авто (необов’язково)' })[field]}<Select disabled={busy || !!result && !result.error} value={mapping[field]} onChange={e => { setMapping(m => ({ ...m, [field]: Number(e.target.value) })); setResult(null) }}><option value={-1}>{field === 'vehicle' ? 'Не імпортувати' : 'Оберіть колонку'}</option>{table.headers.map((h, i) => <option value={i} key={i}>{h || 'Колонка ' + (i + 1)}</option>)}</Select></label>)}</div>
      {!!preview.errors.length && <div className="import-error" role="alert"><p>Виправте дані перед імпортом:</p><ul>{preview.errors.slice(0, 5).map(e => <li key={e}>{e}</li>)}</ul>{preview.errors.length > 5 && <p>Ще помилок: {preview.errors.length - 5}</p>}</div>}
      {!!preview.rows.length && <><div className="import-table-scroll" tabIndex={0} role="region" aria-label="Попередній перегляд клієнтів"><table><thead><tr><th>Ім’я</th><th>Телефон</th><th>Авто</th></tr></thead><tbody>{preview.rows.slice(0, 10).map((row, i) => <tr key={i}><td>{row.name}</td><td>{row.phone}</td><td>{row.vehicle || '—'}</td></tr>)}</tbody></table></div><small>Показано {Math.min(10, preview.rows.length)} з {preview.rows.length} коректних рядків.</small></>}
      <p>Наявних клієнтів зіставляємо за телефоном. Їхні дані не перезаписуємо; додаємо лише відсутні авто.</p>
      {!tenantId && <p className="import-error">Для імпорту увійдіть до акаунта студії.</p>}
      {result && <div className={result.error ? 'import-error' : 'import-success'} role={result.error ? 'alert' : 'status'}>{!result.error && <CheckCircle2 size={18}/>}<p>{result.error || 'Імпорт завершено.'}<br/>Додано клієнтів: {result.clients}. Автомобілів: {result.vehicles}. Рядків зі збігом телефону: {result.matched}.</p></div>}
      <button type="button" className="primary" disabled={!tenantId || busy || loading || !!preview.errors.length || !preview.rows.length || !!result && !result.error} onClick={() => void commit()}>{busy ? 'Імпортуємо… Не закривайте сторінку' : result && !result.error ? 'Імпорт завершено' : result?.error ? 'Повторити імпорт' : 'Підтвердити імпорт'}</button>
    </div>}
  </section>
}
