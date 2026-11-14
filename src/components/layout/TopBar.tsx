import React, { useState } from 'react';
import { Menu, BellRing, Stethoscope, Calendar, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useClinical } from '../../context/ClinicalContext';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationBell } from '../notifications/NotificationBell';
import { ViewId } from '../../types/medical';

interface TopBarProps {
  onOpenMobileMenu: () => void;
  onOpenNotifications: () => void;
}

const VIEW_TITLES: Partial<Record<ViewId, string>> = {
  dashboard: 'Dashboard Pediátrico',
  agenda: 'Agenda Médica',
  'sala-espera': 'Sala de Espera y Triaje',
  pacientes: 'Directorio de Pacientes',
  'paciente-detalle': 'Historial Clínico 360°',
  'paciente-nuevo': 'Registrar Paciente',
  'vacunas-carnet': 'Carnet de Vacunación',
  'vacunas-catalogo': 'Catálogo de Vacunas',
  'consulta-activa': 'Consulta Pediátrica + Dictado IA',
  'firma-medico': 'Firma y Sello del Médico',
  configuracion: 'Configuración y Roles',
};

const QUICK_CALL_REASONS = [
  'Acudir al consultorio ahora',
  'Hacer pasar al siguiente paciente',
  'Apoyo con antropometría / triaje',
  'Preparar vacuna o insumo médico',
];

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileMenu, onOpenNotifications }) => {
  const { userRole } = useAuth();
  const { currentView, setCurrentView, selectedPatient, appointments } = useClinical();
  const { callAssistantFromConsultorio } = useNotifications();
  const [showCallMenu, setShowCallMenu] = useState(false);

  const waitingCount = appointments.filter(
    (a) => a.stage === 'en_sala' || a.stage === 'en_triaje'
  ).length;

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 no-print">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 cursor-pointer"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
            {VIEW_TITLES[currentView] || 'MediCare Pediatría'}
          </h1>
          <p className="hidden sm:block text-[11px] text-slate-500 truncate">
            Paciente activo: <strong className="text-slate-700">{selectedPatient.firstName} {selectedPatient.lastName}</strong> · En espera: {waitingCount}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {userRole === 'PEDIATRA' && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCallMenu((v) => !v)}
              className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <BellRing className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Llamar Asistente</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showCallMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-40 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase text-slate-400">
                  Enviar aviso al Asistente
                </div>
                {QUICK_CALL_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      callAssistantFromConsultorio(
                        reason,
                        `${selectedPatient.firstName} ${selectedPatient.lastName}`
                      );
                      setShowCallMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-900 cursor-pointer"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <NotificationBell onClick={onOpenNotifications} />

        {userRole === 'PEDIATRA' ? (
          <button
            type="button"
            onClick={() => setCurrentView('consulta-activa')}
            className="hidden sm:flex px-3.5 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Ir a Consulta</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentView('sala-espera')}
            className="hidden sm:flex px-3.5 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Sala de Espera ({waitingCount})</span>
          </button>
        )}
      </div>
    </header>
  );
};
