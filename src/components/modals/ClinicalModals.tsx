import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Activity,
  Syringe,
  FileText,
  Printer,
  Send,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useMedical, calculateAgeInMonths, calculateExactAgeLabel } from '../../context/MedicalContext';

export const ClinicalModals: React.FC = () => {
  const {
    triageModalAppointment,
    closeTriageModal,
    saveTriageVitals,
    patients,
    vaccineModalDose,
    closeVaccineModal,
    applyVaccineDose,
    dispatchModalConsultation,
    closeDispatchModal,
    templateConfig,
    incrementWhatsappSent,
    showToast,
  } = useMedical();

  // --- State for Vista 9: Modal de Triaje Rápido ---
  const [weightKg, setWeightKg] = useState<string>('15.4');
  const [heightCm, setHeightCm] = useState<string>('98.5');
  const [headCircumferenceCm, setHeadCircumferenceCm] = useState<string>('49.8');
  const [temperatureC, setTemperatureC] = useState<string>('38.4');
  const [heartRateBpm, setHeartRateBpm] = useState<string>('110');
  const [spo2Percent, setSpo2Percent] = useState<string>('98');
  const [systolicBp, setSystolicBp] = useState<string>('95');
  const [diastolicBp, setDiastolicBp] = useState<string>('60');

  useEffect(() => {
    if (triageModalAppointment) {
      const v = triageModalAppointment.triageVitals;
      setWeightKg(String(v?.weightKg ?? 15.4));
      setHeightCm(String(v?.heightCm ?? 98.5));
      setHeadCircumferenceCm(String(v?.headCircumferenceCm ?? 49.5));
      setTemperatureC(String(v?.temperatureC ?? 37.2));
      setHeartRateBpm(String(v?.heartRateBpm ?? 104));
      setSpo2Percent(String(v?.spo2Percent ?? 98));
      setSystolicBp(String(v?.systolicBp ?? 96));
      setDiastolicBp(String(v?.diastolicBp ?? 62));
    }
  }, [triageModalAppointment]);

  // --- State for Vista 14: Modal de Aplicación Rápida de Dosis ---
  const [doseNumber, setDoseNumber] = useState<string>('1ra Dosis');
  const [batchNumber, setBatchNumber] = useState<string>('LT-2026-894A');
  const [manufacturer, setManufacturer] = useState<string>('Sanofi Pasteur / GSK');
  const [appliedDate, setAppliedDate] = useState<string>('2026-11-09');
  const [observations, setObservations] = useState<string>(
    'Se aplicó en deltoides derecho con técnica aséptica, sin llanto prolongado ni reacción local inmediata.'
  );

  useEffect(() => {
    if (vaccineModalDose) {
      setDoseNumber(vaccineModalDose.dose.doseNumber || '1ra Dosis');
      setBatchNumber(vaccineModalDose.dose.batchNumber || 'LT-2026-912B');
      setManufacturer(vaccineModalDose.dose.manufacturer || 'Sanofi Pasteur');
      setAppliedDate(vaccineModalDose.dose.appliedDate || '2026-11-09');
      setObservations(
        vaccineModalDose.dose.observations ||
          'Se aplicó en deltoides derecho, sin llanto prolongado.'
      );
    }
  }, [vaccineModalDose]);

  // --- State for Vista 17: Modal de Previsualización y Despacho Automatizado ---
  const [activePdfPage, setActivePdfPage] = useState<1 | 2>(1);
  const [sendWhatsappMother, setSendWhatsappMother] = useState<boolean>(true);
  const [sendEmailGuardian, setSendEmailGuardian] = useState<boolean>(true);
  const [dispatchedSuccess, setDispatchedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (dispatchModalConsultation) {
      setActivePdfPage(1);
      setSendWhatsappMother(true);
      setSendEmailGuardian(true);
      setDispatchedSuccess(false);
    }
  }, [dispatchModalConsultation]);

  const triagePatient = triageModalAppointment
    ? patients.find((p) => p.id === triageModalAppointment.patientId)
    : null;
  const isUnder3Years = triagePatient
    ? calculateAgeInMonths(triagePatient.birthDate) < 36
    : true;

  return (
    <>
      {/* =====================================================================
          VISTA 9: MODAL DE TRIAJE RÁPIDO DE LA ASISTENTE
      ====================================================================== */}
      <AnimatePresence>
        {triageModalAppointment && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F0F9FF] text-[#0284C7] flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-slate-500">
                      VISTA 09 · MODAL DE TRIAJE RÁPIDO DE ENFERMERÍA
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {triageModalAppointment.patientName} ({triageModalAppointment.patientAgeLabel})
                    </h3>
                  </div>
                </div>
                <button
                  onClick={closeTriageModal}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Peso Corporal (kg)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="w-full px-4 py-3 text-xl font-bold font-mono tabular-nums text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0284C7] focus:bg-white"
                      />
                      <span className="absolute right-3.5 top-3.5 text-xs font-mono text-slate-400">
                        kg
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Talla / Estatura (cm)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        className="w-full px-4 py-3 text-xl font-bold font-mono tabular-nums text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0284C7] focus:bg-white"
                      />
                      <span className="absolute right-3.5 top-3.5 text-xs font-mono text-slate-400">
                        cm
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Perímetro Cefálico (cm)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        disabled={!isUnder3Years}
                        value={headCircumferenceCm}
                        onChange={(e) => setHeadCircumferenceCm(e.target.value)}
                        className={`w-full px-4 py-3 text-xl font-bold font-mono tabular-nums rounded-xl border focus:outline-none ${
                          isUnder3Years
                            ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#0284C7] focus:bg-white'
                            : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      />
                      <span className="absolute right-3.5 top-3.5 text-xs font-mono text-slate-400">
                        {isUnder3Years ? 'cm (<3a)' : 'N/A ≥3a'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Temperatura (°C)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={temperatureC}
                        onChange={(e) => setTemperatureC(e.target.value)}
                        className={`w-full px-4 py-3 text-xl font-bold font-mono tabular-nums border rounded-xl focus:outline-none ${
                          Number(temperatureC) >= 38.0
                            ? 'bg-rose-50 border-rose-300 text-rose-700'
                            : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      />
                      <span className="absolute right-3.5 top-3.5 text-xs font-mono text-slate-400">
                        °C
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Frec. Cardíaca (lpm)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={heartRateBpm}
                        onChange={(e) => setHeartRateBpm(e.target.value)}
                        className="w-full px-4 py-3 text-xl font-bold font-mono tabular-nums text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0284C7]"
                      />
                      <span className="absolute right-3.5 top-3.5 text-xs font-mono text-slate-400">
                        lpm
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Saturación O2 (% SpO2)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={spo2Percent}
                        onChange={(e) => setSpo2Percent(e.target.value)}
                        className="w-full px-4 py-3 text-xl font-bold font-mono tabular-nums text-emerald-700 bg-emerald-50/50 border border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-3.5 top-3.5 text-xs font-mono text-emerald-600">
                        % O2
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tensión Arterial Sistólica / Diastólica (mmHg)
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <input
                        type="number"
                        value={systolicBp}
                        onChange={(e) => setSystolicBp(e.target.value)}
                        className="w-full px-4 py-2.5 text-lg font-bold font-mono tabular-nums text-slate-900 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                      <span className="absolute right-3.5 top-3 text-xs font-mono text-slate-400">
                        Sistólica (mmHg)
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={diastolicBp}
                        onChange={(e) => setDiastolicBp(e.target.value)}
                        className="w-full px-4 py-2.5 text-lg font-bold font-mono tabular-nums text-slate-900 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                      <span className="absolute right-3.5 top-3 text-xs font-mono text-slate-400">
                        Diastólica (mmHg)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  onClick={closeTriageModal}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() =>
                    saveTriageVitals(triageModalAppointment.id, {
                      weightKg: Number(weightKg) || 15,
                      heightCm: Number(heightCm) || 95,
                      headCircumferenceCm: isUnder3Years ? Number(headCircumferenceCm) : undefined,
                      temperatureC: Number(temperatureC) || 36.8,
                      heartRateBpm: Number(heartRateBpm) || 100,
                      spo2Percent: Number(spo2Percent) || 98,
                      systolicBp: Number(systolicBp) || 95,
                      diastolicBp: Number(diastolicBp) || 60,
                      recordedAt: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
                      recordedBy: 'Lic. Carla Rivas (Asistente Triaje)',
                    })
                  }
                  className="px-5 py-2.5 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Guardar Signos y Enviar a Consultorio
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          VISTA 14: MODAL DE APLICACIÓN RÁPIDA DE DOSIS DE VACUNA
      ====================================================================== */}
      <AnimatePresence>
        {vaccineModalDose && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center">
                    <Syringe className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-slate-500">
                      VISTA 14 · APLICACIÓN RÁPIDA DE DOSIS
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {vaccineModalDose.dose.vaccineName}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={closeVaccineModal}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Vacuna Preseleccionada
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={vaccineModalDose.dose.vaccineName}
                      className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-100 border border-slate-200 rounded-xl text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Número de Dosis
                    </label>
                    <select
                      value={doseNumber}
                      onChange={(e) => setDoseNumber(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-900"
                    >
                      <option value="Dosis Única">Dosis Única</option>
                      <option value="1ra Dosis">1ra Dosis</option>
                      <option value="2da Dosis">2da Dosis</option>
                      <option value="3ra Dosis">3ra Dosis</option>
                      <option value="1er Refuerzo">1er Refuerzo</option>
                      <option value="2do Refuerzo Escolar">2do Refuerzo Escolar</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Número de Lote del Frasco
                    </label>
                    <input
                      type="text"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-mono font-semibold bg-white border border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Laboratorio Fabricante
                    </label>
                    <input
                      type="text"
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Colocación
                  </label>
                  <input
                    type="date"
                    value={appliedDate}
                    onChange={(e) => setAppliedDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Observaciones Clínicas de Aplicación
                  </label>
                  <textarea
                    rows={3}
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  onClick={closeVaccineModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() =>
                    applyVaccineDose(vaccineModalDose.patientId, vaccineModalDose.dose.id, {
                      appliedDate,
                      batchNumber,
                      manufacturer,
                      appliedBy: 'Dra. Valeria Méndez',
                      observations,
                    })
                  }
                  className="px-5 py-2 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Confirmar Dosis Aplicada
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          VISTA 17: MODAL DE PREVISUALIZACIÓN Y DESPACHO AUTOMATIZADO (PDF 2 PÁG)
      ====================================================================== */}
      <AnimatePresence>
        {dispatchModalConsultation && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Top Bar */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 no-print">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-slate-500">
                      VISTA 17 · PREVISUALIZACIÓN DE DOCUMENTOS Y DESPACHO AUTOMATIZADO
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      Récipe Legal + Guía Didáctica para Padres ({dispatchModalConsultation.patient.firstName}{' '}
                      {dispatchModalConsultation.patient.lastName})
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-200/70 p-1 rounded-xl">
                    <button
                      onClick={() => setActivePdfPage(1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activePdfPage === 1
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Página 1: Récipe Legal
                    </button>
                    <button
                      onClick={() => setActivePdfPage(2)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activePdfPage === 2
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Página 2: Guía para Padres
                    </button>
                  </div>
                  <button
                    onClick={closeDispatchModal}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body Split: PDF Interactive Sheet + Immediate Dispatch Panel */}
              <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                {/* Left 8 cols: Interactive 2-Page PDF Preview */}
                <div className="lg:col-span-8 p-6 bg-slate-100/70 flex justify-center">
                  <div
                    className="bg-white w-full max-w-2xl rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col justify-between"
                    style={{ borderTop: `5px solid ${templateConfig.borderColor}` }}
                  >
                    {activePdfPage === 1 ? (
                      /* PÁGINA 1: RÉCIPE LEGAL */
                      <div className="space-y-6">
                        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                          <div>
                            <h4 className="text-base font-bold text-slate-900">
                              {templateConfig.clinicName}
                            </h4>
                            <p className="text-xs text-slate-600">{templateConfig.clinicSubtitle}</p>
                            <p className="text-[11px] text-slate-500 mt-1">
                              RIF: {templateConfig.rif} · {templateConfig.address}
                            </p>
                          </div>
                          <div className="text-right font-mono text-xs text-slate-500">
                            <div>RÉCIPE OFICIAL</div>
                            <div className="font-bold text-slate-900">
                              {dispatchModalConsultation.consultation.date}
                            </div>
                          </div>
                        </div>

                        {/* Patient Summary Bar */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[11px]">Paciente</span>
                            <span className="font-bold text-slate-900">
                              {dispatchModalConsultation.patient.firstName}{' '}
                              {dispatchModalConsultation.patient.lastName}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Edad / Peso</span>
                            <span className="font-mono font-semibold text-slate-900">
                              {calculateExactAgeLabel(dispatchModalConsultation.patient.birthDate)} ·{' '}
                              {dispatchModalConsultation.consultation.weightKg} kg
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-400 block text-[11px]">Diagnóstico CIE-10</span>
                            <span className="font-semibold text-slate-900">
                              {dispatchModalConsultation.consultation.cie10Code} —{' '}
                              {dispatchModalConsultation.consultation.cie10Name}
                            </span>
                          </div>
                        </div>

                        {/* Prescriptions Table */}
                        <div className="space-y-3">
                          <div className="text-xs font-bold text-slate-900 tracking-tight border-b border-slate-200 pb-1.5">
                            RP / PRESCRIPCIÓN FARMACOLÓGICA E INDICACIONES
                          </div>
                          {dispatchModalConsultation.consultation.prescriptions.map((rx, idx) => (
                            <div
                              key={rx.id || idx}
                              className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-900">
                                  {idx + 1}. {rx.medicationName}
                                </span>
                                <span className="text-xs font-mono text-slate-500">{rx.presentation}</span>
                              </div>
                              <div className="text-xs font-mono font-semibold text-[#0284C7]">
                                Dosis: {rx.dosePerTake} · Frecuencia: {rx.frequencyHours} · Duración:{' '}
                                {rx.durationDays}
                              </div>
                              <p className="text-xs text-slate-600">{rx.specialInstructions}</p>
                            </div>
                          ))}
                        </div>

                        {/* Signature, Wet Stamp & QR */}
                        <div className="pt-8 border-t border-slate-200 flex items-end justify-between gap-4">
                          {templateConfig.showQrCode && (
                            <div className="flex items-center gap-3">
                              <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700">
                                <QrCode className="w-9 h-9" />
                              </div>
                              <div className="text-[11px] text-slate-500">
                                <div className="font-semibold text-slate-800">
                                  Autenticidad Verificada QR
                                </div>
                                <div className="font-mono">HASH: MC-2026-9941A</div>
                                <div>{templateConfig.footerNote}</div>
                              </div>
                            </div>
                          )}

                          <div className="text-right shrink-0">
                            {templateConfig.showDigitalSignature && (
                              <div className="italic font-serif text-lg text-sky-900 mb-0.5">
                                Dra. Valeria Méndez
                              </div>
                            )}
                            <div className="border-t border-slate-300 pt-1 text-xs font-bold text-slate-900">
                              Dra. Valeria Méndez
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              MPPS 68.412 · CM 44.910
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* PÁGINA 2: GUÍA DIDÁCTICA ILUSTRADA PARA LOS PADRES */
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                          <div>
                            <span className="text-[11px] font-mono text-[#7C3AED] font-semibold">
                              PÁGINA 2 · EDUCACIÓN AL PACIENTE Y CUIDADOS EN CASA
                            </span>
                            <h4 className="text-base font-bold text-slate-900 mt-0.5">
                              Guía Práctica para la Familia de {dispatchModalConsultation.patient.firstName}
                            </h4>
                          </div>
                          <Clock className="w-6 h-6 text-[#0284C7]" />
                        </div>

                        {/* Empathetic Explanation */}
                        <div className="p-4 rounded-xl bg-[#F0F9FF] border border-sky-200/70 space-y-1.5">
                          <div className="text-xs font-bold text-sky-950">
                            Explicación Médica en Lenguaje Claro y Cuidados en Casa
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {dispatchModalConsultation.consultation.parentGuide}
                          </p>
                        </div>

                        {/* Suggested Administration Schedule Table */}
                        <div>
                          <div className="text-xs font-bold text-slate-900 mb-2">
                            Tabla Horaria Sugerida de Administración
                          </div>
                          <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                              <tr>
                                <th className="py-2 px-3 text-left">Medicamento</th>
                                <th className="py-2 px-3 text-left">Dosis Exacta</th>
                                <th className="py-2 px-3 text-left">Horarios Sugeridos</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {dispatchModalConsultation.consultation.prescriptions.map((rx, i) => (
                                <tr key={i}>
                                  <td className="py-2 px-3 font-semibold text-slate-900">
                                    {rx.medicationName}
                                  </td>
                                  <td className="py-2 px-3 font-mono font-bold text-[#059669]">
                                    {rx.dosePerTake}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-slate-600">
                                    08:00 AM · 04:00 PM · 12:00 AM ({rx.frequencyHours})
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Critical Alarm Signs */}
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>
                              Signos de Alarma Críticos (Acudir a Emergencias de Inmediato)
                            </span>
                          </div>
                          <ul className="space-y-1 text-xs text-rose-900">
                            {dispatchModalConsultation.consultation.alarmSigns.map((sign, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
                                <span>{sign}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right 4 cols: Panel de Envío Inmediato */}
                <div className="lg:col-span-4 p-6 flex flex-col justify-between bg-white no-print">
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Panel de Despacho Inmediato</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Envía el récipe firmado y la guía de cuidados directamente al representante.
                      </p>
                    </div>

                    {/* Switch 1: WhatsApp */}
                    <label className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Enviar copia digital al WhatsApp de la madre
                        </div>
                        <div className="text-xs font-mono text-emerald-700 mt-0.5">
                          {dispatchModalConsultation.patient.guardianWhatsapp}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={sendWhatsappMother}
                        onChange={(e) => setSendWhatsappMother(e.target.checked)}
                        className="mt-1 w-4 h-4 accent-[#059669]"
                      />
                    </label>

                    {/* Switch 2: Email */}
                    <label className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Enviar récipe en PDF al correo del representante
                        </div>
                        <div className="text-xs font-mono text-slate-500 mt-0.5">
                          {dispatchModalConsultation.patient.guardianEmail}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={sendEmailGuardian}
                        onChange={(e) => setSendEmailGuardian(e.target.checked)}
                        className="mt-1 w-4 h-4 accent-[#0284C7]"
                      />
                    </label>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-600">
                      <ShieldCheck className="w-4 h-4 text-[#0284C7] shrink-0" />
                      <span>
                        Documento protegido con firma digital de la Dra. Valeria Méndez y sello húmedo colegiado.
                      </span>
                    </div>

                    {dispatchedSuccess && (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          ¡Documentos despachados con éxito por WhatsApp y Correo Electrónico!
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5 pt-6 border-t border-slate-200">
                    <button
                      onClick={() => {
                        if (sendWhatsappMother) incrementWhatsappSent(1);
                        setDispatchedSuccess(true);
                        showToast(
                          `Récipe y Guía enviados a ${dispatchModalConsultation.patient.guardianWhatsapp}`
                        );
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Despachar Ahora por WhatsApp y Correo</span>
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Descargar PDF / Impresión Física</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
