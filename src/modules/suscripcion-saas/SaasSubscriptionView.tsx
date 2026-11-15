import React from 'react';
import { CreditCard } from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';

export const SaasSubscriptionView: React.FC = () => {
  const { aiMinutesUsed, whatsappMessagesSent } = useClinical();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Suscripción SaaS y Métodos de Pago (Sprint 2)</h1>
          <p className="text-xs text-slate-500">Plan Profesional Pediátrico • Uso mensual del consultorio.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Minutos de Dictado IA</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{aiMinutesUsed} min</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Récipes enviados por WhatsApp</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{whatsappMessagesSent}</p>
        </div>
      </div>
    </div>
  );
};
