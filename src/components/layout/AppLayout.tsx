import React, { useState } from 'react';
import {
  Calendar,
  Users,
  Stethoscope,
  Syringe,
  Wallet,
  BarChart3,
  Settings,
  ShieldCheck,
  Sparkles,
  LogOut,
  ChevronRight,
  Compass,
  FileText,
  Receipt,
  Activity,
  UserCircle,
  Layers,
  CreditCard,
  CheckCircle2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMedical } from '../../context/MedicalContext';
import { Specialty, ViewId } from '../../types/medical';
import { ASSETS } from '../../data/mockClinicalData';
import { SPECIALTY_REGISTRY, getSpecialtyConfig } from '../../config/specialties';

export const ALL_24_VIEWS_CATALOG: {
  number: number;
  title: string;
  routeLabel: string;
  moduleName: string;
  viewId?: ViewId;
  modalAction?: 'triage' | 'vaccine' | 'dispatch';
}[] = [
  { number: 1, title: 'Login Multi-Tenant', routeLabel: '/login', moduleName: 'Módulo 1: Auth & Seguridad', viewId: 'login' },
  { number: 2, title: 'Recuperación de Contraseña', routeLabel: '/recuperar-password', moduleName: 'Módulo 1: Auth & Seguridad', viewId: 'recuperar-password' },
  { number: 3, title: 'Restablecer Contraseña', routeLabel: '/reset-password', moduleName: 'Módulo 1: Auth & Seguridad', viewId: 'reset-password' },
  { number: 4, title: 'Onboarding y Setup Inicial (4 Pasos)', routeLabel: '/onboarding', moduleName: 'Módulo 1: Auth & Seguridad', viewId: 'onboarding' },
  { number: 5, title: 'Perfil del Médico y Ajustes de Cuenta', routeLabel: '/perfil', moduleName: 'Módulo 1: Auth & Seguridad', viewId: 'perfil' },
  { number: 6, title: 'Registro de Auditoría y Seguridad JSON', routeLabel: '/seguridad/auditoria', moduleName: 'Módulo 1: Auth & Seguridad', viewId: 'auditoria' },
  { number: 7, title: 'Agenda Médica y Calendario Interactivo', routeLabel: '/agenda', moduleName: 'Módulo 2: Agenda y Sala de Espera', viewId: 'agenda' },
  { number: 8, title: 'Sala de Espera Virtual / Kanban Triaje', routeLabel: '/sala-espera', moduleName: 'Módulo 2: Agenda y Sala de Espera', viewId: 'sala-espera' },
  { number: 9, title: 'Modal de Triaje Rápido de la Asistente', routeLabel: 'Modal /sala-espera', moduleName: 'Módulo 2: Agenda y Sala de Espera', modalAction: 'triage' },
  { number: 10, title: 'Directorio General de Pacientes', routeLabel: '/pacientes', moduleName: 'Módulo 3: Directorio de Pacientes', viewId: 'pacientes' },
  { number: 11, title: 'Ficha Integral del Paciente 360° + OMS', routeLabel: '/pacientes/:id', moduleName: 'Módulo 3: Directorio de Pacientes', viewId: 'paciente-detalle' },
  { number: 12, title: 'Formulario Registro de Nuevo Paciente', routeLabel: '/pacientes/nuevo', moduleName: 'Módulo 3: Directorio de Pacientes', viewId: 'paciente-nuevo' },
  { number: 13, title: 'Carnet Digital de Vacunación Interactivo', routeLabel: '/pacientes/:id/vacunas', moduleName: 'Módulo 4: Vacunación Pediátrica', viewId: 'vacunas-carnet' },
  { number: 14, title: 'Modal de Aplicación Rápida de Dosis', routeLabel: 'Modal /vacunas', moduleName: 'Módulo 4: Vacunación Pediátrica', modalAction: 'vaccine' },
  { number: 15, title: 'Catálogo Maestro de Vacunas', routeLabel: '/configuracion/vacunas', moduleName: 'Módulo 4: Vacunación Pediátrica', viewId: 'vacunas-catalogo' },
  { number: 16, title: 'Puesto de Consulta Médica Activa con IA', routeLabel: '/consulta/:id', moduleName: 'Módulo 5: Consulta Activa con IA', viewId: 'consulta-activa' },
  { number: 17, title: 'Modal Previsualización y Despacho PDF', routeLabel: 'Modal /consulta/:id', moduleName: 'Módulo 5: Consulta Activa con IA', modalAction: 'dispatch' },
  { number: 18, title: 'Cuaderno de Caja y Cobros del Día (BCV)', routeLabel: '/caja', moduleName: 'Módulo 6: Caja y Facturación', viewId: 'caja' },
  { number: 19, title: 'Emisión y Control de Recibos para Seguros', routeLabel: '/caja/recibos', moduleName: 'Módulo 6: Caja y Facturación', viewId: 'caja-recibos' },
  { number: 20, title: 'Dashboard Estadístico del Consultorio', routeLabel: '/reportes', moduleName: 'Módulo 7: Reportes y Epidemiología', viewId: 'reportes' },
  { number: 21, title: 'Reporte Epidemiológico CIE-10 MPPS', routeLabel: '/reportes/epidemiologia', moduleName: 'Módulo 7: Reportes y Epidemiología', viewId: 'epidemiologia' },
  { number: 22, title: 'Ajustes de la Clínica / Config Tenant', routeLabel: '/configuracion', moduleName: 'Módulo 8: Configuración y SaaS', viewId: 'configuracion' },
  { number: 23, title: 'Diseñador WYSIWYG de Plantillas Récipe', routeLabel: '/configuracion/plantillas', moduleName: 'Módulo 8: Configuración y SaaS', viewId: 'plantillas' },
  { number: 24, title: 'Mi Suscripción SaaS y Consumo del Plan', routeLabel: '/configuracion/suscripcion', moduleName: 'Módulo 8: Configuración y SaaS', viewId: 'suscripcion' },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentView,
    setCurrentView,
    setIsAuthenticated,
    currentUser,
    logout,
    selectedPatient,
    appointments,
    tenantConfig,
    openTriageModal,
    openVaccineModal,
    openDispatchModal,
    toastMessage,
    activeDoctorSpecialty,
    setActiveDoctorSpecialty,
    doctors,
    isAssistant,
    isAdmin,
    activeAssistantProfile,
    activeManagedDoctorId,
    setActiveManagedDoctorId,
  } = useMedical();

  const specialtyConfig = getSpecialtyConfig(activeDoctorSpecialty);

  const [showViewExplorer, setShowViewExplorer] = useState(false);

  const isPublicAuthView =
    currentView === 'login' ||
    currentView === 'recuperar-password' ||
    currentView === 'reset-password' ||
    currentView === 'onboarding';

  const triggerCatalogItem = (item: (typeof ALL_24_VIEWS_CATALOG)[number]) => {
    setShowViewExplorer(false);
    if (item.viewId) {
      if (item.number >= 5) setIsAuthenticated(true);
      setCurrentView(item.viewId);
      return;
    }
    setIsAuthenticated(true);
    if (item.modalAction === 'triage') {
      setCurrentView('sala-espera');
      openTriageModal(appointments[0]);
    } else if (item.modalAction === 'vaccine') {
      setCurrentView('vacunas-carnet');
      const targetDose =
        selectedPatient.vaccines.find((v) => v.status === 'pendiente') || selectedPatient.vaccines[0];
      if (targetDose) openVaccineModal(selectedPatient.id, targetDose);
    } else if (item.modalAction === 'dispatch') {
      setCurrentView('consulta-activa');
      const sampleConsultation = selectedPatient.consultations[0] || {
        id: 'cons-demo-17',
        date: '2026-11-09',
        specialty: selectedPatient.primarySpecialty,
        doctorName: 'Dra. Valeria Méndez',
        reason: 'Fiebre aguda y odinofagia de 36 horas de evolución.',
        cie10Code: 'J03.9',
        cie10Name: 'Amigdalitis aguda estreptocócica',
        weightKg: selectedPatient.latestVitals?.weightKg || 15.4,
        heightCm: selectedPatient.latestVitals?.heightCm || 98.5,
        temperatureC: 38.6,
        bloodPressure: '94/60 mmHg',
        physicalExamSummary: 'Orofaringe congestiva con exudado amigdalino bilateral. Cardiopulmonar normal.',
        prescriptions: [
          {
            id: 'rx-demo-1',
            medicationName: 'Azitromicina Suspensión 200 mg / 5 ml',
            presentation: 'Frasco 15 ml',
            dosePerTake: '3.9 ml (154 mg)',
            frequencyHours: 'Cada 24 horas',
            durationDays: '3 días',
            specialInstructions: 'Administrar 1 hora antes del almuerzo.',
          },
          {
            id: 'rx-demo-2',
            medicationName: 'Ibuprofeno Pediátrico 100 mg / 5 ml',
            presentation: 'Frasco 120 ml',
            dosePerTake: '6.2 ml (123 mg)',
            frequencyHours: 'Cada 8 horas si hay fiebre',
            durationDays: '4 días',
            specialInstructions: 'Dar con alimentos si la temperatura supera 38.3 °C.',
          },
        ],
        parentGuide:
          'Mantener hidratación fraccionada constante con agua y suero oral frío. Ofrecer alimentos blandos y tibios. Lavar manos frecuentemente.',
        alarmSigns: [
          'Fiebre mayor a 39.0 °C que no desciende a los 60 minutos del antipirético',
          'Dificultad respiratoria o hundimiento de las costillas',
          'Rechazo absoluto a líquidos o vómitos persistentes',
        ],
      };
      openDispatchModal(selectedPatient, sampleConsultation);
    }
  };

  const currentViewMeta =
    ALL_24_VIEWS_CATALOG.find((v) => v.viewId === currentView) || ALL_24_VIEWS_CATALOG[0];

  if (isPublicAuthView) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] relative">
        {/* Floating Quick Switcher so reviewer can jump across all 24 views even from Auth screens */}
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 no-print">
          <button
            onClick={() => setShowViewExplorer(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-md hover:bg-slate-800 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4 text-sky-400" />
            <span>Mapa de las 24 Vistas (Vista {currentViewMeta.number}/24)</span>
          </button>
        </div>

        {children}

        {/* Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-5 left-5 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-md text-xs font-medium"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 24-View Explorer Modal */}
        <AnimatePresence>
          {showViewExplorer && (
            <ViewExplorerModal
              currentView={currentView}
              onSelect={triggerCatalogItem}
              onClose={() => setShowViewExplorer(false)}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  const sidebarSections: {
    label: string;
    items: {
      id: ViewId;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      viewNum: number;
      isAi?: boolean;
    }[];
  }[] = [
    {
      label: 'Agenda y Recepción',
      items: [
        { id: 'agenda' as ViewId, label: 'Agenda Interactiva', icon: Calendar, viewNum: 7 },
        { id: 'sala-espera' as ViewId, label: 'Sala de Espera Kanban', icon: Activity, viewNum: 8 },
      ],
    },
    {
      label: 'Pacientes y Vacunación',
      items: [
        { id: 'pacientes' as ViewId, label: 'Directorio de Pacientes', icon: Users, viewNum: 10 },
        { id: 'paciente-detalle' as ViewId, label: 'Expediente 360° & OMS', icon: FileText, viewNum: 11 },
        { id: 'vacunas-carnet' as ViewId, label: 'Carnet de Vacunación', icon: Syringe, viewNum: 13 },
      ],
    },
    {
      label: 'Workspace Clínico IA',
      items: [
        { id: 'consulta-activa' as ViewId, label: 'Consulta Activa + IA', icon: Sparkles, viewNum: 16, isAi: true },
      ],
    },
    {
      label: 'Finanzas y Analítica',
      items: [
        { id: 'caja' as ViewId, label: 'Cuaderno de Caja BCV', icon: Wallet, viewNum: 18 },
        { id: 'caja-recibos' as ViewId, label: 'Recibos para Seguros', icon: Receipt, viewNum: 19 },
        { id: 'reportes' as ViewId, label: 'Dashboard Estadístico', icon: BarChart3, viewNum: 20 },
        { id: 'epidemiologia' as ViewId, label: 'Epidemiología CIE-10', icon: Layers, viewNum: 21 },
      ],
    },
    {
      label: 'Configuración y Seguridad',
      items: [
        { id: 'vacunas-catalogo' as ViewId, label: 'Catálogo de Vacunas', icon: Syringe, viewNum: 15 },
        { id: 'configuracion' as ViewId, label: 'Ajustes de la Clínica', icon: Settings, viewNum: 22 },
        { id: 'plantillas' as ViewId, label: 'Diseñador de Récipe', icon: FileText, viewNum: 23 },
        { id: 'suscripcion' as ViewId, label: 'Suscripción y Plan IA', icon: CreditCard, viewNum: 24 },
        { id: 'perfil' as ViewId, label: 'Perfil y Firma Médica', icon: UserCircle, viewNum: 5 },
        { id: 'auditoria' as ViewId, label: 'Auditoría y Seguridad', icon: ShieldCheck, viewNum: 6 },
      ],
    },
  ];

  const assistantAllowedViews: ViewId[] = activeAssistantProfile?.allowedViews || [
    'agenda',
    'sala-espera',
    'pacientes',
    'paciente-nuevo',
    'caja',
    'perfil',
  ];

  const visibleSidebarSections = isAssistant
    ? sidebarSections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) => assistantAllowedViews.includes(item.id) || item.id === 'perfil'
          ),
        }))
        .filter((section) => section.items.length > 0)
    : isAdmin
      ? sidebarSections
          .map((section) => ({
            ...section,
            items: section.items.filter((item) => item.id !== 'consulta-activa'),
          }))
          .filter((section) => section.items.length > 0)
      : sidebarSections;

  const isViewBlockedForAssistant =
    isAssistant && currentView !== 'perfil' && !assistantAllowedViews.includes(currentView);
  const isViewBlockedForAdmin = isAdmin && currentView === 'consulta-activa';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex">
      {/* Sidebar Navigation (264px fixed desktop width) */}
      <aside className="w-[264px] bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 select-none no-print">
        <div>
          {/* Brand Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200/70">
            <button
              onClick={() => setCurrentView('consulta-activa')}
              className="flex items-center gap-2.5 text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-[#0284C7] flex items-center justify-center text-white font-bold text-sm shadow-xs">
                M
              </div>
              <span className="font-bold text-base tracking-tight text-slate-900 whitespace-nowrap">
                MedCore AI
              </span>
            </button>
            {!isAssistant && (
              <button
                onClick={() => setShowViewExplorer(true)}
                title="Explorar las 24 vistas del sistema"
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-semibold transition-colors cursor-pointer"
              >
                {currentViewMeta.number}/24
              </button>
            )}
          </div>

          {/* Navigation Groups */}
          <div className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-148px)]">
            {visibleSidebarSections.map((group) => (
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
                        onClick={() => setCurrentView(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          active
                            ? item.isAi
                              ? 'bg-[#7C3AED] text-white shadow-xs'
                              : 'bg-[#0284C7] text-white shadow-xs'
                            : item.isAi
                            ? 'bg-[#F5F3FF] text-[#7C3AED] hover:bg-violet-100'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 truncate">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <span
                          className={`text-[10px] font-mono tabular-nums ${
                            active ? 'text-white/80' : 'text-slate-400'
                          }`}
                        >
                          V{item.viewNum}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Doctor Account Card Footer */}
        <div className="p-3 border-t border-slate-200/70 bg-slate-50/50">
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <button
              onClick={() => setCurrentView('perfil')}
              className="flex items-center gap-2.5 text-left min-w-0 cursor-pointer"
            >
              <img
                src={ASSETS.doctorAvatar}
                alt="Dra. Valeria Méndez"
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {currentUser?.name || 'Dra. Valeria Méndez'}
                  </p>
                  {(currentUser?.esSuperAdmin || currentUser?.roleCode === 'SUPERADMIN') && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-800 shrink-0">
                      SUPERADMIN
                    </span>
                  )}
                  {!currentUser?.esSuperAdmin && currentUser?.roleCode === 'ADMIN' && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-sky-100 text-sky-800 shrink-0">
                      ADMIN
                    </span>
                  )}
                  {currentUser?.roleCode === 'ASISTENTE' && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-violet-100 text-violet-800 shrink-0">
                      ASISTENTE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {currentUser?.roleName || `${activeDoctorSpecialty} · MPPS 68412`}
                </p>
              </div>
            </button>
            <button
              onClick={logout}
              title="Cerrar sesión (Ir a Vista 1 Login)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Strict 3-Zone Top Bar Contract */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between gap-8 shrink-0 no-print">
          {/* Zone 1: Contextual Breadcrumb */}
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 whitespace-nowrap shrink-0">
            <span className="text-slate-400">{currentViewMeta.moduleName}</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <span className="font-semibold text-slate-900">
              Vista {currentViewMeta.number}: {currentViewMeta.title}
            </span>
          </div>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden xl:flex items-center gap-6 text-xs font-medium text-slate-600">
            {!isAssistant && (
              <button
                onClick={() => setShowViewExplorer(true)}
                className="hover:text-[#0284C7] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Explorar 24 Vistas
              </button>
            )}
            {(!isAssistant || assistantAllowedViews.includes('sala-espera')) && (
              <button
                onClick={() => setCurrentView('sala-espera')}
                className="hover:text-[#0284C7] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sala de Espera ({appointments.filter((a) => a.stage !== 'completado').length})
              </button>
            )}
            {(!isAssistant || assistantAllowedViews.includes('paciente-detalle')) && (
              <button
                onClick={() => setCurrentView('paciente-detalle')}
                className="hover:text-[#0284C7] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Paciente: {selectedPatient.firstName}
              </button>
            )}
            {(!isAssistant || assistantAllowedViews.includes('caja')) && (
              <button
                onClick={() => setCurrentView('caja')}
                className="hover:text-[#0284C7] transition-colors whitespace-nowrap shrink-0 font-mono tabular-nums cursor-pointer"
              >
                BCV: Bs. {tenantConfig.bcvRate.toFixed(2)}
              </button>
            )}
          </nav>

          {/* Zone 3: Global Specialty / Managed Doctor Context + 1 Primary Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            {isAssistant ? (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-200">
                <span className="text-[11px] font-bold text-violet-700">Médico:</span>
                <select
                  value={activeManagedDoctorId}
                  onChange={(e) => setActiveManagedDoctorId(e.target.value)}
                  aria-label="Médico gestionado por la asistente"
                  className="text-xs font-semibold text-violet-950 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="ALL">
                    Todos mis médicos ({activeAssistantProfile?.assignedDoctorIds.length ?? doctors.length})
                  </option>
                  {doctors
                    .filter(
                      (doc) =>
                        !activeAssistantProfile ||
                        activeAssistantProfile.assignedDoctorIds.includes(doc.id)
                    )
                    .map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} ({doc.specialty})
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: specialtyConfig.accentColor }}
                />
                <select
                  value={activeDoctorSpecialty}
                  onChange={(e) => setActiveDoctorSpecialty(e.target.value as Specialty)}
                  aria-label="Especialidad activa del médico"
                  className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                >
                  {(Object.keys(SPECIALTY_REGISTRY) as Specialty[]).map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {isAssistant ? (
              <button
                onClick={() => setCurrentView('agenda')}
                className="px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold flex items-center gap-2 shadow-xs hover:-translate-y-0.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Mi Agenda</span>
              </button>
            ) : isAdmin ? (
              <button
                onClick={() => setCurrentView('reportes')}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs hover:-translate-y-0.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Dashboard Gerencial</span>
              </button>
            ) : (
              <button
                onClick={() => setCurrentView('consulta-activa')}
                className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold flex items-center gap-2 shadow-xs hover:-translate-y-0.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Puesto de Consulta IA</span>
              </button>
            )}
          </div>
        </header>

        {/* Active View Viewport */}
        <main className="flex-1 p-6 overflow-y-auto">
          {isViewBlockedForAssistant ? (
            <div className="max-w-lg mx-auto mt-12 bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Vista Restringida para Asistente</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Esta sección es exclusiva del médico o requiere autorización explícita en{' '}
                <strong>Configuración → Asistentes</strong> (ej. Consulta Activa + IA y Epidemiología CIE-10 no están habilitadas para asistentes).
              </p>
              <button
                onClick={() => setCurrentView('agenda')}
                className="px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold cursor-pointer"
              >
                Volver a Mi Agenda
              </button>
            </div>
          ) : isViewBlockedForAdmin ? (
            <div className="max-w-lg mx-auto mt-12 bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Acto Médico Exclusivo del Doctor</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                El rol <strong>ADMIN</strong> gestiona finanzas, reportes, configuración y personal, pero no puede iniciar consultas médicas ni agendar sin autorización del doctor.
              </p>
              <button
                onClick={() => setCurrentView('reportes')}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Ir al Dashboard Gerencial
              </button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-md text-xs font-medium no-print"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 24-View Interactive Directory Modal */}
      <AnimatePresence>
        {showViewExplorer && (
          <ViewExplorerModal
            currentView={currentView}
            onSelect={triggerCatalogItem}
            onClose={() => setShowViewExplorer(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ViewExplorerModal: React.FC<{
  currentView: ViewId;
  onSelect: (item: (typeof ALL_24_VIEWS_CATALOG)[number]) => void;
  onClose: () => void;
}> = ({ currentView, onSelect, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-5xl w-full max-h-[88vh] flex flex-col overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Arquitectura Completa del Sistema — Las 24 Vistas Operativas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Selecciona cualquier vista o modal para inspeccionar su interfaz y flujos interactivos al instante.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ALL_24_VIEWS_CATALOG.map((item) => {
            const isCurrent = item.viewId === currentView;
            return (
              <button
                key={item.number}
                onClick={() => onSelect(item)}
                className={`text-left p-3.5 rounded-xl border transition-all hover:-translate-y-0.5 cursor-pointer ${
                  isCurrent
                    ? 'border-[#0284C7] bg-[#F0F9FF]/70 shadow-xs'
                    : 'border-slate-200/80 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums mb-1">
                  <span>VISTA {String(item.number).padStart(2, '0')}</span>
                  <span>{item.routeLabel}</span>
                </div>
                <p className="text-xs font-bold text-slate-900 truncate">{item.title}</p>
                <p className="text-[11px] text-slate-500 mt-1 truncate">{item.moduleName}</p>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
