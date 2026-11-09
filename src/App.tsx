/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MedicalProvider, useMedical } from './context/MedicalContext';
import { AppLayout } from './components/layout/AppLayout';
import { ClinicalModals } from './components/modals/ClinicalModals';
import {
  LoginView,
  RecoverPasswordView,
  ResetPasswordView,
  OnboardingView,
  DoctorProfileView,
  AuditLogView,
} from './views/AuthAndSecurityViews';
import {
  MedicalAgendaView,
  WaitingRoomKanbanView,
} from './views/AgendaAndWaitingRoomViews';
import {
  PatientDirectoryView,
  Patient360View,
  NewPatientFormView,
  VaccinationCardView,
  MasterVaccineCatalogView,
} from './views/PatientsAndVaccinesViews';
import { ActiveConsultationView } from './views/ActiveConsultationView';
import {
  CashbookView,
  MedicalReceiptsView,
  AnalyticsDashboardView,
  EpidemiologyReportView,
} from './views/FinanceAndReportsViews';
import {
  ClinicSettingsView,
  RecipeTemplateDesignerView,
  SaasSubscriptionView,
} from './views/SettingsAndSubscriptionViews';

const ViewRouter: React.FC = () => {
  const { currentView } = useMedical();

  switch (currentView) {
    // Módulo 1: Autenticación, Onboarding y Seguridad (Vistas 1 a 6)
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

    // Módulo 2: Agenda, Recepción y Sala de Espera (Vistas 7 a 9)
    case 'agenda':
      return <MedicalAgendaView />;
    case 'sala-espera':
      return <WaitingRoomKanbanView />;

    // Módulo 3: Directorio Integral de Pacientes (Vistas 10 a 12)
    case 'pacientes':
      return <PatientDirectoryView />;
    case 'paciente-detalle':
      return <Patient360View />;
    case 'paciente-nuevo':
      return <NewPatientFormView />;

    // Módulo 4: Vacunación Pediátrica y Preventiva (Vistas 13 a 15)
    case 'vacunas-carnet':
      return <VaccinationCardView />;
    case 'vacunas-catalogo':
      return <MasterVaccineCatalogView />;

    // Módulo 5: La Consulta Médica Activa con Copiloto IA (Vistas 16 y 17)
    case 'consulta-activa':
      return <ActiveConsultationView />;

    // Módulo 6: Caja, Facturación y Pagos (Vistas 18 y 19)
    case 'caja':
      return <CashbookView />;
    case 'caja-recibos':
      return <MedicalReceiptsView />;

    // Módulo 7: Reportes, Analítica y Epidemiología (Vistas 20 y 21)
    case 'reportes':
      return <AnalyticsDashboardView />;
    case 'epidemiologia':
      return <EpidemiologyReportView />;

    // Módulo 8: Configuración Institucional y Suscripción SaaS (Vistas 22 a 24)
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
        <ViewRouter />
        <ClinicalModals />
      </AppLayout>
    </MedicalProvider>
  );
}
