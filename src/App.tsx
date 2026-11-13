/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { MedicalProvider, useMedical } from './context/MedicalContext';
import { AppLayout } from './components/layout/AppLayout';
import { ClinicalModals } from './components/modals/ClinicalModals';

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
const DoctorProfileView = lazy(() =>
  import('./modules/auth').then((m) => ({ default: m.DoctorProfileView }))
);
const AuditLogView = lazy(() =>
  import('./modules/auth').then((m) => ({ default: m.AuditLogView }))
);

const MedicalAgendaView = lazy(() =>
  import('./modules/agenda').then((m) => ({ default: m.MedicalAgendaView }))
);
const WaitingRoomKanbanView = lazy(() =>
  import('./modules/agenda').then((m) => ({ default: m.WaitingRoomKanbanView }))
);

const PatientDirectoryView = lazy(() =>
  import('./modules/pacientes').then((m) => ({ default: m.PatientDirectoryView }))
);
const Patient360View = lazy(() =>
  import('./modules/pacientes').then((m) => ({ default: m.Patient360View }))
);
const NewPatientFormView = lazy(() =>
  import('./modules/pacientes').then((m) => ({ default: m.NewPatientFormView }))
);

const VaccinationCardView = lazy(() =>
  import('./modules/vacunacion').then((m) => ({ default: m.VaccinationCardView }))
);
const MasterVaccineCatalogView = lazy(() =>
  import('./modules/vacunacion').then((m) => ({ default: m.MasterVaccineCatalogView }))
);

const ActiveConsultationView = lazy(() =>
  import('./modules/consulta').then((m) => ({ default: m.ActiveConsultationView }))
);

const CashbookView = lazy(() =>
  import('./modules/finanzas').then((m) => ({ default: m.CashbookView }))
);
const MedicalReceiptsView = lazy(() =>
  import('./modules/finanzas').then((m) => ({ default: m.MedicalReceiptsView }))
);

const AnalyticsDashboardView = lazy(() =>
  import('./modules/reportes').then((m) => ({ default: m.AnalyticsDashboardView }))
);
const EpidemiologyReportView = lazy(() =>
  import('./modules/reportes').then((m) => ({ default: m.EpidemiologyReportView }))
);

const ClinicSettingsView = lazy(() =>
  import('./modules/configuracion').then((m) => ({ default: m.ClinicSettingsView }))
);
const RecipeTemplateDesignerView = lazy(() =>
  import('./modules/configuracion').then((m) => ({ default: m.RecipeTemplateDesignerView }))
);
const SaasSubscriptionView = lazy(() =>
  import('./modules/configuracion').then((m) => ({ default: m.SaasSubscriptionView }))
);

const ViewRouter: React.FC = () => {
  const { currentView } = useMedical();

  switch (currentView) {
    case 'login':
      return <LoginView />;
    case 'recuperar-password':
      return <RecoverPasswordView />;
    case 'reset-password':
      return <ResetPasswordView />;
    case 'onboarding':
      return <OnboardingView />;
    case 'perfil':
      return <DoctorProfileView />;
    case 'auditoria':
      return <AuditLogView />;

    case 'agenda':
      return <MedicalAgendaView />;
    case 'sala-espera':
      return <WaitingRoomKanbanView />;

    case 'pacientes':
      return <PatientDirectoryView />;
    case 'paciente-detalle':
      return <Patient360View />;
    case 'paciente-nuevo':
      return <NewPatientFormView />;

    case 'vacunas-carnet':
      return <VaccinationCardView />;
    case 'vacunas-catalogo':
      return <MasterVaccineCatalogView />;

    case 'consulta-activa':
      return <ActiveConsultationView />;

    case 'caja':
      return <CashbookView />;
    case 'caja-recibos':
      return <MedicalReceiptsView />;

    case 'reportes':
      return <AnalyticsDashboardView />;
    case 'epidemiologia':
      return <EpidemiologyReportView />;

    case 'configuracion':
      return <ClinicSettingsView />;
    case 'plantillas':
      return <RecipeTemplateDesignerView />;
    case 'suscripcion':
      return <SaasSubscriptionView />;

    default:
      return <ActiveConsultationView />;
  }
};

export default function App() {
  return (
    <MedicalProvider>
      <AppLayout>
        <Suspense
          fallback={
            <div className="p-8 text-center text-xs font-semibold text-slate-400">
              Cargando módulo clínico...
            </div>
          }
        >
          <ViewRouter />
        </Suspense>
        <ClinicalModals />
      </AppLayout>
    </MedicalProvider>
  );
}
