import React from 'react';
import { FileCheck2 } from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';
import { formatUsd } from '../../utils/formatters';

export const MedicalReceiptsView: React.FC = () => {
  const { payments } = useClinical();

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
          <FileCheck2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Recibos para Seguros (Sprint 2)</h1>
          <p className="text-xs text-slate-500">Emisión de comprobantes médicos para reembolso.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {payments.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-700">{p.receiptNumber}</span>
              <span className="text-xs text-slate-400">{p.date}</span>
            </div>
            <p className="text-sm font-bold text-slate-900">{p.patientName}</p>
            <p className="text-xs text-slate-600">
              {p.concept} • CIE-10: {p.cie10Code}
            </p>
            <p className="text-xs font-bold text-emerald-700">Total: {formatUsd(p.amountUsd)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
