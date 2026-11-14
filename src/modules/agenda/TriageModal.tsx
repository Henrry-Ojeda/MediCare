import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common';
import { useClinical } from '../../context/ClinicalContext';
import { useAuth } from '../../context/AuthContext';
import { calculateAgeInMonths } from '../../utils/pediatricCalculations';
import { getCurrentTimeLabel } from '../../utils/formatters';

export const TriageModal: React.FC = () => {
  const { currentUser } = useAuth();
  const { triageModalAppointment, closeTriageModal, saveTriageVitals, patients } = useClinical();

  const [weightKg, setWeightKg] = useState('15.4');
  const [heightCm, setHeightCm] = useState('98.5');
  const [headCircumferenceCm, setHeadCircumferenceCm] = useState('49.5');
  const [temperatureC, setTemperatureC] = useState('37.2');
  const [heartRateBpm, setHeartRateBpm] = useState('104');
  const [spo2Percent, setSpo2Percent] = useState('98');
  const [systolicBp, setSystolicBp] = useState('96');
  const [diastolicBp, setDiastolicBp] = useState('62');

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

  if (!triageModalAppointment) return null;

  const triagePatient = patients.find((p) => p.id === triageModalAppointment.patientId);
  const isUnder3Years = triagePatient ? calculateAgeInMonths(triagePatient.birthDate) < 36 : true;

  const handleSave = () => {
    saveTriageVitals(triageModalAppointment.id, {
      weightKg: Number(weightKg) || 15,
      heightCm: Number(heightCm) || 95,
      headCircumferenceCm: isUnder3Years ? Number(headCircumferenceCm) : undefined,
      temperatureC: Number(temperatureC) || 36.8,
      heartRateBpm: Number(heartRateBpm) || 100,
      spo2Percent: Number(spo2Percent) || 98,
      systolicBp: Number(systolicBp) || 95,
      diastolicBp: Number(diastolicBp) || 60,
      recordedAt: getCurrentTimeLabel(),
      recordedBy: currentUser?.name || 'Asistente de Triaje',
    });
  };

  return (
    <Modal
      isOpen={Boolean(triageModalAppointment)}
      onClose={closeTriageModal}
      title={`Triaje Pediátrico — ${triageModalAppointment.patientName}`}
      subtitle={triageModalAppointment.patientAgeLabel}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Peso (kg)</label>
            <input
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full px-3.5 py-2.5 text-lg font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Talla (cm)</label>
            <input
              type="number"
              step="0.1"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="w-full px-3.5 py-2.5 text-lg font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              P. Cefálico {isUnder3Years ? '(cm)' : '(N/A ≥3a)'}
            </label>
            <input
              type="number"
              step="0.1"
              disabled={!isUnder3Years}
              value={headCircumferenceCm}
              onChange={(e) => setHeadCircumferenceCm(e.target.value)}
              className="w-full px-3.5 py-2.5 text-lg font-bold font-mono bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Temperatura (°C)
            </label>
            <input
              type="number"
              step="0.1"
              value={temperatureC}
              onChange={(e) => setTemperatureC(e.target.value)}
              className={`w-full px-3.5 py-2.5 text-lg font-bold font-mono border rounded-xl ${
                Number(temperatureC) >= 38.0
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'bg-slate-50 border-slate-200'
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">FC (lpm)</label>
            <input
              type="number"
              value={heartRateBpm}
              onChange={(e) => setHeartRateBpm(e.target.value)}
              className="w-full px-3.5 py-2.5 text-lg font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">SpO2 (%)</label>
            <input
              type="number"
              value={spo2Percent}
              onChange={(e) => setSpo2Percent(e.target.value)}
              className="w-full px-3.5 py-2.5 text-lg font-bold font-mono bg-emerald-50/50 border border-emerald-200 text-emerald-700 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              T.A. Sistólica
            </label>
            <input
              type="number"
              value={systolicBp}
              onChange={(e) => setSystolicBp(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              T.A. Diastólica
            </label>
            <input
              type="number"
              value={diastolicBp}
              onChange={(e) => setDiastolicBp(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={closeTriageModal}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
          >
            Guardar Signos y Pasar a Consultorio
          </button>
        </div>
      </div>
    </Modal>
  );
};
