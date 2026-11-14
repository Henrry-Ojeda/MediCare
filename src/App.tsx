import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ClinicalProvider, useClinical } from './context/ClinicalContext';
import { AppLayout } from './components/layout/AppLayout';
import { TriageModal } from './modules/agenda';
import { ApplyVaccineDoseModal } from './modules/especialidades/pediatria';
import { RecipeDispatchModal } from './components/recipe/RecipeDispatchModal';
import { isViewEnabledInSprint } from './config/permissions.config';

// Auth Views
const LoginView = lazy(() => import('./modules/auth').then((m) => ({ default: m.LoginView })));
const RecoverPasswordView = lazy(() =>
  import('./modules/auth').then((m) => ({ default: m.RecoverPasswordView }))
);
const ResetPasswordView = lazy(() =>
  import('./modules/auth').then((m) => ({ default: m.ResetPasswordView }))
);
const OnboardingView = lazy(() =>
  import('./modules/auth').then((m) => ({ default: m.OnboardingView }))
);

// Sprint 1 Active Views
const DashboardView = lazy(() =>
  import('./modules/dashboard').then((m) => ({ default: m.DashboardView }))
);
const AgendaView = lazy(() => import('./modules/agenda').then((m) => ({ default: m.AgendaView })));
const WaitingRoomView = lazy(() =>
  import('./modules/agenda').then((m) => ({ default: m.WaitingRoomView }))
);
const PatientDirectoryView = lazy(() =>
  import('./modules/pacientes').then((m) => ({ default: m.PatientDirectoryView }))
);
const NewPatientView = lazy(() =>
  import('./modules/pacientes').then((m) => ({ default: m.NewPatientView }))
);
const PediatricHistoryView = lazy(() =>
  import('./modules/especialidades/pediatria').then((m) => ({ default: m.PediatricHistoryView }))
);
const PediatricConsultationView = lazy(() =>
  import('./modules/especialidades/pediatria').then((m) => ({ default: m.PediatricConsultationView }))
);
const VaccinationCardView = lazy(() =>
  import('./modules/especialidades/pediatria').then((m) => ({ default: m.VaccinationCardView }))
);
const VaccineCatalogView = lazy(() =>
  import('./modules/especialidades/pediatria').then((m) => ({ default: m.VaccineCatalogView }))
);
const DoctorSignatureView = lazy(() =>
  import('./modules/firma-y-config').then((m) => ({ default: m.DoctorSignatureView }))
);
const ClinicSettingsView = lazy(() =>
  import('./modules/firma-y-config').then((m) => ({ default: m.ClinicSettingsView }))
);

// Sprint 2 Hidden Views (conservadas y listas para habilitar por featureFlags)
const RecipeTemplateDesignerView = lazy(() =>
  import('./modules/firma-y-config').then((m) => ({ default: m.RecipeTemplateDesignerView }))
);
const CashbookView = lazy(() =>
  import('./modules/finanzas').then((m) => ({ default: m.CashbookView }))
);
const MedicalReceiptsView = lazy(() =>
  import('./modules/finanzas').then((m) => ({ default: m.MedicalReceiptsView }))
);
const SaasSubscriptionView = lazy(() =>
  import('./modules/suscripcion-saas').then((m) => ({ default: m.SaasSubscriptionView }))
);
const AnalyticsDashboardView = lazy(() =>
  import('./modules/reportes-y-auditoria').then((m) => ({ default: m.AnalyticsDashboardView }))
);
const EpidemiologyReportView = lazy(() =>
  import('./modules/reportes-y-auditoria').then((m) => ({ default: m.EpidemiologyReportView }))
);
const AuditLogView = lazy(() =>
  import('./modules/reportes-y-auditoria').then((m) => ({ default: m.AuditLogView }))
);

const ViewLoadingFallback: React.FC = () => (
  <div className="min-h-[320px] flex flex-col items-center justify-center gap-3 text-slate-500">
    <div className="w-8 h-8 rounded-full border-2 border-sky-600 border-t-transparent animate-spin" />
    <span className="text-xs font-medium">Cargando módulo clínico...</span>
  </div>
);

const AuthenticatedRouter: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { currentView, setCurrentView } = useClinical();

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        {currentView === 'recuperar-password' ? (
          <RecoverPasswordView />
        ) : currentView === 'reset-password' ? (
          <ResetPasswordView />
        ) : (
          <LoginView />
        )}
      </Suspense>
    );
  }

  const renderActiveView = () => {
    if (!isViewEnabledInSprint(currentView) && currentView !== 'dashboard') {
      return <DashboardView />;
    }

    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'agenda':
        return <AgendaView />;
      case 'sala-espera':
        return <WaitingRoomView />;
      case 'pacientes':
        return <PatientDirectoryView />;
      case 'paciente-nuevo':
        return <NewPatientView />;
      case 'paciente-detalle':
        return <PediatricHistoryView />;
      case 'consulta-activa':
        return <PediatricConsultationView />;
      case 'vacunas-carnet':
        return <VaccinationCardView />;
      case 'vacunas-catalogo':
        return <VaccineCatalogView />;
      case 'firma-medico':
      case 'perfil':
        return <DoctorSignatureView />;
      case 'configuracion':
      case 'admin-usuarios':
        return <ClinicSettingsView />;
      case 'plantillas':
        return <RecipeTemplateDesignerView />;
      case 'caja':
        return <CashbookView />;
      case 'caja-recibos':
        return <MedicalReceiptsView />;
      case 'suscripcion':
        return <SaasSubscriptionView />;
      case 'reportes':
        return <AnalyticsDashboardView />;
      case 'epidemiologia':
        return <EpidemiologyReportView />;
      case 'auditoria':
        return <AuditLogView />;
      case 'onboarding':
        return <OnboardingView />;
      default:
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <p className="text-sm text-slate-600">Vista no disponible en este Sprint.</p>
            <button
              type="button"
              onClick={() => setCurrentView('dashboard')}
              className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold"
            >
              Volver al Inicio
            </button>
          </div>
        );
    }
  };

  return (
    <AppLayout>
      <Suspense fallback={<ViewLoadingFallback />}>{renderActiveView()}</Suspense>
      <TriageModal />
      <ApplyVaccineDoseModal />
      <RecipeDispatchModal />
    </AppLayout>
  );
};

export function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ClinicalProvider>
          <AuthenticatedRouter />
        </ClinicalProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
