import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Menu, BellRing, Stethoscope, Calendar, ChevronDown, QrCode, RefreshCw, WifiOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useClinical } from '../../context/ClinicalContext';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationBell } from '../notifications/NotificationBell';
import { MobileAppQrModal } from '../common';
import { APP_VERSION, APK_VERSION_NAME, checkNativeApkUpdate, forceAppUpdate } from '../../utils/appVersion';
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
  'admin-doctores': 'Gestión de Doctores',
  'admin-asistentes': 'Gestión de Asistentes',
  'admin-clinicas': 'Gestión de Clínicas',
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
  const {
    currentView,
    setCurrentView,
    selectedPatient,
    navigateToActiveConsultation,
    refreshClinicalData,
    currentDoctorHasAssistant,
    appointments,
  } = useClinical();
  const { callAssistantFromConsultorio, showToast } = useNotifications();
  const [showCallMenu, setShowCallMenu] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [updatingApp, setUpdatingApp] = useState(false);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleUpdateApp = async () => {
    setUpdatingApp(true);
    try {
      await Promise.all([forceAppUpdate(), refreshClinicalData()]);
      if (Capacitor.isNativePlatform()) {
        const apkUpdate = await checkNativeApkUpdate();
        if (apkUpdate.hasUpdate && apkUpdate.downloadUrl) {
          showToast(`Nueva versión v${apkUpdate.latestVersionName} disponible. Abriendo instalador...`);
          window.open(apkUpdate.downloadUrl, '_system');
          return;
        }
        showToast(`App y datos al día (v${APK_VERSION_NAME})`);
        return;
      }
      showToast(`Sistema y caché actualizados en segundo plano (v${APP_VERSION})`);
    } finally {
      setUpdatingApp(false);
    }
  };

  const waitingCount = appointments.filter(
    (a) => a.stage === 'en_sala' || a.stage === 'en_triaje'
  ).length;

  return (
    <header className="min-h-16 pt-[env(safe-area-inset-top)] bg-gradient-to-r from-[#0369A1] via-[#0284C7] to-[#0D9488] text-white border-b border-sky-900/20 shadow-md px-4 sm:px-6 py-2 flex items-center justify-between gap-3 shrink-0 no-print">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white cursor-pointer"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-white truncate">
            {userRole === 'ADMIN' && currentView === 'dashboard'
              ? 'Panel Administrativo'
              : VIEW_TITLES[currentView] || 'MediCare'}
          </h1>
          {userRole === 'ADMIN' ? (
            <p className="hidden sm:block text-[11px] text-sky-100 truncate">
              Gestión de Doctores, Asistentes, Clínicas y Tasa BCV
            </p>
          ) : (
            <p className="hidden sm:block text-[11px] text-sky-100 truncate">
              Paciente activo:{' '}
              <strong className="text-white">
                {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Sin paciente seleccionado'}
              </strong>
              {(userRole !== 'PEDIATRA' || currentDoctorHasAssistant) && (
                <> · En espera: {waitingCount}</>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {userRole === 'PEDIATRA' && currentDoctorHasAssistant && (
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
                        selectedPatient
                          ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                          : undefined
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

        {!isOnline && (
          <span
            className="px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold inline-flex items-center gap-1"
            title="Sin conexión Wi-Fi o datos móviles"
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sin conexión</span>
          </span>
        )}

        <button
          type="button"
          onClick={handleUpdateApp}
          disabled={updatingApp}
          className="px-2.5 py-2 rounded-xl border border-emerald-300/60 bg-emerald-500/25 hover:bg-emerald-500/35 text-white text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
          title={`Actualizar a la última versión (v${APP_VERSION})`}
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-200 ${updatingApp ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>

        <button
          type="button"
          onClick={() => setShowQrModal(true)}
          className="px-2.5 py-2 rounded-xl border border-white/25 bg-white/15 hover:bg-white/25 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          title="Abrir o instalar App Móvil por QR"
        >
          <QrCode className="w-4 h-4 text-sky-100" />
          <span className="hidden md:inline">App Móvil</span>
        </button>

        <NotificationBell onClick={onOpenNotifications} />

        {userRole === 'PEDIATRA' ? (
          <button
            type="button"
            onClick={() => {
              if (selectedPatient) {
                navigateToActiveConsultation(selectedPatient.id);
                return;
              }
              if (currentDoctorHasAssistant) {
                const nextApt =
                  appointments.find((a) => a.stage === 'en_consulta') ||
                  appointments.find((a) => a.stage === 'en_triaje') ||
                  appointments.find((a) => a.stage === 'en_sala');
                if (nextApt) {
                  navigateToActiveConsultation(nextApt.patientId);
                  return;
                }
              }
              setCurrentView('consulta-activa');
            }}
            className="hidden sm:flex px-3.5 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Ir a Consulta</span>
          </button>
        ) : userRole === 'ASISTENTE' ? (
          <button
            type="button"
            onClick={() => setCurrentView('sala-espera')}
            className="hidden sm:flex px-3.5 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Sala de Espera ({waitingCount})</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentView('admin-doctores')}
            className="hidden sm:flex px-3.5 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Gestionar Doctores</span>
          </button>
        )}
      </div>

      <MobileAppQrModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} />
    </header>
  );
};
