export type Sex = 'Feminino' | 'Masculino' | 'Outro' | 'Não informado'
export type Patient = {
  id: string; name: string; cpf: string; cns: string; birth: string; sex: Sex
  mother: string; phone: string; email: string; cep: string; city: string
  neighborhood: string; street: string; number: string; complement: string
  allergies: string; conditions: string; medications: string
}
export type VitalKey = 'pressure' | 'heart' | 'respiratory' | 'temperature' | 'oxygen' | 'weight' | 'height' | 'glucose'
export type Encounter = {
  id: string; patientId: string; date: string; type: string; professional: string
  status: 'Em andamento' | 'Finalizado'; finishedAt: string
  vitals: Record<VitalKey, string>
  soap: { subjective: string; objective: string; assessment: string; plan: string }
  conduct: { guidance: string; exams: string; referral: string; returnDate: string; notes: string }
}
export type Vaccination = {
  id: string; patientId: string; vaccine: string; dose: string; date: string; batch: string
  manufacturer: string; unit: string; route: string; site: string; notes: string
  nextDose: string; professional: string
}
export type Appointment = {
  id: string; patientId: string; date: string; time: string; reason: string
  status: 'Agendado' | 'Em atendimento' | 'Finalizado'
}
export type Data = { patients: Patient[]; encounters: Encounter[]; vaccinations: Vaccination[]; appointments: Appointment[] }

export const professional = 'Enfermeiro(a) — Simulação'
export const vaccines = ['BCG', 'Hepatite B', 'Pentavalente', 'Poliomielite', 'Rotavírus', 'Pneumocócica', 'Meningocócica', 'Febre amarela', 'Tríplice viral', 'DTP', 'HPV', 'Influenza', 'COVID-19', 'Outras']
export const doses = ['Dose única', '1ª dose', '2ª dose', '3ª dose', 'Reforço', 'Dose adicional']
export const encounterTypes = ['Consulta agendada', 'Demanda espontânea', 'Retorno', 'Pré-natal', 'Puericultura', 'Outros']
export const uid = () => crypto.randomUUID()
export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const dateLabel = (date: string) => date ? new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '—'
export const timeLabel = (date: string) => date ? new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'
export const age = (birth: string) => {
  if (!birth) return '—'
  const now = today()
  return String(Number(now.slice(0, 4)) - Number(birth.slice(0, 4)) - (now.slice(5) < birth.slice(5) ? 1 : 0))
}
export const blankPatient = (): Patient => ({ id: uid(), name: '', cpf: '', cns: '', birth: '', sex: 'Não informado', mother: '', phone: '', email: '', cep: '', city: '', neighborhood: '', street: '', number: '', complement: '', allergies: '', conditions: '', medications: '' })
export const blankEncounter = (patientId: string, type: string): Encounter => ({
  id: uid(), patientId, type, date: new Date().toISOString(), professional, status: 'Em andamento', finishedAt: '',
  vitals: { pressure: '', heart: '', respiratory: '', temperature: '', oxygen: '', weight: '', height: '', glucose: '' },
  soap: { subjective: '', objective: '', assessment: '', plan: '' },
  conduct: { guidance: '', exams: '', referral: '', returnDate: '', notes: '' },
})
export const blankVaccination = (): Vaccination => ({ id: uid(), patientId: '', vaccine: '', dose: '', date: today(), batch: '', manufacturer: '', unit: 'UBS Simulada', route: '', site: '', notes: '', nextDose: '', professional })

function dayOffset(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function seedData(): Data {
  const names = ['Maria Aparecida de Oliveira', 'José Carlos da Silva', 'Ana Paula Ferreira', 'Francisco Alves de Souza', 'Juliana Santos Lima', 'Antônio Pereira Costa', 'Beatriz Rodrigues Silva', 'Pedro Henrique Martins', 'Luciana Gomes Ribeiro', 'Carlos Eduardo Santos']
  const patients = names.map((name, i): Patient => ({
    ...blankPatient(), name, cpf: `000.000.00${i}-${String(i).repeat(2)}`, cns: `999 0000 0000 ${String(i).padStart(4, '0')}`,
    birth: [`1958-04-12`, `1965-09-23`, `1992-03-15`, `1970-11-02`, `1988-07-26`, `1954-01-19`, `2018-06-08`, `2021-10-14`, `1984-05-30`, `1977-12-03`][i],
    sex: [0, 2, 4, 6, 8].includes(i) ? 'Feminino' : 'Masculino', mother: 'Nome fictício', phone: `(11) 9999${i}-0000`,
    city: 'São Paulo', neighborhood: 'Jardim das Flores', allergies: i === 0 ? 'Nenhuma alergia informada' : '',
    conditions: i === 0 ? 'Hipertensão arterial' : '', medications: i === 0 ? 'Losartana' : '',
  }))
  const encounters = [
    { ...blankEncounter(patients[0].id, 'Consulta agendada'), date: `${today()}T08:30:00`, status: 'Finalizado' as const, finishedAt: `${today()}T09:05:00`, soap: { subjective: 'Consulta de acompanhamento.', objective: 'Paciente em bom estado geral.', assessment: 'Acompanhamento de rotina.', plan: 'Orientações e retorno programado.' } },
    { ...blankEncounter(patients[1].id, 'Demanda espontânea'), date: `${today()}T09:15:00` },
    { ...blankEncounter(patients[2].id, 'Pré-natal'), date: `${today()}T10:00:00` },
    { ...blankEncounter(patients[4].id, 'Retorno'), date: `${dayOffset(-1)}T14:00:00`, status: 'Finalizado' as const, finishedAt: `${dayOffset(-1)}T14:35:00` },
  ]
  const vaccinations = [
    { ...blankVaccination(), patientId: patients[0].id, vaccine: 'Influenza', dose: 'Dose única', date: today(), batch: 'SIM2401', manufacturer: 'Fabricante fictício', route: 'Intramuscular', site: 'Braço esquerdo' },
    { ...blankVaccination(), patientId: patients[6].id, vaccine: 'Tríplice viral', dose: '1ª dose', date: dayOffset(-30), nextDose: dayOffset(7), batch: 'SIM2402', manufacturer: 'Fabricante fictício', route: 'Subcutânea', site: 'Braço direito' },
    { ...blankVaccination(), patientId: patients[7].id, vaccine: 'Poliomielite', dose: '1ª dose', date: dayOffset(-60), nextDose: dayOffset(14), batch: 'SIM2403', manufacturer: 'Fabricante fictício', route: 'Intramuscular', site: 'Coxa' },
  ]
  const appointments: Appointment[] = [
    { id: uid(), patientId: patients[0].id, date: today(), time: '08:30', reason: 'Acompanhamento de hipertensão', status: 'Finalizado' },
    { id: uid(), patientId: patients[1].id, date: today(), time: '09:15', reason: 'Acolhimento e avaliação', status: 'Em atendimento' },
    { id: uid(), patientId: patients[2].id, date: today(), time: '10:00', reason: 'Consulta de pré-natal', status: 'Em atendimento' },
    { id: uid(), patientId: patients[4].id, date: today(), time: '11:30', reason: 'Consulta de rotina', status: 'Agendado' },
  ]
  return { patients, encounters, vaccinations, appointments }
}
