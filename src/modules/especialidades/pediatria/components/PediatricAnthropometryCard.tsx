import React from 'react';
import { Activity, Scale } from 'lucide-react';
import { VitalSigns } from '../../../../types/patient.types';
import { calculateBmi, evaluateOmsStatus } from '../../../../utils/pediatricCalculations';

interface PediatricAnthropometryCardProps {
  vitals: VitalSigns;
  ageMonths: number;
  onChange: (updated: VitalSigns) => void;
}

export const PediatricAnthropometryCard: React.FC<PediatricAnthropometryCardProps> = ({
  vitals,
  ageMonths,
  onChange,
}) => {
  const bmi = calculateBmi(vitals.weightKg, vitals.heightCm);
  const oms = evaluateOmsStatus(vitals.weightKg, vitals.heightCm, ageMonths);

  const updateField = (field: keyof VitalSigns, value: number) => {
    onChange({
      ...vitals,
      [field]: Number.isFinite(value) ? value : 0,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Scale className="w-4 h-4 text-sky-600" /> Antropometría y Signos Vitales
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-[11px] font-bold">
            IMC: {bmi} kg/m²
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
            {oms.statusLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Peso (kg)</label>
          <input
            type="number"
            step="0.1"
            value={vitals.weightKg}
            onChange={(e) => updateField('weightKg', parseFloat(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Talla (cm)</label>
          <input
            type="number"
            step="0.5"
            value={vitals.heightCm}
            onChange={(e) => updateField('heightCm', parseFloat(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Temp (°C)</label>
          <input
            type="number"
            step="0.1"
            value={vitals.temperatureC}
            onChange={(e) => updateField('temperatureC', parseFloat(e.target.value))}
            className={`w-full px-3 py-2 rounded-xl border text-sm font-bold ${
              vitals.temperatureC >= 38 ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-900'
            }`}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">SpO₂ (%)</label>
          <input
            type="number"
            value={vitals.spo2Percent}
            onChange={(e) => updateField('spo2Percent', parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">FC (lpm)</label>
          <input
            type="number"
            value={vitals.heartRateBpm}
            onChange={(e) => updateField('heartRateBpm', parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">P. Cefálico (cm)</label>
          <input
            type="number"
            step="0.1"
            value={vitals.headCircumferenceCm ?? ''}
            onChange={(e) => updateField('headCircumferenceCm', parseFloat(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">PA Sistólica</label>
          <input
            type="number"
            value={vitals.systolicBp}
            onChange={(e) => updateField('systolicBp', parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">PA Diastólica</label>
          <input
            type="number"
            value={vitals.diastolicBp}
            onChange={(e) => updateField('diastolicBp', parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <Activity className="w-3.5 h-3.5 text-emerald-600" />
        <span>
          Evaluación OMS ({ageMonths} meses): <strong>{oms.statusLabel}</strong> • Percentil {oms.percentileLabel}
        </span>
      </div>
    </div>
  );
};
