import React from 'react';
import { BarChart3 } from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';

export const AnalyticsDashboardView: React.FC = () => {
  const { patients, appointments } = useClinical();

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Analítica Clínica (Sprint 2)</h1>
          <p className="text-xs text-slate-500">Indicadores avanzados de productividad médica.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500">Total Pacientes</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{patients.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500">Citas Registradas</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{appointments.length}</p>
        </div>
      </div>
    </div>
  );
};
