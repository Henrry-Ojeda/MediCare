import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, Eye, FileSignature, Pill, Search, Send, Stethoscope, Upload, UserPlus } from 'lucide-react';
import { Modal } from '../../../../components/common';
import { RecipeDocumentPreview } from '../../../../components/recipe/RecipeDocumentPreview';
import { useClinical } from '../../../../context/ClinicalContext';
import { useAuth } from '../../../../context/AuthContext';
import { useNotifications } from '../../../../context/NotificationContext';
import { MedicalStudyFile, PastConsultationSummary, PrescriptionItem } from '../../../../types/medical';
import { VitalSigns } from '../../../../types/patient.types';
import { DictationAiResult } from '../../../../types/consultation.types';
import { calculateAgeInMonths, calculateExactAgeLabel } from '../../../../utils/pediatricCalculations';
import { getTodayIsoDate } from '../../../../utils/formatters';
import { PatientClinicalHeader } from '../components/PatientClinicalHeader';
import { ClinicalDictationBar } from '../components/ClinicalDictationBar';
import { PediatricAnthropometryCard } from '../components/PediatricAnthropometryCard';
import { PediatricExamCard, PhysicalExamState } from '../components/PediatricExamCard';
import { PediatricPrescriptionCard } from '../components/PediatricPrescriptionCard';
import { CreateRecipeModal } from '../../../../components/recipe/CreateRecipeModal';

export const PediatricConsultationView: React.FC = () => {
  const {
    selectedPatient,
    patients,
    appointments,
    templateConfig,
    currentDoctorHasAssistant,
    addPatient,
    navigateToActiveConsultation,
    setCurrentView,
    completeConsultation,
    addPatientStudy,
    openDispatchModal,
    navigateToPatientVaccines,
  } = useClinical();
  const { currentUser, userRole, doctorSignature } = useAuth();
  const { showToast } = useNotifications();

  const [patientSearch, setPatientSearch] = useState('');
  const [isQuickPatientOpen, setIsQuickPatientOpen] = useState(false);
  const [quickFirstName, setQuickFirstName] = useState('');
  const [quickLastName, setQuickLastName] = useState('');
  const [quickSex, setQuickSex] = useState<'M' | 'F'>('M');
  const [quickBirthDate, setQuickBirthDate] = useState('2022-01-01');
  const [quickIdDoc, setQuickIdDoc] = useState('');
  const [quickGuardianName, setQuickGuardianName] = useState('');
  const [quickGuardianWhatsapp, setQuickGuardianWhatsapp] = useState('');
  const [isLivePreviewOpen, setIsLivePreviewOpen] = useState(false);
  const [livePreviewPage, setLivePreviewPage] = useState<1 | 2>(1);
  const activePatient = selectedPatient;
  const ageMonths = activePatient ? calculateAgeInMonths(activePatient.birthDate) : 24;
  const ageLabel = activePatient ? calculateExactAgeLabel(activePatient.birthDate) : '2 años';

  const [vitals, setVitals] = useState<VitalSigns>(
    activePatient?.latestVitals || {
      weightKg: 0,
      heightCm: 0,
      headCircumferenceCm: 0,
      temperatureC: 0,
      heartRateBpm: 0,
      spo2Percent: 0,
      systolicBp: 0,
      diastolicBp: 0,
      recordedAt: 'Ahora',
      recordedBy: currentUser?.name || 'Pediatra',
    }
  );

  useEffect(() => {
    if (activePatient?.latestVitals) {
      setVitals(activePatient.latestVitals);
    }
  }, [activePatient?.id, activePatient?.latestVitals]);

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [physicalExam, setPhysicalExam] = useState<PhysicalExamState>({
    general: '',
    cabezaCuello: '',
    cardiopulmonar: '',
    abdomen: '',
    extremidades: '',
  });

  const [cie10Code, setCie10Code] = useState('');
  const [cie10Name, setCie10Name] = useState('');
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [parentGuide, setParentGuide] = useState('');
  const [alarmSigns, setAlarmSigns] = useState<string[]>([]);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);

  const [studyTitle, setStudyTitle] = useState('');
  const [studyCategory, setStudyCategory] = useState<MedicalStudyFile['category']>('Laboratorio PDF');
  const [studySummary, setStudySummary] = useState('');
  const [studyImageUrl, setStudyImageUrl] = useState('');

  const handleStudyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setStudyImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const formattedExamString = useMemo(() => {
    const parts: string[] = [];
    if (physicalExam.general.trim()) parts.push(`General: ${physicalExam.general.trim()}`);
    if (physicalExam.cabezaCuello.trim()) parts.push(`ORL/Cuello: ${physicalExam.cabezaCuello.trim()}`);
    if (physicalExam.cardiopulmonar.trim()) parts.push(`Cardiopulmonar: ${physicalExam.cardiopulmonar.trim()}`);
    if (physicalExam.abdomen.trim()) parts.push(`Abdomen: ${physicalExam.abdomen.trim()}`);
    if (physicalExam.extremidades.trim()) parts.push(`Extremidades: ${physicalExam.extremidades.trim()}`);
    return parts.join(' | ');
  }, [physicalExam]);

  if (!activePatient) {
    const showWaitingQueue = userRole !== 'PEDIATRA' || currentDoctorHasAssistant;
    const queueApts = showWaitingQueue
      ? appointments.filter(
          (a) => a.stage === 'en_consulta' || a.stage === 'en_triaje' || a.stage === 'en_sala'
        )
      : [];
    const filteredPatients = patients.filter((p) => {
      const q = patientSearch.trim().toLowerCase();
      if (!q) return true;
      return `${p.firstName} ${p.lastName} ${p.historyNumber} ${p.guardianName}`
        .toLowerCase()
        .includes(q);
    });

    const handleCreateQuickPatient = (e: React.FormEvent) => {
      e.preventDefault();
      if (!quickFirstName.trim()) return;
      const created = addPatient({
        firstName: quickFirstName.trim(),
        lastName: quickLastName.trim() || 'Paciente',
        sex: quickSex,
        birthDate: quickBirthDate || '2022-01-01',
        idDocument: quickIdDoc.trim() || undefined,
        bloodType: 'O+',
        primarySpecialty: 'Pediatría',
        criticalAllergies: [],
        chronicConditions: [],
        previousHospitalizations: '',
        guardianName: quickGuardianName.trim() || `${quickFirstName.trim()} ${quickLastName.trim()}`.trim(),
        guardianRelation: 'Madre',
        guardianIdDocument: quickIdDoc.trim(),
        guardianOccupation: '',
        guardianWhatsapp: quickGuardianWhatsapp.trim(),
        guardianEmail: '',
        perinatal: {
          gestationalWeeks: 39,
          apgar1Min: 9,
          apgar5Min: 9,
          birthWeightKg: 3.2,
          birthHeightCm: 50,
          birthHeadCircumferenceCm: 34,
          deliveryType: 'Parto Eutócico Simple',
          neonatalComplications: 'Ninguna',
          maternalBloodType: 'O+',
          exclusiveBreastfeedingMonths: 6,
        },
        growthHistory: [],
        vaccines: [],
        studies: [],
        consultations: [],
      });
      setIsQuickPatientOpen(false);
      setQuickFirstName('');
      setQuickLastName('');
      setQuickIdDoc('');
      setQuickGuardianName('');
      setQuickGuardianWhatsapp('');
      showToast(`Paciente ${created.firstName} ${created.lastName} creado. Iniciando consulta...`);
      navigateToActiveConsultation(created.id);
    };

    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Seleccionar Paciente para Consulta</h2>
                <p className="text-xs text-slate-500">
                  Elija un paciente de la sala de espera, búsquelo o registre sus datos básicos para atenderlo.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsQuickPatientOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Paciente Rápido</span>
            </button>
          </div>

          {queueApts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700">En Consultorio / Sala de Espera</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {queueApts.map((apt) => (
                  <button
                    key={apt.id}
                    type="button"
                    onClick={() => navigateToActiveConsultation(apt.patientId)}
                    className="text-left p-3 rounded-xl border border-violet-200 bg-violet-50/50 hover:bg-violet-100/70 transition-colors cursor-pointer"
                  >
                    <p className="text-xs font-bold text-slate-900">{apt.patientName}</p>
                    <p className="text-[11px] text-violet-700 font-semibold">
                      {apt.stage === 'en_consulta'
                        ? 'En Consultorio'
                        : apt.stage === 'en_triaje'
                        ? 'En Triaje'
                        : 'En Sala de Espera'}{' '}
                      · {apt.reason}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Buscar paciente por nombre, historia o representante..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          {filteredPatients.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs text-slate-500">
                No hay pacientes que coincidan con la búsqueda.
              </p>
              <button
                type="button"
                onClick={() => {
                  const parts = patientSearch.trim().split(/\s+/);
                  if (parts[0]) setQuickFirstName(parts[0]);
                  if (parts.length > 1) setQuickLastName(parts.slice(1).join(' '));
                  setIsQuickPatientOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Registrar "{patientSearch.trim() || 'Nuevo Paciente'}" y Atender</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto">
              {filteredPatients.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigateToActiveConsultation(p.id)}
                  className="text-left p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-bold text-slate-900">
                    {p.firstName} {p.lastName}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {p.historyNumber} · Rep: {p.guardianName}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <Modal
          isOpen={isQuickPatientOpen}
          onClose={() => setIsQuickPatientOpen(false)}
          title="Registro Básico Rápido de Paciente"
          subtitle="Ingrese los datos esenciales para abrir la consulta y el triaje de inmediato"
          maxWidthClass="max-w-lg"
        >
          <form onSubmit={handleCreateQuickPatient} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={quickFirstName}
                  onChange={(e) => setQuickFirstName(e.target.value)}
                  placeholder="Ej. Sofía"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Apellido</label>
                <input
                  type="text"
                  value={quickLastName}
                  onChange={(e) => setQuickLastName(e.target.value)}
                  placeholder="Ej. Pérez"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sexo</label>
                <select
                  value={quickSex}
                  onChange={(e) => setQuickSex(e.target.value as 'M' | 'F')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Nacimiento</label>
                <input
                  type="date"
                  value={quickBirthDate}
                  onChange={(e) => setQuickBirthDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cédula / Documento</label>
                <input
                  type="text"
                  value={quickIdDoc}
                  onChange={(e) => setQuickIdDoc(e.target.value)}
                  placeholder="Opcional"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Representante</label>
                <input
                  type="text"
                  value={quickGuardianName}
                  onChange={(e) => setQuickGuardianName(e.target.value)}
                  placeholder="Nombre madre/padre"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Representante</label>
              <input
                type="text"
                value={quickGuardianWhatsapp}
                onChange={(e) => setQuickGuardianWhatsapp(e.target.value)}
                placeholder="Ej. +584141234567"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsQuickPatientOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Guardar e Ir a Consulta</span>
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  const handleApplyAiResult = (result: DictationAiResult | null, rawTranscript: string) => {
    if (result) {
      if (result.motivoConsulta) setChiefComplaint(result.motivoConsulta);
      if (result.examenFisico) {
        setPhysicalExam((prev) => ({
          general: result.examenFisico?.general || prev.general,
          cabezaCuello: result.examenFisico?.cabezaCuello || prev.cabezaCuello,
          cardiopulmonar: result.examenFisico?.cardiopulmonar || prev.cardiopulmonar,
          abdomen: result.examenFisico?.abdomen || prev.abdomen,
          extremidades: result.examenFisico?.extremidades || prev.extremidades,
        }));
      }
      if (result.cie10Code && result.cie10Name) {
        setCie10Code(result.cie10Code);
        setCie10Name(result.cie10Name);
      }
      if (result.medicamentos && result.medicamentos.length > 0) {
        const mapped: PrescriptionItem[] = result.medicamentos.map((m, idx) => ({
          id: `rx-ai-${Date.now()}-${idx}`,
          medicationName: m.nombre || 'Medicamento',
          presentation: m.presentacion || 'Suspensión',
          dosePerTake: m.dosisPorToma || '5 ml',
          frequencyHours: String(m.frecuenciaHoras || '8'),
          durationDays: String(m.duracionDias || '5'),
          specialInstructions: m.indicacionEspecial || 'Según indicación médica.',
        }));
        setPrescriptions(mapped);
      }
      if (result.guiaPadres) setParentGuide(result.guiaPadres);
      if (result.signosAlarma && result.signosAlarma.length > 0) setAlarmSigns(result.signosAlarma);
      return;
    }

    // Fallback clínico local cuando no hay backend Gemini disponible
    setChiefComplaint(rawTranscript);
    if (rawTranscript.toLowerCase().includes('faringoamigdalitis') || rawTranscript.toLowerCase().includes('j03.9')) {
      setCie10Code('J03.9');
      setCie10Name('Faringoamigdalitis aguda, no especificada');
    } else if (rawTranscript.toLowerCase().includes('rinofaringitis') || rawTranscript.toLowerCase().includes('j00')) {
      setCie10Code('J00');
      setCie10Name('Rinofaringitis aguda (resfriado común)');
    }
  };

  const handleFinalizeAndSend = () => {
    const newConsultation: PastConsultationSummary = {
      id: `cons-${Date.now()}`,
      date: getTodayIsoDate(),
      doctorId: currentUser?.id,
      doctorName: currentUser?.name || doctorSignature.doctorName || 'Pediatra',
      specialty: 'Pediatría',
      cie10Code,
      cie10Name,
      reason: chiefComplaint.trim() || 'Control pediátrico integral.',
      weightKg: vitals.weightKg,
      heightCm: vitals.heightCm,
      temperatureC: vitals.temperatureC,
      bloodPressure: `${vitals.systolicBp}/${vitals.diastolicBp}`,
      physicalExamSummary: formattedExamString,
      prescriptions,
      parentGuide,
      alarmSigns,
    };

    completeConsultation(activePatient.id, newConsultation, vitals);
    if (studyTitle.trim() && studySummary.trim()) {
      addPatientStudy(activePatient.id, {
        title: studyTitle.trim(),
        category: studyCategory,
        date: getTodayIsoDate(),
        summary: studySummary.trim(),
        imageUrl: studyImageUrl || undefined,
      });
      setStudyTitle('');
      setStudySummary('');
      setStudyImageUrl('');
    }
    showToast('Consulta guardada en historial clínico.');
    openDispatchModal(activePatient, newConsultation);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500">Paciente en atención:</span>
          <select
            value={activePatient.id}
            onChange={(e) => navigateToActiveConsultation(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} ({p.historyNumber})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setCurrentView('firma-medico')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
        >
          <FileSignature className="w-3.5 h-3.5 text-sky-600" />
          Firma activa: {doctorSignature.doctorName}
        </button>
      </div>

      <PatientClinicalHeader
        patient={activePatient}
        onBack={() => setCurrentView('paciente-detalle')}
        onOpenVaccines={() => navigateToPatientVaccines(activePatient.id)}
      />

      <ClinicalDictationBar
        patientName={`${activePatient.firstName} ${activePatient.lastName}`}
        patientAge={ageLabel}
        weightKg={vitals.weightKg}
        onApplyAiResult={handleApplyAiResult}
      />

      <PediatricAnthropometryCard vitals={vitals} ageMonths={ageMonths} onChange={setVitals} />

      <PediatricExamCard
        chiefComplaint={chiefComplaint}
        onChiefComplaintChange={setChiefComplaint}
        physicalExam={physicalExam}
        onPhysicalExamChange={setPhysicalExam}
        cie10Code={cie10Code}
        cie10Name={cie10Name}
        onSelectCie10={(code, name) => {
          setCie10Code(code);
          setCie10Name(name);
        }}
      />

      <PediatricPrescriptionCard
        weightKg={vitals.weightKg}
        criticalAllergies={activePatient.criticalAllergies}
        prescriptions={prescriptions}
        onChange={setPrescriptions}
        isPreviewOpen={isLivePreviewOpen}
        onTogglePreview={() => setIsLivePreviewOpen((prev) => !prev)}
      />

      {isLivePreviewOpen && (
        <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-sky-600" /> Vista Previa en Vivo del Récipe
            </span>
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setLivePreviewPage(1)}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  livePreviewPage === 1 ? 'bg-sky-600 text-white' : 'text-slate-600'
                }`}
              >
                Página 1: Récipe
              </button>
              <button
                type="button"
                onClick={() => setLivePreviewPage(2)}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  livePreviewPage === 2 ? 'bg-sky-600 text-white' : 'text-slate-600'
                }`}
              >
                Página 2: Guía Padres
              </button>
            </div>
          </div>
          <div className="flex justify-center overflow-auto">
            <RecipeDocumentPreview
              patient={activePatient}
              consultation={{
                id: 'cons-live-preview',
                date: getTodayIsoDate(),
                doctorId: currentUser?.id,
                doctorName: currentUser?.name || doctorSignature.doctorName || 'Pediatra',
                specialty: 'Pediatría',
                cie10Code: cie10Code || 'Z00.1',
                cie10Name: cie10Name || 'Indicación Médica / Récipe',
                reason: chiefComplaint.trim() || 'Control pediátrico integral.',
                weightKg: vitals.weightKg,
                heightCm: vitals.heightCm,
                temperatureC: vitals.temperatureC,
                bloodPressure: `${vitals.systolicBp}/${vitals.diastolicBp}`,
                physicalExamSummary: formattedExamString,
                prescriptions,
                parentGuide,
                alarmSigns,
              }}
              templateConfig={templateConfig}
              doctorSignature={doctorSignature}
              activePage={livePreviewPage}
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Guía y Cuidados para los Padres</label>
          <textarea
            rows={3}
            value={parentGuide}
            onChange={(e) => setParentGuide(e.target.value)}
            placeholder="Ej. Hidratación oral abundante, reposo, control térmico si fiebre > 38°C..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-rose-700 flex items-center gap-1.5 mb-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Signos de Alarma (1 por línea)
          </label>
          <textarea
            rows={3}
            value={alarmSigns.join('\n')}
            onChange={(e) => setAlarmSigns(e.target.value.split('\n').filter(Boolean))}
            placeholder="Ej. Dificultad para respirar&#10;Fiebre persistente > 39°C por más de 48 horas"
            className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50/40 text-xs text-slate-700"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5 text-sky-600" /> Adjuntar Resultado / Estudio al Historial (opcional)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Título del resultado (Ej. Hematología)"
            value={studyTitle}
            onChange={(e) => setStudyTitle(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
          />
          <select
            value={studyCategory}
            onChange={(e) => setStudyCategory(e.target.value as MedicalStudyFile['category'])}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs"
          >
            <option value="Laboratorio PDF">Laboratorio PDF</option>
            <option value="Ecografía">Ecografía</option>
            <option value="Radiografía">Radiografía</option>
            <option value="Informe Especialista">Informe Especialista</option>
          </select>
          <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-sky-600" />
            {studyImageUrl ? 'Archivo adjunto listo' : 'Subir Archivo / PDF'}
            <input
              type="file"
              accept="image/*,.pdf,application/pdf"
              onChange={handleStudyFileChange}
              className="hidden"
            />
          </label>
          <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 cursor-pointer">
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tomar Foto</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleStudyFileChange}
              className="hidden"
            />
          </label>
        </div>
        {studyTitle.trim() && (
          <input
            type="text"
            placeholder="Resumen o hallazgos del resultado..."
            value={studySummary}
            onChange={(e) => setStudySummary(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
          />
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pb-4">
        <button
          type="button"
          onClick={() => setIsRecipeModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold shadow-md transition-colors cursor-pointer"
        >
          <Pill className="w-4 h-4" />
          <span>Crear Récipe</span>
        </button>

        <button
          type="button"
          onClick={handleFinalizeAndSend}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md transition-colors cursor-pointer"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Finalizar Consulta y Enviar Récipe por WhatsApp</span>
          <Send className="w-4 h-4" />
        </button>
      </div>

      <CreateRecipeModal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        patient={activePatient}
        initialPrescriptions={prescriptions}
        initialCie10Code={cie10Code}
        initialCie10Name={cie10Name}
        initialReason={chiefComplaint}
        initialParentGuide={parentGuide}
        initialAlarmSigns={alarmSigns}
        weightKg={vitals.weightKg}
        onSaveRecipe={(saved) => {
          setPrescriptions(saved.prescriptions);
          if (saved.cie10Code) setCie10Code(saved.cie10Code);
          if (saved.cie10Name) setCie10Name(saved.cie10Name);
          if (saved.reason) setChiefComplaint(saved.reason);
          if (saved.parentGuide) setParentGuide(saved.parentGuide);
          if (saved.alarmSigns.length > 0) setAlarmSigns(saved.alarmSigns);
        }}
      />
    </div>
  );
};
