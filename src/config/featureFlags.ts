/**
 * Control centralizado de visibilidad de módulos por Sprint.
 * Las vistas ocultas (`false`) conservan su código modularizado en `1 Vista = 1 Archivo`
 * listas para activarse en el Sprint 2.
 */
export const FEATURE_FLAGS = {
  // Sprint 1 — Activos (Pediatría Core)
  enableDashboard: true,
  enableAgendaAndWaitingRoom: true,
  enablePatientsAndHistory: true,
  enablePediatricVaccines: true,
  enablePediatricConsultation: true,
  enableClinicalDictation: true,
  enableAiModule: true,
  enableDoctorSignature: true,
  enableWhatsappDispatch: true,
  enableAssistantCall: true,
  enableNotifications: true,

  // Sprint 2 — Ocultos temporalmente
  enablePaymentsModule: false,
  enableSaasSubscription: true,
  enableAdvancedReports: false,
  enableAuditLog: false,
  enableOnboarding: false,
  enableWysiwygTemplateDesigner: false,
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
