import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Activity,
  Users,
  Stethoscope,
  Syringe,
  Settings,
} from 'lucide-react';
import { ViewId } from '../../types/medical';
import { useAuth } from '../../context/AuthContext';
import { useClinical } from '../../context/ClinicalContext';

interface MobileTabItem {
  id: ViewId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const MobileBottomNav: React.FC = () => {
  const { userRole } = useAuth();
  const { currentView, setCurrentView } = useClinical();

  const tabs: MobileTabItem[] =
    userRole === 'PEDIATRA'
      ? [
          { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
          { id: 'sala-espera', label: 'Espera', icon: Activity },
          { id: 'consulta-activa', label: 'Consulta', icon: Stethoscope },
          { id: 'pacientes', label: 'Pacientes', icon: Users },
          { id: 'vacunas-carnet', label: 'Vacunas', icon: Syringe },
        ]
      : userRole === 'ASISTENTE'
        ? [
            { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
            { id: 'agenda', label: 'Agenda', icon: Calendar },
            { id: 'sala-espera', label: 'Triaje', icon: Activity },
            { id: 'pacientes', label: 'Pacientes', icon: Users },
            { id: 'vacunas-carnet', label: 'Vacunas', icon: Syringe },
          ]
        : [
            { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
            { id: 'agenda', label: 'Agenda', icon: Calendar },
            { id: 'sala-espera', label: 'Sala', icon: Activity },
            { id: 'pacientes', label: 'Pacientes', icon: Users },
            { id: 'configuracion', label: 'Clínica', icon: Settings },
          ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#E0F2FE] via-[#F0F9FF] to-white/95 backdrop-blur-md border-t border-sky-200/90 shadow-[0_-6px_20px_rgba(2,132,199,0.10)] px-1.5 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center justify-around no-print">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = currentView === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCurrentView(tab.id)}
            className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
              active
                ? 'bg-gradient-to-r from-[#0284C7] to-[#0D9488] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#0284C7]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
