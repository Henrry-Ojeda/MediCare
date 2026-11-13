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
};

