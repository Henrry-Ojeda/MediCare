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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-1.5 flex items-center justify-around no-print">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = currentView === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCurrentView(tab.id)}
            className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
              active ? 'text-[#0284C7] bg-sky-50' : 'text-slate-500'
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
