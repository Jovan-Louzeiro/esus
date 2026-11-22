import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Activity, ArrowLeft, ArrowRight, Bell, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Clock3, Download, FileHeart, HeartPulse, LayoutDashboard, Menu, Plus, Search, Settings, ShieldCheck, Stethoscope, Syringe, Trash2, Upload, UserRound, UsersRound, X } from 'lucide-react'
import { age, blankEncounter, blankPatient, blankVaccination, dateLabel, doses, encounterTypes, seedData, timeLabel, today, triagePriorities, vaccines, type Appointment, type Data, type Encounter, type Patient, type TriagePriority, type Vaccination, type VitalKey } from './model'
import { clearData, isData, loadData, normalizeData, saveData } from './storage'

type Page = 'dashboard' | 'patients' | 'encounters' | 'vaccinations'
type Modal = 'patient' | 'record' | 'newEncounter' | 'vaccination' | 'settings' | null
const sexOptions = ['Feminino', 'Masculino', 'Outro', 'Não informado'] as const
const localDate = (value: string) => {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
const formatLongDate = () => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const patientName = (data: Data, id: string) => data.patients.find(p => p.id === id)?.name ?? 'Paciente não encontrado'

function ModalShell({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
    <div className="modal-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={20} /></button></div>{children}
  </section></div>
}
function Field({ label, children, required = false, hint }: { label: string; children: ReactNode; required?: boolean; hint?: string }) {
  return <label className="field"><span>{label}{required && <b className="required"> *</b>}</span>{children}{hint && <small>{hint}</small>}</label>
}
function Badge({ status }: { status: string }) {
  const style = status === 'Finalizado' ? 'green' : status === 'Em andamento' || status === 'Em atendimento' ? 'blue' : 'amber'
  return <span className={`badge ${style}`}><i />{status}</span>
}
function PriorityBadge({ priority }: { priority: TriagePriority }) {
  const label = triagePriorities.find(item => item.value === priority)?.label ?? 'Não classificado'
  return <span className={`priority-badge priority-${priority}`}><i />{label}</span>
}
function PrioritySelector({ value, onChange }: { value: Exclude<TriagePriority, 'unclassified'> | ''; onChange: (priority: Exclude<TriagePriority, 'unclassified'>) => void }) {
  return <div className="triage-options" role="radiogroup" aria-label="Prioridade do atendimento">{triagePriorities.map(item => <button key={item.value} type="button" role="radio" aria-checked={value === item.value} className={`triage-option triage-${item.value} ${value === item.value ? 'selected' : ''}`} onClick={() => onChange(item.value)}><i /><strong>{item.label}</strong><small>{item.description}</small></button>)}</div>
}
function Avatar({ name, index = 0 }: { name: string; index?: number }) { return <span className={`avatar avatar-${index % 5}`}>{initials(name)}</span> }
function Empty({ text }: { text: string }) { return <div className="empty"><FileHeart size={25} /><p>{text}</p></div> }
function PatientCell({ patient, index = 0, subtitle }: { patient?: Patient; index?: number; subtitle?: string }) {
  if (!patient) return <span>Paciente não encontrado</span>
  return <div className="person"><Avatar name={patient.name} index={index} /><div><strong>{patient.name}</strong>{subtitle && <small>{subtitle}</small>}</div></div>
}
function Stat({ icon, label, value, note, tone }: { icon: ReactNode; label: string; value: number; note: string; tone: string }) {
  return <div className="stat"><div className="stat-top"><span>{label}</span><div className={`stat-icon ${tone}`}>{icon}</div></div><strong>{value.toString().padStart(2, '0')}</strong><small>{note}</small></div>
}

function PatientForm({ patient, onSave, onClose, onError }: { patient: Patient; onSave: (patient: Patient) => void; onClose: () => void; onError: (message: string) => void }) {
  const [form, setForm] = useState(patient)
  const set = (key: keyof Patient, value: string) => setForm(old => ({ ...old, [key]: value }))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (form.birth > today()) { onError('A data de nascimento não pode estar no futuro.'); return }
    if (form.cpf && form.cpf.replace(/\D/g, '').length !== 11) { onError('Informe um CPF com 11 dígitos.'); return }
    if (form.cns && form.cns.replace(/\D/g, '').length !== 15) { onError('Informe um CNS com 15 dígitos.'); return }
    if (form.cep && form.cep.replace(/\D/g, '').length !== 8) { onError('Informe um CEP com 8 dígitos.'); return }
    if (form.phone && ![10, 11].includes(form.phone.replace(/\D/g, '').length)) { onError('Informe um telefone com DDD e 10 ou 11 dígitos.'); return }
    onSave({ ...form, name: form.name.trim() })
  }
  const input = (key: keyof Patient, placeholder = '', type = 'text') => <input type={type} value={form[key]} placeholder={placeholder} onChange={e => set(key, e.target.value)} />
  return <form onSubmit={submit}><div className="modal-body">
    <div className="form-section-title">Informações pessoais</div><div className="form-grid">
      <Field label="Nome completo" required><input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nome do paciente fictício" /></Field>
      <Field label="Data de nascimento" required><input required type="date" max={today()} value={form.birth} onChange={e => set('birth', e.target.value)} /></Field>
      <Field label="CPF">{input('cpf', '000.000.000-00')}</Field><Field label="Cartão SUS (CNS)">{input('cns', '15 dígitos')}</Field>
      <Field label="Sexo"><select value={form.sex} onChange={e => set('sex', e.target.value)}>{sexOptions.map(s => <option key={s}>{s}</option>)}</select></Field>
      <Field label="Nome da mãe">{input('mother')}</Field><Field label="Telefone">{input('phone', '(00) 00000-0000', 'tel')}</Field><Field label="E-mail">{input('email', 'email@exemplo.com', 'email')}</Field>
    </div><div className="form-section-title spaced">Endereço</div><div className="form-grid">
      <Field label="CEP">{input('cep', '00000-000')}</Field><Field label="Município">{input('city')}</Field><Field label="Bairro">{input('neighborhood')}</Field><Field label="Rua">{input('street')}</Field><Field label="Número">{input('number')}</Field><Field label="Complemento">{input('complement')}</Field>
    </div>
  </div><div className="modal-footer"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary" type="submit">Salvar paciente</button></div></form>
}

function VaccinationForm({ vaccination, patients, onSave, onClose, onError }: { vaccination: Vaccination; patients: Patient[]; onSave: (v: Vaccination) => void; onClose: () => void; onError: (message: string) => void }) {
  const [form, setForm] = useState(vaccination)
  const set = (key: keyof Vaccination, value: string) => setForm(old => ({ ...old, [key]: value }))
  return <form onSubmit={e => { e.preventDefault(); if (form.nextDose && form.nextDose < form.date) { onError('A próxima dose não pode ser anterior à aplicação.'); return }; onSave(form) }}>
    <div className="modal-body"><div className="form-grid">
      <Field label="Paciente" required><select required value={form.patientId} onChange={e => set('patientId', e.target.value)}><option value="">Selecione um paciente</option>{patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="Vacina" required><select required value={form.vaccine} onChange={e => set('vaccine', e.target.value)}><option value="">Selecione</option>{vaccines.map(v => <option key={v}>{v}</option>)}</select></Field>
      <Field label="Dose" required><select required value={form.dose} onChange={e => set('dose', e.target.value)}><option value="">Selecione</option>{doses.map(d => <option key={d}>{d}</option>)}</select></Field>
      <Field label="Data de aplicação" required><input required type="date" max={today()} value={form.date} onChange={e => set('date', e.target.value)} /></Field>
      <Field label="Lote" required><input required value={form.batch} onChange={e => set('batch', e.target.value)} /></Field>
      <Field label="Fabricante" required><input required value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} /></Field>
      <Field label="Unidade de saúde"><input value={form.unit} onChange={e => set('unit', e.target.value)} /></Field>
      <Field label="Via de administração"><input value={form.route} onChange={e => set('route', e.target.value)} placeholder="Ex.: Intramuscular" /></Field>
      <Field label="Local de aplicação"><input value={form.site} onChange={e => set('site', e.target.value)} placeholder="Ex.: Braço esquerdo" /></Field>
      <Field label="Próxima dose prevista"><input type="date" value={form.nextDose} onChange={e => set('nextDose', e.target.value)} /></Field>
      <div className="full"><Field label="Observações"><textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field></div>
    </div></div><div className="modal-footer"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary">Salvar registro</button></div>
  </form>
}

function RecordModal({ patient, data, onClose, onEdit, onClinical, onStart, onVaccinate }: { patient: Patient; data: Data; onClose: () => void; onEdit: () => void; onClinical: (p: Patient) => void; onStart: () => void; onVaccinate: () => void }) {
  const [tab, setTab] = useState('Dados pessoais')
  const [clinical, setClinical] = useState(patient)
  const tabs = ['Dados pessoais', 'Histórico clínico', 'Atendimentos', 'Vacinação']
  const encounters = data.encounters.filter(e => e.patientId === patient.id).sort((a, b) => b.date.localeCompare(a.date))
  const vaccinations = data.vaccinations.filter(v => v.patientId === patient.id).sort((a, b) => b.date.localeCompare(a.date))
  return <ModalShell title="Prontuário do paciente" subtitle="Informações de acompanhamento fictícias" onClose={onClose} wide>
    <div className="record-person"><PatientCell patient={patient} subtitle={`${age(patient.birth)} anos · ${patient.sex} · CNS ${patient.cns || 'não informado'}`} /><div className="row-actions"><button className="btn secondary small" onClick={onEdit}>Editar cadastro</button><button className="btn primary small" onClick={onStart}><Plus size={15} /> Atendimento</button></div></div>
    <div className="tabs">{tabs.map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
    <div className="modal-body record-body">
      {tab === 'Dados pessoais' && <div className="detail-grid">{[['CPF', patient.cpf], ['CNS', patient.cns], ['Data de nascimento', dateLabel(patient.birth)], ['Sexo', patient.sex], ['Nome da mãe', patient.mother], ['Telefone', patient.phone], ['E-mail', patient.email], ['CEP', patient.cep], ['Município', patient.city], ['Bairro', patient.neighborhood], ['Endereço', [patient.street, patient.number, patient.complement].filter(Boolean).join(', ')]].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value || 'Não informado'}</strong></div>)}</div>}
      {tab === 'Histórico clínico' && <form onSubmit={e => { e.preventDefault(); onClinical(clinical) }} className="clinical-form">
        {([['allergies', 'Alergias'], ['conditions', 'Condições de saúde'], ['medications', 'Medicamentos em uso']] as const).map(([key, label]) => <Field label={label} key={key}><textarea rows={3} value={clinical[key]} onChange={e => setClinical({ ...clinical, [key]: e.target.value })} placeholder={`Registre ${label.toLowerCase()}...`} /></Field>)}
        <button className="btn primary">Salvar informações</button></form>}
      {tab === 'Atendimentos' && (encounters.length ? <div className="history-list">{encounters.map(e => <div className="history-item" key={e.id}><div><strong>{e.type}</strong><small>{dateLabel(localDate(e.date))} às {timeLabel(e.date)} · {e.professional}</small>{e.soap.assessment && <p>{e.soap.assessment}</p>}</div><div className="row-actions"><PriorityBadge priority={e.priority} /><Badge status={e.status} /></div></div>)}</div> : <Empty text="Nenhum atendimento registrado para este paciente." />)}
      {tab === 'Vacinação' && <><div className="section-action"><span>Histórico de aplicações</span><button className="btn secondary small" onClick={onVaccinate}><Plus size={15} /> Registrar vacina</button></div>{vaccinations.length ? <div className="history-list">{vaccinations.map(v => <div className="history-item" key={v.id}><div><strong>{v.vaccine} · {v.dose}</strong><small>Aplicação: {dateLabel(v.date)} · Lote: {v.batch}</small><small>Próxima dose: {dateLabel(v.nextDose)}</small></div><span className="badge green"><i />Registrada</span></div>)}</div> : <Empty text="Nenhuma vacina registrada para este paciente." />}</>}
    </div>
  </ModalShell>
}

function Dashboard({ data, navigate, openPatient, openEncounter, quick }: { data: Data; navigate: (p: Page) => void; openPatient: (id: string) => void; openEncounter: (id: string) => void; quick: (action: string) => void }) {
  const recent = [...data.encounters].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  const agenda = data.appointments.filter(a => a.date === today()).sort((a, b) => a.time.localeCompare(b.time))
  const completedToday = data.encounters.filter(e => e.status === 'Finalizado' && localDate(e.finishedAt) === today()).length
  const active = data.encounters.filter(e => e.status === 'Em andamento').length
  const vaccinatedToday = data.vaccinations.filter(v => v.date === today()).length
  return <>
    <div className="welcome"><div><div className="eyebrow"><span className="eyebrow-dot" /> VISÃO GERAL DA UNIDADE</div><h1>Olá, enfermeiro(a) <span className="wave">✦</span></h1><p>Acompanhe a rotina da sua unidade de saúde.</p></div><div className="welcome-date"><CalendarDays size={18} /><span>Hoje, {formatLongDate()}</span></div></div>
    <div className="stats-grid">
      <Stat icon={<UsersRound size={21} />} label="Pacientes cadastrados" value={data.patients.length} note="Total de pacientes" tone="mint" />
      <Stat icon={<CheckCircle2 size={21} />} label="Atendimentos realizados" value={completedToday} note="Finalizados hoje" tone="sky" />
      <Stat icon={<Clock3 size={21} />} label="Atendimentos pendentes" value={active} note="Em andamento" tone="sand" />
      <Stat icon={<Syringe size={21} />} label="Vacinas aplicadas" value={vaccinatedToday} note="Doses registradas hoje" tone="lavender" />
    </div>
    <div className="dashboard-grid">
      <section className="panel recent-panel"><div className="panel-head"><div><h2>Atendimentos recentes</h2><p>Acompanhe os últimos atendimentos realizados</p></div><button className="text-link" onClick={() => navigate('encounters')}>Ver todos <ArrowRight size={15} /></button></div>
        {recent.length ? <div className="table-scroll"><table><thead><tr><th>PACIENTE</th><th>HORÁRIO</th><th>TIPO DE ATENDIMENTO</th><th>PRIORIDADE</th><th>STATUS</th><th></th></tr></thead><tbody>{recent.map((e, i) => <tr key={e.id}><td><button className="plain-button" onClick={() => openPatient(e.patientId)}><PatientCell patient={data.patients.find(p => p.id === e.patientId)} index={i} /></button></td><td>{timeLabel(e.date)}</td><td>{e.type}</td><td><PriorityBadge priority={e.priority} /></td><td><Badge status={e.status} /></td><td><button className="icon-btn subtle" aria-label="Abrir atendimento" onClick={() => openEncounter(e.id)}><ChevronRight size={18} /></button></td></tr>)}</tbody></table></div> : <Empty text="Nenhum atendimento registrado ainda." />}
      </section>
      <section className="panel agenda-panel"><div className="panel-head"><div><h2>Agenda de hoje</h2><p>Consultas programadas para hoje</p></div><div className="panel-icon"><CalendarDays size={18} /></div></div>
        {agenda.length ? <div className="agenda-list">{agenda.map((a, i) => <button className="agenda-item" key={a.id} onClick={() => openPatient(a.patientId)}><span className="agenda-time">{a.time}</span><span className={`timeline-dot dot-${i % 3}`} /><span className="agenda-copy"><strong>{patientName(data, a.patientId)}</strong><small>{a.reason}</small><Badge status={a.status} /></span><ChevronRight size={15} /></button>)}</div> : <Empty text="Nenhum paciente agendado para hoje." />}
        <div className="agenda-footer"><CalendarDays size={15} /> {agenda.length} {agenda.length === 1 ? 'agendamento' : 'agendamentos'} para hoje</div>
      </section>
    </div>
    <section className="quick-section"><div className="section-heading"><div><h2>Ações rápidas</h2><p>Acesse as principais funcionalidades</p></div></div><div className="quick-grid">
      {[
        { label: 'Novo paciente', sub: 'Cadastrar paciente', icon: <UsersRound size={21} />, action: 'patient', tone: 'mint' },
        { label: 'Iniciar atendimento', sub: 'Nova consulta', icon: <Stethoscope size={21} />, action: 'encounter', tone: 'sky' },
        { label: 'Registrar vacinação', sub: 'Adicionar aplicação', icon: <Syringe size={21} />, action: 'vaccination', tone: 'lavender' },
        { label: 'Buscar paciente', sub: 'Consultar prontuário', icon: <Search size={21} />, action: 'search', tone: 'sand' },
      ].map(item => <button className="quick-card" key={item.action} onClick={() => quick(item.action)}><div className={`quick-icon ${item.tone}`}>{item.icon}</div><span><strong>{item.label}</strong><small>{item.sub}</small></span><ChevronRight size={17} /></button>)}
    </div></section>
  </>
}

function PatientsPage({ data, query, setQuery, openPatient, editPatient, deletePatient, addPatient }: { data: Data; query: string; setQuery: (q: string) => void; openPatient: (id: string) => void; editPatient: (p: Patient) => void; deletePatient: (p: Patient) => void; addPatient: () => void }) {
  const [sex, setSex] = useState('Todos')
  const [sort, setSort] = useState('name')
  const patients = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('pt-BR')
    return data.patients.filter(p => (sex === 'Todos' || p.sex === sex) && (!q || [p.name, p.cpf, p.cns].some(v => v.toLocaleLowerCase('pt-BR').includes(q) || (q.replace(/\D/g, '') && v.replace(/\D/g, '').includes(q.replace(/\D/g, '')))))).sort((a, b) => sort === 'birth' ? a.birth.localeCompare(b.birth) : a.name.localeCompare(b.name, 'pt-BR'))
  }, [data.patients, query, sex, sort])
  return <><div className="page-title"><div><div className="eyebrow">CADASTROS DA UNIDADE</div><h1>Pacientes</h1><p>Gerencie os pacientes e consulte seus prontuários.</p></div><button className="btn primary" onClick={addPatient}><Plus size={18} /> Novo paciente</button></div>
    <section className="panel"><div className="list-heading"><div><h2>Pacientes cadastrados <span className="count">{patients.length}</span></h2><p>Dados fictícios da unidade de saúde</p></div></div>
      <div className="filters"><div className="search-field"><Search size={17} /><input placeholder="Buscar por nome, CPF ou CNS..." value={query} onChange={e => setQuery(e.target.value)} /></div><select aria-label="Filtrar por sexo" value={sex} onChange={e => setSex(e.target.value)}><option>Todos</option>{sexOptions.map(s => <option key={s}>{s}</option>)}</select><select aria-label="Ordenar pacientes" value={sort} onChange={e => setSort(e.target.value)}><option value="name">Ordenar por nome</option><option value="birth">Ordenar por nascimento</option></select></div>
      {patients.length ? <div className="table-scroll"><table><thead><tr><th>NOME COMPLETO</th><th>CPF</th><th>NASCIMENTO</th><th>SEXO</th><th>TELEFONE</th><th>CARTÃO SUS</th><th>AÇÕES</th></tr></thead><tbody>{patients.map((p, i) => <tr key={p.id}><td><button className="plain-button" onClick={() => openPatient(p.id)}><PatientCell patient={p} index={i} /></button></td><td>{p.cpf || '—'}</td><td>{dateLabel(p.birth)}</td><td>{p.sex}</td><td>{p.phone || '—'}</td><td>{p.cns || '—'}</td><td><div className="table-actions"><button onClick={() => openPatient(p.id)}>Prontuário</button><button onClick={() => editPatient(p)}>Editar</button><button className="danger-text" onClick={() => deletePatient(p)}>Excluir</button></div></td></tr>)}</tbody></table></div> : <Empty text="Nenhum paciente encontrado." />}
    </section></>
}

function EncountersPage({ data, query, setQuery, openEncounter, add }: { data: Data; query: string; setQuery: (q: string) => void; openEncounter: (id: string) => void; add: () => void }) {
  const [filter, setFilter] = useState('Todos')
  const encounters = [...data.encounters].filter(e => patientName(data, e.patientId).toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')) && (filter === 'Todos' || (filter === 'Hoje' ? localDate(e.date) === today() : e.status === filter))).sort((a, b) => b.date.localeCompare(a.date))
  return <><div className="page-title"><div><div className="eyebrow">CUIDADO E ACOMPANHAMENTO</div><h1>Atendimentos</h1><p>Gerencie as consultas de enfermagem da unidade.</p></div><button className="btn primary" onClick={add}><Plus size={18} /> Novo atendimento</button></div>
    <section className="panel"><div className="list-heading"><div><h2>Atendimentos <span className="count">{encounters.length}</span></h2><p>Histórico de consultas da unidade</p></div></div>
      <div className="filters"><div className="search-field"><Search size={17} /><input placeholder="Buscar paciente..." value={query} onChange={e => setQuery(e.target.value)} /></div><select aria-label="Filtrar atendimentos" value={filter} onChange={e => setFilter(e.target.value)}><option>Todos</option><option>Hoje</option><option>Em andamento</option><option>Finalizado</option></select></div>
      {encounters.length ? <div className="table-scroll"><table><thead><tr><th>PACIENTE</th><th>DATA</th><th>HORÁRIO</th><th>TIPO</th><th>PRIORIDADE</th><th>PROFISSIONAL</th><th>STATUS</th><th>AÇÃO</th></tr></thead><tbody>{encounters.map((e, i) => <tr key={e.id}><td><PatientCell patient={data.patients.find(p => p.id === e.patientId)} index={i} /></td><td>{dateLabel(localDate(e.date))}</td><td>{timeLabel(e.date)}</td><td>{e.type}</td><td><PriorityBadge priority={e.priority} /></td><td>{e.professional}</td><td><Badge status={e.status} /></td><td><button className="table-link" onClick={() => openEncounter(e.id)}>{e.status === 'Finalizado' ? 'Visualizar' : 'Continuar'}</button></td></tr>)}</tbody></table></div> : <Empty text="Nenhum atendimento encontrado." />}
    </section></>
}

function VaccinationsPage({ data, query, setQuery, add, edit, remove }: { data: Data; query: string; setQuery: (q: string) => void; add: () => void; edit: (v: Vaccination) => void; remove: (v: Vaccination) => void }) {
  const [patient, setPatient] = useState('')
  const [vaccine, setVaccine] = useState('')
  const records = [...data.vaccinations].filter(v => (!patient || v.patientId === patient) && (!vaccine || v.vaccine === vaccine) && patientName(data, v.patientId).toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))).sort((a, b) => b.date.localeCompare(a.date))
  const upcoming = data.vaccinations.filter(v => v.nextDose && v.nextDose >= today())
  const pending = new Set(data.vaccinations.filter(v => v.nextDose && v.nextDose <= today()).map(v => v.patientId)).size
  return <><div className="page-title"><div><div className="eyebrow">IMUNIZAÇÃO</div><h1>Vacinação</h1><p>Registre aplicações e acompanhe o histórico vacinal.</p></div><button className="btn primary" onClick={add}><Plus size={18} /> Registrar vacinação</button></div>
    <div className="stats-grid compact-stats"><Stat icon={<Syringe size={21} />} label="Aplicadas hoje" value={data.vaccinations.filter(v => v.date === today()).length} note="Doses registradas hoje" tone="mint" /><Stat icon={<ClipboardList size={21} />} label="Total de registros" value={data.vaccinations.length} note="Aplicações registradas" tone="sky" /><Stat icon={<Clock3 size={21} />} label="Pacientes pendentes" value={pending} note="Doses previstas até hoje" tone="sand" /><Stat icon={<CalendarDays size={21} />} label="Próximas doses" value={upcoming.length} note="Previstas a partir de hoje" tone="lavender" /></div>
    <section className="panel"><div className="list-heading"><div><h2>Registros de vacinação <span className="count">{records.length}</span></h2><p>Aplicações e próximas doses informadas manualmente</p></div></div><div className="filters"><div className="search-field"><Search size={17} /><input placeholder="Buscar paciente..." value={query} onChange={e => setQuery(e.target.value)} /></div><select aria-label="Filtrar por paciente" value={patient} onChange={e => setPatient(e.target.value)}><option value="">Todos os pacientes</option>{data.patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><select aria-label="Filtrar por vacina" value={vaccine} onChange={e => setVaccine(e.target.value)}><option value="">Todas as vacinas</option>{vaccines.map(v => <option key={v}>{v}</option>)}</select></div>
      {records.length ? <div className="table-scroll"><table><thead><tr><th>PACIENTE</th><th>VACINA</th><th>DOSE</th><th>APLICAÇÃO</th><th>PRÓXIMA DOSE</th><th>LOTE</th><th>FABRICANTE</th><th>PROFISSIONAL</th><th>AÇÕES</th></tr></thead><tbody>{records.map((v, i) => <tr key={v.id}><td><PatientCell patient={data.patients.find(p => p.id === v.patientId)} index={i} /></td><td>{v.vaccine}</td><td>{v.dose}</td><td>{dateLabel(v.date)}</td><td>{dateLabel(v.nextDose)}</td><td>{v.batch}</td><td>{v.manufacturer}</td><td>{v.professional}</td><td><div className="table-actions"><button onClick={() => edit(v)}>Editar</button><button className="danger-text" onClick={() => remove(v)}>Excluir</button></div></td></tr>)}</tbody></table></div> : <Empty text="Nenhum registro de vacinação encontrado." />}
    </section></>
}

function Consultation({ encounter, patient, update, back, finish, saved }: { encounter: Encounter; patient: Patient; update: (e: Encounter) => void; back: () => void; finish: () => void; saved: () => void }) {
  const readonly = encounter.status === 'Finalizado'
  const vitalFields: [VitalKey, string, string][] = [['pressure', 'Pressão arterial', 'mmHg · ex.: 120/80'], ['heart', 'Frequência cardíaca', 'bpm'], ['respiratory', 'Frequência respiratória', 'irpm'], ['temperature', 'Temperatura', '°C'], ['oxygen', 'Saturação de oxigênio', '%'], ['weight', 'Peso', 'kg'], ['height', 'Altura', 'cm'], ['glucose', 'Glicemia capilar', 'mg/dL']]
  const weight = Number(encounter.vitals.weight), height = Number(encounter.vitals.height)
  const bmi = weight > 0 && height > 0 ? (weight / (height / 100) ** 2).toFixed(1) : '—'
  return <><button className="back-link" onClick={back}><ArrowLeft size={17} /> Voltar para atendimentos</button><div className="page-title consultation-title"><div><div className="eyebrow">CONSULTA DE ENFERMAGEM</div><h1>{readonly ? 'Atendimento finalizado' : 'Atendimento em andamento'}</h1><p>Registro clínico de treinamento · {encounter.type}</p></div><div className="row-actions"><PriorityBadge priority={encounter.priority} /><Badge status={encounter.status} /></div></div>
    <div className="consult-patient"><PatientCell patient={patient} subtitle={`${age(patient.birth)} anos · ${patient.sex} · CNS ${patient.cns || 'não informado'}`} /><div><small>DATA E HORÁRIO</small><strong>{dateLabel(localDate(encounter.date))} às {timeLabel(encounter.date)}</strong></div><div><small>PROFISSIONAL</small><strong>{encounter.professional}</strong></div></div>
    {!readonly && <section className="panel consult-section triage-section"><div className="section-title-icon"><div className="small-icon sand"><Activity size={19} /></div><div><h2>Prioridade do atendimento</h2><p>Classificação manual para fins de simulação</p></div></div><PrioritySelector value={encounter.priority === 'unclassified' ? '' : encounter.priority} onChange={priority => update({ ...encounter, priority })} /></section>}
    <fieldset disabled={readonly} className="consult-fields">
      <section className="panel consult-section"><div className="section-title-icon"><div className="small-icon mint"><HeartPulse size={19} /></div><div><h2>Sinais vitais</h2><p>Registre os dados aferidos durante a consulta</p></div></div><div className="vitals-grid">
        {vitalFields.map(([key, label, unit]) => <Field label={label} key={key}><div className="unit-input"><input type={key === 'pressure' ? 'text' : 'number'} min={key === 'pressure' ? undefined : '0'} step="any" value={encounter.vitals[key]} placeholder="—" onChange={e => update({ ...encounter, vitals: { ...encounter.vitals, [key]: e.target.value } })} /><span>{unit}</span></div></Field>)}
        <Field label="IMC calculado"><div className="bmi-value">{bmi} <span>kg/m²</span></div></Field>
      </div></section>
      <section className="panel consult-section"><div className="section-title-icon"><div className="small-icon sky"><ClipboardList size={19} /></div><div><h2>Registro SOAP</h2><p>Documente a consulta de forma estruturada</p></div></div><div className="soap-grid">
        {([['subjective', 'S', 'Subjetivo', 'Queixas, sintomas e relato do paciente...'], ['objective', 'O', 'Objetivo', 'Exame físico e observações clínicas...'], ['assessment', 'A', 'Avaliação', 'Avaliação clínica e problemas identificados...'], ['plan', 'P', 'Plano', 'Condutas, orientações e acompanhamento...']] as const).map(([key, letter, title, placeholder]) => <Field key={key} label={`${letter} — ${title}`}><textarea rows={5} value={encounter.soap[key]} placeholder={placeholder} onChange={e => update({ ...encounter, soap: { ...encounter.soap, [key]: e.target.value } })} /></Field>)}
      </div></section>
      <section className="panel consult-section"><div className="section-title-icon"><div className="small-icon lavender"><FileHeart size={19} /></div><div><h2>Condutas</h2><p>Registros simulados de orientações e acompanhamento</p></div></div><div className="form-grid">
        {([['guidance', 'Orientações ao paciente'], ['exams', 'Solicitação de exames'], ['referral', 'Encaminhamento'], ['notes', 'Observações adicionais']] as const).map(([key, label]) => <Field key={key} label={label}><textarea rows={3} value={encounter.conduct[key]} onChange={e => update({ ...encounter, conduct: { ...encounter.conduct, [key]: e.target.value } })} /></Field>)}
        <Field label="Data de retorno"><input type="date" value={encounter.conduct.returnDate} onChange={e => update({ ...encounter, conduct: { ...encounter.conduct, returnDate: e.target.value } })} /></Field>
      </div></section>
    </fieldset>
    {!readonly && <div className="consult-footer"><span><Check size={16} /> Alterações salvas automaticamente neste navegador</span><div className="row-actions"><button className="btn secondary" onClick={saved}>Salvar rascunho</button><button className="btn primary" onClick={finish}><CheckCircle2 size={17} /> Finalizar atendimento</button></div></div>}
    {readonly && <p className="muted">Finalizado em {dateLabel(localDate(encounter.finishedAt))} às {timeLabel(encounter.finishedAt)}. Registro disponível para consulta.</p>}
  </>
}

function NewEncounterModal({ patients, initialPatient, onClose, onStart }: { patients: Patient[]; initialPatient: string; onClose: () => void; onStart: (id: string, type: string, priority: TriagePriority) => void }) {
  const [patient, setPatient] = useState(initialPatient)
  const [type, setType] = useState('Consulta agendada')
  const [priority, setPriority] = useState<Exclude<TriagePriority, 'unclassified'> | ''>('')
  return <ModalShell title="Novo atendimento" subtitle="Selecione o paciente, o tipo e a prioridade" onClose={onClose}><form onSubmit={e => { e.preventDefault(); if (priority) onStart(patient, type, priority) }}><div className="modal-body stack">
    <Field label="Paciente" required><select required value={patient} onChange={e => setPatient(e.target.value)}><option value="">Selecione um paciente</option>{patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
    <Field label="Tipo de atendimento" required><select value={type} onChange={e => setType(e.target.value)}>{encounterTypes.map(t => <option key={t}>{t}</option>)}</select></Field>
    <div className="triage-field"><span>Prioridade do atendimento <b className="required">*</b></span><PrioritySelector value={priority} onChange={setPriority} /><small className="triage-hint">Classificação manual para fins de simulação. Avalie conforme o protocolo da unidade.</small></div>
    {!patients.length && <p className="muted">Cadastre um paciente antes de iniciar um atendimento.</p>}
  </div><div className="modal-footer"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button disabled={!patients.length || !priority} className="btn primary">Iniciar atendimento <ArrowRight size={16} /></button></div></form></ModalShell>
}

function SettingsModal({ onClose, onExport, onImport, onRestore, onClear }: { onClose: () => void; onExport: () => void; onImport: (file: File) => void; onRestore: () => void; onClear: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return <ModalShell title="Configurações" subtitle="Gerencie os dados de treinamento deste navegador" onClose={onClose}><div className="modal-body settings-list">
    <div className="setting-item"><div><strong>Exportar dados</strong><p>Baixe um arquivo JSON com todos os registros.</p></div><button className="btn secondary small" onClick={onExport}><Download size={15} /> Exportar</button></div>
    <div className="setting-item"><div><strong>Importar dados</strong><p>Substitua os registros por um backup JSON.</p></div><input hidden ref={inputRef} type="file" accept=".json,application/json" onChange={e => { const file = e.target.files?.[0]; if (file) onImport(file); e.target.value = '' }} /><button className="btn secondary small" onClick={() => inputRef.current?.click()}><Upload size={15} /> Importar</button></div>
    <div className="setting-item"><div><strong>Restaurar dados fictícios</strong><p>Substitua os dados atuais pelos exemplos iniciais.</p></div><button className="btn secondary small" onClick={onRestore}>Restaurar</button></div>
    <div className="setting-item"><div><strong>Limpar dados de treinamento</strong><p>Exclua todos os registros deste navegador.</p></div><button className="btn danger small" onClick={onClear}><Trash2 size={15} /> Limpar</button></div>
  </div></ModalShell>
}

export default function App() {
  const [initial] = useState(() => { try { return { data: loadData(), error: '' } } catch (error) { return { data: clearData(), error: error instanceof Error ? error.message : 'Não foi possível carregar os dados locais.' } } })
  const [data, setData] = useState<Data>(initial.data)
  const [storageError, setStorageError] = useState(initial.error)
  const [page, setPage] = useState<Page>('dashboard')
  const [modal, setModal] = useState<Modal>(null)
  const [selectedPatient, setSelectedPatient] = useState('')
  const [selectedEncounter, setSelectedEncounter] = useState('')
  const [patientDraft, setPatientDraft] = useState<Patient>(blankPatient)
  const [vaccinationDraft, setVaccinationDraft] = useState<Vaccination>(blankVaccination)
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null)
  const [sidebar, setSidebar] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notify = (text: string, error = false) => { setToast({ text, error }); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 3500) }
  const commit = (next: Data, success?: string, recovery = false) => {
    if (initial.error && storageError && !recovery) { notify('Recupere os dados locais antes de fazer alterações.', true); return false }
    try { saveData(next); setData(next); setStorageError(''); if (success) notify(success); return true }
    catch { setStorageError('Não foi possível salvar os dados neste navegador. Verifique o espaço disponível e as permissões de armazenamento.'); notify('Erro ao salvar os dados locais.', true); return false }
  }
  const navigate = (next: Page) => { setPage(next); setSelectedEncounter(''); setQuery(''); setSidebar(false) }
  const openPatient = (id: string) => { setSelectedPatient(id); setModal('record') }
  const addPatient = () => { setPatientDraft(blankPatient()); setModal('patient') }
  const editPatient = (p: Patient) => { setPatientDraft(p); setModal('patient') }
  const savePatient = (p: Patient) => {
    if (!p.name.trim()) { notify('Informe o nome do paciente.', true); return }
    if (p.cpf && data.patients.some(item => item.id !== p.id && item.cpf && item.cpf.replace(/\D/g, '') === p.cpf.replace(/\D/g, ''))) { notify('Já existe um paciente com este CPF.', true); return }
    if (p.cns && data.patients.some(item => item.id !== p.id && item.cns && item.cns.replace(/\D/g, '') === p.cns.replace(/\D/g, ''))) { notify('Já existe um paciente com este CNS.', true); return }
    const exists = data.patients.some(item => item.id === p.id)
    if (commit({ ...data, patients: exists ? data.patients.map(item => item.id === p.id ? p : item) : [...data.patients, p] }, exists ? 'Cadastro atualizado.' : 'Paciente cadastrado.')) setModal(null)
  }
  const deletePatient = (p: Patient) => {
    if (!confirm(`Excluir ${p.name}? Os atendimentos, vacinas e agendamentos vinculados também serão excluídos.`)) return
    commit({ patients: data.patients.filter(item => item.id !== p.id), encounters: data.encounters.filter(e => e.patientId !== p.id), vaccinations: data.vaccinations.filter(v => v.patientId !== p.id), appointments: data.appointments.filter(a => a.patientId !== p.id) }, 'Paciente e registros vinculados excluídos.')
  }
  const startModal = (id = '') => { setSelectedPatient(id); setModal('newEncounter') }
  const startEncounter = (id: string, type: string, priority: TriagePriority) => {
    const e = blankEncounter(id, type, priority)
    let updated = false
    const appointments: Appointment[] = data.appointments.map(a => { if (!updated && a.patientId === id && a.date === today() && a.status === 'Agendado') { updated = true; return { ...a, status: 'Em atendimento' } }; return a })
    if (commit({ ...data, appointments, encounters: [...data.encounters, e] }, 'Atendimento iniciado.')) { setModal(null); setPage('encounters'); setSelectedEncounter(e.id); setQuery('') }
  }
  const updateEncounter = (e: Encounter) => commit({ ...data, encounters: data.encounters.map(item => item.id === e.id ? e : item) })
  const finishEncounter = (e: Encounter) => {
    if (!confirm('Finalizar este atendimento? Após a finalização, o registro ficará disponível apenas para consulta.')) return
    const finished = { ...e, status: 'Finalizado' as const, finishedAt: new Date().toISOString() }
    let updated = false
    const appointments: Appointment[] = data.appointments.map(a => { if (!updated && a.patientId === e.patientId && a.date === localDate(e.date) && a.status === 'Em atendimento') { updated = true; return { ...a, status: 'Finalizado' } }; return a })
    commit({ ...data, appointments, encounters: data.encounters.map(item => item.id === e.id ? finished : item) }, 'Atendimento finalizado.')
  }
  const openEncounter = (id: string) => { setPage('encounters'); setSelectedEncounter(id); setQuery('') }
  const addVaccination = (patientId = '') => { setVaccinationDraft({ ...blankVaccination(), patientId }); setModal('vaccination') }
  const saveVaccination = (v: Vaccination) => {
    const exists = data.vaccinations.some(item => item.id === v.id)
    if (commit({ ...data, vaccinations: exists ? data.vaccinations.map(item => item.id === v.id ? v : item) : [...data.vaccinations, v] }, exists ? 'Vacinação atualizada.' : 'Vacinação registrada.')) setModal(null)
  }
  const exportData = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `aps-simulada-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    notify('Backup exportado.')
  }
  const importData = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isData(parsed)) { notify('Arquivo inválido ou incompatível com o sistema.', true); return }
      if (!confirm('Importar este backup e substituir todos os dados atuais?')) return
      if (commit(normalizeData(parsed), 'Dados importados com sucesso.', true)) { setModal(null); setSelectedEncounter(''); setSelectedPatient(''); setPage('dashboard') }
    } catch { notify('Não foi possível ler o arquivo JSON.', true) }
  }
  const reset = (restore: boolean) => {
    if (!confirm(restore ? 'Restaurar os dados fictícios? Todos os dados atuais serão substituídos.' : 'Limpar todos os dados de treinamento? Esta ação não pode ser desfeita.')) return
    if (commit(restore ? seedData() : clearData(), restore ? 'Dados fictícios restaurados.' : 'Dados de treinamento removidos.', true)) { setModal(null); setSelectedEncounter(''); setSelectedPatient(''); setPage('dashboard') }
  }
  const quick = (action: string) => { if (action === 'patient') addPatient(); else if (action === 'encounter') startModal(); else if (action === 'vaccination') addVaccination(); else navigate('patients') }
  const patient = data.patients.find(p => p.id === selectedPatient)
  const encounter = data.encounters.find(e => e.id === selectedEncounter)
  const encounterPatient = data.patients.find(p => p.id === encounter?.patientId)
  const navItems: { key: Page; label: string; icon: ReactNode }[] = [{ key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={19} /> }, { key: 'patients', label: 'Pacientes', icon: <UsersRound size={19} /> }, { key: 'encounters', label: 'Atendimentos', icon: <ClipboardList size={19} /> }, { key: 'vaccinations', label: 'Vacinação', icon: <Syringe size={19} /> }]
  return <div className="app">
    {sidebar && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setSidebar(false)} />}
    <aside className={`sidebar ${sidebar ? 'open' : ''}`}><div className="brand"><div className="brand-mark"><Activity size={25} strokeWidth={2.2} /></div><div><strong>APS <span>Simulada</span></strong><small>ATENÇÃO PRIMÁRIA À SAÚDE</small></div></div>
      <div className="side-label">MENU PRINCIPAL</div><nav>{navItems.map(item => <button key={item.key} className={`nav-item ${page === item.key ? 'active' : ''}`} onClick={() => navigate(item.key)}>{item.icon}<span>{item.label}</span>{page === item.key && <ChevronRight className="nav-chevron" size={16} />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="side-divider" /><button className="settings-button" onClick={() => { setModal('settings'); setSidebar(false) }}><Settings size={19} /> Configurações</button><div className="professional"><div className="professional-avatar"><UserRound size={19} /></div><div><strong>Enfermeiro(a)</strong><small>UBS Simulada</small></div><ChevronDown size={15} /></div><div className="side-simulation">Enfermeiro(a) — Simulação</div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="top-left"><button className="icon-btn menu-toggle" onClick={() => setSidebar(true)} aria-label="Abrir menu"><Menu size={21} /></button><div className="breadcrumb"><span>APS Simulada</span><ChevronRight size={14} /><strong>{navItems.find(n => n.key === page)?.label}</strong></div></div>
      <div className="top-right"><div className="top-search"><Search size={17} /><input placeholder="Buscar paciente..." value={query} onChange={e => { if (page !== 'patients') { setPage('patients'); setSelectedEncounter('') }; setQuery(e.target.value) }} /></div><span className="top-date">{dateLabel(today())}</span><div className="training-badge"><span /> AMBIENTE DE TREINAMENTO</div><button className="notification" aria-label="Notificações (simulação)" title="Notificações (simulação)"><Bell size={20} /><i /></button><div className="top-profile"><div className="professional-avatar"><UserRound size={17} /></div><div><strong>Enfermeiro(a)</strong><small>UBS Simulada</small></div></div></div></header>
      <main className="content">
        {storageError && <div className="storage-error"><strong>Problema no armazenamento local.</strong> {storageError} <button onClick={() => setModal('settings')}>Abrir configurações</button></div>}
        {page === 'dashboard' && <Dashboard data={data} navigate={navigate} openPatient={openPatient} openEncounter={openEncounter} quick={quick} />}
        {page === 'patients' && <PatientsPage data={data} query={query} setQuery={setQuery} openPatient={openPatient} editPatient={editPatient} deletePatient={deletePatient} addPatient={addPatient} />}
        {page === 'encounters' && (encounter && encounterPatient ? <Consultation encounter={encounter} patient={encounterPatient} update={updateEncounter} back={() => setSelectedEncounter('')} finish={() => finishEncounter(encounter)} saved={() => { commit(data, 'Rascunho salvo.') }} /> : <EncountersPage data={data} query={query} setQuery={setQuery} openEncounter={openEncounter} add={() => startModal()} />)}
        {page === 'vaccinations' && <VaccinationsPage data={data} query={query} setQuery={setQuery} add={() => addVaccination()} edit={v => { setVaccinationDraft(v); setModal('vaccination') }} remove={v => { if (confirm(`Excluir o registro de ${v.vaccine} de ${patientName(data, v.patientId)}?`)) commit({ ...data, vaccinations: data.vaccinations.filter(item => item.id !== v.id) }, 'Registro de vacinação excluído.') }} />}
        <footer className="page-footer"><span><ShieldCheck size={15} /> Sistema de treinamento. Dados fictícios. Não destinado ao atendimento real de pacientes.</span><span>APS Simulada <i>•</i> Atenção Primária à Saúde</span></footer>
      </main>
    </div>
    {modal === 'patient' && <ModalShell title={data.patients.some(p => p.id === patientDraft.id) ? 'Editar paciente' : 'Novo paciente'} subtitle="Preencha os dados cadastrais do paciente fictício" onClose={() => setModal(null)} wide><PatientForm patient={patientDraft} onSave={savePatient} onClose={() => setModal(null)} onError={message => notify(message, true)} /></ModalShell>}
    {modal === 'record' && patient && <RecordModal patient={patient} data={data} onClose={() => setModal(null)} onEdit={() => editPatient(patient)} onClinical={p => { if (commit({ ...data, patients: data.patients.map(item => item.id === p.id ? p : item) }, 'Histórico clínico atualizado.')) setModal(null) }} onStart={() => startModal(patient.id)} onVaccinate={() => addVaccination(patient.id)} />}
    {modal === 'newEncounter' && <NewEncounterModal patients={data.patients} initialPatient={selectedPatient} onClose={() => setModal(null)} onStart={startEncounter} />}
    {modal === 'vaccination' && <ModalShell title={data.vaccinations.some(v => v.id === vaccinationDraft.id) ? 'Editar vacinação' : 'Registrar vacinação'} subtitle="Preencha as informações da aplicação simulada" onClose={() => setModal(null)} wide><VaccinationForm vaccination={vaccinationDraft} patients={data.patients} onSave={saveVaccination} onClose={() => setModal(null)} onError={message => notify(message, true)} /></ModalShell>}
    {modal === 'settings' && <SettingsModal onClose={() => setModal(null)} onExport={exportData} onImport={importData} onRestore={() => reset(true)} onClear={() => reset(false)} />}
    {toast && <div role="status" className={`toast ${toast.error ? 'toast-error' : ''}`}>{toast.error ? <X size={17} /> : <CheckCircle2 size={17} />}{toast.text}</div>}
  </div>
}
