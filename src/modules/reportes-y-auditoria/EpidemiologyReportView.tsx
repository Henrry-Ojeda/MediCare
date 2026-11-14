import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';

export const EpidemiologyReportView: React.FC = () => {
  const { patients } = useClinical();
  const consultations = patients.flatMap((p) => p.consultations);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Reporte Epidemiológico MPPS (Sprint 2)</h1>
          <p className="text-xs text-slate-500">Consolidado de diagnósticos CIE-10 registrados.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
        {consultations.map((c) => (
          <div key={c.id} className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0">
            <span className="font-bold text-slate-800">
              {c.cie10Code} — {c.cie10Name}
            </span>
            <span className="text-slate-500">{c.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
