import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Scale } from 'lucide-react';
import { GrowthMeasurement, VitalSigns } from '../../../../types/patient.types';
import {
  calculateBmi,
  evaluateGrowthTrend,
  evaluateOmsStatus,
} from '../../../../utils/pediatricCalculations';

export interface AnthropometryVisibleFields {
  respiratoryRate?: boolean;
  headCircumference?: boolean;
  bloodPressure?: boolean;
  spo2?: boolean;
}

interface PediatricAnthropometryCardProps {
  vitals: VitalSigns;
  ageMonths: number;
  sex?: 'M' | 'F';
  previousGrowth?: GrowthMeasurement;
  visibleFields?: AnthropometryVisibleFields;
  onChange: (updated: VitalSigns) => void;
}

export const PediatricAnthropometryCard: React.FC<PediatricAnthropometryCardProps> = ({
  vitals,
  ageMonths,
  sex = 'M',
  previousGrowth,
  visibleFields = { respiratoryRate: true, headCircumference: true, bloodPressure: true, spo2: true },
  onChange,
}) => {
  const bmi = calculateBmi(vitals.weightKg, vitals.heightCm);
  const oms = evaluateOmsStatus(
    vitals.weightKg,
    vitals.heightCm,
    ageMonths,
    sex,
    vitals.headCircumferenceCm
  );
  const trend = evaluateGrowthTrend(
    {
      weightKg: vitals.weightKg,
      heightCm: vitals.heightCm,
      headCircumferenceCm: vitals.headCircumferenceCm,
    },
    previousGrowth,
    ageMonths
  );

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
        {visibleFields.spo2 !== false && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">SpO₂ (%)</label>
            <input
              type="number"
              value={vitals.spo2Percent}
              onChange={(e) => updateField('spo2Percent', parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
            />
          </div>
        )}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">FC (lpm)</label>
          <input
            type="number"
            value={vitals.heartRateBpm}
            onChange={(e) => updateField('heartRateBpm', parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
          />
        </div>
        {visibleFields.respiratoryRate !== false && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">FR (rpm)</label>
            <input
              type="number"
              value={vitals.respiratoryRateRpm ?? ''}
              onChange={(e) => updateField('respiratoryRateRpm', parseInt(e.target.value, 10))}
              placeholder="Ej. 24"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
            />
          </div>
        )}
        {visibleFields.headCircumference !== false && (
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
        )}
        {visibleFields.bloodPressure !== false && (
          <>
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
          </>
        )}
      </div>

      <div className="space-y-2 pt-1">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
          <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            Evaluación OMS ({ageMonths} m · {sex === 'F' ? 'Niña' : 'Niño'}):{' '}
            <strong>{oms.statusLabel}</strong> · Peso {oms.weightPercentile} · Talla{' '}
            {oms.heightPercentile}
            {oms.headStatusLabel ? ` · ${oms.headStatusLabel}` : ''}
          </span>
        </div>

        {previousGrowth ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <p className="text-xs font-bold text-slate-800">
              Análisis Comparativo: Actual vs. Historial Anterior vs. Estándar OMS
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              <div className="rounded-xl bg-white border border-sky-200 p-3 space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-sky-700">
                  1. Información Actual
                </p>
                <p className="text-slate-700">
                  Peso: <strong>{vitals.weightKg} kg</strong> ({(vitals.weightKg - previousGrowth.weightKg) >= 0 ? '+' : ''}
                  {(vitals.weightKg - previousGrowth.weightKg).toFixed(2)} kg)
                </p>
                <p className="text-slate-700">
                  Talla: <strong>{vitals.heightCm} cm</strong> ({(vitals.heightCm - previousGrowth.heightCm) >= 0 ? '+' : ''}
                  {(vitals.heightCm - previousGrowth.heightCm).toFixed(1)} cm)
                </p>
                <p className="text-slate-700">
                  IMC: <strong>{bmi} kg/m²</strong>
                  {vitals.headCircumferenceCm ? ` · PC: ${vitals.headCircumferenceCm} cm` : ''}
                </p>
              </div>

              <div className="rounded-xl bg-white border border-slate-200 p-3 space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  2. Registro Anterior ({previousGrowth.date})
                </p>
                <p className="text-slate-700">
                  Peso: <strong>{previousGrowth.weightKg} kg</strong> ({previousGrowth.ageMonths} m)
                </p>
                <p className="text-slate-700">
                  Talla: <strong>{previousGrowth.heightCm} cm</strong>
                </p>
                <p className="text-slate-700">
                  IMC: <strong>{previousGrowth.bmi} kg/m²</strong>
                  {previousGrowth.headCircumferenceCm ? ` · PC: ${previousGrowth.headCircumferenceCm} cm` : ''}
                </p>
              </div>

              <div
                className={`rounded-xl p-3 space-y-1 border ${
                  trend.isNormalGrowth
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}
              >
                <p className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1">
                  {trend.isNormalGrowth ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  3. Evaluación OMS
                </p>
                <p className="font-bold">{oms.statusLabel}</p>
                <p className="text-[11px]">
                  Peso {oms.weightPercentile} · Talla {oms.heightPercentile}
                  {oms.headStatusLabel ? ` · ${oms.headStatusLabel}` : ''}
                </p>
                <p className="text-[11px] font-semibold">{trend.summary}</p>
              </div>
            </div>

            {trend.alerts.length > 0 && (
              <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5 pt-1">
                {trend.alerts.map((al) => (
                  <li key={al}>{al}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 px-3.5 py-2.5 text-xs text-sky-950 flex items-start gap-2">
            <Activity className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Primera evaluación antropométrica (sin historial previo)</p>
              <p className="text-[11px] text-sky-800">
                Estándar OMS ({ageMonths} m · {sex === 'F' ? 'Niña' : 'Niño'}):{' '}
                <strong>{oms.statusLabel}</strong> · Peso {oms.weightPercentile} · Talla{' '}
                {oms.heightPercentile}
                {oms.headStatusLabel ? ` · ${oms.headStatusLabel}` : ''}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
