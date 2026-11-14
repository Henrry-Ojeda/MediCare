import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useClinical();

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Bitácora de Auditoría (Sprint 2)</h1>
          <p className="text-xs text-slate-500">Registro de eventos clínicos y administrativos.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <th className="py-3 px-4 font-bold">Fecha</th>
              <th className="py-3 px-4 font-bold">Usuario</th>
              <th className="py-3 px-4 font-bold">Acción</th>
              <th className="py-3 px-4 font-bold">Paciente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {auditLogs.map((log) => (
              <tr key={log.id}>
                <td className="py-2.5 px-4 text-slate-500">{log.timestamp}</td>
                <td className="py-2.5 px-4 font-semibold text-slate-900">{log.user}</td>
                <td className="py-2.5 px-4">{log.action}</td>
                <td className="py-2.5 px-4">{log.patientName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
