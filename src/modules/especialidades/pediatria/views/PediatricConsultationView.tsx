import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, Eye, FileSignature, MessageCircle, Pill, Printer, Search, Send, SlidersHorizontal, Stethoscope, Upload, UserPlus } from 'lucide-react';
import { Modal } from '../../../../components/common';
import { RecipeDocumentPreview } from '../../../../components/recipe/RecipeDocumentPreview';
import { buildRecipeWhatsappUrl } from '../../../../utils/whatsappFormatter';
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
import {
  GastroExamCard,
  GastroExamState,
  INITIAL_GASTRO_EXAM,
} from '../../gastroenterologia';
import { resolveActiveSpecialtyPlugins, SPECIALTY_REGISTRY } from '../../registry';
import { CreateRecipeModal } from '../../../../components/recipe/CreateRecipeModal';
import { PatientForm } from '../../../pacientes/components/PatientForm';

export const PediatricConsultationView: React.FC = () => {
  const {
    selectedPatient,
    patients,
    appointments,
    templateConfig,
    currentDoctorHasAssistant,
    navigateToActiveConsultation,
    setCurrentView,
    completeConsultation,
    addPatientStudy,
    openDispatchModal,
    incrementWhatsappSent,
    doctors,
    refreshPatient360,
    navigateToPatientVaccines,
  } = useClinical();
  const { currentUser, userRole, doctorSignature } = useAuth();
  const { showToast } = useNotifications();

  const canUseDictation =
    userRole === 'ADMIN' ||
    Boolean(
      currentUser?.dictationEnabled ||
        doctors.find((d) => d.id === currentUser?.id)?.dictationEnabled
    );

  const [patientSearch, setPatientSearch] = useState('');
  const [isQuickPatientOpen, setIsQuickPatientOpen] = useState(false);
  const [includeRecipe, setIncludeRecipe] = useState(false);
  const [isLivePreviewOpen, setIsLivePreviewOpen] = useState(false);
  const [livePreviewPage, setLivePreviewPage] = useState<1 | 2>(1);
  const activePatient = selectedPatient;
  const ageMonths = activePatient ? calculateAgeInMonths(activePatient.birthDate) : 24;
  const ageLabel = activePatient ? calculateExactAgeLabel(activePatient.birthDate) : '2 años';

  const [gastroExam, setGastroExam] = useState<GastroExamState>(INITIAL_GASTRO_EXAM);
  const [manualSpecialties, setManualSpecialties] = useState<string[] | undefined>(undefined);

  const doctorSpecialtyCodes = useMemo(
    () =>
      currentUser?.specialties && currentUser.specialties.length > 0
        ? currentUser.specialties
        : ['pediatria'],
    [currentUser?.specialties]
  );

  const activePlugins = useMemo(
    () => resolveActiveSpecialtyPlugins(doctorSpecialtyCodes, ageMonths, manualSpecialties),
    [doctorSpecialtyCodes, ageMonths, manualSpecialties]
  );

  const isPediatricActive = activePlugins.some((p) => p.id === 'pediatria');
  const isGastroActive = activePlugins.some((p) => p.id === 'gastroenterologia');

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
    if (activePatient?.id) {
      void refreshPatient360(activePatient.id);
    }
  }, [activePatient?.id]);

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

  const fieldPrefsStorageKey = `medicare_doctor_fields_${currentUser?.id || 'default'}`;
  const [showFieldSettings, setShowFieldSettings] = useState(false);
  const [doctorFieldPrefs, setDoctorFieldPrefs] = useState<{
    respiratoryRate: boolean;
    headCircumference: boolean;
    bloodPressure: boolean;
    spo2: boolean;
    priorMedications: boolean;
    feedingAndNeuro: boolean;
    skinAndFontanelle: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem(fieldPrefsStorageKey);
      if (saved) return { respiratoryRate: true, headCircumference: true, bloodPressure: true, spo2: true, priorMedications: true, feedingAndNeuro: false, skinAndFontanelle: false, ...JSON.parse(saved) };
    } catch {
      // ignore storage errors
    }
    return {
      respiratoryRate: true,
      headCircumference: true,
      bloodPressure: true,
      spo2: true,
      priorMedications: true,
      feedingAndNeuro: false,
      skinAndFontanelle: false,
    };
  });

  const toggleFieldPref = (key: keyof typeof doctorFieldPrefs) => {
    setDoctorFieldPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(fieldPrefsStorageKey, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const [priorMedications, setPriorMedications] = useState('');
  const [feedingNotes, setFeedingNotes] = useState('');
  const [neurodevelopmentNotes, setNeurodevelopmentNotes] = useState('');
  const [skinAndFontanelle, setSkinAndFontanelle] = useState('');

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
    if (skinAndFontanelle.trim()) parts.push(`Piel/Fontanela: ${skinAndFontanelle.trim()}`);
    if (priorMedications.trim()) parts.push(`Medicación previa: ${priorMedications.trim()}`);
    if (feedingNotes.trim()) parts.push(`Alimentación: ${feedingNotes.trim()}`);
    if (neurodevelopmentNotes.trim()) parts.push(`Neurodesarrollo: ${neurodevelopmentNotes.trim()}`);
    return parts.join(' | ');
  }, [physicalExam, skinAndFontanelle, priorMedications, feedingNotes, neurodevelopmentNotes]);

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
                  {showWaitingQueue
                    ? 'Elija un paciente de la sala de espera, búsquelo o registre sus datos básicos para atenderlo.'
                    : 'Busque un paciente existente o registre sus datos básicos para iniciar la consulta.'}
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
                onClick={() => setIsQuickPatientOpen(true)}
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
          title="Registro Rápido de Paciente"
          subtitle="Ingrese los datos esenciales para iniciar la consulta de inmediato"
          maxWidthClass="max-w-xl"
        >
          <PatientForm
            compact
            showPerinatalSection={false}
            onCancel={() => setIsQuickPatientOpen(false)}
            onCreated={(created) => {
              setIsQuickPatientOpen(false);
              showToast(`Paciente ${created.firstName} ${created.lastName} creado. Iniciando consulta...`);
              navigateToActiveConsultation(created.id);
            }}
          />
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
    const gastroSummaryParts: string[] = [];
    if (isGastroActive) {
      if (gastroExam.bristolType) gastroSummaryParts.push(`Bristol Tipo ${gastroExam.bristolType}`);
      if (gastroExam.symptoms.length > 0) gastroSummaryParts.push(`Síntomas GI: ${gastroExam.symptoms.join(', ')}`);
      if (gastroExam.quadrants.length > 0) gastroSummaryParts.push(`Cuadrantes: ${gastroExam.quadrants.join(', ')}`);
      if (gastroExam.intolerances.length > 0) gastroSummaryParts.push(`Intolerancias: ${gastroExam.intolerances.join(', ')}`);
      if (gastroExam.endoscopyHistory.trim()) gastroSummaryParts.push(`Endoscopia/Hepático: ${gastroExam.endoscopyHistory.trim()}`);
    }
    const combinedExamSummary = [formattedExamString, ...gastroSummaryParts]
      .filter(Boolean)
      .join(' | ');
    const combinedGuide =
      isGastroActive && gastroExam.dietPlan.trim()
        ? `${parentGuide ? parentGuide + '\n' : ''}Plan Dietético: ${gastroExam.dietPlan.trim()}`
        : parentGuide;

    const newConsultation: PastConsultationSummary = {
      id: `cons-${Date.now()}`,
      date: getTodayIsoDate(),
      doctorId: currentUser?.id,
      doctorName: currentUser?.name || doctorSignature.doctorName || 'Médico Tratante',
      specialty: activePlugins.map((p) => p.shortLabel).join(' · ') as PastConsultationSummary['specialty'],
      cie10Code,
      cie10Name,
      reason: chiefComplaint.trim() || 'Control clínico integral.',
      weightKg: vitals.weightKg,
      heightCm: vitals.heightCm,
      temperatureC: vitals.temperatureC,
      bloodPressure: `${vitals.systolicBp}/${vitals.diastolicBp}`,
      physicalExamSummary: combinedExamSummary,
      prescriptions,
      parentGuide: combinedGuide,
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

      {doctorSpecialtyCodes.length > 1 && (
        <div
          data-testid="multi-specialty-bar"
          className="bg-white rounded-2xl border border-slate-200/80 px-4 py-3 flex flex-wrap items-center justify-between gap-2 shadow-xs"
        >
          <span className="text-xs font-bold text-slate-700">
            Especialidades activas en esta consulta:
          </span>
          <div className="flex flex-wrap gap-2">
            {doctorSpecialtyCodes.map((code) => {
              const plugin = SPECIALTY_REGISTRY[code.trim().toLowerCase()];
              if (!plugin) return null;
              const isActive = activePlugins.some((p) => p.id === plugin.id);
              return (
                <button
                  key={plugin.id}
                  type="button"
                  onClick={() => {
                    const currentIds = activePlugins.map((p) => p.id);
                    const next = isActive
                      ? currentIds.filter((id) => id !== plugin.id)
                      : [...currentIds, plugin.id];
                    setManualSpecialties(next.length > 0 ? next : [plugin.id]);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    isActive
                      ? 'bg-sky-50 border-sky-400 text-sky-800'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  {isActive ? '✓ ' : '+ '}
                  {plugin.shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {canUseDictation && (
        <ClinicalDictationBar
          patientName={`${activePatient.firstName} ${activePatient.lastName}`}
          patientAge={ageLabel}
          weightKg={vitals.weightKg}
          onApplyAiResult={handleApplyAiResult}
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-700">
            Personalización de Campos Clínicos del Médico
          </span>
          <button
            type="button"
            onClick={() => setShowFieldSettings((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>{showFieldSettings ? 'Ocultar configuración' : 'Elegir campos visibles'}</span>
          </button>
        </div>

        {showFieldSettings && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            {(
              [
                { key: 'respiratoryRate', label: 'Frec. Respiratoria (FR)' },
                { key: 'headCircumference', label: 'Perímetro Cefálico' },
                { key: 'bloodPressure', label: 'Presión Arterial' },
                { key: 'spo2', label: 'Saturación SpO₂' },
                { key: 'priorMedications', label: 'Medicación Previa' },
                { key: 'feedingAndNeuro', label: 'Alimentación y Neurodesarrollo' },
                { key: 'skinAndFontanelle', label: 'Piel y Fontanela' },
              ] as const
            ).map((opt) => (
              <label
                key={opt.key}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                  doctorFieldPrefs[opt.key]
                    ? 'bg-sky-50 border-sky-300 text-sky-900'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={doctorFieldPrefs[opt.key]}
                  onChange={() => toggleFieldPref(opt.key)}
                  className="rounded border-slate-300"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <PediatricAnthropometryCard
        vitals={vitals}
        ageMonths={ageMonths}
        sex={activePatient.sex}
        previousGrowth={activePatient.growthHistory[activePatient.growthHistory.length - 1]}
        visibleFields={doctorFieldPrefs}
        showPediatricMetrics={isPediatricActive}
        onChange={setVitals}
      />

      {(doctorFieldPrefs.priorMedications ||
        doctorFieldPrefs.feedingAndNeuro ||
        doctorFieldPrefs.skinAndFontanelle) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {doctorFieldPrefs.priorMedications && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Medicación previa en casa
              </label>
              <input
                type="text"
                value={priorMedications}
                onChange={(e) => setPriorMedications(e.target.value)}
                placeholder="Ej. Acetaminofén hace 4 horas..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          )}
          {doctorFieldPrefs.skinAndFontanelle && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Piel y Fontanela
              </label>
              <input
                type="text"
                value={skinAndFontanelle}
                onChange={(e) => setSkinAndFontanelle(e.target.value)}
                placeholder="Ej. Fontanela normotensa, piel sin lesiones..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          )}
          {doctorFieldPrefs.feedingAndNeuro && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Alimentación / Nutrición actual
                </label>
                <input
                  type="text"
                  value={feedingNotes}
                  onChange={(e) => setFeedingNotes(e.target.value)}
                  placeholder="Ej. Lactancia materna + sólidos adecuados..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Hitos de Neurodesarrollo
                </label>
                <input
                  type="text"
                  value={neurodevelopmentNotes}
                  onChange={(e) => setNeurodevelopmentNotes(e.target.value)}
                  placeholder="Ej. Acorde a su edad..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </>
          )}
        </div>
      )}

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

      {isGastroActive && (
        <GastroExamCard
          value={gastroExam}
          onChange={setGastroExam}
          selectedCie10Code={cie10Code}
          onSelectCie10={(code, name) => {
            setCie10Code(code);
            setCie10Name(name);
          }}
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">¿Requiere récipe en esta consulta?</p>
            <p className="text-[11px] text-slate-500">
              Actívalo solo si necesitas prescribir medicamentos o indicaciones.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={includeRecipe || prescriptions.length > 0}
          onClick={() => setIncludeRecipe((prev) => !prev)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            includeRecipe || prescriptions.length > 0
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {includeRecipe || prescriptions.length > 0 ? 'Récipe Activado' : 'Agregar Récipe (Opcional)'}
        </button>
      </div>

      {(includeRecipe || prescriptions.length > 0) && (
        <PediatricPrescriptionCard
          weightKg={vitals.weightKg}
          criticalAllergies={activePatient.criticalAllergies}
          prescriptions={prescriptions}
          onChange={setPrescriptions}
          isPreviewOpen={isLivePreviewOpen}
          onTogglePreview={() => setIsLivePreviewOpen((prev) => !prev)}
        />
      )}

      <Modal
        isOpen={isLivePreviewOpen}
        onClose={() => setIsLivePreviewOpen(false)}
        title={`Vista Previa del Récipe · ${activePatient.firstName} ${activePatient.lastName}`}
        subtitle="Previsualización en vivo lista para imprimir en PDF o enviar por WhatsApp"
        maxWidthClass="max-w-4xl"
      >
        {(() => {
          const livePreviewConsultation: PastConsultationSummary = {
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
          };
          const whatsappUrl = buildRecipeWhatsappUrl(
            activePatient,
            livePreviewConsultation,
            templateConfig.clinicName
          );
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 no-print">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setLivePreviewPage(1)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      livePreviewPage === 1 ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Página 1: Récipe
                  </button>
                  <button
                    type="button"
                    onClick={() => setLivePreviewPage(2)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      livePreviewPage === 2 ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Página 2: Guía Padres
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-sky-600" />
                    <span>Imprimir / PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      incrementWhatsappSent(1);
                      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                      showToast(
                        `Abriendo WhatsApp para enviar récipe a ${activePatient.guardianWhatsapp || 'representante'}`
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Enviar por WhatsApp</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-3 sm:p-4 flex justify-center overflow-auto">
                <RecipeDocumentPreview
                  patient={activePatient}
                  consultation={livePreviewConsultation}
                  templateConfig={templateConfig}
                  doctorSignature={doctorSignature}
                  activePage={livePreviewPage}
                />
              </div>
            </div>
          );
        })()}
      </Modal>

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
