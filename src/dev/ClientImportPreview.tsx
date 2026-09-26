import { useState } from 'react'
import ClientImport from '../ClientImport'
import type { ClientImportStore, ExistingImportClient, ExistingImportVehicle } from '../lib/clientImport'

const clients: ExistingImportClient[] = [], vehicles: ExistingImportVehicle[] = []
let fail = false
const store: ClientImportStore = {
  async load() { return { clients: [...clients], vehicles: [...vehicles] } },
  async clients(rows) { let count = 0; for (const row of rows) if (!clients.some(c => c.id === row.id)) { clients.push(row); count++ } return count },
  async vehicles(rows) { if (fail) { fail = false; throw new Error('Test failure') } let count = 0; for (const row of rows) if (!vehicles.some(c => c.id === row.id)) { vehicles.push(row); count++ } return count },
}
export default function ClientImportPreview() {
  const [, refresh] = useState(0)
  return <section className="content"><p>Тестове сховище: {clients.length} клієнтів, {vehicles.length} авто.</p><button className="text-btn" onClick={() => { fail = true }}>Тест: помилка збереження авто</button><ClientImport tenantId="qa-import" store={store} onComplete={() => refresh(v => v + 1)}/></section>
}
