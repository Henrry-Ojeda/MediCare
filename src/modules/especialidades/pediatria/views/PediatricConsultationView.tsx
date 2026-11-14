import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSignature, Send } from 'lucide-react';
import { useClinical } from '../../../../context/ClinicalContext';
import { useAuth } from '../../../../context/AuthContext';
import { useNotifications } from '../../../../context/NotificationContext';
import { PastConsultationSummary, PrescriptionItem } from '../../../../types/medical';
import { VitalSigns } from '../../../../types/patient.types';
import { DictationAiResult } from '../../../../types/consultation.types';
import { calculateAgeInMonths, calculateExactAgeLabel } from '../../../../utils/pediatricCalculations';
import { getTodayIsoDate } from '../../../../utils/formatters';
import { PatientClinicalHeader } from '../components/PatientClinicalHeader';
import { ClinicalDictationBar } from '../components/ClinicalDictationBar';
import { PediatricAnthropometryCard } from '../components/PediatricAnthropometryCard';
import { PediatricExamCard, PhysicalExamState } from '../components/PediatricExamCard';
import { PediatricPrescriptionCard } from '../components/PediatricPrescriptionCard';
import { PEDIATRIC_CIE10_LIST } from '../config/pediatricCie10';

export const PediatricConsultationView: React.FC = () => {
  const {
    selectedPatient,
    patients,
    setSelectedPatientId,
    setCurrentView,
    completeConsultation,
    openDispatchModal,
    navigateToPatientVaccines,
  } = useClinical();
  const { currentUser, doctorSignature } = useAuth();
  const { showToast } = useNotifications();

  const activePatient = selectedPatient || patients[0];
  const ageMonths = activePatient ? calculateAgeInMonths(activePatient.birthDate) : 24;
  const ageLabel = activePatient ? calculateExactAgeLabel(activePatient.birthDate) : '2 años';

  const [vitals, setVitals] = useState<VitalSigns>(
    activePatient?.latestVitals || {
      weightKg: 14.5,
      heightCm: 96,
      headCircumferenceCm: 49,
      temperatureC: 36.8,
      heartRateBpm: 98,
      spo2Percent: 98,
      systolicBp: 95,
      diastolicBp: 60,
      recordedAt: 'Ahora',
      recordedBy: currentUser?.name || 'Pediatra',
    }
  );

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [physicalExam, setPhysicalExam] = useState<PhysicalExamState>({
    general: 'Paciente activo, hidratado, normocoloreado.',
    cabezaCuello: 'Normocéfalo, orofaringe sin exudados, otoscopia bilateral normal.',
    cardiopulmonar: 'Ruidos cardíacos rítmicos sin soplos, murmullo vesicular audible bilateral.',
    abdomen: 'Blando, depresible, no doloroso a la palpación, RHA presentes.',
    extremidades: 'Simétricas, llenado capilar < 2 seg, sin edemas.',
  });

  const [cie10Code, setCie10Code] = useState(PEDIATRIC_CIE10_LIST[0]?.code || 'Z00.1');
  const [cie10Name, setCie10Name] = useState(
    PEDIATRIC_CIE10_LIST[0]?.name || 'Control de salud de rutina del niño'
  );
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [parentGuide, setParentGuide] = useState(
    'Mantener hidratación oral abundante, control térmico por medios físicos si fiebre > 38°C.'
  );
  const [alarmSigns, setAlarmSigns] = useState<string[]>([
    'Dificultad para respirar o tiraje intercostal',
    'Fiebre persistente > 39°C por más de 48 horas',
    'Rechazo completo de líquidos o vómitos incoercibles',
  ]);

  const formattedExamString = useMemo(
    () =>
      `General: ${physicalExam.general} | ORL/Cuello: ${physicalExam.cabezaCuello} | Cardiopulmonar: ${physicalExam.cardiopulmonar} | Abdomen: ${physicalExam.abdomen} | Extremidades: ${physicalExam.extremidades}`,
    [physicalExam]
  );

  if (!activePatient) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-600">No hay pacientes disponibles para iniciar consulta.</p>
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
      doctorName: doctorSignature.doctorName || currentUser?.name || 'Pediatra',
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
            onChange={(e) => setSelectedPatientId(e.target.value)}
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
      />

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Guía y Cuidados para los Padres</label>
          <textarea
            rows={3}
            value={parentGuide}
            onChange={(e) => setParentGuide(e.target.value)}
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
            className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50/40 text-xs text-slate-700"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pb-4">
        <button
          type="button"
          onClick={handleFinalizeAndSend}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md transition-colors"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Finalizar Consulta y Enviar Récipe por WhatsApp</span>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
