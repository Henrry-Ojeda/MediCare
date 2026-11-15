import { apiFetch, setAuthToken } from './client';

export interface LoginResponse {
  token: string;
  esSuperAdmin?: boolean;
  user: {
    id: string;
    username?: string;
    name: string;
    email: string;
    roleCode: string;
    roleName: string;
    esSuperAdmin?: boolean;
  };
}

export interface HealthResponse {
  service: string;
  db: {
    connected: boolean;
    database?: string;
    error?: string;
  };
}

export const medicareApi = {
  health: () => apiFetch<HealthResponse>('/health'),

  login: async (identifier: string, password: string): Promise<LoginResponse> => {
    const clean = identifier.trim();
    const res = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: clean, email: clean, password }),
    });
    setAuthToken(res.token);
    return res;
  },

  logout: () => {
    setAuthToken(null);
  },

  setupClinic: async (payload: {
    adminName: string;
    email: string;
    password: string;
    numeroColegiado?: string;
    telefono?: string;
    businessName: string;
    subdomain: string;
    rif: string;
    clinicPhone: string;
    clinicAddress: string;
  }) => {
    const res = await apiFetch<{ token: string; userId: string; message: string }>(
      '/auth/setup-clinic',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    setAuthToken(res.token);
    return res;
  },

  getBootstrap: () => apiFetch<Record<string, unknown>>('/bootstrap'),

  getPatients: (q?: string) =>
    apiFetch<unknown[]>(`/patients${q ? `?q=${encodeURIComponent(q)}` : ''}`),

  getPatientById: (id: string) => apiFetch<Record<string, unknown>>(`/patients/${id}`),

  createPatient: (payload: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>('/patients', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  grantDiagnosisPermission: (patientId: string, payload: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>(`/patients/${patientId}/diagnosis-permissions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  revokeDiagnosisPermission: (patientId: string, permissionId: string) =>
    apiFetch<{ ok: boolean }>(`/patients/${patientId}/diagnosis-permissions/${permissionId}`, {
      method: 'DELETE',
    }),

  getAppointments: (params?: { date?: string; stage?: string }) => {
    const qs = new URLSearchParams();
    if (params?.date) qs.set('date', params.date);
    if (params?.stage) qs.set('stage', params.stage);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<unknown[]>(`/appointments${suffix}`);
  },

  createAppointment: (payload: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>('/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAppointmentStage: (id: string, stage: string) =>
    apiFetch<Record<string, unknown>>(`/appointments/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage }),
    }),

  rescheduleAppointment: (
    id: string,
    payload: { newDate: string; newTime: string; reason?: string; doctorUserId?: string }
  ) =>
    apiFetch<Record<string, unknown>>(`/appointments/${id}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  updateAppointment: (
    id: string,
    payload: {
      date: string;
      time: string;
      durationMinutes: number;
      type: string;
      reason: string;
      doctorUserId?: string;
      stage?: string;
    }
  ) =>
    apiFetch<Record<string, unknown>>(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteAppointment: (id: string) =>
    apiFetch<{ ok: boolean }>(`/appointments/${id}`, {
      method: 'DELETE',
    }),

  saveTriage: (id: string, vitals: Record<string, unknown>) =>
    apiFetch<{ ok: boolean }>(`/appointments/${id}/triage`, {
      method: 'PATCH',
      body: JSON.stringify(vitals),
    }),

  completeConsultation: (payload: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>('/consultations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMasterVaccines: () => apiFetch<unknown[]>('/vaccines/master'),

  createMasterVaccine: (payload: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>('/vaccines/master', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  toggleMasterVaccine: (id: string) =>
    apiFetch<Record<string, unknown>>(`/vaccines/master/${id}/toggle`, {
      method: 'PATCH',
    }),

  applyVaccineDose: (patientId: string, doseId: string, payload: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>(`/vaccines/patients/${patientId}/doses/${doseId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  addPatientVaccineDose: (patientId: string, payload: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>(`/vaccines/patients/${patientId}/doses`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getPayments: () => apiFetch<unknown[]>('/payments'),

  createPayment: (payload: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>('/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateBcvRate: (bcvRate: number) =>
    apiFetch<{ ok: boolean; bcvRate: number }>('/payments/bcv-rate', {
      method: 'PATCH',
      body: JSON.stringify({ bcvRate }),
    }),

  getBcvHistory: () =>
    apiFetch<
      Array<{
        id: number;
        tasa: number;
        origen: string;
        recordedAt: string;
        updatedByName?: string | null;
        updatedByRole?: string | null;
      }>
    >('/payments/bcv-history'),

  getEpidemiologyReport: () => apiFetch<unknown[]>('/reports/epidemiology'),

  getAuditLogs: () => apiFetch<unknown[]>('/reports/audit-logs'),

  processConsultationAi: (payload: {
    transcript: string;
    patientName?: string;
    patientAge?: string;
    weightKg?: number;
    specialty?: string;
  }) =>
    apiFetch<{ source: string; data: unknown }>('/ai/process-consultation', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listDoctors: () =>
    apiFetch<
      Array<{
        id: string;
        nombreCompleto: string;
        username: string;
        email?: string;
        telefono?: string;
        numeroColegiado?: string;
        avatarUrl?: string;
        activo: boolean;
      }>
    >('/users/doctors'),

  createDoctor: (payload: {
    firstName: string;
    lastName: string;
    email: string;
    username?: string;
    password: string;
    phone?: string;
    licenseNumber?: string;
    avatarUrl?: string;
  }) =>
    apiFetch<{
      id: string;
      nombreCompleto: string;
      username: string;
      email: string;
      telefono?: string;
      numeroColegiado: string;
      avatarUrl?: string;
    }>('/users/doctors', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateDoctor: (
    id: string,
    payload: {
      firstName: string;
      lastName: string;
      email: string;
      username?: string;
      password?: string;
      phone?: string;
      licenseNumber?: string;
      avatarUrl?: string;
    }
  ) =>
    apiFetch<{ ok: boolean; id: string }>(`/users/doctors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteDoctor: (id: string) =>
    apiFetch<{ ok: boolean }>(`/users/doctors/${id}`, {
      method: 'DELETE',
    }),

  listAssistants: () =>
    apiFetch<
      Array<{
        id: string;
        nombreCompleto: string;
        username: string;
        email: string;
        telefono?: string;
        activo: boolean;
        assignedDoctorIds: string[];
        permissions: {
          canSchedule: boolean;
          canRegisterPatientInfo: boolean;
          canCollectPayments: boolean;
          canRescheduleOrCancel: boolean;
        };
      }>
    >('/users/assistants'),

  createAssistant: (payload: {
    firstName: string;
    lastName: string;
    email: string;
    username?: string;
    password: string;
    phone?: string;
    assignedDoctorIds: string[];
    permissions: {
      canSchedule: boolean;
      canRegisterPatientInfo: boolean;
      canCollectPayments: boolean;
      canRescheduleOrCancel: boolean;
    };
  }) =>
    apiFetch<{
      id: string;
      nombreCompleto: string;
      username: string;
      email: string;
      telefono?: string;
      assignedDoctorIds: string[];
    }>('/users/assistants', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAssistant: (
    id: string,
    payload: {
      firstName: string;
      lastName: string;
      email: string;
      username?: string;
      password?: string;
      phone?: string;
      assignedDoctorIds: string[];
      permissions: {
        canSchedule: boolean;
        canRegisterPatientInfo: boolean;
        canCollectPayments: boolean;
        canRescheduleOrCancel: boolean;
      };
    }
  ) =>
    apiFetch<{ ok: boolean; id: string }>(`/users/assistants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteAssistant: (id: string) =>
    apiFetch<{ ok: boolean }>(`/users/assistants/${id}`, {
      method: 'DELETE',
    }),

  unlinkMyAssistant: (assistantId: string) =>
    apiFetch<{ ok: boolean }>(`/users/assistants/${assistantId}/unlink-me`, {
      method: 'DELETE',
    }),

  listClinics: () =>
    apiFetch<
      Array<{
        id: string;
        name: string;
        rif?: string;
        phone?: string;
        email?: string;
        address?: string;
        active: boolean;
        assignments: Array<{
          id: string;
          doctorId: string;
          doctorName?: string;
          assistantId?: string | null;
          assistantName?: string | null;
        }>;
      }>
    >('/clinics'),

  createClinic: (payload: {
    name: string;
    rif?: string;
    phone?: string;
    email?: string;
    address?: string;
    assignments: Array<{ medicoUserId: string; asistenteUserId?: string | null }>;
  }) =>
    apiFetch<{ id: string; name: string }>('/clinics', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateClinic: (
    id: string,
    payload: {
      name: string;
      rif?: string;
      phone?: string;
      email?: string;
      address?: string;
      assignments: Array<{ medicoUserId: string; asistenteUserId?: string | null }>;
    }
  ) =>
    apiFetch<{ ok: boolean; id: string }>(`/clinics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteClinic: (id: string) =>
    apiFetch<{ ok: boolean }>(`/clinics/${id}`, {
      method: 'DELETE',
    }),

  getNotifications: () =>
    apiFetch<{
      notifications: Array<{
        id: string;
        title: string;
        message: string;
        category: string;
        priority: 'normal' | 'high' | 'urgent';
        targetRoles: string[];
        createdAt: string;
        read: boolean;
        patientId?: string;
        appointmentId?: string;
        targetUserId?: string;
      }>;
      activeAssistantCall: {
        id: string;
        requestedByDoctor: string;
        consultorioLabel: string;
        reason: string;
        patientName?: string;
        status: 'PENDIENTE' | 'EN_CAMINO' | 'ATENDIDO';
        createdAt: string;
        acknowledgedBy?: string;
        acknowledgedAt?: string;
      } | null;
    }>('/notifications'),

  createNotification: (payload: {
    title: string;
    message: string;
    category: string;
    priority?: string;
    targetRoles: string[];
    patientId?: string;
    appointmentId?: string;
    targetUserId?: string;
  }) =>
    apiFetch<{ id: string; createdAt: string }>('/notifications', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  callAssistant: (payload: { reason: string; patientName?: string; consultorioLabel?: string }) =>
    apiFetch<{
      id: string;
      requestedByDoctor: string;
      consultorioLabel: string;
      reason: string;
      patientName?: string;
      status: 'PENDIENTE';
      createdAt: string;
    }>('/notifications/call-assistant', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  acknowledgeAssistantCall: () =>
    apiFetch<{ ok: boolean; acknowledgedBy: string; acknowledgedAt: string }>(
      '/notifications/call-assistant/acknowledge',
      { method: 'PATCH' }
    ),

  dismissAssistantCall: () =>
    apiFetch<{ ok: boolean }>('/notifications/call-assistant/dismiss', { method: 'PATCH' }),

  markNotificationRead: (id: string) =>
    apiFetch<{ ok: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllNotificationsRead: () =>
    apiFetch<{ ok: boolean }>('/notifications/read-all', { method: 'PATCH' }),

  listDiagnosisPermissions: (patientId?: string) =>
    apiFetch<
      Array<{
        id: string;
        patientId: string;
        consultationId?: string | null;
        grantedByUserId: string;
        grantedByName: string;
        targetDoctorUserId: string;
        targetDoctorName: string;
        reason?: string;
        active: boolean;
        createdAt: string;
      }>
    >(patientId ? `/diagnosis-permissions?patientId=${encodeURIComponent(patientId)}` : '/diagnosis-permissions'),

  grantDoctorDiagnosisPermission: (payload: {
    patientId: string;
    consultationId?: string;
    targetDoctorUserId: string;
    reason?: string;
  }) =>
    apiFetch<{ id: string }>('/diagnosis-permissions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  revokeDoctorDiagnosisPermission: (id: string) =>
    apiFetch<{ ok: boolean }>(`/diagnosis-permissions/${id}`, {
      method: 'DELETE',
    }),
};

