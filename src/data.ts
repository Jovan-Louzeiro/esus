export type Patient = { id: string; name: string; birthDate: string; cpf: string; cns: string; phone: string; sex: string; address: string };
export type AppointmentStatus = 'scheduled' | 'present' | 'triaged' | 'completed' | 'cancelled' | 'no-show';
export type Appointment = { id: string; patientId: string; date: string; professional: string; type: string; status: AppointmentStatus };
export type TriageRisk = 'emergency' | 'very-urgent' | 'urgent' | 'less-urgent' | 'not-urgent';
export const triageRiskLabels: Record<TriageRisk, string> = {
  emergency: 'Emergência',
  'very-urgent': 'Muito urgente',
  urgent: 'Urgente',
  'less-urgent': 'Pouco urgente',
  'not-urgent': 'Não urgente',
};
export const isTriageRisk = (value: unknown): value is TriageRisk =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(triageRiskLabels, value);
export type Triage = {
  id: string;
  patientId: string;
  date: string;
  complaint: string;
  pressure: string;
  temperature: string;
  weight: string;
  height: string;
  heartRate: string;
  respiratoryRate?: string;
  oxygenSaturation?: string;
  bloodGlucose?: string;
  bloodGlucoseMoment?: string;
  riskClassification?: TriageRisk;
  appointmentId?: string;
};
export type Encounter = { id: string; patientId: string; date: string; anamnesis: string; exam: string; assessment: string; diagnosis: string; conduct: string };
export type Vaccination = { id: string; patientId: string; date: string; vaccine: string; dose: string; batch: string };
export type Procedure = { id: string; patientId: string; date: string; procedure: string; professional: string; notes: string };
export type Database = { version: 2; patients: Patient[]; triages: Triage[]; encounters: Encounter[]; vaccinations: Vaccination[]; procedures: Procedure[]; appointments: Appointment[] };

export const STORAGE_KEY = 'simulador-aps-v1';
export const id = () => crypto.randomUUID();
export const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
export const nowLocal = () => `${today()}T${new Date().toTimeString().slice(0, 5)}`;
export const formatDate = (value: string) => {
  if (!value) return '—';
  const [date, time] = value.split('T');
  const parts = date.split('-');
  return `${parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date}${time ? ` às ${time.slice(0, 5)}` : ''}`;
};
export const age = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return '—';
  const now = new Date();
  return `${now.getFullYear() - year - (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day) ? 1 : 0)} anos`;
};
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
export const bmi = (weight: string, height: string) => {
  const w = Number(weight);
  const h = Number(height) / 100;
  return w > 0 && h > 0 ? (w / (h * h)).toFixed(1).replace('.', ',') : '—';
};

export function initialData(): Database {
  const patients: Patient[] = [
    { id: 'p1', name: 'Maria Aparecida Oliveira', birthDate: '1962-05-18', cpf: '123.456.789-00', cns: '700 0000 0000 0001', phone: '(11) 99999-0001', sex: 'Feminino', address: 'Rua das Flores, 120' },
    { id: 'p2', name: 'José Carlos Santos', birthDate: '1978-08-22', cpf: '123.456.789-01', cns: '700 0000 0000 0002', phone: '(11) 99999-0002', sex: 'Masculino', address: 'Rua das Palmeiras, 45' },
    { id: 'p3', name: 'Ana Paula Ferreira', birthDate: '1991-03-12', cpf: '123.456.789-02', cns: '700 0000 0000 0003', phone: '(11) 99999-0003', sex: 'Feminino', address: 'Avenida Central, 210' },
    { id: 'p4', name: 'Francisco das Chagas Lima', birthDate: '1955-11-02', cpf: '123.456.789-03', cns: '700 0000 0000 0004', phone: '(11) 99999-0004', sex: 'Masculino', address: 'Rua da Esperança, 68' },
  ];
  return {
    version: 2, patients,
    triages: [
      { id: 't1', patientId: 'p1', date: `${today()}T08:30`, complaint: 'Acompanhamento de rotina', pressure: '120/80', temperature: '36.5', weight: '68', height: '160', heartRate: '76' },
      { id: 't2', patientId: 'p2', date: `${today()}T09:10`, complaint: 'Dor de cabeça e mal-estar', pressure: '130/80', temperature: '36.7', weight: '82', height: '175', heartRate: '80' },
      { id: 't3', patientId: 'p3', date: `${today()}T09:45`, complaint: 'Orientações de saúde', pressure: '110/70', temperature: '36.4', weight: '62', height: '165', heartRate: '72' },
    ],
    encounters: [{ id: 'e1', patientId: 'p3', date: `${today()}T10:00`, anamnesis: 'Consulta de rotina.', exam: 'Sem alterações relatadas.', assessment: 'Acompanhamento de saúde.', diagnosis: 'Avaliação de rotina', conduct: 'Orientações gerais de saúde.' }],
    vaccinations: [], procedures: [], appointments: [],
  };
}

const fields = {
  patients: ['id', 'name', 'birthDate', 'cpf', 'cns', 'phone', 'sex', 'address'],
  triages: ['id', 'patientId', 'date', 'complaint', 'pressure', 'temperature', 'weight', 'height', 'heartRate'],
  encounters: ['id', 'patientId', 'date', 'anamnesis', 'exam', 'assessment', 'diagnosis', 'conduct'],
  vaccinations: ['id', 'patientId', 'date', 'vaccine', 'dose', 'batch'],
  procedures: ['id', 'patientId', 'date', 'procedure', 'professional', 'notes'],
} as const;

function validRecords(records: unknown, required: readonly string[]) {
  if (!Array.isArray(records)) return false;
  const ids = new Set<string>();
  return records.every(record => {
    if (!record || typeof record !== 'object') return false;
    const item = record as Record<string, unknown>;
    if (!required.every(field => typeof item[field] === 'string') || typeof item.id !== 'string' || !item.id || ids.has(item.id)) return false;
    ids.add(item.id);
    return true;
  });
}

export function parseDatabase(value: unknown): Database | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (data.version !== 1 && data.version !== 2) return null;
  for (const [key, required] of Object.entries(fields)) {
    if (!validRecords(data[key], required)) return null;
  }
  const appointments = data.appointments === undefined && data.version === 1 ? [] : data.appointments;
  if (!validRecords(appointments, ['id', 'patientId', 'date', 'professional', 'type', 'status'])) return null;
  const optionalTriageFields: (keyof Pick<Triage, 'respiratoryRate' | 'oxygenSaturation' | 'bloodGlucose' | 'bloodGlucoseMoment'>)[] = [
    'respiratoryRate', 'oxygenSaturation', 'bloodGlucose', 'bloodGlucoseMoment',
  ];
  if ((data.triages as Triage[]).some(triage =>
    optionalTriageFields.some(field => triage[field] !== undefined && typeof triage[field] !== 'string') ||
    (triage.riskClassification !== undefined && !isTriageRisk(triage.riskClassification)),
  )) return null;
  const allowedStatuses: AppointmentStatus[] = ['scheduled', 'present', 'triaged', 'completed', 'cancelled', 'no-show'];
  if ((appointments as Appointment[]).some(appointment => !allowedStatuses.includes(appointment.status))) return null;
  const patientIds = new Set((data.patients as Patient[]).map(patient => patient.id));
  const hasValidPatients = (records: unknown) =>
    (records as { patientId: string }[]).every(record => patientIds.has(record.patientId));
  if (![data.triages, data.encounters, data.vaccinations, data.procedures, appointments].every(hasValidPatients)) return null;
  const appointmentIds = new Set((appointments as Appointment[]).map(appointment => appointment.id));
  if ((data.triages as Triage[]).some(triage =>
    triage.appointmentId !== undefined && (typeof triage.appointmentId !== 'string' || !appointmentIds.has(triage.appointmentId)),
  )) return null;

  return {
    version: 2,
    patients: data.patients as Patient[],
    triages: data.triages as Triage[],
    encounters: data.encounters as Encounter[],
    vaccinations: data.vaccinations as Vaccination[],
    procedures: data.procedures as Procedure[],
    appointments: appointments as Appointment[],
  };
}
