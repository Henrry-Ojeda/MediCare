import React from 'react';
import { TrendingUp } from 'lucide-react';
import { GrowthMeasurement } from '../../../../types/patient.types';

interface OmsGrowthCurvesTabProps {
  growthHistory: GrowthMeasurement[];
}

export const OmsGrowthCurvesTab: React.FC<OmsGrowthCurvesTabProps> = ({ growthHistory }) => {
  if (growthHistory.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        No hay mediciones antropométricas registradas para graficar curvas OMS.
      </div>
    );
  }

  const maxWeight = Math.max(...growthHistory.map((g) => g.weightKg), 20);
  const maxHeight = Math.max(...growthHistory.map((g) => g.heightCm), 110);

  const buildPolylinePoints = (values: number[], maxVal: number, width: number, height: number) => {
    if (values.length === 1) {
      const y = height - (values[0] / maxVal) * (height - 24) - 12;
      return `20,${y} ${width - 20},${y}`;
    }
    return values
      .map((val, idx) => {
        const x = 20 + (idx / (values.length - 1)) * (width - 40);
        const y = height - (val / maxVal) * (height - 24) - 12;
        return `${x},${y}`;
      })
      .join(' ');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-600" /> Curva de Peso (kg)
            </h3>
            <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full">
              Último: {growthHistory[growthHistory.length - 1].weightKg} kg
            </span>
          </div>
          <svg viewBox="0 0 360 150" className="w-full h-40 bg-slate-50 rounded-xl border border-slate-100">
            <polyline
              fill="none"
              stroke="#0284C7"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={buildPolylinePoints(
                growthHistory.map((g) => g.weightKg),
                maxWeight,
                360,
                150
              )}
            />
          </svg>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Curva de Talla (cm)
            </h3>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Último: {growthHistory[growthHistory.length - 1].heightCm} cm
            </span>
          </div>
          <svg viewBox="0 0 360 150" className="w-full h-40 bg-slate-50 rounded-xl border border-slate-100">
            <polyline
              fill="none"
              stroke="#059669"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={buildPolylinePoints(
                growthHistory.map((g) => g.heightCm),
                maxHeight,
                360,
                150
              )}
            />
          </svg>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <th className="py-3 px-4 font-bold">Fecha</th>
              <th className="py-3 px-4 font-bold">Edad (m)</th>
              <th className="py-3 px-4 font-bold">Peso (kg)</th>
              <th className="py-3 px-4 font-bold">Talla (cm)</th>
              <th className="py-3 px-4 font-bold">IMC</th>
              <th className="py-3 px-4 font-bold">Percentil Peso</th>
              <th className="py-3 px-4 font-bold">Percentil Talla</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {growthHistory.map((row, idx) => (
              <tr key={`${row.date}-${idx}`} className="hover:bg-slate-50">
                <td className="py-2.5 px-4 font-medium text-slate-800">{row.date}</td>
                <td className="py-2.5 px-4 text-slate-600">{row.ageMonths} m</td>
                <td className="py-2.5 px-4 font-bold text-slate-900">{row.weightKg}</td>
                <td className="py-2.5 px-4 font-bold text-slate-900">{row.heightCm}</td>
                <td className="py-2.5 px-4 text-slate-600">{row.bmi}</td>
                <td className="py-2.5 px-4 text-sky-700 font-semibold">{row.percentileWeight}</td>
                <td className="py-2.5 px-4 text-emerald-700 font-semibold">{row.percentileHeight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
