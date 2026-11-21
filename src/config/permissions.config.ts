import { UserRole } from '../types/auth.types';
import { ViewId } from '../types/medical';
import { FEATURE_FLAGS } from './featureFlags';

export interface RolePermissionRule {
  defaultView: ViewId;
  allowedViews: ViewId[];
  canCallAssistant: boolean;
  canReceiveAssistantCall: boolean;
  canStartConsultation: boolean;
  canApplyVaccine: boolean;
  canManageUsers: boolean;
  canEditDoctorSignature: boolean;
  canManageSchedule: boolean;
  canCreatePatient: boolean;
  canEditPediatricsModule: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissionRule> = {
  PEDIATRA: {
    defaultView: 'dashboard',
    allowedViews: [
      'dashboard',
      'agenda',
      'sala-espera',
      'pacientes',
      'paciente-detalle',
      'paciente-nuevo',
      'vacunas-carnet',
      'vacunas-catalogo',
      'consulta-activa',
      'firma-medico',
      'plantillas',
      'ia-modulo',
      'configuracion',
      'perfil',
    ],
    canCallAssistant: true,
    canReceiveAssistantCall: false,
    canStartConsultation: true,
    canApplyVaccine: true,
    canManageUsers: false,
    canEditDoctorSignature: true,
    canManageSchedule: true,
    canCreatePatient: true,
    canEditPediatricsModule: true,
  },
  ASISTENTE: {
    defaultView: 'dashboard',
    allowedViews: [
      'dashboard',
      'agenda',
      'sala-espera',
      'pacientes',
      'paciente-detalle',
      'paciente-nuevo',
      'vacunas-carnet',
      'perfil',
    ],
    canCallAssistant: false,
    canReceiveAssistantCall: true,
    canStartConsultation: false,
    canApplyVaccine: false,
    canManageUsers: false,
    canEditDoctorSignature: false,
    canManageSchedule: true,
    canCreatePatient: true,
    canEditPediatricsModule: false,
  },
  ADMIN: {
    defaultView: 'dashboard',
    allowedViews: [
      'dashboard',
      'admin-usuarios',
      'admin-doctores',
      'admin-asistentes',
      'admin-clinicas',
      'ia-modulo',
      'configuracion',
      'perfil',
    ],
    canCallAssistant: false,
    canReceiveAssistantCall: false,
    canStartConsultation: false,
    canApplyVaccine: false,
    canManageUsers: true,
    canEditDoctorSignature: false,
    canManageSchedule: false,
    canCreatePatient: false,
    canEditPediatricsModule: false,
  },
};

/**
 * Mapeo de vistas que dependen de un Feature Flag del Sprint 2.
 */
const FEATURE_GATED_VIEWS: Partial<Record<ViewId, boolean>> = {
  caja: FEATURE_FLAGS.enablePaymentsModule,
  'caja-recibos': FEATURE_FLAGS.enablePaymentsModule,
  suscripcion: FEATURE_FLAGS.enableSaasSubscription,
  reportes: FEATURE_FLAGS.enableAdvancedReports,
  epidemiologia: FEATURE_FLAGS.enableAdvancedReports,
  auditoria: FEATURE_FLAGS.enableAuditLog,
  onboarding: FEATURE_FLAGS.enableOnboarding,
  plantillas: true,
};

export function isViewEnabledInSprint(viewId: ViewId): boolean {
  const gated = FEATURE_GATED_VIEWS[viewId];
  return gated === undefined ? true : gated;
}

export function canRoleAccessView(role: UserRole, viewId: ViewId): boolean {
  if (!isViewEnabledInSprint(viewId)) return false;
  if (viewId === 'login' || viewId === 'recuperar-password' || viewId === 'reset-password') {
    return true;
  }
  return ROLE_PERMISSIONS[role]?.allowedViews.includes(viewId) ?? false;
}
