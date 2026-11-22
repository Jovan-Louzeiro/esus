import { useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown,
  ChevronRight, CircleHelp, ClipboardList, Clock3, FileHeart, FileText, HeartPulse, Home,
  Menu, MoreHorizontal, Plus, Search, ShieldCheck, Stethoscope, Syringe,
  Trash2, Upload, UsersRound, X, Pencil, Pill, BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { age, bmi, formatDate, id, initialData, initials, isTriageRisk, nowLocal, parseDatabase, STORAGE_KEY, today, triageRiskLabels } from './data';
import type { Appointment, AppointmentStatus, Database, Patient, Triage, TriageRisk } from './data';

type Page = 'painel' | 'cidadaos' | 'acolhimento' | 'atendimento' | 'prontuario' | 'vacinacao' | 'procedimentos' | 'agendamentos' | 'medicamentos' | 'relatorios';
type Notice = { text: string; error?: boolean };
const navigation: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: 'painel', label: 'Visão geral', icon: Home },
  { id: 'cidadaos', label: 'Cidadãos', icon: UsersRound },
  { id: 'acolhimento', label: 'Escuta inicial', icon: HeartPulse },
  { id: 'atendimento', label: 'Lista de atendimentos', icon: Stethoscope },
  { id: 'prontuario', label: 'Prontuário', icon: FileHeart },
  { id: 'vacinacao', label: 'Vacinação', icon: Syringe },
  { id: 'procedimentos', label: 'Procedimentos', icon: ClipboardList },
  { id: 'agendamentos', label: 'Agendamentos', icon: CalendarDays },
  { id: 'medicamentos', label: 'Medicamentos', icon: Pill },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
];
const procedures = ['Aferição de pressão arterial', 'Glicemia capilar', 'Curativo', 'Administração de medicamentos', 'Nebulização', 'Antropometria', 'Retirada de pontos'];
const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  scheduled: 'Agendado',
  present: 'Presente na unidade',
  triaged: 'Aguardando consulta',
  completed: 'Atendido',
  cancelled: 'Cancelado',
  'no-show': 'Não compareceu',
};
const triageRiskOptions: { value: TriageRisk; label: string }[] = [
  { value: 'emergency', label: 'Emergência · vermelho' },
  { value: 'very-urgent', label: 'Muito urgente · laranja' },
  { value: 'urgent', label: 'Urgente · amarelo' },
  { value: 'less-urgent', label: 'Pouco urgente · verde' },
  { value: 'not-urgent', label: 'Não urgente · azul' },
];
const bloodGlucoseMomentLabels: Record<string, string> = {
  fasting: 'jejum',
  'pre-prandial': 'pré-prandial',
  'post-prandial': 'pós-prandial',
  casual: 'casual',
};
const emptyData: Database = { version: 2, patients: [], triages: [], encounters: [], vaccinations: [], procedures: [], appointments: [] };
const readInitial = (): { data: Database; error: string } => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const data = initialData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return { data, error: '' };
    }
    const parsed = parseDatabase(JSON.parse(stored) as unknown);
    if (!parsed) throw new Error('Formato inválido');
    return { data: parsed, error: '' };
  } catch {
    return { data: emptyData, error: 'Não foi possível ler os dados salvos. Importe um backup válido antes de continuar para evitar substituí-los.' };
  }
};
const value = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const byNewest = <T extends { date: string }>(items: T[]) => [...items].sort((a, b) => b.date.localeCompare(a.date));
const byOldest = <T extends { date: string }>(items: T[]) => [...items].sort((a, b) => a.date.localeCompare(b.date));
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

function Field({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) {
  return <label className="field"><span>{label}{required && <b> *</b>}</span>{children}</label>;
}
function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
function Empty({ text }: { text: string }) {
  return <div className="empty"><FileText size={23} /><span>{text}</span></div>;
}
function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="section-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}
function PatientSelect({ patients, selected, onChange }: { patients: Patient[]; selected: string; onChange: (id: string) => void }) {
  return <Field label="Cidadão" required><select required value={selected} onChange={event => onChange(event.target.value)}><option value="">Selecione um cidadão</option>{patients.map(patient => <option key={patient.id} value={patient.id}>{patient.name} {patient.cns ? `· CNS ${patient.cns}` : ''}</option>)}</select></Field>;
}
function Avatar({ name, index = 0 }: { name: string; index?: number }) {
  return <span className={`avatar avatar-${index % 4}`}>{initials(name)}</span>;
}
function TriageRiskBadge({ risk }: { risk?: TriageRisk }) {
  return <span className={`risk-badge risk-${risk ?? 'unknown'}`}>{risk ? triageRiskLabels[risk] : 'Não informado'}</span>;
}
function TriageMeasurements({ triage }: { triage: Triage }) {
  const measurements = [
    { label: 'PA', value: triage.pressure ? `${triage.pressure} mmHg` : '' },
    { label: 'Temperatura', value: triage.temperature ? `${triage.temperature} °C` : '' },
    { label: 'FC', value: triage.heartRate ? `${triage.heartRate} bpm` : '' },
    { label: 'FR', value: triage.respiratoryRate ? `${triage.respiratoryRate} irpm` : '' },
    { label: 'SpO₂', value: triage.oxygenSaturation ? `${triage.oxygenSaturation}%` : '' },
    { label: 'Peso', value: triage.weight ? `${triage.weight} kg` : '' },
    { label: 'Altura', value: triage.height ? `${triage.height} cm` : '' },
    { label: 'IMC', value: bmi(triage.weight, triage.height) !== '—' ? `${bmi(triage.weight, triage.height)} kg/m²` : '' },
    {
      label: `Glicemia${triage.bloodGlucoseMoment ? ` · ${bloodGlucoseMomentLabels[triage.bloodGlucoseMoment] ?? triage.bloodGlucoseMoment}` : ''}`,
      value: triage.bloodGlucose ? `${triage.bloodGlucose} mg/dL` : '',
    },
  ].filter(measurement => measurement.value);
  return measurements.length
    ? <div className="vitals">{measurements.map(item => <span key={item.label}>{item.label} <strong>{item.value}</strong></span>)}</div>
    : <p className="triage-no-measurements">Nenhuma medição registrada.</p>;
}

export default function App() {
  const [initial] = useState(readInitial);
  const [data, setData] = useState(initial.data);
  const [notice, setNotice] = useState<Notice | null>(initial.error ? { text: initial.error, error: true } : null);
  const [storageBlocked, setStorageBlocked] = useState(Boolean(initial.error));
  const [page, setPage] = useState<Page>('painel');
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Patient | null>(null);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showEncounterForm, setShowEncounterForm] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [queueDate, setQueueDate] = useState(today());
  const [agendaDate, setAgendaDate] = useState(today());
  const [queueSearch, setQueueSearch] = useState('');
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const importRef = useRef<HTMLInputElement>(null);

  const navigate = (next: Page, patientId?: string) => {
    if (patientId !== undefined) setSelected(patientId);
    setPage(next);
    setMenuOpen(false);
    setShowPatientForm(false);
    setShowEncounterForm(false);
    setShowAppointmentForm(false);
    setActiveAppointmentId(null);
    setFormKey(key => key + 1);
    window.scrollTo(0, 0);
  };
  const save = (next: Database, message: string, importing = false) => {
    if (storageBlocked && !importing) {
      setNotice({ text: 'Os dados salvos não puderam ser lidos. Importe um backup válido antes de salvar.', error: true });
      return false;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setData(next);
      setStorageBlocked(false);
      setNotice({ text: message });
      return true;
    } catch {
      setNotice({ text: 'Não foi possível salvar no navegador. Verifique o espaço disponível e as permissões de armazenamento.', error: true });
      return false;
    }
  };
  const download = () => {
    if (storageBlocked) {
      setNotice({ text: 'Não é possível exportar: os dados salvos não puderam ser lidos.', error: true });
      return;
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `backup-simulador-aps-${today()}.json`; link.click();
    URL.revokeObjectURL(url);
    setNotice({ text: 'Backup exportado com sucesso.' });
  };
  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = parseDatabase(JSON.parse(await file.text()) as unknown);
      if (!parsed) throw new Error('invalid');
      if (!window.confirm('Importar este backup substituirá todos os dados atuais deste navegador. Deseja continuar?')) return;
      if (save(parsed, 'Backup importado com sucesso.', true)) { setSelected(''); navigate('painel'); }
    } catch {
      setNotice({ text: 'Backup inválido. Selecione um arquivo JSON exportado pelo simulador.', error: true });
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  };
  const submitPatient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const patient: Patient = { id: editing?.id ?? id(), name: value(form, 'name'), birthDate: value(form, 'birthDate'), cpf: value(form, 'cpf'), cns: value(form, 'cns'), phone: value(form, 'phone'), sex: value(form, 'sex'), address: value(form, 'address') };
    if (!patient.name) { setNotice({ text: 'Informe o nome do cidadão.', error: true }); return; }
    const patients = editing ? data.patients.map(item => item.id === editing.id ? patient : item) : [...data.patients, patient];
    if (save({ ...data, patients }, editing ? 'Cadastro atualizado com sucesso.' : 'Cidadão cadastrado com sucesso.')) {
      setEditing(null); setShowPatientForm(false); setSelected(patient.id);
    }
  };
  const submitAppointment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = value(form, 'date');
    if (date < nowLocal()) {
      setNotice({ text: 'Escolha uma data e horário futuros para o agendamento.', error: true });
      return;
    }
    const appointment: Appointment = {
      id: id(),
      patientId: value(form, 'patientId'),
      date,
      professional: value(form, 'professional'),
      type: value(form, 'type'),
      status: 'scheduled',
    };
    if (!data.patients.some(patient => patient.id === appointment.patientId)) {
      setNotice({ text: 'Selecione um cidadão cadastrado.', error: true });
      return;
    }
    if (!appointment.professional || !appointment.type) {
      setNotice({ text: 'Informe o profissional e o tipo de atendimento.', error: true });
      return;
    }
    const conflictingSlot = data.appointments.some(item =>
      item.date === appointment.date &&
      item.professional.toLocaleLowerCase('pt-BR') === appointment.professional.toLocaleLowerCase('pt-BR') &&
      item.status !== 'cancelled' &&
      item.status !== 'no-show',
    );
    if (conflictingSlot) {
      setNotice({ text: 'Este profissional já possui um agendamento nesse horário.', error: true });
      return;
    }
    if (save({ ...data, appointments: [...data.appointments, appointment] }, 'Agendamento registrado com sucesso.')) {
      setShowAppointmentForm(false);
    }
  };
  const changeAppointmentStatus = (appointment: Appointment, status: AppointmentStatus, message: string) => {
    const appointments = data.appointments.map(item => item.id === appointment.id ? { ...item, status } : item);
    return save({ ...data, appointments }, message);
  };
  const deletePatient = (patient: Patient) => {
    if (!window.confirm(`Excluir ${patient.name} e todos os seus registros de escuta inicial, atendimento, vacinação e procedimentos? Esta ação não pode ser desfeita.`)) return;
    const keep = <T extends { patientId: string }>(items: T[]) => items.filter(item => item.patientId !== patient.id);
    if (save({ ...data, patients: data.patients.filter(item => item.id !== patient.id), triages: keep(data.triages), encounters: keep(data.encounters), vaccinations: keep(data.vaccinations), procedures: keep(data.procedures), appointments: keep(data.appointments) }, 'Cidadão e registros vinculados excluídos.')) {
      if (selected === patient.id) setSelected('');
    }
  };
  const submitRecord = (event: FormEvent<HTMLFormElement>, kind: 'triage' | 'encounter' | 'vaccination' | 'procedure') => {
    event.preventDefault();
    if (!data.patients.some(patient => patient.id === selected)) { setNotice({ text: 'Selecione um cidadão cadastrado.', error: true }); return; }
    const form = new FormData(event.currentTarget);
    const base = { id: id(), patientId: selected, date: kind === 'triage' || kind === 'encounter' ? nowLocal() : value(form, 'date') };
    let next: Database;
    if (kind === 'triage') {
      const riskClassification = value(form, 'riskClassification');
      if (!isTriageRisk(riskClassification)) {
        setNotice({ text: 'Selecione uma classificação de risco para a escuta inicial.', error: true });
        return;
      }
      const appointment = data.appointments.find(item => item.patientId === selected && item.status === 'present' && item.date.startsWith(today()));
      next = {
        ...data,
        triages: [...data.triages, {
          ...base,
          complaint: value(form, 'complaint'),
          pressure: value(form, 'pressure'),
          temperature: value(form, 'temperature'),
          weight: value(form, 'weight'),
          height: value(form, 'height'),
          heartRate: value(form, 'heartRate'),
          respiratoryRate: value(form, 'respiratoryRate'),
          oxygenSaturation: value(form, 'oxygenSaturation'),
          bloodGlucose: value(form, 'bloodGlucose'),
          bloodGlucoseMoment: value(form, 'bloodGlucoseMoment'),
          riskClassification,
          ...(appointment ? { appointmentId: appointment.id } : {}),
        }],
        appointments: appointment ? data.appointments.map(item => item.id === appointment.id ? { ...item, status: 'triaged' } : item) : data.appointments,
      };
    } else if (kind === 'encounter') {
      const triage = byNewest(data.triages.filter(item => item.patientId === selected)).find(item =>
        !data.encounters.some(encounter => encounter.patientId === selected && encounter.date >= item.date),
      );
      const appointmentId = activeAppointmentId && data.appointments.some(item => item.id === activeAppointmentId && item.patientId === selected)
        ? activeAppointmentId
        : triage?.appointmentId;
      next = {
        ...data,
        encounters: [...data.encounters, { ...base, anamnesis: value(form, 'anamnesis'), exam: value(form, 'exam'), assessment: value(form, 'assessment'), diagnosis: value(form, 'diagnosis'), conduct: value(form, 'conduct') }],
        appointments: appointmentId
          ? data.appointments.map(item => item.id === appointmentId ? { ...item, status: 'completed' } : item)
          : data.appointments,
      };
    } else if (kind === 'vaccination') {
      next = { ...data, vaccinations: [...data.vaccinations, { ...base, vaccine: value(form, 'vaccine'), dose: value(form, 'dose'), batch: value(form, 'batch') }] };
    } else {
      next = { ...data, procedures: [...data.procedures, { ...base, procedure: value(form, 'procedure'), professional: value(form, 'professional'), notes: value(form, 'notes') }] };
    }
    if (save(next, `${kind === 'triage' ? 'Escuta inicial' : kind === 'encounter' ? 'Atendimento' : kind === 'vaccination' ? 'Vacinação' : 'Procedimento'} registrado com sucesso.`)) {
      setFormKey(key => key + 1); setWeight(''); setHeight('');
      if (kind === 'encounter') { setShowEncounterForm(false); setActiveAppointmentId(null); }
    }
  };
  const currentPatient = data.patients.find(patient => patient.id === selected);
  const patientName = (patientId: string) => data.patients.find(patient => patient.id === patientId)?.name ?? 'Cidadão não encontrado';
  const todayTriages = data.triages.filter(item => item.date.startsWith(today()));
  const todayEncounters = data.encounters.filter(item => item.date.startsWith(today()));
  const pending = todayTriages.filter(triage => !data.encounters.some(encounter => encounter.patientId === triage.patientId && encounter.date >= triage.date));
  const waitingCount = pending.length + data.appointments.filter(appointment => appointment.date.startsWith(today()) && appointment.status === 'present').length;
  const matchesQueueSearch = (patientId: string) => {
    const patient = data.patients.find(item => item.id === patientId);
    return patient ? `${patient.name} ${patient.cpf} ${patient.cns}`.toLocaleLowerCase('pt-BR').includes(queueSearch.toLocaleLowerCase('pt-BR')) : false;
  };
  const queuedAppointments = data.appointments.filter(appointment =>
    appointment.date.startsWith(queueDate) &&
    ['scheduled', 'present', 'triaged'].includes(appointment.status) &&
    matchesQueueSearch(appointment.patientId),
  );
  const queuedTriages = data.triages.filter(triage =>
    triage.date.startsWith(queueDate) &&
    !triage.appointmentId &&
    !data.encounters.some(encounter => encounter.patientId === triage.patientId && encounter.date >= triage.date) &&
    matchesQueueSearch(triage.patientId),
  );
  const filteredPatients = data.patients.filter(patient => `${patient.name} ${patient.cpf} ${patient.cns}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><span>+</span></div><div><strong>e-SUS <span>APS</span></strong><small>SIMULADOR PEC</small></div><button className="mobile-close icon-button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={20} /></button></div>
      <div className="sidebar-label">MENU PRINCIPAL</div>
      <nav aria-label="Menu principal">{navigation.map((item, index) => <div key={item.id}>{index === 7 && <div className="sidebar-label sidebar-label-second">OUTROS MÓDULOS</div>}<button className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)}><item.icon size={19} strokeWidth={1.8} /><span>{item.label}</span>{page === item.id && <ChevronRight className="nav-chevron" size={16} />}</button></div>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={18} /></div><div><strong>Ambiente de prática</strong><p>Explore as funcionalidades com dados fictícios.</p></div></div><div className="sidebar-footer"><ShieldCheck size={16} /> Dados salvos neste navegador</div></div>
    </aside>
    {menuOpen && <button className="mobile-overlay" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}
    <div className="main-shell">
      <div className="simulation-bar"><ShieldCheck size={14} /> AMBIENTE DE SIMULAÇÃO <span>—</span> DADOS FICTÍCIOS <span className="simulation-extra">· Sem integração com o e-SUS oficial</span></div>
      <header className="topbar"><div className="topbar-left"><button className="menu-toggle icon-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu size={21} /></button><div className="unit-icon"><Plus size={19} /></div><div><strong>UBS Jardim das Flores</strong><small>Unidade Básica de Saúde <span>•</span> CNES 0000000</small></div></div><div className="topbar-right"><span className="top-date"><CalendarDays size={16} /> {shortDate.format(new Date())}</span><div className="top-divider" /><div className="profile"><div className="profile-avatar">EF</div><div><strong>Enfermeiro(a)</strong><small>Profissional de saúde</small></div><ChevronDown size={16} /></div></div></header>
      <main className="content">
        {notice && <div role="status" className={`notice ${notice.error ? 'notice-error' : ''}`}><span>{notice.text}</span><button onClick={() => setNotice(null)} aria-label="Fechar aviso"><X size={17} /></button></div>}
        {page === 'painel' && <>
          <div className="breadcrumb">Início <ChevronRight size={14} /> <strong>Visão geral</strong></div>
          <PageHeading eyebrow="UNIDADE BÁSICA DE SAÚDE" title="Painel da unidade" description="Acompanhamento dos cidadãos e das atividades da equipe." action={<div className="heading-date"><CalendarDays size={17} /> {shortDate.format(new Date())}</div>} />
          <div className="overview-heading"><div><h2>Resumo do dia</h2><p>Indicadores das atividades registradas nesta unidade.</p></div><span><span className="live-dot" /> Dados locais</span></div>
          <div className="stats-grid">
            <Stat icon={UsersRound} color="blue" label="Cidadãos cadastrados" number={data.patients.length} detail="Total de cadastros" onClick={() => navigate('cidadaos')} />
            <Stat icon={HeartPulse} color="teal" label="Escutas iniciais hoje" number={todayTriages.length} detail="Registros realizados hoje" onClick={() => navigate('acolhimento')} />
            <Stat icon={Stethoscope} color="purple" label="Atendimentos hoje" number={todayEncounters.length} detail="Atendimentos finalizados" onClick={() => navigate('atendimento')} />
            <Stat icon={Clock3} color="orange" label="Aguardando atendimento" number={waitingCount} detail="Na fila da unidade" onClick={() => navigate('atendimento')} />
          </div>
          <div className="dashboard-grid"><section className="card recent-card"><SectionTitle title="Atividades recentes" subtitle="Últimas escutas iniciais registradas na unidade" action={<button className="text-link" onClick={() => navigate('acolhimento')}>Ver escutas iniciais <ArrowRight size={15} /></button>} />
            {data.triages.length ? <div className="table-wrap"><table><thead><tr><th>CIDADÃO</th><th>MOTIVO DA PROCURA</th><th>RISCO</th><th>DATA</th><th>STATUS</th><th /></tr></thead><tbody>{byNewest(data.triages).slice(0, 5).map((triage, index) => { const done = data.encounters.some(encounter => encounter.patientId === triage.patientId && encounter.date >= triage.date); return <tr key={triage.id}><td><button className="person-cell" onClick={() => navigate('prontuario', triage.patientId)}><Avatar name={patientName(triage.patientId)} index={index} /><span><strong>{patientName(triage.patientId)}</strong><small>Prontuário do cidadão</small></span></button></td><td>{triage.complaint}</td><td><TriageRiskBadge risk={triage.riskClassification} /></td><td>{formatDate(triage.date)}</td><td><span className={`status ${done ? 'status-done' : 'status-wait'}`}><span />{done ? 'Finalizado' : 'Aguardando'}</span></td><td><button className="table-action" onClick={() => navigate('prontuario', triage.patientId)} aria-label={`Ver prontuário de ${patientName(triage.patientId)}`}><MoreHorizontal size={19} /></button></td></tr>; })}</tbody></table></div> : <Empty text="Nenhuma escuta inicial registrada ainda." />}
          </section><section className="card quick-card"><SectionTitle title="Acesso rápido" subtitle="O que você precisa fazer?" /><div className="quick-list"><Quick icon={UsersRound} color="blue" title="Cadastrar cidadão" description="Adicionar um novo cadastro" onClick={() => { setEditing(null); setShowPatientForm(true); setPage('cidadaos'); }} /><Quick icon={HeartPulse} color="teal" title="Nova escuta inicial" description="Registrar motivo e medições" onClick={() => navigate('acolhimento')} /><Quick icon={Stethoscope} color="purple" title="Iniciar atendimento" description="Registrar atendimento de enfermagem" onClick={() => navigate('atendimento')} /><Quick icon={FileHeart} color="orange" title="Consultar prontuário" description="Acessar histórico do cidadão" onClick={() => navigate('prontuario')} /></div></section></div>
          <div className="dashboard-note"><div className="note-icon"><ShieldCheck size={19} /></div><p><strong>Este é um ambiente de simulação.</strong> Utilize apenas dados fictícios. As informações ficam armazenadas somente neste navegador.</p><button onClick={download}>Fazer backup <ArrowUpRight size={15} /></button></div>
        </>}
        {page === 'cidadaos' && <>
          <div className="breadcrumb">Início <ChevronRight size={14} /> <strong>Cidadãos</strong></div>
          <PageHeading eyebrow="CADASTROS" title="Cidadãos" description="Gerencie os cadastros dos cidadãos da unidade." action={!showPatientForm && <button className="button primary" onClick={() => { setEditing(null); setShowPatientForm(true); }}><Plus size={17} /> Novo cidadão</button>} />
          {showPatientForm ? <section className="card form-card"><SectionTitle title={editing ? 'Editar cidadão' : 'Novo cidadão'} subtitle="Preencha os dados fictícios para o cadastro." /><form onSubmit={submitPatient} key={editing?.id ?? 'new'}><div className="form-grid"><Field label="Nome completo" required><input name="name" defaultValue={editing?.name} required maxLength={150} placeholder="Nome do cidadão" /></Field><Field label="Data de nascimento" required><input name="birthDate" type="date" defaultValue={editing?.birthDate} max={today()} required /></Field><Field label="CPF"><input name="cpf" defaultValue={editing?.cpf} placeholder="000.000.000-00" /></Field><Field label="Cartão Nacional de Saúde (CNS)"><input name="cns" defaultValue={editing?.cns} placeholder="Número do CNS" /></Field><Field label="Telefone"><input name="phone" defaultValue={editing?.phone} placeholder="(00) 00000-0000" /></Field><Field label="Sexo"><select name="sex" defaultValue={editing?.sex ?? ''}><option value="">Selecione</option><option>Feminino</option><option>Masculino</option><option>Outro</option><option>Não informado</option></select></Field><div className="span-2"><Field label="Endereço"><input name="address" defaultValue={editing?.address} placeholder="Rua, número e bairro" /></Field></div></div><div className="form-actions"><button type="button" className="button secondary" onClick={() => { setShowPatientForm(false); setEditing(null); }}>Cancelar</button><button className="button primary"><Check size={17} /> Salvar cadastro</button></div></form></section> : <section className="card list-card"><SectionTitle title="Cidadãos cadastrados" subtitle={`${data.patients.length} cidadão(ãos) no total`} /><div className="search-box"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome, CPF ou CNS" aria-label="Buscar cidadãos" /></div>{filteredPatients.length ? <div className="table-wrap"><table><thead><tr><th>CIDADÃO</th><th>NASCIMENTO</th><th>CPF</th><th>TELEFONE</th><th>AÇÕES</th></tr></thead><tbody>{filteredPatients.map((patient, index) => <tr key={patient.id}><td><button className="person-cell" onClick={() => navigate('prontuario', patient.id)}><Avatar name={patient.name} index={index} /><span><strong>{patient.name}</strong><small>{patient.cns ? `CNS ${patient.cns}` : 'CNS não informado'}</small></span></button></td><td>{formatDate(patient.birthDate)}</td><td>{patient.cpf || '—'}</td><td>{patient.phone || '—'}</td><td><div className="row-actions"><button onClick={() => navigate('prontuario', patient.id)} title="Ver prontuário" aria-label={`Ver prontuário de ${patient.name}`}><FileHeart size={17} /></button><button onClick={() => { setEditing(patient); setShowPatientForm(true); }} title="Editar" aria-label={`Editar ${patient.name}`}><Pencil size={17} /></button><button onClick={() => deletePatient(patient)} title="Excluir" aria-label={`Excluir ${patient.name}`}><Trash2 size={17} /></button></div></td></tr>)}</tbody></table></div> : <Empty text="Nenhum cidadão encontrado." />}</section>}
        </>}
        {page === 'acolhimento' && <>
          <div className="breadcrumb">Início <ChevronRight size={14} /> <strong>Escuta inicial</strong></div>
          <PageHeading eyebrow="CUIDADO AO CIDADÃO" title="Escuta inicial" description="Registre o motivo da procura, a classificação de risco e as medições realizadas." />
          <section className="card form-card">
            <SectionTitle title="Nova escuta inicial" subtitle="Informe o motivo e a classificação de risco. As medições são opcionais, conforme avaliação profissional." />
            <form key={formKey} onSubmit={event => submitRecord(event, 'triage')}>
              <PatientSelect patients={data.patients} selected={selected} onChange={setSelected} />
              {currentPatient && <p className="triage-patient-context"><strong>{currentPatient.name}</strong> · {age(currentPatient.birthDate)} · {currentPatient.sex || 'Sexo não informado'}</p>}
              <Field label="Motivo da procura / queixa principal" required><textarea name="complaint" required placeholder="Registre o que o cidadão relata, incluindo sinais e sintomas percebidos." rows={3} /></Field>
              <Field label="Classificação de risco" required>
                <select name="riskClassification" defaultValue="" required>
                  <option value="">Selecione a classificação</option>
                  {triageRiskOptions.map(risk => <option key={risk.value} value={risk.value}>{risk.label}</option>)}
                </select>
              </Field>
              <h3 className="form-subtitle"><Activity size={18} /> Sinais vitais</h3>
              <div className="form-grid three">
                <Field label="Pressão arterial (mmHg)"><input name="pressure" pattern="[0-9]{2,3}/[0-9]{2,3}" placeholder="Ex.: 120/80" title="Informe no formato 120/80" /></Field>
                <Field label="Temperatura (°C)"><input name="temperature" type="number" step="0.1" min="30" max="45" placeholder="Ex.: 36,5" /></Field>
                <Field label="Frequência cardíaca (bpm)"><input name="heartRate" type="number" min="1" max="300" placeholder="Ex.: 80" /></Field>
                <Field label="Frequência respiratória (irpm)"><input name="respiratoryRate" type="number" min="1" max="100" placeholder="Ex.: 18" /></Field>
                <Field label="Saturação de O₂ (%)"><input name="oxygenSaturation" type="number" min="1" max="100" placeholder="Ex.: 98" /></Field>
              </div>
              <h3 className="form-subtitle">Medidas antropométricas</h3>
              <div className="form-grid three">
                <Field label="Peso (kg)"><input name="weight" type="number" step="0.1" min="0.1" max="500" value={weight} onChange={event => setWeight(event.target.value)} placeholder="Ex.: 70" /></Field>
                <Field label="Altura (cm)"><input name="height" type="number" step="0.1" min="1" max="250" value={height} onChange={event => setHeight(event.target.value)} placeholder="Ex.: 170" /></Field>
                <Field label="IMC calculado"><div className="calculated">{bmi(weight, height)} <small>kg/m²</small></div></Field>
              </div>
              <h3 className="form-subtitle">Glicemia capilar</h3>
              <div className="form-grid three">
                <Field label="Glicemia capilar (mg/dL)"><input name="bloodGlucose" type="number" min="1" max="1000" placeholder="Ex.: 100" /></Field>
                <Field label="Momento da glicemia">
                  <select name="bloodGlucoseMoment" defaultValue="">
                    <option value="">Não informado</option>
                    <option value="fasting">Jejum</option>
                    <option value="pre-prandial">Pré-prandial</option>
                    <option value="post-prandial">Pós-prandial</option>
                    <option value="casual">Casual</option>
                  </select>
                </Field>
              </div>
              <div className="form-actions"><button className="button primary"><Check size={17} /> Salvar escuta inicial</button></div>
            </form>
          </section>
        </>}
        {page === 'atendimento' && <>
          <div className="breadcrumb">Início <ChevronRight size={14} /> <strong>Lista de atendimentos</strong></div>
          <PageHeading eyebrow="CUIDADO AO CIDADÃO" title={showEncounterForm ? 'Atendimento de enfermagem' : 'Lista de atendimentos'} description={showEncounterForm ? 'Registre a consulta no formato SOAP e finalize o atendimento.' : 'Acompanhe os cidadãos agendados e a demanda espontânea da unidade.'} />
          {showEncounterForm ? <section className="card form-card">
            <SectionTitle title="Consulta de enfermagem" subtitle="Registre o atendimento e o plano de cuidados." action={<button className="button secondary" onClick={() => { setShowEncounterForm(false); setActiveAppointmentId(null); }}>Voltar à lista</button>} />
            {currentPatient && <div className="patient-summary encounter-summary">
              <div className="patient-summary-top"><Avatar name={currentPatient.name} /><div><h2>{currentPatient.name}</h2><p>{age(currentPatient.birthDate)} · {currentPatient.sex || 'Sexo não informado'} · CNS {currentPatient.cns || 'não informado'}</p></div></div>
              {(() => {
                const triage = byNewest(data.triages.filter(item => item.patientId === currentPatient.id))[0];
                return triage ? <>
                  <div className="triage-summary-heading"><span>Escuta inicial · {formatDate(triage.date)}</span><TriageRiskBadge risk={triage.riskClassification} /></div>
                  <TriageMeasurements triage={triage} />
                </> : <p className="encounter-hint">Nenhuma escuta inicial registrada para este cidadão.</p>;
              })()}
            </div>}
            <form key={formKey} onSubmit={event => submitRecord(event, 'encounter')}>
              <PatientSelect patients={data.patients} selected={selected} onChange={setSelected} />
              <h3 className="form-subtitle">S · Subjetivo</h3><Field label="Relato e motivo da consulta" required><textarea name="anamnesis" rows={3} required placeholder="Registre o que o cidadão relata e suas necessidades." /></Field>
              <h3 className="form-subtitle">O · Objetivo</h3><Field label="Exame físico e dados observados" required><textarea name="exam" rows={3} required placeholder="Registre achados observáveis e informações relevantes." /></Field>
              <h3 className="form-subtitle">A · Avaliação</h3><div className="form-grid"><Field label="Avaliação de enfermagem" required><textarea name="assessment" rows={3} required placeholder="Registre sua avaliação do caso." /></Field><Field label="Problemas/condições (CIAP-2 ou CID-10, se aplicável)"><textarea name="diagnosis" rows={3} placeholder="Informe o código e a descrição, quando conhecidos." /></Field></div>
              <h3 className="form-subtitle">P · Plano</h3><Field label="Plano de cuidados, condutas e orientações" required><textarea name="conduct" rows={4} required placeholder="Registre os cuidados, orientações e próximos passos acordados." /></Field>
              <div className="form-actions"><button className="button primary"><Check size={17} /> Salvar e finalizar atendimento</button></div>
            </form>
          </section> : <section className="card list-card">
            <SectionTitle title="Aguardando atendimento" subtitle="Agendados presentes e cidadãos com escuta inicial pendente." />
            <div className="worklist-filters"><Field label="Data"><input type="date" value={queueDate} onChange={event => setQueueDate(event.target.value)} /></Field><div className="search-box"><Search size={18} /><input value={queueSearch} onChange={event => setQueueSearch(event.target.value)} placeholder="Buscar por nome, CPF ou CNS" aria-label="Buscar na lista de atendimentos" /></div></div>
            {queuedAppointments.length || queuedTriages.length ? <div className="worklist-list">
              {byOldest(queuedAppointments).map(appointment => {
                const patient = data.patients.find(item => item.id === appointment.patientId);
                if (!patient) return null;
                const startEncounter = () => { setSelected(patient.id); setActiveAppointmentId(appointment.id); setShowEncounterForm(true); setFormKey(key => key + 1); };
                return <article className="queue-row" key={appointment.id}><span className="queue-time">{appointment.date.slice(11, 16)}</span><Avatar name={patient.name} /><div className="queue-person"><strong>{patient.name}</strong><small>{appointment.type} · {appointment.professional}</small></div><span className={`status ${appointment.status === 'triaged' ? 'status-triaged' : appointment.status === 'present' ? 'status-present' : 'status-wait'}`}><span />{appointmentStatusLabels[appointment.status]}</span><div className="queue-actions">{appointment.status === 'scheduled' && <button className="button secondary" onClick={() => changeAppointmentStatus(appointment, 'present', 'Presença registrada; cidadão incluído na fila.')}>Registrar chegada</button>}{appointment.status === 'present' && <button className="button primary" onClick={() => navigate('acolhimento', patient.id)}>Fazer escuta inicial</button>}{appointment.status === 'triaged' && <button className="button primary" onClick={startEncounter}>Atender</button>}</div></article>;
              })}
              {byOldest(queuedTriages).map(triage => {
                const patient = data.patients.find(item => item.id === triage.patientId);
                if (!patient) return null;
                return <article className="queue-row" key={triage.id}><span className="queue-time">{triage.date.slice(11, 16)}</span><Avatar name={patient.name} /><div className="queue-person"><strong>{patient.name}</strong><small>Demanda espontânea · Escuta inicial registrada</small><TriageRiskBadge risk={triage.riskClassification} /></div><span className="status status-triaged"><span />Aguardando consulta</span><div className="queue-actions"><button className="button primary" onClick={() => { setSelected(patient.id); setActiveAppointmentId(null); setShowEncounterForm(true); setFormKey(key => key + 1); }}>Atender</button></div></article>;
              })}
            </div> : <Empty text="Nenhum atendimento aguardando nesta data." />}
          </section>}
        </>}
        {page === 'vacinacao' && <><div className="breadcrumb">Início <ChevronRight size={14} /> <strong>Vacinação</strong></div><PageHeading eyebrow="CUIDADO AO CIDADÃO" title="Vacinação" description="Registre aplicações e consulte o histórico de vacinação." /><section className="card form-card"><SectionTitle title="Registrar vacinação" subtitle="Os registros são vinculados ao prontuário." /><form key={formKey} onSubmit={event => submitRecord(event, 'vaccination')}><PatientSelect patients={data.patients} selected={selected} onChange={setSelected} /><div className="form-grid"><Field label="Nome da vacina" required><input name="vaccine" required placeholder="Ex.: Influenza" /></Field><Field label="Dose" required><input name="dose" required placeholder="Ex.: 1ª dose" /></Field><Field label="Lote" required><input name="batch" required placeholder="Número do lote" /></Field><Field label="Data de aplicação" required><input name="date" type="date" defaultValue={today()} required /></Field></div><div className="form-actions"><button className="button primary"><Check size={17} /> Salvar vacinação</button></div></form></section><History title="Histórico de vacinação" selected={selected} items={byNewest(data.vaccinations.filter(item => item.patientId === selected)).map(item => ({ id: item.id, title: item.vaccine, detail: `Dose: ${item.dose} · Lote: ${item.batch}`, date: item.date }))} /></>}
        {page === 'procedimentos' && <><div className="breadcrumb">Início <ChevronRight size={14} /> <strong>Procedimentos</strong></div><PageHeading eyebrow="CUIDADO AO CIDADÃO" title="Procedimentos" description="Registre procedimentos realizados e consulte o histórico." /><section className="card form-card"><SectionTitle title="Registrar procedimento" subtitle="Os registros são vinculados ao prontuário." /><form key={formKey} onSubmit={event => submitRecord(event, 'procedure')}><PatientSelect patients={data.patients} selected={selected} onChange={setSelected} /><div className="form-grid"><Field label="Procedimento" required><select name="procedure" required defaultValue=""><option value="">Selecione um procedimento</option>{procedures.map(item => <option key={item}>{item}</option>)}</select></Field><Field label="Data e horário" required><input name="date" type="datetime-local" defaultValue={nowLocal()} required /></Field><div className="span-2"><Field label="Profissional responsável" required><input name="professional" required placeholder="Nome do profissional" /></Field></div><div className="span-2"><Field label="Observações"><textarea name="notes" rows={3} placeholder="Informações adicionais sobre o procedimento" /></Field></div></div><div className="form-actions"><button className="button primary"><Check size={17} /> Salvar procedimento</button></div></form></section><History title="Histórico de procedimentos" selected={selected} items={byNewest(data.procedures.filter(item => item.patientId === selected)).map(item => ({ id: item.id, title: item.procedure, detail: `Profissional: ${item.professional}${item.notes ? ` · ${item.notes}` : ''}`, date: item.date }))} /></>}
        {page === 'prontuario' && <>
          <div className="breadcrumb">Início <ChevronRight size={14} /> <strong>Prontuário</strong></div>
          <PageHeading eyebrow="CUIDADO AO CIDADÃO" title="Prontuário" description="Consulte os dados e o histórico de cuidado do cidadão." />
          <section className="card form-card select-card"><PatientSelect patients={data.patients} selected={selected} onChange={setSelected} /></section>
          {currentPatient ? <>
            <section className="card patient-summary">
              <div className="patient-summary-top">
                <Avatar name={currentPatient.name} />
                <div><h2>{currentPatient.name}</h2><p>{age(currentPatient.birthDate)} · {currentPatient.sex || 'Sexo não informado'}</p></div>
                <button className="button secondary" onClick={() => { setEditing(currentPatient); setShowPatientForm(true); setPage('cidadaos'); }}><Pencil size={16} /> Editar cadastro</button>
              </div>
              <div className="patient-details">
                <div><small>DATA DE NASCIMENTO</small><strong>{formatDate(currentPatient.birthDate)}</strong></div>
                <div><small>CPF</small><strong>{currentPatient.cpf || 'Não informado'}</strong></div>
                <div><small>CNS</small><strong>{currentPatient.cns || 'Não informado'}</strong></div>
                <div><small>TELEFONE</small><strong>{currentPatient.phone || 'Não informado'}</strong></div>
                <div><small>ENDEREÇO</small><strong>{currentPatient.address || 'Não informado'}</strong></div>
              </div>
            </section>
            <section className="card history-card">
              <SectionTitle title="Histórico de atendimentos" subtitle="Evoluções registradas para este cidadão" />
              {data.encounters.filter(item => item.patientId === selected).length
                ? byNewest(data.encounters.filter(item => item.patientId === selected)).map(item => <article className="record" key={item.id}>
                  <div className="record-heading"><span className="record-icon purple"><Stethoscope size={18} /></span><div><strong>Atendimento de enfermagem</strong><small>{formatDate(item.date)}</small></div><span className="status status-done"><span />Finalizado</span></div>
                  <div className="record-body"><RecordText label="Anamnese" text={item.anamnesis} /><RecordText label="Exame físico" text={item.exam} /><RecordText label="Avaliação" text={item.assessment} /><RecordText label="Diagnóstico" text={item.diagnosis} /><RecordText label="Condutas e orientações" text={item.conduct} /></div>
                </article>)
                : <Empty text="Nenhum atendimento registrado." />}
            </section>
            <section className="card history-card">
              <SectionTitle title="Escutas iniciais e medições" subtitle="Motivo da procura, classificação de risco e dados registrados" />
              {data.triages.filter(item => item.patientId === selected).length
                ? byNewest(data.triages.filter(item => item.patientId === selected)).map(item => <article className="record" key={item.id}>
                  <div className="record-heading">
                    <span className="record-icon teal"><HeartPulse size={18} /></span>
                    <div><strong>Escuta inicial</strong><small>{formatDate(item.date)}</small></div>
                    <TriageRiskBadge risk={item.riskClassification} />
                  </div>
                  <div className="record-body">
                    <RecordText label="Motivo da procura / queixa principal" text={item.complaint} />
                    <TriageMeasurements triage={item} />
                  </div>
                </article>)
                : <Empty text="Nenhuma escuta inicial registrada." />}
            </section>
            <History title="Vacinações" selected={selected} items={byNewest(data.vaccinations.filter(item => item.patientId === selected)).map(item => ({ id: item.id, title: item.vaccine, detail: `Dose: ${item.dose} · Lote: ${item.batch}`, date: item.date }))} />
            <History title="Procedimentos" selected={selected} items={byNewest(data.procedures.filter(item => item.patientId === selected)).map(item => ({ id: item.id, title: item.procedure, detail: `Profissional: ${item.professional}${item.notes ? ` · ${item.notes}` : ''}`, date: item.date }))} />
          </> : <section className="card"><Empty text="Selecione um cidadão para consultar o prontuário." /></section>}
        </>}
        {page === 'agendamentos' && <>
          <div className="breadcrumb">Início <ChevronRight size={14} /> <strong>Agenda</strong></div>
          <PageHeading eyebrow="ORGANIZAÇÃO DO CUIDADO" title="Agenda da unidade" description="Agende consultas e acompanhe a chegada dos cidadãos." action={!showAppointmentForm && <button className="button primary" onClick={() => setShowAppointmentForm(true)}><Plus size={17} /> Novo agendamento</button>} />
          {showAppointmentForm ? <section className="card form-card">
            <SectionTitle title="Novo agendamento" subtitle="Agendamento local para o ambiente de simulação." />
            <form onSubmit={submitAppointment}>
              <Field label="Cidadão" required><select name="patientId" required defaultValue=""><option value="">Selecione um cidadão</option>{data.patients.map(patient => <option key={patient.id} value={patient.id}>{patient.name}{patient.cns ? ` · CNS ${patient.cns}` : ''}</option>)}</select></Field>
              <div className="form-grid">
                <Field label="Data e horário" required><input name="date" type="datetime-local" min={nowLocal().slice(0, 16)} defaultValue={agendaDate > today() ? `${agendaDate}T09:00` : nowLocal().slice(0, 16)} required /></Field>
                <Field label="Tipo de atendimento" required><select name="type" defaultValue="Consulta de enfermagem"><option>Consulta de enfermagem</option><option>Retorno</option><option>Demanda programada</option><option>Procedimento</option></select></Field>
                <Field label="Profissional responsável" required><input name="professional" defaultValue="Enfermeiro(a)" required maxLength={100} /></Field>
              </div>
              <div className="form-actions"><button type="button" className="button secondary" onClick={() => setShowAppointmentForm(false)}>Cancelar</button><button className="button primary"><Check size={17} /> Salvar agendamento</button></div>
            </form>
          </section> : <section className="card list-card">
            <SectionTitle title="Agendamentos" subtitle={`${data.appointments.filter(item => item.date.startsWith(agendaDate)).length} registro(s) na data selecionada.`} />
            <div className="agenda-tools"><Field label="Data"><input type="date" value={agendaDate} onChange={event => setAgendaDate(event.target.value)} /></Field></div>
            {data.appointments.filter(item => item.date.startsWith(agendaDate)).length ? <div className="table-wrap"><table><thead><tr><th>HORÁRIO</th><th>CIDADÃO</th><th>ATENDIMENTO</th><th>PROFISSIONAL</th><th>SITUAÇÃO</th><th>AÇÕES</th></tr></thead><tbody>
              {byOldest(data.appointments.filter(item => item.date.startsWith(agendaDate))).map(appointment => {
                const patient = data.patients.find(item => item.id === appointment.patientId);
                if (!patient) return null;
                return <tr key={appointment.id}><td>{appointment.date.slice(11, 16)}</td><td><button className="person-cell" onClick={() => navigate('prontuario', patient.id)}><Avatar name={patient.name} /><span><strong>{patient.name}</strong><small>{patient.cns ? `CNS ${patient.cns}` : 'CNS não informado'}</small></span></button></td><td>{appointment.type}</td><td>{appointment.professional}</td><td><span className={`status ${appointment.status === 'completed' ? 'status-done' : appointment.status === 'triaged' ? 'status-triaged' : appointment.status === 'present' ? 'status-present' : 'status-wait'}`}><span />{appointmentStatusLabels[appointment.status]}</span></td><td><div className="row-actions agenda-actions">
                  {appointment.status === 'scheduled' && <><button className="agenda-action" onClick={() => { if (changeAppointmentStatus(appointment, 'present', 'Presença registrada; cidadão incluído na fila.')) navigate('atendimento', patient.id); }}>Registrar chegada</button>{appointment.date < nowLocal() && <button className="agenda-action" onClick={() => changeAppointmentStatus(appointment, 'no-show', 'Agendamento marcado como não compareceu.')}>Não compareceu</button>}<button className="agenda-action danger" onClick={() => { if (window.confirm(`Cancelar o agendamento de ${patient.name}?`)) changeAppointmentStatus(appointment, 'cancelled', 'Agendamento cancelado.'); }}>Cancelar</button></>}
                  {appointment.status === 'present' && <button className="agenda-action" onClick={() => navigate('acolhimento', patient.id)}>Fazer escuta inicial</button>}
                  {appointment.status === 'triaged' && <button className="agenda-action" onClick={() => { navigate('atendimento', patient.id); setActiveAppointmentId(appointment.id); setShowEncounterForm(true); }}>Atender</button>}
                </div></td></tr>;
              })}
            </tbody></table></div> : <Empty text="Nenhum agendamento nesta data." />}
          </section>}
        </>}
        {(['medicamentos', 'relatorios'] as Page[]).includes(page) && <><div className="breadcrumb">Início <ChevronRight size={14} /> <strong>{navigation.find(item => item.id === page)?.label}</strong></div><PageHeading eyebrow="OUTROS MÓDULOS" title={navigation.find(item => item.id === page)?.label ?? ''} description="Conheça os módulos disponíveis no ambiente de simulação." /><section className="card illustrative"><div className="illustrative-icon">{page === 'medicamentos' ? <Pill size={30} /> : <BarChart3 size={30} />}</div><h2>Uma visão ilustrativa</h2><p>Este módulo é apenas demonstrativo e não possui funcionalidades implementadas neste simulador.</p><button className="button secondary" onClick={() => navigate('painel')}>Voltar para visão geral</button></section></>}
        <footer className="footer"><span>Simulador e-SUS APS <span>·</span> Ambiente de aprendizado</span><span>Dados fictícios, cuidado real com a privacidade.</span></footer>
      </main>
      <div className="backup-dock"><button onClick={download} title="Exportar backup"><ArrowDownToLine size={15} /> Exportar backup</button><button onClick={() => importRef.current?.click()} title="Importar backup"><Upload size={15} /> Importar</button><input ref={importRef} type="file" accept=".json,application/json" hidden onChange={event => void importBackup(event.target.files?.[0])} /></div>
    </div>
  </div>;
}

function Stat({ icon: Icon, color, label, number, detail, onClick }: { icon: LucideIcon; color: string; label: string; number: number; detail: string; onClick: () => void }) {
  return <button className="card stat" onClick={onClick}><div className="stat-top"><span className={`stat-icon ${color}`}><Icon size={21} /></span><ArrowUpRight size={17} /></div><span className="stat-label">{label}</span><strong>{String(number).padStart(2, '0')}</strong><small>{detail}</small></button>;
}
function Quick({ icon: Icon, color, title, description, onClick }: { icon: LucideIcon; color: string; title: string; description: string; onClick: () => void }) {
  return <button className="quick-item" onClick={onClick}><span className={`quick-icon ${color}`}><Icon size={19} /></span><span><strong>{title}</strong><small>{description}</small></span><ChevronRight size={17} /></button>;
}
function RecordText({ label, text }: { label: string; text: string }) {
  return <div className="record-text"><strong>{label}</strong><p>{text || '—'}</p></div>;
}
function History({ title, selected, items }: { title: string; selected: string; items: { id: string; title: string; detail: string; date: string }[] }) {
  return <section className="card history-card"><SectionTitle title={title} subtitle="Registros vinculados ao cidadão" />{!selected ? <Empty text="Selecione um cidadão para consultar o histórico." /> : items.length ? items.map(item => <article className="history-item" key={item.id}><span className="record-icon blue"><FileText size={18} /></span><div><strong>{item.title}</strong><p>{item.detail}</p></div><small>{formatDate(item.date)}</small></article>) : <Empty text="Nenhum registro encontrado para este cidadão." />}</section>;
}
