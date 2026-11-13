import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ViewId,
  Patient,
  Appointment,
  PaymentRecord,
  AuditLogEntry,
  MasterVaccineItem,
  RecipeTemplateConfig,
  ClinicTenantConfig,
  VitalSigns,
  VaccineDoseRecord,
  PastConsultationSummary,
  WaitingRoomStage,
  Specialty,
  DiagnosisPermission,
  DoctorProfile,
  AssistantAssignment,
  AssistantPermissions,
  AdminAgendaPermissionRequest,
} from '../types/medical';
import {
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_PAYMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_MASTER_VACCINES,
  INITIAL_TEMPLATE_CONFIG,
  INITIAL_TENANT_CONFIG,
} from '../data/mockClinicalData';
import { medicareApi } from '../api/medicareApi';
import { getAuthToken } from '../api/client';

export interface AuthUser {
  id: string;
  username?: string;
  name: string;
  email: string;
  roleCode: string;
  roleName: string;
  esSuperAdmin?: boolean;
}

interface MedicalContextValue {
  currentView: ViewId;
  setCurrentView: (view: ViewId) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  currentUser: AuthUser | null;
  setCurrentUser: (user: AuthUser | null) => void;
  logout: () => void;
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
  selectedPatient: Patient;
  patients: Patient[];
  appointments: Appointment[];
  payments: PaymentRecord[];
  auditLogs: AuditLogEntry[];
  masterVaccines: MasterVaccineItem[];
  templateConfig: RecipeTemplateConfig;
  tenantConfig: ClinicTenantConfig;

  // Modals corresponding to explicit views:
  // Vista 9: Modal de Triaje Rápido de la Asistente
  triageModalAppointment: Appointment | null;
  openTriageModal: (apt: Appointment) => void;
  closeTriageModal: () => void;

  // Vista 14: Modal de Aplicación Rápida de Dosis
  vaccineModalDose: { patientId: string; dose: VaccineDoseRecord } | null;
  openVaccineModal: (patientId: string, dose: VaccineDoseRecord) => void;
  closeVaccineModal: () => void;

  // Vista 17: Modal de Previsualización y Despacho Automatizado
  dispatchModalConsultation: { patient: Patient; consultation: PastConsultationSummary } | null;
  openDispatchModal: (patient: Patient, consultation: PastConsultationSummary) => void;
  closeDispatchModal: () => void;

  // Actions
  navigateToPatient360: (patientId: string) => void;
  navigateToPatientVaccines: (patientId: string) => void;
  navigateToActiveConsultation: (patientId: string) => void;
  addPatient: (newPatient: Omit<Patient, 'id' | 'historyNumber'>) => Patient;
  saveTriageVitals: (appointmentId: string, vitals: VitalSigns) => void;
  updateAppointmentStage: (appointmentId: string, stage: WaitingRoomStage) => void;
  addAppointment: (apt: Omit<Appointment, 'id' | 'waitingMinutes'>) => void;
  applyVaccineDose: (
    patientId: string,
    doseId: string,
    payload: { appliedDate: string; batchNumber: string; manufacturer: string; appliedBy: string; observations: string }
  ) => void;
  toggleMasterVaccine: (vaccineId: string) => void;
  addMasterVaccine: (item: Omit<MasterVaccineItem, 'id'>) => void;
  completeConsultation: (patientId: string, consultation: PastConsultationSummary, vitals: VitalSigns) => void;
  addPaymentRecord: (payment: Omit<PaymentRecord, 'id' | 'receiptNumber' | 'date' | 'time'>) => void;
  updateBcvRate: (newRate: number) => void;
  updateTemplateConfig: (partial: Partial<RecipeTemplateConfig>) => void;
  updateTenantConfig: (partial: Partial<ClinicTenantConfig>) => void;
  logAuditEvent: (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'ipAddress'>) => void;
  activeDoctorSpecialty: Specialty;
  setActiveDoctorSpecialty: (specialty: Specialty) => void;
  saveSpecialtyRecord: (patientId: string, specialty: Specialty, data: Record<string, string>) => void;
  grantDiagnosisPermission: (
    patientId: string,
    payload: {
      consultationId?: string;
      targetSpecialty: Specialty;
      reason: string;
      grantedByDoctor?: string;
    }
  ) => void;
  revokeDiagnosisPermission: (patientId: string, permissionId: string) => void;
  canViewConsultationDiagnosis: (
    patient: Patient,
    consultation: PastConsultationSummary,
    viewerSpecialty: Specialty
  ) => boolean;

  // Asistentes Personales y Compartidas (Clínica)
  doctors: DoctorProfile[];
  assistants: AssistantAssignment[];
  isAssistant: boolean;
  isAdmin: boolean;
  activeAssistantProfile: AssistantAssignment | null;
  activeManagedDoctorId: string;
  setActiveManagedDoctorId: (doctorId: string) => void;
  saveAssistantAssignment: (assignment: Omit<AssistantAssignment, 'id'> & { id?: string }) => void;
  toggleAssistantPermission: (assistantId: string, key: keyof AssistantPermissions) => void;
  toggleAssistantViewPermission: (assistantId: string, viewId: ViewId) => void;
  removeAssistantAssignment: (assistantId: string) => void;
  adminAgendaRequests: AdminAgendaPermissionRequest[];
  requestAdminAgendaPermission: (doctorId: string, reason: string) => void;
  resolveAdminAgendaPermission: (requestId: string, approved: boolean) => void;
  canAdminScheduleForDoctor: (doctorId: string) => boolean;
  rescheduleAppointment: (
    appointmentId: string,
    newDate: string,
    newTime: string,
    doctorId?: string,
    reason?: string
  ) => void;

  // SaaS usage metrics (Vista 24)
  aiMinutesUsed: number;
  whatsappMessagesSent: number;
  incrementAiUsage: (minutes?: number) => void;
  incrementWhatsappSent: (count?: number) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const MedicalContext = createContext<MedicalContextValue | undefined>(undefined);

const STORAGE_KEY = 'medcore_ai_saas_state_v1';
const USER_STORAGE_KEY = 'medicare_current_user';

export function calculateExactAgeLabel(birthDateStr: string): string {
  const birth = new Date(birthDateStr);
  const now = new Date('2026-11-09T12:00:00');
  if (isNaN(birth.getTime())) return 'Edad no disponible';
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years <= 0) {
    return `${Math.max(1, months)} meses`;
  }
  return `${years} ${years === 1 ? 'año' : 'años'}, ${months} ${months === 1 ? 'mes' : 'meses'}`;
}

export function calculateAgeInMonths(birthDateStr: string): number {
  const birth = new Date(birthDateStr);
  const now = new Date('2026-11-09T12:00:00');
  if (isNaN(birth.getTime())) return 36;
  return Math.max(0, (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth()));
}

const INITIAL_DOCTORS: DoctorProfile[] = [
  { id: 'doc-1', name: 'Dra. Valeria Méndez', specialty: 'Pediatría', licenseNumber: 'MPPS 68412' },
  { id: 'doc-2', name: 'Dr. Carlos Mendoza', specialty: 'Medicina Interna / Cardiología', licenseNumber: 'MPPS 71204' },
  { id: 'doc-3', name: 'Dra. Sofía Rojas', specialty: 'Medicina General', licenseNumber: 'MPPS 64980' },
  { id: 'doc-4', name: 'Dr. Andrés Navarro', specialty: 'Ginecología', licenseNumber: 'MPPS 73015' },
];

const INITIAL_ASSISTANTS: AssistantAssignment[] = [
  {
    id: 'asist-1',
    assistantName: 'Laura Pérez',
    assistantUsername: 'laura.asistente',
    assistantEmail: 'laura.perez@medcoresalud.com',
    mode: 'PERSONAL',
    assignedDoctorIds: ['doc-1'],
    permissions: {
      canSchedule: true,
      canRegisterPatientInfo: true,
      canCollectPayments: true,
      canRescheduleOrCancel: true,
    },
    allowedViews: ['agenda', 'sala-espera', 'pacientes', 'paciente-nuevo', 'caja', 'caja-recibos', 'perfil'],
    active: true,
  },
  {
    id: 'asist-2',
    assistantName: 'Mariana Gómez (Coordinación Clínica)',
    assistantUsername: 'mariana.clinica',
    assistantEmail: 'mariana.gomez@medcoresalud.com',
    mode: 'COMPARTIDA_CLINICA',
    assignedDoctorIds: ['doc-1', 'doc-2', 'doc-3'],
    permissions: {
      canSchedule: true,
      canRegisterPatientInfo: true,
      canCollectPayments: true,
      canRescheduleOrCancel: true,
    },
    allowedViews: ['agenda', 'sala-espera', 'pacientes', 'paciente-nuevo', 'caja', 'caja-recibos', 'perfil'],
    active: true,
  },
];

export const MedicalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<AuthUser | null>(() => {
    try {
      const token = getAuthToken();
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      if (token && raw) return JSON.parse(raw) as AuthUser;
    } catch {
      // ignore storage errors
    }
    return null;
  });

  const [currentView, setCurrentView] = useState<ViewId>(() =>
    getAuthToken() && localStorage.getItem(USER_STORAGE_KEY) ? 'consulta-activa' : 'login'
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    Boolean(getAuthToken() && localStorage.getItem(USER_STORAGE_KEY))
  );

  const setCurrentUser = (user: AuthUser | null) => {
    setCurrentUserState(user);
    try {
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  };

  const logout = () => {
    medicareApi.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCurrentView('login');
  };
  const [selectedPatientId, setSelectedPatientId] = useState<string>('pat-1');
  const [activeDoctorSpecialty, setActiveDoctorSpecialty] = useState<Specialty>('Pediatría');
  const [doctors] = useState<DoctorProfile[]>(INITIAL_DOCTORS);
  const [activeManagedDoctorId, setActiveManagedDoctorId] = useState<string>('ALL');
  const [assistants, setAssistants] = useState<AssistantAssignment[]>(() => {
    try {
      const saved = localStorage.getItem('medicare_assistants_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_ASSISTANTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('medicare_assistants_v1', JSON.stringify(assistants));
    } catch {
      // ignore
    }
  }, [assistants]);

  const [adminAgendaRequests, setAdminAgendaRequests] = useState<AdminAgendaPermissionRequest[]>(() => {
    try {
      const saved = localStorage.getItem('medicare_admin_agenda_requests_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('medicare_admin_agenda_requests_v1', JSON.stringify(adminAgendaRequests));
    } catch {
      // ignore
    }
  }, [adminAgendaRequests]);

  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.patients?.length) return parsed.patients;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_PATIENTS;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.appointments?.length) return parsed.appointments;
      }
    } catch {
      // ignore
    }
    return INITIAL_APPOINTMENTS;
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.payments?.length) return parsed.payments;
      }
    } catch {
      // ignore
    }
    return INITIAL_PAYMENTS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [masterVaccines, setMasterVaccines] = useState<MasterVaccineItem[]>(INITIAL_MASTER_VACCINES);
  const [templateConfig, setTemplateConfig] = useState<RecipeTemplateConfig>(INITIAL_TEMPLATE_CONFIG);
  const [tenantConfig, setTenantConfig] = useState<ClinicTenantConfig>(INITIAL_TENANT_CONFIG);

  const [aiMinutesUsed, setAiMinutesUsed] = useState<number>(185);
  const [whatsappMessagesSent, setWhatsappMessagesSent] = useState<number>(320);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Explicit View Modals (Vista 9, Vista 14, Vista 17)
  const [triageModalAppointment, setTriageModalAppointment] = useState<Appointment | null>(null);
  const [vaccineModalDose, setVaccineModalDose] = useState<{ patientId: string; dose: VaccineDoseRecord } | null>(null);
  const [dispatchModalConsultation, setDispatchModalConsultation] = useState<{
    patient: Patient;
    consultation: PastConsultationSummary;
  } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          patients,
          appointments,
          payments,
        })
      );
    } catch {
      // ignore quota error
    }
  }, [patients, appointments, payments]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3600);
  };

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const logAuditEvent = (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'ipAddress'>) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const newLog: AuditLogEntry = {
      ...entry,
      id: `aud-${Date.now()}`,
      timestamp: nowStr,
      ipAddress: '190.202.44.118',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const navigateToPatient360 = (patientId: string) => {
    setSelectedPatientId(patientId);
    setIsAuthenticated(true);
    setCurrentView('paciente-detalle');
  };

  const navigateToPatientVaccines = (patientId: string) => {
    setSelectedPatientId(patientId);
    setIsAuthenticated(true);
    setCurrentView('vacunas-carnet');
  };

  const navigateToActiveConsultation = (patientId: string) => {
    setSelectedPatientId(patientId);
    setIsAuthenticated(true);
    setCurrentView('consulta-activa');
  };

  const addPatient = (newPatientData: Omit<Patient, 'id' | 'historyNumber'>): Patient => {
    const nextNum = 100 + patients.length + 1;
    const created: Patient = {
      ...newPatientData,
      id: `pat-${Date.now()}`,
      historyNumber: `HC-2026-0${nextNum}`,
    };
    setPatients((prev) => [created, ...prev]);
    setSelectedPatientId(created.id);
    logAuditEvent({
      user: 'Dra. Valeria Méndez',
      role: 'Médico Especialista',
      action: 'Creación de Consulta',
      patientName: `${created.firstName} ${created.lastName}`,
      previousValue: { patientExists: false },
      newValue: { historyNumber: created.historyNumber, specialty: created.primarySpecialty },
    });
    showToast(`Expediente ${created.historyNumber} creado exitosamente`);
    return created;
  };

  const saveTriageVitals = (appointmentId: string, vitals: VitalSigns) => {
    const targetApt = appointments.find((a) => a.id === appointmentId);
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId
          ? {
              ...apt,
              stage: 'en_consulta',
              triageVitals: vitals,
            }
          : apt
      )
    );
    if (targetApt) {
      setPatients((prev) =>
        prev.map((p) => (p.id === targetApt.patientId ? { ...p, latestVitals: vitals } : p))
      );
      logAuditEvent({
        user: vitals.recordedBy,
        role: 'Enfermera de Triaje',
        action: 'Modificación de Diagnóstico',
        patientName: targetApt.patientName,
        previousValue: { stage: targetApt.stage },
        newValue: { stage: 'en_consulta', weightKg: vitals.weightKg, heightCm: vitals.heightCm, tempC: vitals.temperatureC },
      });
    }
    setTriageModalAppointment(null);
    showToast('Signos vitales guardados y paciente enviado a consultorio');
  };

  const updateAppointmentStage = (appointmentId: string, stage: WaitingRoomStage) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === appointmentId ? { ...apt, stage } : apt))
    );
  };

  const addAppointment = (apt: Omit<Appointment, 'id' | 'waitingMinutes'>) => {
    const created: Appointment = {
      ...apt,
      id: `apt-${Date.now()}`,
      waitingMinutes: apt.stage === 'en_sala' ? 5 : 0,
    };
    setAppointments((prev) => [created, ...prev]);
    showToast(`Cita agendada para ${apt.patientName} a las ${apt.time}`);
  };

  const applyVaccineDose = (
    patientId: string,
    doseId: string,
    payload: { appliedDate: string; batchNumber: string; manufacturer: string; appliedBy: string; observations: string }
  ) => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== patientId) return p;
        return {
          ...p,
          vaccines: p.vaccines.map((v) =>
            v.id === doseId
              ? {
                  ...v,
                  status: 'aplicada',
                  ...payload,
                }
              : v
          ),
        };
      })
    );
    const pat = patients.find((p) => p.id === patientId);
    const dose = pat?.vaccines.find((v) => v.id === doseId);
    if (pat && dose) {
      logAuditEvent({
        user: payload.appliedBy,
        role: 'Médico Especialista',
        action: 'Aplicación de Dosis',
        patientName: `${pat.firstName} ${pat.lastName}`,
        previousValue: { vaccine: dose.vaccineName, status: 'pendiente' },
        newValue: { vaccine: dose.vaccineName, status: 'aplicada', batchNumber: payload.batchNumber, manufacturer: payload.manufacturer },
      });
    }
    setVaccineModalDose(null);
    showToast('Dosis de vacuna registrada en el Carnet Digital');
  };

  const toggleMasterVaccine = (vaccineId: string) => {
    setMasterVaccines((prev) =>
      prev.map((item) => (item.id === vaccineId ? { ...item, active: !item.active } : item))
    );
    showToast('Esquema del catálogo maestro actualizado');
  };

  const addMasterVaccine = (item: Omit<MasterVaccineItem, 'id'>) => {
    setMasterVaccines((prev) => [...prev, { ...item, id: `vac-${Date.now()}` }]);
    showToast(`Vacuna ${item.commercialName} agregada al catálogo oficial`);
  };

  const completeConsultation = (patientId: string, consultation: PastConsultationSummary, vitals: VitalSigns) => {
    let updatedPatientObj: Patient | null = null;
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== patientId) return p;
        const heightMeters = vitals.heightCm / 100;
        const bmi = heightMeters > 0 ? Number((vitals.weightKg / (heightMeters * heightMeters)).toFixed(1)) : 16.0;
        const newGrowth = {
          date: consultation.date,
          ageMonths: calculateAgeInMonths(p.birthDate),
          weightKg: vitals.weightKg,
          heightCm: vitals.heightCm,
          headCircumferenceCm: vitals.headCircumferenceCm,
          bmi,
          percentileWeight: 'P60',
          percentileHeight: 'P62',
        };
        const updated: Patient = {
          ...p,
          latestVitals: vitals,
          growthHistory: [...p.growthHistory, newGrowth],
          consultations: [consultation, ...p.consultations],
        };
        updatedPatientObj = updated;
        return updated;
      })
    );

    setAppointments((prev) =>
      prev.map((apt) => (apt.patientId === patientId ? { ...apt, stage: 'completado' } : apt))
    );

    const targetPat = updatedPatientObj || patients.find((p) => p.id === patientId) || selectedPatient;
    logAuditEvent({
      user: consultation.doctorName,
      role: 'Médico Especialista',
      action: 'Creación de Consulta',
      patientName: `${targetPat.firstName} ${targetPat.lastName}`,
      previousValue: { consultationsCount: targetPat.consultations.length },
      newValue: {
        cie10Code: consultation.cie10Code,
        cie10Name: consultation.cie10Name,
        prescriptionsCount: consultation.prescriptions.length,
      },
    });

    setDispatchModalConsultation({ patient: targetPat, consultation });
  };

  const addPaymentRecord = (payment: Omit<PaymentRecord, 'id' | 'receiptNumber' | 'date' | 'time'>) => {
    const nextNum = 840 + payments.length + 1;
    const created: PaymentRecord = {
      ...payment,
      id: `pay-${Date.now()}`,
      receiptNumber: `REC-2026-0${nextNum}`,
      date: '2026-11-09',
      time: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
    };
    setPayments((prev) => [created, ...prev]);
    showToast(`Pago registrado (${created.receiptNumber}) por $${created.amountUsd.toFixed(2)} USD`);
  };

  const updateBcvRate = (newRate: number) => {
    const oldRate = tenantConfig.bcvRate;
    setTenantConfig((prev) => ({ ...prev, bcvRate: newRate }));
    logAuditEvent({
      user: 'Dra. Valeria Méndez',
      role: 'Administrador Tenant',
      action: 'Actualización de Tasa BCV',
      patientName: 'Sistema Financiero General',
      previousValue: { bcvRate: oldRate },
      newValue: { bcvRate: newRate },
    });
    showToast(`Tasa BCV actualizada a Bs. ${newRate.toFixed(2)} / USD`);
  };

  const updateTemplateConfig = (partial: Partial<RecipeTemplateConfig>) => {
    setTemplateConfig((prev) => ({ ...prev, ...partial }));
  };

  const updateTenantConfig = (partial: Partial<ClinicTenantConfig>) => {
    setTenantConfig((prev) => ({ ...prev, ...partial }));
  };

  const incrementAiUsage = (minutes = 3) => {
    setAiMinutesUsed((prev) => prev + minutes);
  };

  const incrementWhatsappSent = (count = 1) => {
    setWhatsappMessagesSent((prev) => prev + count);
  };

  const saveSpecialtyRecord = (
    patientId: string,
    specialty: Specialty,
    data: Record<string, string>
  ) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? {
              ...p,
              specialtyRecords: {
                ...(p.specialtyRecords || {}),
                [specialty]: data,
              },
            }
          : p
      )
    );
    showToast(`Ficha clínica de ${specialty} actualizada`);
  };

  const grantDiagnosisPermission = (
    patientId: string,
    payload: {
      consultationId?: string;
      targetSpecialty: Specialty;
      reason: string;
      grantedByDoctor?: string;
    }
  ) => {
    const newPerm: DiagnosisPermission = {
      id: `perm-${Date.now()}`,
      patientId,
      consultationId: payload.consultationId,
      grantedByDoctor: payload.grantedByDoctor || 'Dra. Valeria Méndez',
      grantedBySpecialty: activeDoctorSpecialty,
      targetSpecialty: payload.targetSpecialty,
      reason: payload.reason,
      createdAt: new Date().toISOString().slice(0, 10),
      active: true,
    };

    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? {
              ...p,
              diagnosisPermissions: [newPerm, ...(p.diagnosisPermissions || [])],
            }
          : p
      )
    );

    const pat = patients.find((p) => p.id === patientId);
    logAuditEvent({
      user: newPerm.grantedByDoctor,
      role: 'Médico Especialista',
      action: 'Creación de Consulta',
      patientName: pat ? `${pat.firstName} ${pat.lastName}` : patientId,
      previousValue: { diagnosisAccess: false },
      newValue: {
        grantedFrom: activeDoctorSpecialty,
        targetSpecialty: payload.targetSpecialty,
        consultationId: payload.consultationId || 'all',
        reason: payload.reason,
      },
    });
    showToast(`Permiso de diagnóstico otorgado a ${payload.targetSpecialty}`);
  };

  const revokeDiagnosisPermission = (patientId: string, permissionId: string) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? {
              ...p,
              diagnosisPermissions: (p.diagnosisPermissions || []).map((perm) =>
                perm.id === permissionId ? { ...perm, active: false } : perm
              ),
            }
          : p
      )
    );
    showToast('Permiso de diagnóstico revocado');
  };

  const canViewConsultationDiagnosis = (
    patient: Patient,
    consultation: PastConsultationSummary,
    viewerSpecialty: Specialty
  ): boolean => {
    if (consultation.specialty === viewerSpecialty) return true;
    return (patient.diagnosisPermissions || []).some(
      (perm) =>
        perm.active &&
        perm.targetSpecialty === viewerSpecialty &&
        (!perm.consultationId || perm.consultationId === consultation.id)
    );
  };

  const saveAssistantAssignment = (assignment: Omit<AssistantAssignment, 'id'> & { id?: string }) => {
    const id = assignment.id || `asist-${Date.now()}`;
    setAssistants((prev) => {
      const exists = prev.some((a) => a.id === id);
      const nextItem: AssistantAssignment = { ...assignment, id };
      return exists ? prev.map((a) => (a.id === id ? nextItem : a)) : [nextItem, ...prev];
    });
    showToast(
      assignment.mode === 'COMPARTIDA_CLINICA'
        ? `Asistente compartida asignada a ${assignment.assignedDoctorIds.length} médicos`
        : `Asistente personal ${assignment.assistantName} guardada`
    );
  };

  const toggleAssistantPermission = (assistantId: string, key: keyof AssistantPermissions) => {
    setAssistants((prev) =>
      prev.map((a) =>
        a.id === assistantId
          ? { ...a, permissions: { ...a.permissions, [key]: !a.permissions[key] } }
          : a
      )
    );
    showToast('Permiso de asistente actualizado');
  };

  const toggleAssistantViewPermission = (assistantId: string, viewId: ViewId) => {
    setAssistants((prev) =>
      prev.map((a) => {
        if (a.id !== assistantId) return a;
        const current = a.allowedViews || ['agenda', 'perfil'];
        const has = current.includes(viewId);
        const next = has ? current.filter((v) => v !== viewId) : [...current, viewId];
        return { ...a, allowedViews: next };
      })
    );
    showToast('Permiso de vista actualizado para la asistente');
  };

  const isAssistant = currentUser?.roleCode === 'ASISTENTE';
  const isAdmin = currentUser?.roleCode === 'ADMIN';

  const requestAdminAgendaPermission = (doctorId: string, reason: string) => {
    const doc = doctors.find((d) => d.id === doctorId);
    if (!doc) return;
    const req: AdminAgendaPermissionRequest = {
      id: `req-agenda-${Date.now()}`,
      requestedByAdminName: currentUser?.name || 'Administrador Clínica',
      doctorId: doc.id,
      doctorName: doc.name,
      reason: reason.trim() || 'Solicitud de autorización puntual para agendar cita en nombre del médico.',
      status: 'PENDIENTE',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    setAdminAgendaRequests((prev) => [req, ...prev]);
    logAuditEvent({
      user: req.requestedByAdminName,
      role: 'Administrador Tenant',
      action: 'Creación de Consulta',
      patientName: `Permiso Agenda → ${doc.name}`,
      previousValue: { agendaPermission: 'DENIED_FOR_ADMIN' },
      newValue: { status: 'PENDIENTE', doctorId: doc.id, reason: req.reason },
    });
    showToast(`Solicitud de permiso enviada a ${doc.name}`);
  };

  const resolveAdminAgendaPermission = (requestId: string, approved: boolean) => {
    setAdminAgendaRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: approved ? 'APROBADO' : 'RECHAZADO',
              resolvedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            }
          : r
      )
    );
    showToast(approved ? 'Permiso de agenda aprobado para el Admin' : 'Solicitud de agenda rechazada');
  };

  const canAdminScheduleForDoctor = (doctorId: string): boolean => {
    if (!isAdmin) return true;
    return adminAgendaRequests.some((r) => r.doctorId === doctorId && r.status === 'APROBADO');
  };
  const activeAssistantProfile = isAssistant
    ? assistants.find(
        (a) =>
          a.id === currentUser?.id ||
          a.assistantUsername.toLowerCase() === (currentUser?.username || '').toLowerCase()
      ) ||
      assistants[0] ||
      null
    : null;

  const removeAssistantAssignment = (assistantId: string) => {
    setAssistants((prev) => prev.filter((a) => a.id !== assistantId));
    showToast('Asignación de asistente eliminada');
  };

  const rescheduleAppointment = (
    appointmentId: string,
    newDate: string,
    newTime: string,
    doctorId?: string,
    reason?: string
  ) => {
    const targetDoc = doctorId ? doctors.find((d) => d.id === doctorId) : undefined;
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId
          ? {
              ...apt,
              date: newDate,
              time: newTime,
              doctorId: targetDoc ? targetDoc.id : apt.doctorId,
              doctorName: targetDoc ? targetDoc.name : apt.doctorName,
              specialty: targetDoc ? targetDoc.specialty : apt.specialty,
              reason: reason?.trim() ? reason.trim() : apt.reason,
              stage: 'programado',
            }
          : apt
      )
    );
    showToast(`Cita reprogramada para el ${newDate} a las ${newTime}`);
  };

  return (
    <MedicalContext.Provider
      value={{
        currentView,
        setCurrentView,
        isAuthenticated,
        setIsAuthenticated,
        currentUser,
        setCurrentUser,
        logout,
        selectedPatientId,
        setSelectedPatientId,
        selectedPatient,
        patients,
        appointments,
        payments,
        auditLogs,
        masterVaccines,
        templateConfig,
        tenantConfig,
        triageModalAppointment,
        openTriageModal: (apt) => setTriageModalAppointment(apt),
        closeTriageModal: () => setTriageModalAppointment(null),
        vaccineModalDose,
        openVaccineModal: (patientId, dose) => setVaccineModalDose({ patientId, dose }),
        closeVaccineModal: () => setVaccineModalDose(null),
        dispatchModalConsultation,
        openDispatchModal: (patient, consultation) => setDispatchModalConsultation({ patient, consultation }),
        closeDispatchModal: () => setDispatchModalConsultation(null),
        navigateToPatient360,
        navigateToPatientVaccines,
        navigateToActiveConsultation,
        addPatient,
        saveTriageVitals,
        updateAppointmentStage,
        addAppointment,
        applyVaccineDose,
        toggleMasterVaccine,
        addMasterVaccine,
        completeConsultation,
        addPaymentRecord,
        updateBcvRate,
        updateTemplateConfig,
        updateTenantConfig,
        logAuditEvent,
        activeDoctorSpecialty,
        setActiveDoctorSpecialty,
        saveSpecialtyRecord,
        grantDiagnosisPermission,
        revokeDiagnosisPermission,
        canViewConsultationDiagnosis,
        doctors,
        assistants,
        isAssistant,
        isAdmin,
        activeAssistantProfile,
        activeManagedDoctorId,
        setActiveManagedDoctorId,
        saveAssistantAssignment,
        toggleAssistantPermission,
        toggleAssistantViewPermission,
        removeAssistantAssignment,
        adminAgendaRequests,
        requestAdminAgendaPermission,
        resolveAdminAgendaPermission,
        canAdminScheduleForDoctor,
        rescheduleAppointment,
        aiMinutesUsed,
        whatsappMessagesSent,
        incrementAiUsage,
        incrementWhatsappSent,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </MedicalContext.Provider>
  );
};

export const useMedical = () => {
  const ctx = useContext(MedicalContext);
  if (!ctx) throw new Error('useMedical debe usarse dentro de un MedicalProvider');
  return ctx;
};
