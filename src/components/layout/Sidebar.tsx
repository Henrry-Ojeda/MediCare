import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Activity,
  Users,
  FileText,
  Syringe,
  Sparkles,
  FileSignature,
  Settings,
  LogOut,
  X,
  Wallet,
  CreditCard,
  BarChart3,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { ViewId } from '../../types/medical';
import { UserRole } from '../../types/auth.types';
import { canRoleAccessView } from '../../config/permissions.config';
import { useAuth } from '../../context/AuthContext';
import { useClinical } from '../../context/ClinicalContext';
import { ASSETS } from '../../data/mockClinicalData';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: ViewId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  highlightAi?: boolean;
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'agenda', label: 'Agenda Médica', icon: Calendar },
      { id: 'sala-espera', label: 'Sala de Espera', icon: Activity },
    ],
  },
  {
    label: 'Pacientes y Pediatría',
    items: [
      { id: 'pacientes', label: 'Pacientes', icon: Users },
    ],
  },
  {
    label: 'Gestión y Firma',
    items: [
      { id: 'vacunas-catalogo', label: 'Catálogo Vacunas', icon: Syringe },
      { id: 'firma-medico', label: 'Firma del Médico', icon: FileSignature },
      { id: 'plantillas', label: 'Personalizar Récipe', icon: FileText },
      { id: 'admin-doctores', label: 'Doctores', icon: Users },
      { id: 'admin-asistentes', label: 'Asistentes', icon: Users },
      { id: 'admin-clinicas', label: 'Clínicas', icon: Building2 },
      { id: 'configuracion', label: 'Clínica y Roles', icon: Settings },
      { id: 'perfil', label: 'Mi Perfil', icon: ShieldCheck },
    ],
  },
  {
    label: 'Sprint 2 (Oculto)',
    items: [
      { id: 'caja', label: 'Caja y Pagos', icon: Wallet },
      { id: 'suscripcion', label: 'Suscripción SaaS', icon: CreditCard },
      { id: 'reportes', label: 'Reportes Avanzados', icon: BarChart3 },
      { id: 'auditoria', label: 'Auditoría', icon: ShieldCheck },
    ],
  },
];

const ROLE_BADGE_STYLE: Record<UserRole, { label: string; className: string }> = {
  PEDIATRA: { label: 'PEDIATRA', className: 'bg-sky-100 text-sky-800' },
  ASISTENTE: { label: 'ASISTENTE', className: 'bg-violet-100 text-violet-800' },
  ADMIN: { label: 'ADMIN', className: 'bg-amber-100 text-amber-800' },
};

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { currentUser, userRole, logout } = useAuth();
  const { currentView, setCurrentView, currentDoctorHasAssistant } = useClinical();

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!canRoleAccessView(userRole, item.id)) return false;
      if (item.id === 'sala-espera' && userRole === 'PEDIATRA' && !currentDoctorHasAssistant) {
        return false;
      }
      return true;
    }),
  })).filter((section) => section.items.length > 0);

  const handleNavigate = (viewId: ViewId) => {
    setCurrentView(viewId);
    onCloseMobile();
  };

  const badge = ROLE_BADGE_STYLE[userRole];

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full bg-white border-r border-slate-200/80 select-none">
      <div>
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200/70">
          <button
            type="button"
            onClick={() => handleNavigate('dashboard')}
            className="flex items-center gap-2.5 text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-[#0284C7] flex items-center justify-center text-white font-bold text-sm shadow-xs">
              M
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 block leading-none">
                MediCare
              </span>
              <span className="text-[10px] font-semibold text-[#0284C7]">Pediatría</span>
            </div>
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-144px)]">
          {visibleSections.map((group) => (
            <div key={group.label}>
              <div className="px-3 mb-1.5 text-[11px] font-semibold text-slate-400 tracking-tight">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? item.highlightAi
                            ? 'bg-[#7C3AED] text-white shadow-xs'
                            : 'bg-[#0284C7] text-white shadow-xs'
                          : item.highlightAi
                            ? 'bg-[#F5F3FF] text-[#7C3AED] hover:bg-violet-100'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-slate-200/70 bg-slate-50/50">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <button
            type="button"
            onClick={() => handleNavigate(userRole === 'PEDIATRA' ? 'firma-medico' : 'dashboard')}
            className="flex items-center gap-2.5 text-left min-w-0 cursor-pointer"
          >
            <img
              src={ASSETS.doctorAvatar}
              alt={currentUser?.name || 'Usuario'}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {currentUser?.name || 'Usuario'}
                </p>
                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded shrink-0 ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {currentUser?.roleName || 'Pediatría'}
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={logout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block w-[256px] shrink-0 no-print">{sidebarContent}</aside>

      {/* Mobile / Tablet drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 w-[272px] max-w-[85vw] h-full">{sidebarContent}</aside>
        </div>
      )}
    </>
  );
};
