import React from 'react';
import { Wallet } from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';
import { formatUsd, formatVes } from '../../utils/formatters';

export const CashbookView: React.FC = () => {
  const { payments, tenantConfig } = useClinical();

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Cuaderno de Caja BCV (Sprint 2)</h1>
            <p className="text-xs text-slate-500">Tasa BCV actual: Bs. {tenantConfig.bcvRate.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <th className="py-3 px-4 font-bold">Recibo</th>
              <th className="py-3 px-4 font-bold">Paciente</th>
              <th className="py-3 px-4 font-bold">Concepto</th>
              <th className="py-3 px-4 font-bold">Método</th>
              <th className="py-3 px-4 font-bold">USD</th>
              <th className="py-3 px-4 font-bold">VES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="py-2.5 px-4 font-bold text-slate-900">{p.receiptNumber}</td>
                <td className="py-2.5 px-4">{p.patientName}</td>
                <td className="py-2.5 px-4">{p.concept}</td>
                <td className="py-2.5 px-4">{p.method}</td>
                <td className="py-2.5 px-4 font-bold text-emerald-700">{formatUsd(p.amountUsd)}</td>
                <td className="py-2.5 px-4">{formatVes(p.amountVes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
