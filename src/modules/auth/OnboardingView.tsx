import React from 'react';
import { Building2 } from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';

export const OnboardingView: React.FC = () => {
  const { tenantConfig, updateTenantConfig, setCurrentView } = useClinical();

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-6 flex flex-col items-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs space-y-5">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-[#0284C7]" />
          <h1 className="text-lg font-bold text-slate-900">Configuración Inicial de Clínica</h1>
        </div>
        <input
          type="text"
          value={tenantConfig.businessName}
          onChange={(e) => updateTenantConfig({ businessName: e.target.value })}
          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setCurrentView('dashboard')}
            className="px-5 py-2.5 rounded-xl bg-[#0284C7] text-white text-xs font-bold cursor-pointer"
          >
            Continuar al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
