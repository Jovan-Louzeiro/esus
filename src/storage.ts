import { seedData, type Data } from './model'

const keys = { patients: 'aps_pacientes', encounters: 'aps_atendimentos', vaccinations: 'aps_vacinacoes', appointments: 'aps_agenda', marker: 'aps_configuracoes' }
const empty = (): Data => ({ patients: [], encounters: [], vaccinations: [], appointments: [] })

// Validate imported data before replacing any existing training records.
export function isData(value: unknown): value is Data {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  const strings = (item: unknown, fields: string[]) => !!item && typeof item === 'object' && fields.every(field => typeof (item as Record<string, unknown>)[field] === 'string')
  const list = (key: string) => Array.isArray(data[key]) ? data[key] as unknown[] : null
  const patients = list('patients'), encounters = list('encounters'), vaccinations = list('vaccinations'), appointments = list('appointments')
  if (!patients || !encounters || !vaccinations || !appointments) return false
  const date = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  const timestamp = (value: string) => !!value && !Number.isNaN(Date.parse(value))
  if (!patients.every(p => strings(p, ['id', 'name', 'cpf', 'cns', 'birth', 'sex', 'mother', 'phone', 'email', 'cep', 'city', 'neighborhood', 'street', 'number', 'complement', 'allergies', 'conditions', 'medications']) && ['Feminino', 'Masculino', 'Outro', 'Não informado'].includes((p as { sex: string }).sex))) return false
  if (!patients.every(p => { const item = p as { id: string; name: string; birth: string }; return !!item.id && !!item.name.trim() && date(item.birth) })) return false
  if (!encounters.every(e => {
    if (!strings(e, ['id', 'patientId', 'date', 'type', 'professional', 'status', 'finishedAt'])) return false
    const item = e as Record<string, unknown>
    const priority = item.priority
    return (priority === undefined || ['red', 'orange', 'yellow', 'green', 'blue', 'unclassified'].includes(priority as string)) && !!item.id && timestamp(item.date as string) && (item.status === 'Em andamento' ? !item.finishedAt : item.status === 'Finalizado' && timestamp(item.finishedAt as string)) && strings(item.vitals, ['pressure', 'heart', 'respiratory', 'temperature', 'oxygen', 'weight', 'height', 'glucose']) && strings(item.soap, ['subjective', 'objective', 'assessment', 'plan']) && strings(item.conduct, ['guidance', 'exams', 'referral', 'returnDate', 'notes']) && (!(item.conduct as { returnDate: string }).returnDate || date((item.conduct as { returnDate: string }).returnDate))
  })) return false
  if (!vaccinations.every(v => strings(v, ['id', 'patientId', 'vaccine', 'dose', 'date', 'batch', 'manufacturer', 'unit', 'route', 'site', 'notes', 'nextDose', 'professional']))) return false
  if (!vaccinations.every(v => { const item = v as { id: string; vaccine: string; dose: string; date: string; nextDose: string }; return !!item.id && !!item.vaccine && !!item.dose && date(item.date) && (!item.nextDose || date(item.nextDose)) })) return false
  if (!appointments.every(a => strings(a, ['id', 'patientId', 'date', 'time', 'reason', 'status']) && ['Agendado', 'Em atendimento', 'Finalizado'].includes((a as { status: string }).status))) return false
  if (!appointments.every(a => { const item = a as { id: string; date: string; time: string }; return !!item.id && date(item.date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time) })) return false
  const ids = new Set(patients.map(p => (p as { id: string }).id))
  return ids.size === patients.length && [encounters, vaccinations, appointments].every(items => items.every(item => ids.has((item as { patientId: string }).patientId)) && new Set(items.map(item => (item as { id: string }).id)).size === items.length)
}

export function normalizeData(data: Data): Data {
  return { ...data, encounters: data.encounters.map(encounter => ({ ...encounter, priority: encounter.priority ?? 'unclassified' })) }
}

export function saveData(data: Data) {
  // A single snapshot makes replacement atomic, including imports and resets.
  localStorage.setItem(keys.marker, JSON.stringify({ version: 1, data }))
}
export function loadData(): Data {
  const marker = localStorage.getItem(keys.marker)
  if (marker) {
    const parsed: unknown = JSON.parse(marker)
    if (parsed && typeof parsed === 'object' && isData((parsed as { data?: unknown }).data)) return normalizeData((parsed as { data: Data }).data)
    throw new Error('Os dados locais estão em formato inválido. Importe um backup ou limpe os dados do navegador.')
  }
  if (Object.values(keys).some(key => localStorage.getItem(key) !== null)) throw new Error('Foram encontrados dados locais incompletos. Importe um backup antes de continuar.')
  const data = seedData()
  saveData(data)
  return data
}
export const clearData = empty
