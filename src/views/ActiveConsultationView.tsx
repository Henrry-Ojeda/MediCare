import React, { useState, useEffect, useMemo } from 'react';
import {
  Mic,
  Pause,
  Play,
  Sparkles,
  Scale,
  Stethoscope,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Search,
  HeartHandshake,
  Save,
  Send,
  Calculator,
  UserCheck,
  Wand2,
} from 'lucide-react';
import { useMedical, calculateExactAgeLabel, calculateAgeInMonths } from '../context/MedicalContext';
import {
  CIE10_CATALOG,
  PEDIATRIC_FORMULARY,
  calculatePediatricDose,
  DEMO_DICTATION_SCRIPTS,
} from '../data/mockClinicalData';
import { PrescriptionItem } from '../types/medical';

export const ActiveConsultationView: React.FC = () => {
  const {
    patients,
    selectedPatient,
    setSelectedPatientId,
    completeConsultation,
    incrementAiUsage,
    showToast,
  } = useMedical();

  // --- AI Copilot Recording & Processing State ---
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(42);
  const [copilotStatus, setCopilotStatus] = useState<'idle' | 'listening' | 'processing' | 'completed'>('idle');
  const [selectedDemoKey, setSelectedDemoKey] = useState<string>('pediatria_amigdalitis');
  const [transcript, setTranscript] = useState<string>(
    DEMO_DICTATION_SCRIPTS.pediatria_amigdalitis.transcript
  );
  const [showTranscriptDrawer, setShowTranscriptDrawer] = useState<boolean>(false);

  // --- Left Column: Anthropometry & Clinical Exploration ---
  const [weightKg, setWeightKg] = useState<number>(selectedPatient.latestVitals?.weightKg || 15.4);
  const [heightCm, setHeightCm] = useState<number>(selectedPatient.latestVitals?.heightCm || 98.5);
  const [headCircumferenceCm, setHeadCircumferenceCm] = useState<number>(
    selectedPatient.latestVitals?.headCircumferenceCm || 49.8
  );
  const [temperatureC, setTemperatureC] = useState<number>(
    selectedPatient.latestVitals?.temperatureC || 38.6
  );
  const [bloodPressure, setBloodPressure] = useState<string>(
    selectedPatient.latestVitals
      ? `${selectedPatient.latestVitals.systolicBp}/${selectedPatient.latestVitals.diastolicBp}`
      : '94/60'
  );

  const [motivoConsulta, setMotivoConsulta] = useState<string>(
    'Paciente acude en compañía de su madre por presentar alza térmica cuantificada en 38.8 °C de 36 horas de evolución, asociada a odinofagia moderada e hiporexia parcial para sólidos.'
  );

  const [activeExamTab, setActiveExamTab] = useState<
    'general' | 'cabezaCuello' | 'cardiopulmonar' | 'abdomen' | 'extremidades'
  >('cabezaCuello');

  const [examenFisico, setExamenFisico] = useState({
    general:
      'Paciente febril al tacto, vigil, orientado, hidratado, en buenas condiciones generales. Llenado capilar < 2 segundos.',
    cabezaCuello:
      'Normocéfalo. Otoscopia bilateral con membranas timpánicas íntegras. Orofaringe congestiva e hiperémica con hipertrofia amigdalina grado II y exudado blanquecino puntiforme. Adenopatías submaxilares móviles.',
    cardiopulmonar:
      'Tórax simétrico normoexpansible. Murmullo vesicular audible en ambos campos pulmonares sin agregados. Ruidos cardíacos rítmicos, normofonéticos, sin soplos.',
    abdomen:
      'Blando, depresible, no doloroso a la palpación superficial ni profunda. Ruidos hidroaéreos presentes normales. Sin visceromegalias.',
    extremidades:
      'Simétricas, eutróficas, móviles, sin edemas ni lesiones cutáneas activas.',
  });

  // CIE-10 Predictive Input
  const [cie10Query, setCie10Query] = useState<string>('J03.9 — Amigdalitis aguda, no especificada');
  const [selectedCie10, setSelectedCie10] = useState({
    code: 'J03.9',
    name: 'Amigdalitis aguda, no especificada (Faringoamigdalitis aguda)',
  });
  const [showCie10Dropdown, setShowCie10Dropdown] = useState<boolean>(false);

  // --- Right Column: Prescription & Parent Education ---
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>(() => {
    const ibuFormula = PEDIATRIC_FORMULARY[1];
    const azitroFormula = PEDIATRIC_FORMULARY[4];
    const w = selectedPatient.latestVitals?.weightKg || 15.4;
    const ibuCalc = calculatePediatricDose(ibuFormula, w);
    const aziCalc = calculatePediatricDose(azitroFormula, w);
    return [
      {
        id: 'rx-1',
        medicationName: azitroFormula.name,
        presentation: azitroFormula.presentation,
        dosePerTake: aziCalc.dosePerTake,
        frequencyHours: `Cada ${azitroFormula.frequencyHours} horas`,
        durationDays: `${azitroFormula.defaultDurationDays} días`,
        specialInstructions: azitroFormula.specialInstructions,
        calculatedMgPerKg: aziCalc.calculatedMgPerKg,
      },
      {
        id: 'rx-2',
        medicationName: ibuFormula.name,
        presentation: ibuFormula.presentation,
        dosePerTake: ibuCalc.dosePerTake,
        frequencyHours: `Cada ${ibuFormula.frequencyHours} horas`,
        durationDays: `${ibuFormula.defaultDurationDays} días`,
        specialInstructions: ibuFormula.specialInstructions,
        calculatedMgPerKg: ibuCalc.calculatedMgPerKg,
      },
    ];
  });

  const [parentGuide, setParentGuide] = useState<string>(
    'Mateo presenta una faringoamigdalitis aguda que ocasiona inflamación en la garganta y fiebre. Dado su antecedente de alergia a la penicilina, hemos indicado un antibiótico seguro (Azitromicina) una sola vez al día por 3 días. Ofrezca líquidos frescos o a temperatura ambiente de forma fraccionada y alimentos suaves (purés, sopas tibias, compotas) sin forzarlo.'
  );

  const [alarmSigns, setAlarmSigns] = useState<{ label: string; checked: boolean }[]>([
    { label: 'Fiebre mayor a 39.0 °C que no cede tras 60 minutos de administrar el antipirético', checked: true },
    { label: 'Dificultad para respirar, respiración muy rápida o hundimiento de las costillas', checked: true },
    { label: 'Vómitos continuos o imposibilidad total para tragar líquidos (babeo constante)', checked: true },
    { label: 'Decaimiento extremo, somnolencia inusual o irritabilidad inconsolable', checked: true },
    { label: 'Aparición de erupción cutánea roja o manchas en el tronco', checked: false },
  ]);

  // Sync patient vitals when switching active patient
  useEffect(() => {
    const w = selectedPatient.latestVitals?.weightKg || 15.4;
    const h = selectedPatient.latestVitals?.heightCm || 98.5;
    setWeightKg(w);
    setHeightCm(h);
    setHeadCircumferenceCm(selectedPatient.latestVitals?.headCircumferenceCm || 49.8);
    setTemperatureC(selectedPatient.latestVitals?.temperatureC || 37.2);
    if (selectedPatient.latestVitals) {
      setBloodPressure(
        `${selectedPatient.latestVitals.systolicBp}/${selectedPatient.latestVitals.diastolicBp}`
      );
    }
  }, [selectedPatient]);

  // Recording Timer
  useEffect(() => {
    if (!isRecording || isPaused) return;
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecording, isPaused]);

  // Real-time BMI and WHO Percentile calculation
  const anthropometrySummary = useMemo(() => {
    const heightM = heightCm / 100;
    const bmi = heightM > 0 ? Number((weightKg / (heightM * heightM)).toFixed(1)) : 0;
    const ageMonths = calculateAgeInMonths(selectedPatient.birthDate);
    let omsStatus = 'Eutrófico · Percentil P50–P65 OMS';
    if (bmi < 14.0) omsStatus = 'Riesgo Bajo Peso · Percentil P10–P15 OMS';
    else if (bmi > 18.5 && ageMonths < 72) omsStatus = 'Sobrepeso Leve · Percentil P85–P92 OMS';
    return { bmi, omsStatus, ageMonths };
  }, [weightKg, heightCm, selectedPatient.birthDate]);

  // Automatically recalculate weight-based doses whenever weightKg changes
  const handleRecalculateDosesForWeight = (newWeight: number) => {
    setWeightKg(newWeight);
    setPrescriptions((prev) =>
      prev.map((rx) => {
        const matchedFormula = PEDIATRIC_FORMULARY.find((f) =>
          rx.medicationName.toLowerCase().includes(f.name.split(' ')[0].toLowerCase())
        );
        if (!matchedFormula) return rx;
        const calc = calculatePediatricDose(matchedFormula, newWeight);
        return {
          ...rx,
          dosePerTake: calc.dosePerTake,
          calculatedMgPerKg: calc.calculatedMgPerKg,
        };
      })
    );
  };

  // Trigger AI Processing (calls server-side Gemini 3.8 Flash endpoint with smart clinical fallback)
  const handleProcessWithAI = async () => {
    setIsRecording(false);
    setIsPaused(false);
    setCopilotStatus('processing');

    try {
      const response = await fetch('/api/ai/process-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
          patientAge: calculateExactAgeLabel(selectedPatient.birthDate),
          weightKg,
          specialty: selectedPatient.primarySpecialty,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const d = result.data;
        if (d) {
          if (d.motivoConsulta) setMotivoConsulta(d.motivoConsulta);
          if (d.examenFisico) {
            setExamenFisico((prev) => ({
              general: d.examenFisico.general || prev.general,
              cabezaCuello: d.examenFisico.cabezaCuello || prev.cabezaCuello,
              cardiopulmonar: d.examenFisico.cardiopulmonar || prev.cardiopulmonar,
              abdomen: d.examenFisico.abdomen || prev.abdomen,
              extremidades: d.examenFisico.extremidades || prev.extremidades,
            }));
          }
          if (d.cie10Code && d.cie10Name) {
            setSelectedCie10({ code: d.cie10Code, name: d.cie10Name });
            setCie10Query(`${d.cie10Code} — ${d.cie10Name}`);
          }
          if (Array.isArray(d.medicamentos) && d.medicamentos.length > 0) {
            setPrescriptions(
              d.medicamentos.map((m: any, idx: number) => ({
                id: `rx-ai-${Date.now()}-${idx}`,
                medicationName: m.nombre || 'Medicamento Prescrito',
                presentation: m.presentacion || 'Suspensión Oral',
                dosePerTake: m.dosisPorToma || '5 ml',
                frequencyHours: m.frecuenciaHoras || 'Cada 8 horas',
                durationDays: m.duracionDias || '5 días',
                specialInstructions: m.indicacionEspecial || 'Administrar según indicación médica.',
                calculatedMgPerKg: `Ajustado a ${weightKg} kg`,
              }))
            );
          }
          if (d.guiaPadres) setParentGuide(d.guiaPadres);
          if (Array.isArray(d.signosAlarma) && d.signosAlarma.length > 0) {
            setAlarmSigns(d.signosAlarma.map((s: string) => ({ label: s, checked: true })));
          }
          incrementAiUsage(2);
          setCopilotStatus('completed');
          showToast('Consulta estructurada con Gemini 3.8 Flash y dosis ajustadas al peso');
          return;
        }
      }
    } catch {
      // Fallback handled cleanly below if offline or secret not configured
    }

    // Deterministic Clinical Structuring based on selected transcript
    await new Promise((r) => setTimeout(r, 650));
    if (selectedDemoKey === 'pediatria_bronquiolitis') {
      setMotivoConsulta(
        'Lactante mayor de 18 meses traída por presentar rinorrea hialina abundante y tos húmeda de 3 días de evolución, sin fiebre ni dificultad respiratoria.'
      );
      setExamenFisico((prev) => ({
        ...prev,
        cabezaCuello: 'Rinoscopia con mucosa levemente congestiva y rinorrea hialina. Orofaringe sin exudados.',
        cardiopulmonar:
          'Murmullo vesicular conservado bilateralmente con escasos roncus transmitidos de vía aérea superior. Sin tiraje intercostal ni sibilancias.',
      }));
      setSelectedCie10({ code: 'J00', name: 'Rinofaringitis aguda (Resfriado común)' });
      setCie10Query('J00 — Rinofaringitis aguda (Resfriado común)');
      const deslo = PEDIATRIC_FORMULARY[3];
      const calc = calculatePediatricDose(deslo, weightKg);
      setPrescriptions([
        {
          id: `rx-sim-${Date.now()}`,
          medicationName: deslo.name,
          presentation: deslo.presentation,
          dosePerTake: calc.dosePerTake,
          frequencyHours: 'Cada 24 horas (8:00 PM)',
          durationDays: '5 días',
          specialInstructions: 'Acompañar de lavados nasales con solución salina isotónica antes de dormir.',
          calculatedMgPerKg: calc.calculatedMgPerKg,
        },
      ]);
      setParentGuide(
        'Cuadro catarral benigno de vías respiratorias altas. Realizar lavados nasales con suero fisiológico 3 veces al día, mantener la cabecera elevada a 30 grados al dormir y ofrecer abundante agua.'
      );
    } else if (selectedDemoKey === 'ginecologia_prenatal') {
      setMotivoConsulta(
        'Control prenatal rutinario de gestación simple de 24 semanas. Paciente asintomática, percibe movimientos fetales activos diarios.'
      );
      setExamenFisico((prev) => ({
        ...prev,
        abdomen:
          'Útero grávido con altura uterina de 23 cm. Feto único en situación longitudinal, presentación cefálica. Frecuencia cardíaca fetal: 146 lpm rítmicos.',
      }));
      setSelectedCie10({ code: 'Z34.0', name: 'Supervisión de primer embarazo normal (Control Prenatal)' });
      setCie10Query('Z34.0 — Supervisión de primer embarazo normal');
      setPrescriptions([
        {
          id: `rx-gin-1`,
          medicationName: 'Hierro Aminoquelado + Ácido Fólico (Intafer / Fefol)',
          presentation: 'Cápsulas 30 mg / 1 mg',
          dosePerTake: '1 cápsula',
          frequencyHours: 'Cada 24 horas',
          durationDays: '30 días',
          specialInstructions: 'Tomar lejos de lácteos, preferiblemente con jugo cítrico al mediodía.',
        },
        {
          id: `rx-gin-2`,
          medicationName: 'Citrato de Calcio + Vitamina D3 (Calcibon D)',
          presentation: 'Tabletas 1500 mg / 400 UI',
          dosePerTake: '1 tableta',
          frequencyHours: 'Cada 24 horas',
          durationDays: '30 días',
          specialInstructions: 'Tomar después de la cena.',
        },
      ]);
      setParentGuide(
        'Su embarazo de 24 semanas evoluciona de forma óptima con crecimiento fetal armónico. Mantenga caminata suave de 25 minutos diarios, hidratación de 2.5 litros de agua y control de presión arterial semanal.'
      );
    } else {
      handleRecalculateDosesForWeight(weightKg);
    }

    incrementAiUsage(2);
    setCopilotStatus('completed');
    showToast('Historia clínica estructurada con éxito por el Copiloto IA');
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const filteredCie10 = CIE10_CATALOG.filter(
    (item) =>
      item.code.toLowerCase().includes(cie10Query.toLowerCase()) ||
      item.name.toLowerCase().includes(cie10Query.toLowerCase())
  );

  const handleFinishConsultation = () => {
    const [sys, dia] = bloodPressure.split('/').map((n) => Number(n) || 90);
    const summaryObj = {
      id: `cons-${Date.now()}`,
      date: '2026-11-09',
      specialty: selectedPatient.primarySpecialty,
      doctorName: 'Dra. Valeria Méndez',
      reason: motivoConsulta,
      cie10Code: selectedCie10.code,
      cie10Name: selectedCie10.name,
      weightKg,
      heightCm,
      temperatureC,
      bloodPressure: `${bloodPressure} mmHg`,
      physicalExamSummary: `${examenFisico.general} ${examenFisico.cabezaCuello} ${examenFisico.cardiopulmonar}`,
      prescriptions,
      parentGuide,
      alarmSigns: alarmSigns.filter((a) => a.checked).map((a) => a.label),
    };

    completeConsultation(selectedPatient.id, summaryObj, {
      weightKg,
      heightCm,
      headCircumferenceCm,
      temperatureC,
      heartRateBpm: selectedPatient.latestVitals?.heartRateBpm || 108,
      spo2Percent: selectedPatient.latestVitals?.spo2Percent || 98,
      systolicBp: sys,
      diastolicBp: dia,
      recordedAt: 'Recién finalizado',
      recordedBy: 'Dra. Valeria Méndez',
    });
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Patient Selector Header & Critical Allergy Alert */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#F0F9FF] text-[#0284C7] font-bold text-sm flex items-center justify-center border border-sky-200">
            {selectedPatient.firstName[0]}
            {selectedPatient.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">
                {selectedPatient.firstName} {selectedPatient.lastName}
              </h1>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-mono text-slate-600">{selectedPatient.historyNumber}</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-semibold text-[#0284C7]">
                {calculateExactAgeLabel(selectedPatient.birthDate)}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-mono font-bold text-slate-700">
                Sangre {selectedPatient.bloodType}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Representante: {selectedPatient.guardianName} ({selectedPatient.guardianRelation}) · WhatsApp:{' '}
              <span className="font-mono">{selectedPatient.guardianWhatsapp}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedPatient.criticalAllergies.length > 0 && (
            <div className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-bold text-[#E11D48]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{selectedPatient.criticalAllergies.join(' · ')}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-slate-400" />
            <select
              value={selectedPatient.id}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 cursor-pointer"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  Cambiar paciente: {p.firstName} {p.lastName} ({p.primarySpecialty})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* =====================================================================
          BARRA FLOTANTE DEL COPILOTO IA (TOP-STICKY)
      ====================================================================== */}
      <div className="sticky top-2 z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-violet-200 shadow-md p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left: Vibrant Violet Microphone Button & Real-Time Waveform */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (!isRecording) {
                  setIsRecording(true);
                  setIsPaused(false);
                  setCopilotStatus('listening');
                } else {
                  setIsPaused(!isPaused);
                }
              }}
              className="px-4 py-2.5 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold flex items-center gap-2 shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>{!isRecording ? 'Iniciar Dictado Clínico' : isPaused ? 'Reanudar Micrófono' : 'Grabando Voz'}</span>
            </button>

            {/* Sound Wave Visualizer */}
            <div className="flex items-center gap-1 h-7 px-3 rounded-xl bg-[#F5F3FF] border border-violet-200/80">
              {[14, 22, 10, 24, 18, 12, 20, 15, 22, 11].map((h, i) => (
                <span
                  key={i}
                  style={{
                    height: isRecording && !isPaused ? `${Math.max(6, (h + secondsElapsed * (i + 2)) % 24)}px` : '8px',
                  }}
                  className="w-1 rounded-full bg-[#8B5CF6] transition-all duration-150"
                />
              ))}
              <span className="ml-2 font-mono text-xs font-bold text-[#7C3AED] tabular-nums">
                {formatTimer(secondsElapsed)}
              </span>
            </div>

            {isRecording && (
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                title={isPaused ? 'Reanudar grabación' : 'Pausar grabación'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Status Text */}
            <div className="text-xs font-semibold text-slate-600">
              {copilotStatus === 'listening' && (
                <span className="text-[#7C3AED]">Escuchando consulta en tiempo real...</span>
              )}
              {copilotStatus === 'processing' && (
                <span className="text-amber-600">Estructurando historia clínica con IA...</span>
              )}
              {copilotStatus === 'completed' && (
                <span className="text-[#059669] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Historia clínica y dosis autocompletadas por IA
                </span>
              )}
              {copilotStatus === 'idle' && (
                <span className="text-slate-500">Copiloto Clínico IA listo para dictado o caso demo</span>
              )}
            </div>
          </div>

          {/* Right: Demo Script Selector, Transcript Toggle & Prominent Process Button */}
          <div className="flex items-center gap-2.5">
            <select
              value={selectedDemoKey}
              onChange={(e) => {
                const key = e.target.value;
                setSelectedDemoKey(key);
                setTranscript(DEMO_DICTATION_SCRIPTS[key].transcript);
                setShowTranscriptDrawer(true);
              }}
              className="px-3 py-2 text-xs font-medium bg-[#F5F3FF] text-[#7C3AED] border border-violet-200 rounded-xl cursor-pointer"
            >
              {Object.entries(DEMO_DICTATION_SCRIPTS).map(([key, item]) => (
                <option key={key} value={key}>
                  Dictado Demo: {item.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowTranscriptDrawer(!showTranscriptDrawer)}
              className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              {showTranscriptDrawer ? 'Ocultar Dictado' : 'Ver / Editar Dictado'}
            </button>

            <button
              onClick={handleProcessWithAI}
              disabled={copilotStatus === 'processing'}
              className="px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {copilotStatus === 'processing' ? 'Procesando con Gemini...' : 'Procesar Consulta con IA'}
              </span>
            </button>
          </div>
        </div>

        {/* Collapsible Voice Dictation Transcript Box */}
        {showTranscriptDrawer && (
          <div className="pt-2 border-t border-violet-100">
            <label className="block text-[11px] font-semibold text-[#7C3AED] mb-1">
              Transcripción de Voz / Dictado Libre del Médico (Editable antes de procesar con Gemini)
            </label>
            <textarea
              rows={2}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full p-2.5 text-xs bg-[#F5F3FF]/60 border border-violet-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#7C3AED]"
            />
          </div>
        )}
      </div>

      {/* =====================================================================
          ÁREA DE TRABAJO DIVIDIDA EN 2 COLUMNAS DE ALTA PRODUCTIVIDAD
      ====================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA (6 COLS): EXPLORACIÓN CLÍNICA Y DATOS */}
        <div className="lg:col-span-6 space-y-5">
          {/* 1. Antropometría del Día + Cálculo OMS en Tiempo Real */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#0284C7]" />
                <h2 className="text-sm font-bold text-slate-900">
                  Antropometría del Día y Signos Vitales
                </h2>
              </div>
              <div className="text-xs font-mono font-semibold text-[#059669]">
                IMC: {anthropometrySummary.bmi} kg/m² · {anthropometrySummary.omsStatus}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => handleRecalculateDosesForWeight(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm font-bold font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-[#0284C7] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Talla (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value) || 50)}
                  className="w-full px-3 py-2 text-sm font-bold font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-[#0284C7] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">P. Cefálico (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={headCircumferenceCm}
                  onChange={(e) => setHeadCircumferenceCm(Number(e.target.value) || 35)}
                  className="w-full px-3 py-2 text-sm font-bold font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-[#0284C7] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Temp (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={temperatureC}
                  onChange={(e) => setTemperatureC(Number(e.target.value) || 36.5)}
                  className={`w-full px-3 py-2 text-sm font-bold font-mono tabular-nums border rounded-xl focus:outline-none ${
                    temperatureC >= 38.0
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">T.A. (mmHg)</label>
                <input
                  type="text"
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-[#0284C7] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. Motivo de Consulta y Enfermedad Actual */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Motivo de Consulta y Enfermedad Actual
              </h2>
              <span className="text-[11px] text-[#7C3AED] font-medium flex items-center gap-1">
                <Wand2 className="w-3 h-3" />
                Autocompletado por Copiloto IA
              </span>
            </div>
            <textarea
              rows={3}
              value={motivoConsulta}
              onChange={(e) => setMotivoConsulta(e.target.value)}
              className="w-full p-3.5 text-xs leading-relaxed bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#0284C7] focus:outline-none"
            />
          </div>

          {/* 3. Examen Físico Segmentado por Áreas */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-[#0284C7]" />
                <h2 className="text-sm font-bold text-slate-900">Examen Físico por Sistemas</h2>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl">
              {(
                [
                  { id: 'general', label: 'General' },
                  { id: 'cabezaCuello', label: 'Cabeza / Cuello' },
                  { id: 'cardiopulmonar', label: 'Cardiopulmonar' },
                  { id: 'abdomen', label: 'Abdomen' },
                  { id: 'extremidades', label: 'Extremidades' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveExamTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeExamTab === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={examenFisico[activeExamTab]}
              onChange={(e) =>
                setExamenFisico((prev) => ({
                  ...prev,
                  [activeExamTab]: e.target.value,
                }))
              }
              className="w-full p-3.5 text-xs leading-relaxed bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#0284C7] focus:outline-none"
            />
          </div>

          {/* 4. Diagnóstico CIE-10 con Autocompletado Predictivo */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3 relative">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Diagnóstico Codificado CIE-10 (OMS)
              </h2>
              <span className="text-xs font-mono font-bold text-[#0284C7]">
                Código Activo: {selectedCie10.code}
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={cie10Query}
                onFocus={() => setShowCie10Dropdown(true)}
                onChange={(e) => {
                  setCie10Query(e.target.value);
                  setShowCie10Dropdown(true);
                }}
                placeholder="Buscar por código (ej. J03.9) o nombre patológico..."
                className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-[#0284C7] focus:outline-none"
              />
            </div>

            {showCie10Dropdown && (
              <div className="border border-slate-200 rounded-xl bg-white shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                {filteredCie10.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => {
                      setSelectedCie10({ code: item.code, name: item.name });
                      setCie10Query(`${item.code} — ${item.name}`);
                      setShowCie10Dropdown(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-sky-50/70 flex items-center justify-between text-xs cursor-pointer"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#0284C7] mr-2">{item.code}</span>
                      <span className="font-medium text-slate-800">{item.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{item.specialty}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA (6 COLS): PRESCRIPCIÓN Y EDUCACIÓN AL PACIENTE */}
        <div className="lg:col-span-6 space-y-5">
          {/* 1. Récipe Farmacológico con Calculadora Pediátrica mg/kg */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Récipe Farmacológico Dinámico
                </h2>
                <p className="text-xs text-slate-500">
                  Dosis en <span className="font-mono">mg/ml</span> calculada automáticamente según peso actual de{' '}
                  <span className="font-mono font-bold text-slate-800">{weightKg} kg</span>
                </p>
              </div>

              {/* Quick Add from Pediatric Weight Formulary */}
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    if (isNaN(idx)) return;
                    const formula = PEDIATRIC_FORMULARY[idx];
                    if (!formula) return;
                    const calc = calculatePediatricDose(formula, weightKg);
                    setPrescriptions((prev) => [
                      ...prev,
                      {
                        id: `rx-${Date.now()}`,
                        medicationName: formula.name,
                        presentation: formula.presentation,
                        dosePerTake: calc.dosePerTake,
                        frequencyHours: `Cada ${formula.frequencyHours} horas`,
                        durationDays: `${formula.defaultDurationDays} días`,
                        specialInstructions: formula.specialInstructions,
                        calculatedMgPerKg: calc.calculatedMgPerKg,
                      },
                    ]);
                    e.target.value = '';
                  }}
                  defaultValue=""
                  className="px-3 py-1.5 text-xs font-semibold bg-[#ECFDF5] text-[#059669] border border-emerald-200 rounded-xl cursor-pointer"
                >
                  <option value="" disabled>
                    + Agregar por Peso ({weightKg} kg)...
                  </option>
                  {PEDIATRIC_FORMULARY.map((f, i) => (
                    <option key={f.name} value={i}>
                      {f.name} ({f.mgPerKgPerDay} mg/kg/día)
                    </option>
                  ))}
                </select>

                <button
                  onClick={() =>
                    setPrescriptions((prev) => [
                      ...prev,
                      {
                        id: `rx-manual-${Date.now()}`,
                        medicationName: 'Nuevo Medicamento',
                        presentation: 'Suspensión / Tabletas',
                        dosePerTake: '5 ml',
                        frequencyHours: 'Cada 8 horas',
                        durationDays: '5 días',
                        specialInstructions: 'Administrar con alimentos.',
                      },
                    ])
                  }
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
                  title="Añadir fila manual"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {prescriptions.map((rx, index) => (
                <div
                  key={rx.id}
                  className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={rx.medicationName}
                      onChange={(e) =>
                        setPrescriptions((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, medicationName: e.target.value } : item
                          )
                        )
                      }
                      className="flex-1 text-xs font-bold text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200"
                    />
                    {rx.calculatedMgPerKg && (
                      <span className="text-[11px] font-mono text-[#059669] flex items-center gap-1 shrink-0">
                        <Calculator className="w-3 h-3" />
                        {rx.calculatedMgPerKg}
                      </span>
                    )}
                    <button
                      onClick={() =>
                        setPrescriptions((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="block text-[10px] text-slate-400">Presentación</span>
                      <input
                        type="text"
                        value={rx.presentation}
                        onChange={(e) =>
                          setPrescriptions((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, presentation: e.target.value } : item
                            )
                          )
                        }
                        className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Dosis por toma</span>
                      <input
                        type="text"
                        value={rx.dosePerTake}
                        onChange={(e) =>
                          setPrescriptions((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, dosePerTake: e.target.value } : item
                            )
                          )
                        }
                        className="w-full px-2.5 py-1 text-xs font-mono font-bold bg-white border border-emerald-300 rounded-lg text-[#059669]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Frecuencia</span>
                      <input
                        type="text"
                        value={rx.frequencyHours}
                        onChange={(e) =>
                          setPrescriptions((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, frequencyHours: e.target.value } : item
                            )
                          )
                        }
                        className="w-full px-2.5 py-1 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-700"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Duración</span>
                      <input
                        type="text"
                        value={rx.durationDays}
                        onChange={(e) =>
                          setPrescriptions((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, durationDays: e.target.value } : item
                            )
                          )
                        }
                        className="w-full px-2.5 py-1 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Guía para Padres / Paciente (Generada por IA) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-[#7C3AED]" />
                <h2 className="text-sm font-bold text-slate-900">
                  Guía Empática para Padres / Paciente (Generada por IA)
                </h2>
              </div>
              <span className="text-[11px] text-[#7C3AED] font-medium">Lenguaje claro y humano</span>
            </div>
            <textarea
              rows={4}
              value={parentGuide}
              onChange={(e) => setParentGuide(e.target.value)}
              className="w-full p-3.5 text-xs leading-relaxed bg-[#F5F3FF]/40 border border-violet-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#7C3AED] focus:outline-none"
            />
          </div>

          {/* 3. Signos de Alarma Críticos */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#E11D48]" />
                <h2 className="text-sm font-bold text-slate-900">
                  Signos de Alarma Críticos (Acudir a Emergencias)
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {alarmSigns.filter((s) => s.checked).length} seleccionados
              </span>
            </div>

            <div className="space-y-2">
              {alarmSigns.map((sign, idx) => (
                <label
                  key={idx}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                    sign.checked
                      ? 'bg-rose-50/60 border-rose-200 text-rose-950 font-medium'
                      : 'bg-slate-50 border-slate-200/70 text-slate-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sign.checked}
                    onChange={(e) =>
                      setAlarmSigns((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, checked: e.target.checked } : item
                        )
                      )
                    }
                    className="mt-0.5 w-4 h-4 accent-[#E11D48]"
                  />
                  <span>{sign.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          BARRA INFERIOR DE CIERRE (FOOTER FIJO)
      ====================================================================== */}
      <div className="fixed bottom-0 left-[264px] right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          <span>
            Consulta lista · Diagnóstico <strong className="font-mono">{selectedCie10.code}</strong> ·{' '}
            <strong className="font-mono">{prescriptions.length}</strong> medicamentos calculados para{' '}
            <strong className="font-mono">{weightKg} kg</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => showToast('Borrador clínico guardado automáticamente')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Borrador</span>
          </button>

          <button
            onClick={handleFinishConsultation}
            className="px-6 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-2 shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Finalizar Consulta y Despachar Documentos</span>
          </button>
        </div>
      </div>
    </div>
  );
};
