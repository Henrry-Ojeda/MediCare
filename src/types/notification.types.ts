import { UserRole } from './auth.types';

export type NotificationPriority = 'normal' | 'high' | 'urgent';

export type NotificationCategory =
  | 'assistant_call'
  | 'triage_ready'
  | 'patient_arrived'
  | 'recipe_ready'
  | 'vaccine_alert'
  | 'system';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  targetRoles: UserRole[];
  createdAt: string;
  read: boolean;
  patientId?: string;
  appointmentId?: string;
}

export interface AssistantCallAlert {
  id: string;
  requestedByDoctor: string;
  consultorioLabel: string;
  reason: string;
  patientName?: string;
  createdAt: string;
  status: 'PENDIENTE' | 'EN_CAMINO' | 'ATENDIDO';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}
