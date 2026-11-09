import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  AlertTriangle,
  Phone,
  Stethoscope,
  FileText,
  Baby,
  TrendingUp,
  FolderOpen,
  Syringe,
  CheckCircle2,
  Clock,
  Plus,
  Eye,
} from 'lucide-react';
import { useMedical, calculateExactAgeLabel } from '../context/MedicalContext';
import { Specialty } from '../types/medical';

/* ============================================================================
   VISTA 10: DIRECTORIO GENERAL DE PACIENTES (/pacientes)
============================================================================ */
export const PatientDirectoryView: React.FC = () => {
  const {
    patients,
    setCurrentView,
    navigateToPatient360,
    navigateToActiveConsultation,
    navigateToPatientVaccines,
  } = useMedical();

  const [query, setQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('Todas');

  const filteredPatients = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((p) => {
      const matchSpec = specialtyFilter === 'Todas' || p.primarySpecialty === specialtyFilter;
      if (!q) return matchSpec;
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      return (
        matchSpec &&
        (fullName.includes(q) ||
          p.historyNumber.toLowerCase().includes(q) ||
          (p.idDocument || '').toLowerCase().includes(q) ||
          p.guardianIdDocument.toLowerCase().includes(q) ||
          p.guardianWhatsapp.toLowerCase().includes(q) ||
          p.guardianName.toLowerCase().includes(q))
      );
    });
  }, [patients, query, specialtyFilter]);

  return (
    <div className="space-y-5">
      {/* Search & Action Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[280px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre del paciente, N° de historia, cédula o teléfono/WhatsApp del representante..."
            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-[#0284C7] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
          >
            <option value="Todas">Todas las especialidades</option>
            <option value="Pediatría">Pediatría</option>
            <option value="Ginecología">Ginecología</option>
            <option value="Medicina Interna / Cardiología">Medicina Interna / Cardiología</option>
            <option value="Traumatología">Traumatología</option>
            <option value="Dermatología">Dermatología</option>
          </select>

          <button
            onClick={() => setCurrentView('paciente-nuevo')}
            className="px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Nuevo Paciente (Vista 12)</span>
          </button>
        </div>
      </div>

      {/* Patient Cards / Rows */}
      <div className="space-y-3">
        {filteredPatients.map((patient) => (
          <div
            key={patient.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md transition-all flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 min-w-[280px]">
              <div className="w-12 h-12 rounded-2xl bg-[#F0F9FF] text-[#0284C7] font-bold text-sm flex items-center justify-center border border-sky-200 shrink-0">
                {patient.firstName[0]}
                {patient.lastName[0]}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => navigateToPatient360(patient.id)}
                    className="text-sm font-bold text-slate-900 hover:text-[#0284C7] cursor-pointer"
                  >
                    {patient.firstName} {patient.lastName}
                  </button>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-mono font-semibold text-slate-600">
                    {patient.historyNumber}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-semibold text-[#0284C7]">
                    {calculateExactAgeLabel(patient.birthDate)}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500">
                    Sexo: {patient.sex === 'M' ? 'Masculino' : 'Femenino'}
                  </span>
                </div>

                {/* Tutor & WhatsApp Info */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>
                    Tutor: <strong className="text-slate-700">{patient.guardianName}</strong> ({patient.guardianRelation} · {patient.guardianIdDocument})
                  </span>
                  <a
                    href={`https://wa.me/${patient.guardianWhatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono font-semibold text-[#059669] hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    {patient.guardianWhatsapp}
                  </a>
                </div>
              </div>
            </div>

            {/* Severe Allergy Alert & Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {patient.criticalAllergies.length > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{patient.criticalAllergies[0]}</span>
                </div>
              )}

              {patient.primarySpecialty === 'Pediatría' && (
                <button
                  onClick={() => navigateToPatientVaccines(patient.id)}
                  className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Syringe className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Vacunas</span>
                </button>
              )}

              <button
                onClick={() => navigateToPatient360(patient.id)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Ver Expediente</span>
              </button>

              <button
                onClick={() => navigateToActiveConsultation(patient.id)}
                className="px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Iniciar Consulta Ahora</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================================
   VISTA 11: FICHA INTEGRAL DEL PACIENTE 360° (/pacientes/:id)
============================================================================ */
export const Patient360View: React.FC = () => {
  const {
    selectedPatient,
    navigateToActiveConsultation,
    navigateToPatientVaccines,
    openDispatchModal,
  } = useMedical();

  const [activeTab, setActiveTab] = useState<'timeline' | 'perinatal' | 'curvas' | 'estudios'>(
    'timeline'
  );
  const [growthMetric, setGrowthMetric] = useState<'weight' | 'height' | 'bmi'>('weight');

  return (
    <div className="space-y-5">
      {/* Persistent Clinical Summary Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F0F9FF] text-[#0284C7] font-bold text-lg flex items-center justify-center border border-sky-200">
              {selectedPatient.firstName[0]}
              {selectedPatient.lastName[0]}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </h1>
                <span className="text-xs font-mono text-slate-500">
                  · {selectedPatient.historyNumber}
                </span>
                <span className="text-xs font-bold text-[#0284C7]">
                  · {calculateExactAgeLabel(selectedPatient.birthDate)}
                </span>
                <span className="text-xs font-mono font-bold text-slate-800">
                  · Grupo Sanguíneo {selectedPatient.bloodType}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Representante: <strong>{selectedPatient.guardianName}</strong> ({selectedPatient.guardianRelation}) · Teléfono:{' '}
                <span className="font-mono font-semibold text-slate-700">
                  {selectedPatient.guardianWhatsapp}
                </span>{' '}
                · Correo: {selectedPatient.guardianEmail}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {selectedPatient.criticalAllergies.length > 0 && (
              <div className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Alergias Críticas: {selectedPatient.criticalAllergies.join(', ')}</span>
              </div>
            )}

            <button
              onClick={() => navigateToPatientVaccines(selectedPatient.id)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
            >
              <Syringe className="w-4 h-4 text-[#059669]" />
              <span>Carnet de Vacunas (Vista 13)</span>
            </button>

            <button
              onClick={() => navigateToActiveConsultation(selectedPatient.id)}
              className="px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <Stethoscope className="w-4 h-4" />
              <span>Iniciar Consulta Ahora</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/70">
          {[
            { id: 'timeline', label: 'Línea de Tiempo (Timeline Clínico)', icon: Clock },
            { id: 'perinatal', label: 'Ficha Perinatal / Antecedentes', icon: Baby },
            { id: 'curvas', label: 'Curvas de Crecimiento OMS', icon: TrendingUp },
            { id: 'estudios', label: 'Archivos y Estudios Diagnósticos', icon: FolderOpen },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as typeof activeTab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  active
                    ? 'bg-[#0284C7] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: TIMELINE CRONOLÓGICO */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {selectedPatient.consultations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-3">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">
                Sin consultas históricas registradas aún
              </h3>
              <p className="text-xs text-slate-500">
                Inicie una consulta con el Copiloto de IA para poblar el historial cronológico.
              </p>
              <button
                onClick={() => navigateToActiveConsultation(selectedPatient.id)}
                className="px-4 py-2 rounded-xl bg-[#0284C7] text-white text-xs font-bold cursor-pointer"
              >
                Iniciar Primera Consulta
              </button>
            </div>
          ) : (
            selectedPatient.consultations.map((cons) => (
              <div
                key={cons.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#0284C7]">{cons.date}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-bold text-slate-900">
                      {cons.cie10Code} — {cons.cie10Name}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{cons.doctorName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-600">
                    <span>Peso: {cons.weightKg} kg</span>
                    <span>Talla: {cons.heightCm} cm</span>
                    <span>T: {cons.temperatureC} °C</span>
                    <button
                      onClick={() => openDispatchModal(selectedPatient, cons)}
                      className="px-3 py-1 rounded-lg bg-sky-50 text-[#0284C7] font-sans font-semibold hover:bg-sky-100 cursor-pointer"
                    >
                      Ver Récipe PDF (Vista 17)
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>Motivo y Evolución:</strong> {cons.reason}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>Examen Físico:</strong> {cons.physicalExamSummary}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: FICHA PERINATAL Y ANTECEDENTES */}
      {activeTab === 'perinatal' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900">
            Datos Perinatales, Neonatales y Antecedentes Patológicos
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[11px] text-slate-500 block">Edad Gestacional</span>
              <span className="text-base font-bold font-mono text-slate-900">
                {selectedPatient.perinatal.gestationalWeeks} semanas
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[11px] text-slate-500 block">Test de Apgar (1&apos; / 5&apos;)</span>
              <span className="text-base font-bold font-mono text-[#059669]">
                {selectedPatient.perinatal.apgar1Min} pts / {selectedPatient.perinatal.apgar5Min} pts
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[11px] text-slate-500 block">Peso y Talla al Nacer</span>
              <span className="text-base font-bold font-mono text-slate-900">
                {selectedPatient.perinatal.birthWeightKg} kg · {selectedPatient.perinatal.birthHeightCm} cm
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[11px] text-slate-500 block">Vía de Nacimiento</span>
              <span className="text-xs font-bold text-slate-900">
                {selectedPatient.perinatal.deliveryType}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">Complicaciones Neonatales y Pesquisa</div>
              <p className="text-slate-600">{selectedPatient.perinatal.neonatalComplications}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">Hospitalizaciones y Condiciones Crónicas</div>
              <p className="text-slate-600">{selectedPatient.previousHospitalizations}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CURVAS DE CRECIMIENTO OMS (SVG INTERACTIVO) */}
      {activeTab === 'curvas' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Curvas Oficiales de Percentiles OMS (Estándar Internacional)
              </h2>
              <p className="text-xs text-slate-500">
                Trazado longitudinal del paciente frente a los canales percentilares P97, P85, P50, P15 y P3.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'weight', label: 'Peso para la Edad (kg)' },
                { id: 'height', label: 'Talla para la Edad (cm)' },
                { id: 'bmi', label: 'IMC para la Edad' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setGrowthMetric(m.id as typeof growthMetric)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    growthMetric === m.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive SVG Percentile Chart */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <svg viewBox="0 0 760 280" className="w-full h-64 overflow-visible">
              {/* Grid lines */}
              {[40, 90, 140, 190, 240].map((y) => (
                <line
                  key={y}
                  x1="50"
                  y1={y}
                  x2="720"
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                />
              ))}
              {/* WHO Reference Percentile Curves (P97, P50, P3) */}
              <path
                d="M 60 210 Q 300 110, 700 45"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="1.5"
                strokeDasharray="5 5"
              />
              <text x="705" y="48" className="text-[10px] fill-amber-600 font-mono">
                P97
              </text>

              <path
                d="M 60 230 Q 300 145, 700 88"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
              />
              <text x="705" y="92" className="text-[10px] fill-emerald-600 font-mono font-bold">
                P50 (OMS)
              </text>

              <path
                d="M 60 248 Q 300 185, 700 140"
                fill="none"
                stroke="#E11D48"
                strokeWidth="1.5"
                strokeDasharray="5 5"
              />
              <text x="705" y="144" className="text-[10px] fill-rose-600 font-mono">
                P3
              </text>

              {/* Patient Measured Trajectory */}
              <polyline
                fill="none"
                stroke="#0284C7"
                strokeWidth="3"
                points="60,228 210,175 360,142 520,114 680,82"
              />
              {[
                { x: 60, y: 228, label: 'RN: 3.35kg' },
                { x: 210, y: 175, label: '6m: 7.9kg' },
                { x: 360, y: 142, label: '12m: 9.8kg' },
                { x: 520, y: 114, label: '24m: 12.6kg' },
                { x: 680, y: 82, label: 'Actual: 15.4kg (P60)' },
              ].map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="5" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2" />
                  <text
                    x={pt.x - 24}
                    y={pt.y - 12}
                    className="text-[10px] font-mono font-bold fill-slate-800"
                  >
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}

      {/* TAB 4: ARCHIVOS Y ESTUDIOS */}
      {activeTab === 'estudios' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedPatient.studies.map((study) => (
            <div
              key={study.id}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs flex flex-col justify-between"
            >
              {study.imageUrl && (
                <img
                  src={study.imageUrl}
                  alt={study.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-48 object-cover border-b border-slate-200"
                />
              )}
              <div className="p-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                  <span className="font-bold text-[#0284C7]">{study.category}</span>
                  <span>{study.date}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{study.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{study.summary}</p>
                {study.valuesHighlight && (
                  <div className="pt-2 text-xs font-mono font-semibold text-emerald-700">
                    {study.valuesHighlight}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   VISTA 12: FORMULARIO DE REGISTRO DE NUEVO PACIENTE (/pacientes/nuevo)
============================================================================ */
export const NewPatientFormView: React.FC = () => {
  const { addPatient, navigateToPatient360 } = useMedical();

  const [firstName, setFirstName] = useState('Santiago Andrés');
  const [lastName, setLastName] = useState('Castillo Rivas');
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [birthDate, setBirthDate] = useState('2024-03-15');
  const [bloodType, setBloodType] = useState<'O+' | 'A+' | 'B+'>('O+');
  const [primarySpecialty, setPrimarySpecialty] = useState<Specialty>('Pediatría');

  const [guardianName, setGuardianName] = useState('Gabriela Rivas de Castillo');
  const [guardianIdDocument, setGuardianIdDocument] = useState('V-19.334.112');
  const [guardianOccupation, setGuardianOccupation] = useState('Odontóloga');
  const [guardianWhatsapp, setGuardianWhatsapp] = useState('+58 414-7782310');
  const [guardianEmail, setGuardianEmail] = useState('gabriela.rivas@correo.com');

  const [allergiesText, setAllergiesText] = useState('Alergia a Ibuprofeno');
  const [chronicText, setChronicText] = useState('Ninguna condición crónica');
  const [hospText, setHospText] = useState('Sin hospitalizaciones previas');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = addPatient({
      firstName,
      lastName,
      sex,
      birthDate,
      bloodType,
      primarySpecialty,
      criticalAllergies: allergiesText ? [allergiesText] : [],
      chronicConditions: [chronicText],
      previousHospitalizations: hospText,
      guardianName,
      guardianRelation: 'Madre',
      guardianIdDocument,
      guardianOccupation,
      guardianWhatsapp,
      guardianEmail,
      perinatal: {
        gestationalWeeks: 39,
        apgar1Min: 9,
        apgar5Min: 10,
        birthWeightKg: 3.4,
        birthHeightCm: 50,
        birthHeadCircumferenceCm: 34.5,
        deliveryType: 'Parto Eutócico Simple',
        neonatalComplications: 'Ninguna',
        maternalBloodType: bloodType,
        exclusiveBreastfeedingMonths: 6,
      },
      growthHistory: [],
      vaccines: [],
      studies: [],
      consultations: [],
    });
    navigateToPatient360(created.id);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            Bloque 1 · Datos del Niño / Paciente
          </h2>
          <span className="text-xs font-mono font-bold text-[#0284C7]">
            Edad Calculada: {calculateExactAgeLabel(birthDate)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombres</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Apellidos</label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fecha de Nacimiento
            </label>
            <input
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sexo</label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value as 'M' | 'F')}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Grupo Sanguíneo
            </label>
            <select
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value as 'O+' | 'A+' | 'B+')}
              className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="O+">O+</option>
              <option value="A+">A+</option>
              <option value="B+">B+</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Especialidad Principal
            </label>
            <select
              value={primarySpecialty}
              onChange={(e) => setPrimarySpecialty(e.target.value as Specialty)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="Pediatría">Pediatría</option>
              <option value="Ginecología">Ginecología</option>
              <option value="Medicina Interna / Cardiología">Medicina Interna / Cardiología</option>
              <option value="Traumatología">Traumatología</option>
              <option value="Dermatología">Dermatología</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
          Bloque 2 · Datos del Representante Legal / Contacto Directo
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre Madre / Padre / Tutor
            </label>
            <input
              type="text"
              required
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cédula de Identidad
            </label>
            <input
              type="text"
              required
              value={guardianIdDocument}
              onChange={(e) => setGuardianIdDocument(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ocupación</label>
            <input
              type="text"
              value={guardianOccupation}
              onChange={(e) => setGuardianOccupation(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              WhatsApp para Récipes
            </label>
            <input
              type="text"
              required
              value={guardianWhatsapp}
              onChange={(e) => setGuardianWhatsapp(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={guardianEmail}
              onChange={(e) => setGuardianEmail(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
          Bloque 3 · Antecedentes Médicos y Alergias Críticas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-rose-700 mb-1">
              Alergias a Medicamentos (Alerta Roja)
            </label>
            <input
              type="text"
              value={allergiesText}
              onChange={(e) => setAllergiesText(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-rose-50/50 border border-rose-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Condiciones Crónicas Familiares
            </label>
            <input
              type="text"
              value={chronicText}
              onChange={(e) => setChronicText(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hospitalizaciones Previas
            </label>
            <input
              type="text"
              value={hospText}
              onChange={(e) => setHospText(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div className="pt-3 flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Registrar Paciente y Abrir Expediente 360° →
          </button>
        </div>
      </div>
    </form>
  );
};

/* ============================================================================
   VISTA 13: CARNET DIGITAL DE VACUNACIÓN INTERACTIVO (/pacientes/:id/vacunas)
============================================================================ */
export const VaccinationCardView: React.FC = () => {
  const { selectedPatient, openVaccineModal, setCurrentView } = useMedical();

  const milestones = ['Al nacer', '2 meses', '4 meses', '6 meses', '12 meses', '18 meses', '5 años'];

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900">
            Carnet Digital de Vacunación OMS / SVPP — {selectedPatient.firstName}{' '}
            {selectedPatient.lastName}
          </h1>
          <p className="text-xs text-slate-500">
            Haz clic en cualquier dosis para abrir el Modal de Aplicación Inmediata (Vista 14) y registrar lote y laboratorio.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-[#059669] font-bold">● Verde: Aplicada</span>
          <span className="text-amber-600 font-bold">● Amarillo: Pendiente en edad óptima</span>
          <span className="text-slate-500 font-bold">● Gris: Dosis futura</span>
          <button
            onClick={() => setCurrentView('vacunas-catalogo')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer"
          >
            Catálogo Maestro (Vista 15)
          </button>
        </div>
      </div>

      {/* Chronological Matrix by Age Milestones */}
      <div className="space-y-4">
        {milestones.map((milestone) => {
          const doses = selectedPatient.vaccines.filter((v) => v.milestoneLabel === milestone);
          if (doses.length === 0) return null;
          return (
            <div
              key={milestone}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3"
            >
              <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>HITO DE EDAD: {milestone.toUpperCase()}</span>
                <span className="font-mono text-slate-400">{doses.length} biológicos</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {doses.map((dose) => {
                  const isApplied = dose.status === 'aplicada';
                  const isPending = dose.status === 'pendiente';
                  return (
                    <button
                      key={dose.id}
                      onClick={() => openVaccineModal(selectedPatient.id, dose)}
                      className={`text-left p-4 rounded-xl border transition-all hover:-translate-y-0.5 cursor-pointer ${
                        isApplied
                          ? 'bg-[#ECFDF5]/70 border-emerald-200 text-emerald-950'
                          : isPending
                          ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                        <span className="font-bold">{dose.doseNumber}</span>
                        <span>
                          {isApplied ? (
                            <span className="text-[#059669] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Aplicada
                            </span>
                          ) : isPending ? (
                            <span className="text-amber-700 font-bold">Pendiente · Aplicar</span>
                          ) : (
                            <span>Programada</span>
                          )}
                        </span>
                      </div>

                      <div className="text-sm font-bold text-slate-900">{dose.vaccineName}</div>

                      {isApplied ? (
                        <div className="mt-2 pt-2 border-t border-emerald-200/60 text-[11px] font-mono text-emerald-900 space-y-0.5">
                          <div>
                            Fecha: <strong>{dose.appliedDate}</strong> · Lote:{' '}
                            <strong>{dose.batchNumber}</strong>
                          </div>
                          <div>
                            Lab: {dose.manufacturer} · Por: {dose.appliedBy}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-slate-500">
                          Clic para registrar lote y aplicar dosis inmediata →
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================================
   VISTA 15: CATÁLOGO MAESTRO DE VACUNAS (/configuracion/vacunas)
============================================================================ */
export const MasterVaccineCatalogView: React.FC = () => {
  const { masterVaccines, toggleMasterVaccine, addMasterVaccine } = useMedical();
  const [commercialName, setCommercialName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [dosesRequired, setDosesRequired] = useState(2);
  const [recommendedAges, setRecommendedAges] = useState('2 meses, 4 meses');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commercialName.trim()) return;
    addMasterVaccine({
      commercialName,
      genericName: genericName || commercialName,
      dosesRequired,
      recommendedAges,
      route: 'Intramuscular (IM)',
      active: true,
    });
    setCommercialName('');
    setGenericName('');
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <h1 className="text-base font-bold text-slate-900">
          Catálogo Maestro de Vacunas del Consultorio
        </h1>
        <p className="text-xs text-slate-500">
          Active, desactive o incorpore nuevos biológicos comerciales al esquema oficial del centro.
        </p>

        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Nombre Comercial (ej. Menactra)"
            value={commercialName}
            onChange={(e) => setCommercialName(e.target.value)}
            className="px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
          />
          <input
            type="text"
            placeholder="Componente Genérico (Meningococo)"
            value={genericName}
            onChange={(e) => setGenericName(e.target.value)}
            className="px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
          />
          <input
            type="number"
            min={1}
            max={6}
            value={dosesRequired}
            onChange={(e) => setDosesRequired(Number(e.target.value))}
            className="px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
          />
          <input
            type="text"
            placeholder="Edades recomendadas (9m, 12m)"
            value={recommendedAges}
            onChange={(e) => setRecommendedAges(e.target.value)}
            className="px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Vacuna</span>
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="py-3 px-4 text-left">Nombre Comercial</th>
              <th className="py-3 px-4 text-left">Biológico Genérico</th>
              <th className="py-3 px-4 text-left">Dosis Requeridas</th>
              <th className="py-3 px-4 text-left">Edades Recomendadas</th>
              <th className="py-3 px-4 text-left">Vía</th>
              <th className="py-3 px-4 text-right">Estado en Esquema</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70">
            {masterVaccines.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-900">{v.commercialName}</td>
                <td className="py-3 px-4 text-slate-600">{v.genericName}</td>
                <td className="py-3 px-4 font-mono font-bold text-slate-800">
                  {v.dosesRequired} dosis
                </td>
                <td className="py-3 px-4 text-slate-600">{v.recommendedAges}</td>
                <td className="py-3 px-4 font-mono text-slate-500">{v.route}</td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => toggleMasterVaccine(v.id)}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                      v.active
                        ? 'bg-emerald-50 text-[#059669] border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {v.active ? 'Activa en Consultorio' : 'Inactiva'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
