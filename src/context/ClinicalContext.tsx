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
  DoctorProfile,
  AssistantAssignment,
  AssistantPermissions,
  ClinicProfile,
  BcvHistoryEntry,
  MedicalStudyFile,
  DiagnosisPermissionRecord,
} from '../types/medical';
import {
  INITIAL_MASTER_VACCINES,
  INITIAL_TEMPLATE_CONFIG,
  INITIAL_TENANT_CONFIG,
} from '../data/mockClinicalData';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { calculateAgeInMonths, calculateBmi } from '../utils/pediatricCalculations';
import { getCurrentTimeLabel, getTodayIsoDate } from '../utils/formatters';
import { clinicalSync } from '../api/clinicalSync';
import { medicareApi } from '../api/medicareApi';
import { getAuthToken } from '../api/client';

const STORAGE_KEY = 'medcore_pediatric_state_v2';

interface ClinicalContextValue {
  currentView: ViewId;
  setCurrentView: (view: ViewId) => void;
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
  selectedPatient: Patient | undefined;
  patients: Patient[];
  appointments: Appointment[];
  payments: PaymentRecord[];
  auditLogs: AuditLogEntry[];
  masterVaccines: MasterVaccineItem[];
  templateConfig: RecipeTemplateConfig;
  tenantConfig: ClinicTenantConfig;
  doctors: DoctorProfile[];
  assistants: AssistantAssignment[];
  clinics: ClinicProfile[];
  bcvHistory: BcvHistoryEntry[];
  diagnosisPermissions: DiagnosisPermissionRecord[];

  // Modales activos
  triageModalAppointment: Appointment | null;
  openTriageModal: (apt: Appointment) => void;
  closeTriageModal: () => void;

  vaccineModalDose: { patientId: string; dose: VaccineDoseRecord } | null;
  openVaccineModal: (patientId: string, dose: VaccineDoseRecord) => void;
  closeVaccineModal: () => void;

  dispatchModalConsultation: { patient: Patient; consultation: PastConsultationSummary } | null;
  openDispatchModal: (patient: Patient, consultation: PastConsultationSummary) => void;
  closeDispatchModal: () => void;

  // Navegación contextual
  navigateToPatient360: (patientId: string) => void;
  navigateToPatientVaccines: (patientId: string) => void;
  navigateToActiveConsultation: (patientId: string) => void;

  // Operaciones clínicas
  addPatient: (newPatient: Omit<Patient, 'id' | 'historyNumber'>) => Patient;
  addAppointment: (apt: Omit<Appointment, 'id' | 'waitingMinutes'>) => void;
  updateAppointmentStage: (appointmentId: string, stage: WaitingRoomStage) => void;
  rescheduleAppointment: (
    appointmentId: string,
    newDate: string,
    newTime: string,
    doctorId?: string
  ) => void;
  updateAppointment: (
    appointmentId: string,
    updates: Partial<
      Pick<Appointment, 'date' | 'time' | 'durationMinutes' | 'type' | 'reason' | 'doctorId' | 'stage'>
    >
  ) => void;
  removeAppointment: (appointmentId: string) => void;
  saveTriageVitals: (appointmentId: string, vitals: VitalSigns) => void;
  addPatientStudy: (patientId: string, study: Omit<MedicalStudyFile, 'id'>) => void;
  applyVaccineDose: (
    patientId: string,
    doseId: string,
    payload: {
      appliedDate: string;
      batchNumber: string;
      manufacturer: string;
      appliedBy: string;
      observations: string;
    }
  ) => void;
  addPatientVaccine: (
    patientId: string,
    payload: {
      vaccineId?: string;
      vaccineName: string;
      milestoneLabel: string;
      milestoneMonths: number;
      doseNumber: string;
      status: 'aplicada' | 'pendiente';
      appliedDate?: string;
      batchNumber?: string;
      manufacturer?: string;
      appliedBy?: string;
      observations?: string;
    }
  ) => Promise<void>;
  toggleMasterVaccine: (vaccineId: string) => void;
  addMasterVaccine: (item: Omit<MasterVaccineItem, 'id'>) => void;
  updateMasterVaccine: (item: MasterVaccineItem) => void;
  deleteMasterVaccine: (vaccineId: string) => void;
  quickAddToWaitingRoom: (params: {
    patientId?: string;
    fullName: string;
    idDocument?: string;
    reason?: string;
    guardianWhatsapp?: string;
    doctorId?: string;
    type?: 'control' | 'urgencia';
  }) => void;
  assignPatientDoctor: (appointmentId: string, doctorId: string) => void;
  sendPatientToConsultorio: (appointmentId: string) => void;
  completeConsultation: (
    patientId: string,
    consultation: PastConsultationSummary,
    vitals: VitalSigns
  ) => void;
  refreshClinicalData: () => Promise<void>;
  currentDoctorHasAssistant: boolean;

  // Configuración y Sprint 2 (Finanzas / SaaS)
  updateTemplateConfig: (partial: Partial<RecipeTemplateConfig>) => void;
  updateTenantConfig: (partial: Partial<ClinicTenantConfig>) => void;
  addPaymentRecord: (payment: Omit<PaymentRecord, 'id' | 'receiptNumber' | 'date' | 'time'>) => void;
  updateBcvRate: (newRate: number) => void;
  aiMinutesUsed: number;
  whatsappMessagesSent: number;
  incrementAiUsage: (minutes?: number) => void;
  incrementWhatsappSent: (count?: number) => void;

  // Personal
  addDoctorProfile: (
    doctor: Omit<DoctorProfile, 'id'> & { password?: string }
  ) => Promise<DoctorProfile | null>;
  updateDoctorProfile: (doctor: DoctorProfile & { password?: string }) => Promise<boolean>;
  removeDoctorProfile: (doctorId: string) => void;
  saveAssistantAssignment: (
    assignment: Omit<AssistantAssignment, 'id'> & { id?: string; password?: string }
  ) => Promise<AssistantAssignment | null>;
  toggleAssistantPermission: (assistantId: string, key: keyof AssistantPermissions) => void;
  removeAssistantAssignment: (assistantId: string) => void;
  unlinkDoctorFromAssistant: (assistantId: string) => Promise<void>;
  saveClinic: (clinic: Omit<ClinicProfile, 'id'> & { id?: string }) => Promise<ClinicProfile | null>;
  removeClinic: (clinicId: string) => void;
  grantDiagnosisPermission: (
    patientId: string,
    targetDoctorId: string,
    consultationId?: string,
    reason?: string
  ) => Promise<void>;
  revokeDiagnosisPermission: (permissionId: string) => Promise<void>;
}

const ClinicalContext = createContext<ClinicalContextValue | undefined>(undefined);

export const ClinicalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, currentUser, userRole } = useAuth();
  const { showToast, pushNotification } = useNotifications();

  const [currentView, setCurrentView] = useState<ViewId>(() =>
    isAuthenticated ? 'dashboard' : 'login'
  );
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [clinics, setClinics] = useState<ClinicProfile[]>([]);
  const [bcvHistory, setBcvHistory] = useState<BcvHistoryEntry[]>([]);
  const [diagnosisPermissions, setDiagnosisPermissions] = useState<DiagnosisPermissionRecord[]>([]);

  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.patients?.length) return parsed.patients;
      }
    } catch {
      // ignore
    }
    return [];
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
    return [];
  });

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [auditLogs] = useState<AuditLogEntry[]>([]);
  const [masterVaccines, setMasterVaccines] = useState<MasterVaccineItem[]>(INITIAL_MASTER_VACCINES);
  const [templateConfig, setTemplateConfig] = useState<RecipeTemplateConfig>(INITIAL_TEMPLATE_CONFIG);
  const [tenantConfig, setTenantConfig] = useState<ClinicTenantConfig>(INITIAL_TENANT_CONFIG);
  const [assistants, setAssistants] = useState<AssistantAssignment[]>([]);

  const [aiMinutesUsed, setAiMinutesUsed] = useState<number>(0);
  const [whatsappMessagesSent, setWhatsappMessagesSent] = useState<number>(0);

  const [triageModalAppointment, setTriageModalAppointment] = useState<Appointment | null>(null);
  const [vaccineModalDose, setVaccineModalDose] = useState<{
    patientId: string;
    dose: VaccineDoseRecord;
  } | null>(null);
  const [dispatchModalConsultation, setDispatchModalConsultation] = useState<{
    patient: Patient;
    consultation: PastConsultationSummary;
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentView('login');
      return;
    }
    if (currentView === 'login') {
      setCurrentView('dashboard');
    }
    let cancelled = false;
    clinicalSync.hydrateFromApi().then((data) => {
      if (cancelled || !data) return;
      if (data.patients) {
        setPatients(data.patients);
      }
      if (data.appointments) setAppointments(data.appointments);
      if (data.masterVaccines) setMasterVaccines(data.masterVaccines);
    });
    if (getAuthToken()) {
      Promise.all([
        medicareApi.listDoctors().catch(() => null),
        medicareApi.listAssistants().catch(() => null),
        medicareApi.listClinics().catch(() => null),
        medicareApi.getBcvHistory().catch(() => null),
        medicareApi.listDiagnosisPermissions().catch(() => null),
      ]).then(([apiDoctors, apiAssistants, apiClinics, apiBcvHistory, apiDiagPerms]) => {
        if (cancelled) return;
        if (Array.isArray(apiDiagPerms)) {
          setDiagnosisPermissions(apiDiagPerms);
        }
        if (Array.isArray(apiBcvHistory)) {
          setBcvHistory(apiBcvHistory);
          if (apiBcvHistory.length > 0 && apiBcvHistory[0].tasa) {
            setTenantConfig((prev) => ({ ...prev, bcvRate: Number(apiBcvHistory[0].tasa) }));
          }
        }
        if (Array.isArray(apiClinics)) {
          setClinics(apiClinics);
        }
        if (Array.isArray(apiDoctors)) {
          setDoctors(
            apiDoctors.map((d) => {
              const parts = d.nombreCompleto.trim().split(/\s+/);
              return {
                id: d.id,
                name: d.nombreCompleto,
                firstName: parts[0] || '',
                lastName: parts.slice(1).join(' ') || '',
                phone: d.telefono || undefined,
                email: d.email || undefined,
                username: d.username,
                avatarUrl: d.avatarUrl || undefined,
                specialty: 'Pediatría',
                licenseNumber: d.numeroColegiado || 'MPPS Pendiente',
              };
            })
          );
        }
        if (Array.isArray(apiAssistants)) {
          setAssistants(
            apiAssistants.map((a) => {
              const parts = a.nombreCompleto.trim().split(/\s+/);
              return {
                id: a.id,
                assistantName: a.nombreCompleto,
                firstName: parts[0] || '',
                lastName: parts.slice(1).join(' ') || '',
                phone: a.telefono || undefined,
                assistantUsername: a.username,
                assistantEmail: a.email || '',
                mode: a.assignedDoctorIds.length > 1 ? 'COMPARTIDA_CLINICA' : 'PERSONAL',
                assignedDoctorIds: a.assignedDoctorIds || [],
                permissions: a.permissions,
                allowedViews: ['agenda', 'sala-espera', 'pacientes', 'paciente-nuevo'],
                active: a.activo,
              };
            })
          );
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ patients, appointments }));
    } catch {
      // ignore
    }
  }, [patients, appointments]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const currentDoctorProfile = doctors.find(
    (d) =>
      d.id === currentUser?.id ||
      (currentUser?.email && d.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser?.username && d.username?.toLowerCase() === currentUser.username.toLowerCase())
  );
  const matchedDoctorId = currentDoctorProfile?.id || currentUser?.id;
  const currentDoctorHasAssistant =
    userRole !== 'PEDIATRA' ||
    assistants.some(
      (a) =>
        a.active &&
        Boolean(matchedDoctorId) &&
        (a.assignedDoctorIds || []).includes(matchedDoctorId!)
    );

  const navigateToPatient360 = (patientId: string) => {
    setSelectedPatientId(patientId);
    setCurrentView('paciente-detalle');
  };

  const navigateToPatientVaccines = (patientId: string) => {
    setSelectedPatientId(patientId);
    setCurrentView('vacunas-carnet');
  };

  const navigateToActiveConsultation = (patientId: string) => {
    const waitingApt = appointments.find(
      (a) =>
        a.patientId === patientId &&
        (a.stage === 'en_sala' || a.stage === 'en_triaje' || a.stage === 'programado')
    );
    if (waitingApt) {
      updateAppointmentStage(waitingApt.id, 'en_consulta');
    }
    setSelectedPatientId(patientId);
    setCurrentView('consulta-activa');
  };

  const addPatient = (newPatientData: Omit<Patient, 'id' | 'historyNumber'>): Patient => {
    const nextNum = 100 + patients.length + 1;
    const created: Patient = {
      ...newPatientData,
      id: `pat-${Date.now()}`,
      historyNumber: `HC-${new Date().getFullYear()}-0${nextNum}`,
    };
    setPatients((prev) => [created, ...prev]);
    setSelectedPatientId(created.id);
    clinicalSync.createPatient(newPatientData).catch(() => {});
    showToast(`Expediente ${created.historyNumber} creado exitosamente`);
    return created;
  };

  const addAppointment = (apt: Omit<Appointment, 'id' | 'waitingMinutes'>) => {
    const created: Appointment = {
      ...apt,
      id: `apt-${Date.now()}`,
      waitingMinutes: apt.stage === 'en_sala' ? 1 : 0,
    };
    setAppointments((prev) => [created, ...prev]);
    pushNotification({
      title: 'Nueva Cita Agendada',
      message: `${apt.patientName} programado para las ${apt.time}`,
      category: 'system',
      targetRoles: ['PEDIATRA', 'ASISTENTE'],
      patientId: apt.patientId,
      appointmentId: created.id,
    });
    showToast(`Cita agendada para ${apt.patientName} a las ${apt.time}`);
  };

  const addPatientStudy = (patientId: string, study: Omit<MedicalStudyFile, 'id'>) => {
    const newStudy: MedicalStudyFile = { ...study, id: `std-${Date.now()}` };
    setPatients((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, studies: [newStudy, ...p.studies] } : p))
    );
    showToast(`Resultado médico "${study.title}" agregado al historial`);
  };

  const updateAppointmentStage = (appointmentId: string, stage: WaitingRoomStage) => {
    const target = appointments.find((a) => a.id === appointmentId);
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === appointmentId ? { ...apt, stage } : apt))
    );
    clinicalSync.updateAppointmentStage(appointmentId, stage).catch(() => {});
    if (target && stage === 'en_sala') {
      pushNotification({
        title: 'Paciente en Sala de Espera',
        message: `${target.patientName} llegó a recepción y espera triaje.`,
        category: 'patient_arrived',
        targetRoles: ['PEDIATRA', 'ASISTENTE'],
        patientId: target.patientId,
        appointmentId,
      });
    }
  };

  const rescheduleAppointment = (
    appointmentId: string,
    newDate: string,
    newTime: string,
    doctorId?: string
  ) => {
    const doc = doctors.find((d) => d.id === doctorId);
    if (getAuthToken() && !appointmentId.startsWith('apt-')) {
      medicareApi
        .rescheduleAppointment(appointmentId, {
          newDate,
          newTime,
          doctorUserId: doctorId || undefined,
        })
        .catch(() => {});
    }
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId
          ? {
              ...apt,
              date: newDate,
              time: newTime,
              doctorId: doc?.id || apt.doctorId,
              doctorName: doc?.name || apt.doctorName,
            }
          : apt
      )
    );
    showToast(`Cita reprogramada para el ${newDate} a las ${newTime}`);
  };

  const updateAppointment = (
    appointmentId: string,
    updates: Partial<
      Pick<Appointment, 'date' | 'time' | 'durationMinutes' | 'type' | 'reason' | 'doctorId' | 'stage'>
    >
  ) => {
    const current = appointments.find((a) => a.id === appointmentId);
    if (!current) return;
    const merged: Appointment = {
      ...current,
      ...updates,
    };
    if (updates.doctorId) {
      const doc = doctors.find((d) => d.id === updates.doctorId);
      if (doc) merged.doctorName = doc.name;
    }
    if (getAuthToken() && !appointmentId.startsWith('apt-')) {
      medicareApi
        .updateAppointment(appointmentId, {
          date: merged.date,
          time: merged.time,
          durationMinutes: merged.durationMinutes,
          type: merged.type,
          reason: merged.reason,
          doctorUserId: merged.doctorId || undefined,
          stage: merged.stage,
        })
        .catch(() => {});
    }
    setAppointments((prev) => prev.map((apt) => (apt.id === appointmentId ? merged : apt)));
    showToast(`Cita de ${merged.patientName} actualizada`);
  };

  const removeAppointment = (appointmentId: string) => {
    const target = appointments.find((a) => a.id === appointmentId);
    if (getAuthToken() && !appointmentId.startsWith('apt-')) {
      medicareApi.deleteAppointment(appointmentId).catch(() => {});
    }
    setAppointments((prev) => prev.filter((apt) => apt.id !== appointmentId));
    showToast(
      target ? `Cita de ${target.patientName} eliminada de la agenda` : 'Cita eliminada de la agenda'
    );
  };

  const saveTriageVitals = (appointmentId: string, vitals: VitalSigns) => {
    const targetApt = appointments.find((a) => a.id === appointmentId);
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId
          ? { ...apt, stage: 'en_consulta', triageVitals: vitals }
          : apt
      )
    );
    if (targetApt) {
      setPatients((prev) =>
        prev.map((p) => (p.id === targetApt.patientId ? { ...p, latestVitals: vitals } : p))
      );
      const hasFever = vitals.temperatureC >= 38.0;
      pushNotification({
        title: hasFever ? 'Triaje con Fiebre Alta' : 'Triaje Completado',
        message: `${targetApt.patientName}: ${vitals.weightKg} kg · ${vitals.heightCm} cm · ${vitals.temperatureC} °C`,
        category: 'triage_ready',
        priority: hasFever ? 'high' : 'normal',
        targetRoles: ['PEDIATRA'],
        patientId: targetApt.patientId,
        appointmentId,
      });
    }
    setTriageModalAppointment(null);
    clinicalSync.saveTriage(appointmentId, vitals).catch(() => {});
    showToast('Signos vitales guardados y paciente listo para consulta');
  };

  const applyVaccineDose = (
    patientId: string,
    doseId: string,
    payload: {
      appliedDate: string;
      batchNumber: string;
      manufacturer: string;
      appliedBy: string;
      observations: string;
    }
  ) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? {
              ...p,
              vaccines: p.vaccines.map((v) =>
                v.id === doseId ? { ...v, status: 'aplicada', ...payload } : v
              ),
            }
          : p
      )
    );
    setVaccineModalDose(null);
    clinicalSync.applyVaccineDose(patientId, doseId, payload).catch(() => {});
    showToast('Dosis de vacuna registrada en el Carnet Digital');
  };

  const addPatientVaccine = async (
    patientId: string,
    payload: {
      vaccineId?: string;
      vaccineName: string;
      milestoneLabel: string;
      milestoneMonths: number;
      doseNumber: string;
      status: 'aplicada' | 'pendiente';
      appliedDate?: string;
      batchNumber?: string;
      manufacturer?: string;
      appliedBy?: string;
      observations?: string;
    }
  ) => {
    const tempId = `vac-${Date.now()}`;
    const newDose: VaccineDoseRecord = {
      id: tempId,
      vaccineId: payload.vaccineId || tempId,
      vaccineName: payload.vaccineName,
      milestoneLabel: payload.milestoneLabel,
      milestoneMonths: payload.milestoneMonths,
      doseNumber: payload.doseNumber,
      status: payload.status,
      appliedDate: payload.status === 'aplicada' ? payload.appliedDate : undefined,
      batchNumber: payload.status === 'aplicada' ? payload.batchNumber : undefined,
      manufacturer: payload.status === 'aplicada' ? payload.manufacturer : undefined,
      appliedBy: payload.status === 'aplicada' ? payload.appliedBy : undefined,
      observations: payload.observations,
    };

    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId ? { ...p, vaccines: [...p.vaccines, newDose] } : p
      )
    );
    showToast(`Vacuna ${payload.vaccineName} (${payload.doseNumber}) agregada al historial.`);

    try {
      const created = await clinicalSync.addPatientVaccineDose(patientId, payload);
      const realId = created && (created.Id || created.id);
      if (realId) {
        setPatients((prev) =>
          prev.map((p) =>
            p.id === patientId
              ? {
                  ...p,
                  vaccines: p.vaccines.map((v) =>
                    v.id === tempId ? { ...v, id: String(realId) } : v
                  ),
                }
              : p
          )
        );
      }
    } catch {
      // Mantiene la dosis optimista en el estado local
    }
  };

  const toggleMasterVaccine = (vaccineId: string) => {
    setMasterVaccines((prev) =>
      prev.map((item) => (item.id === vaccineId ? { ...item, active: !item.active } : item))
    );
    showToast('Catálogo de vacunas actualizado');
  };

  const addMasterVaccine = (item: Omit<MasterVaccineItem, 'id'>) => {
    setMasterVaccines((prev) => [...prev, { ...item, id: `vac-${Date.now()}` }]);
    showToast(`Vacuna ${item.commercialName} agregada al catálogo`);
  };

  const updateMasterVaccine = (updated: MasterVaccineItem) => {
    setMasterVaccines((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    showToast(`Vacuna ${updated.commercialName} actualizada`);
  };

  const deleteMasterVaccine = (vaccineId: string) => {
    setMasterVaccines((prev) => prev.filter((item) => item.id !== vaccineId));
    showToast('Vacuna eliminada del catálogo');
  };

  const quickAddToWaitingRoom = (params: {
    patientId?: string;
    fullName: string;
    idDocument?: string;
    reason?: string;
    guardianWhatsapp?: string;
    doctorId?: string;
    type?: 'control' | 'urgencia';
  }) => {
    const cleanName = params.fullName.trim();
    if (!cleanName && !params.patientId) return;
    const parts = cleanName.split(/\s+/);
    const firstName = parts[0] || cleanName || 'Paciente';
    const lastName = parts.slice(1).join(' ') || 'Paciente';

    let patient =
      (params.patientId ? patients.find((p) => p.id === params.patientId) : undefined) ||
      patients.find(
        (p) =>
          `${p.firstName} ${p.lastName}`.toLowerCase() === cleanName.toLowerCase() ||
          (params.idDocument && p.idDocument === params.idDocument.trim())
      );

    if (!patient) {
      patient = addPatient({
        firstName,
        lastName,
        sex: 'M',
        birthDate: '2022-01-01',
        idDocument: params.idDocument?.trim() || undefined,
        bloodType: 'O+',
        primarySpecialty: 'Pediatría',
        criticalAllergies: [],
        chronicConditions: [],
        previousHospitalizations: '',
        guardianName: cleanName,
        guardianRelation: 'Madre',
        guardianIdDocument: params.idDocument?.trim() || '',
        guardianOccupation: '',
        guardianWhatsapp: params.guardianWhatsapp?.trim() || '',
        guardianEmail: '',
        perinatal: {
          gestationalWeeks: 39,
          apgar1Min: 9,
          apgar5Min: 9,
          birthWeightKg: 3.2,
          birthHeightCm: 50,
          birthHeadCircumferenceCm: 34,
          deliveryType: 'Parto Eutócico Simple',
          neonatalComplications: 'Ninguna',
          maternalBloodType: 'O+',
          exclusiveBreastfeedingMonths: 6,
        },
        growthHistory: [],
        vaccines: [],
        studies: [],
        consultations: [],
      });
    }

    const assignedDoctor = doctors.find((d) => d.id === params.doctorId) || doctors[0];
    const aptType = params.type === 'urgencia' ? 'urgencia' : 'control';

    const createdApt: Appointment = {
      id: `apt-${Date.now()}`,
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientAgeLabel: patient.idDocument ? `CI: ${patient.idDocument}` : 'Ingreso rápido',
      guardianName: patient.guardianName,
      guardianWhatsapp: patient.guardianWhatsapp,
      doctorId: assignedDoctor?.id,
      doctorName: assignedDoctor?.name || 'Pediatra por asignar',
      specialty: 'Pediatría',
      date: getTodayIsoDate(),
      time: getCurrentTimeLabel(),
      durationMinutes: 30,
      type: aptType,
      reason: params.reason?.trim() || (aptType === 'urgencia' ? 'Atención Urgente' : 'Consulta Pediátrica'),
      stage: 'en_sala',
      waitingMinutes: 1,
    };

    setAppointments((prev) => [createdApt, ...prev]);

    if (aptType === 'urgencia') {
      pushNotification({
        title: 'URGENCIA en Sala de Espera',
        message: `${createdApt.patientName}${patient.idDocument ? ` (${patient.idDocument})` : ''} ingresó como URGENTE · Médico: ${createdApt.doctorName}.`,
        category: 'triage_ready',
        priority: 'high',
        targetRoles: ['PEDIATRA', 'ASISTENTE'],
        patientId: patient.id,
        appointmentId: createdApt.id,
      });
      showToast(`URGENCIA registrada: ${createdApt.patientName} (notificado a ${createdApt.doctorName})`);
    } else {
      pushNotification({
        title: 'Paciente en Sala de Espera',
        message: `${createdApt.patientName}${patient.idDocument ? ` (${patient.idDocument})` : ''} agregado por recepción · Médico: ${createdApt.doctorName}.`,
        category: 'patient_arrived',
        targetRoles: ['PEDIATRA', 'ASISTENTE'],
        patientId: patient.id,
        appointmentId: createdApt.id,
      });
      showToast(`${createdApt.patientName} agregado a Sala de Espera`);
    }
  };

  const assignPatientDoctor = (appointmentId: string, doctorId: string) => {
    const doc = doctors.find((d) => d.id === doctorId);
    if (!doc) return;
    const currentApt = appointments.find((a) => a.id === appointmentId);
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId ? { ...apt, doctorId: doc.id, doctorName: doc.name } : apt
      )
    );
    if (currentApt && /^[0-9a-f-]{36}$/i.test(appointmentId) && /^[0-9a-f-]{36}$/i.test(doctorId)) {
      medicareApi
        .updateAppointment(appointmentId, {
          date: currentApt.date,
          time: currentApt.time,
          durationMinutes: currentApt.durationMinutes || 30,
          type: currentApt.type,
          reason: currentApt.reason,
          doctorUserId: doctorId,
          stage: currentApt.stage,
        })
        .catch(() => {});
    }
    showToast(`Paciente asignado a ${doc.name}`);
  };

  const sendPatientToConsultorio = (appointmentId: string) => {
    const targetApt = appointments.find((a) => a.id === appointmentId);
    if (!targetApt) return;
    const pat = patients.find((p) => p.id === targetApt.patientId);

    setAppointments((prev) =>
      prev.map((apt) => (apt.id === appointmentId ? { ...apt, stage: 'en_consulta' } : apt))
    );
    clinicalSync.updateAppointmentStage(appointmentId, 'en_consulta').catch(() => {});

    const vitalsSummary = targetApt.triageVitals
      ? ` · ${targetApt.triageVitals.weightKg} kg, ${targetApt.triageVitals.temperatureC} °C`
      : '';

    pushNotification({
      title: 'Paciente Enviado a Consultorio',
      message: `${targetApt.patientName}${pat?.idDocument ? ` (CI: ${pat.idDocument})` : ''}${vitalsSummary}. Toca para abrir su consulta.`,
      category: 'triage_ready',
      priority: 'high',
      targetRoles: ['PEDIATRA'],
      patientId: targetApt.patientId,
      appointmentId,
    });
    showToast(`${targetApt.patientName} enviado a Consultorio y notificado a la Doctora`);
  };

  const refreshClinicalData = async () => {
    const data = await clinicalSync.hydrateFromApi().catch(() => null);
    if (data) {
      if (data.patients) setPatients(data.patients);
      if (data.appointments) setAppointments(data.appointments);
      if (data.masterVaccines) setMasterVaccines(data.masterVaccines);
    }
    if (getAuthToken()) {
      const [apiBcvHistory, apiDiagPerms] = await Promise.all([
        medicareApi.getBcvHistory().catch(() => null),
        medicareApi.listDiagnosisPermissions().catch(() => null),
      ]);
      if (Array.isArray(apiDiagPerms)) setDiagnosisPermissions(apiDiagPerms);
      if (Array.isArray(apiBcvHistory)) {
        setBcvHistory(apiBcvHistory);
        if (apiBcvHistory.length > 0 && apiBcvHistory[0].tasa) {
          setTenantConfig((prev) => ({ ...prev, bcvRate: Number(apiBcvHistory[0].tasa) }));
        }
      }
    }
  };

  const completeConsultation = (
    patientId: string,
    consultation: PastConsultationSummary,
    vitals: VitalSigns
  ) => {
    let updatedPatientObj: Patient | null = null;
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== patientId) return p;
        const bmi = calculateBmi(vitals.weightKg, vitals.heightCm);
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
    if (targetPat) {
      pushNotification({
        title: 'Consulta Finalizada — Récipe Listo',
        message: `${targetPat.firstName} ${targetPat.lastName} (${consultation.cie10Code}) listo para despacho.`,
        category: 'recipe_ready',
        targetRoles: ['ASISTENTE'],
        patientId: targetPat.id,
      });
      setDispatchModalConsultation({ patient: targetPat, consultation });
    }
    clinicalSync.completeConsultation(patientId, consultation, vitals).catch(() => {});
  };

  const addPaymentRecord = (
    payment: Omit<PaymentRecord, 'id' | 'receiptNumber' | 'date' | 'time'>
  ) => {
    const nextNum = 840 + payments.length + 1;
    const created: PaymentRecord = {
      ...payment,
      id: `pay-${Date.now()}`,
      receiptNumber: `REC-${new Date().getFullYear()}-0${nextNum}`,
      date: getTodayIsoDate(),
      time: getCurrentTimeLabel(),
    };
    setPayments((prev) => [created, ...prev]);
    showToast(`Pago registrado (${created.receiptNumber})`);
  };

  const updateBcvRate = async (newRate: number) => {
    if (!Number.isFinite(newRate) || newRate <= 0) return;
    if (getAuthToken()) {
      try {
        await medicareApi.updateBcvRate(newRate);
        const latest = await medicareApi.getBcvHistory().catch(() => null);
        if (Array.isArray(latest)) {
          setBcvHistory(latest);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Error al actualizar la tasa BCV.');
        return;
      }
    } else {
      setBcvHistory((prev) => [
        {
          id: Date.now(),
          tasa: newRate,
          origen: 'Manual',
          recordedAt: new Date().toISOString(),
          updatedByName: currentUser?.name || 'Usuario',
          updatedByRole: currentUser?.roleName || currentUser?.role || 'ADMIN',
        },
        ...prev,
      ]);
    }
    setTenantConfig((prev) => ({ ...prev, bcvRate: newRate }));
    showToast(`Tasa BCV actualizada a Bs. ${newRate.toFixed(2)} / USD`);
  };

  const addDoctorProfile = async (
    doctor: Omit<DoctorProfile, 'id'> & { password?: string }
  ): Promise<DoctorProfile | null> => {
    if (getAuthToken()) {
      try {
        const res = await medicareApi.createDoctor({
          firstName: doctor.firstName || doctor.name.split(' ')[0] || doctor.name,
          lastName: doctor.lastName || doctor.name.split(' ').slice(1).join(' ') || 'Médico',
          email: doctor.email || '',
          username: doctor.username,
          password: doctor.password || '123456',
          phone: doctor.phone,
          licenseNumber: doctor.licenseNumber,
          avatarUrl: doctor.avatarUrl,
        });
        const created: DoctorProfile = {
          ...doctor,
          id: res.id,
          name: res.nombreCompleto,
          username: res.username,
          email: res.email,
          licenseNumber: res.numeroColegiado,
          avatarUrl: res.avatarUrl,
        };
        setDoctors((prev) => [...prev, created]);
        showToast(`Perfil de Doctor ${created.name} creado en base de datos`);
        return created;
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Error al crear el médico en la base de datos.');
        return null;
      }
    }

    const created: DoctorProfile = { ...doctor, id: `doc-${Date.now()}` };
    setDoctors((prev) => [...prev, created]);
    showToast(`Perfil de Doctor ${doctor.name} creado (Pediatría)`);
    return created;
  };

  const updateDoctorProfile = async (
    updated: DoctorProfile & { password?: string }
  ): Promise<boolean> => {
    if (getAuthToken()) {
      try {
        await medicareApi.updateDoctor(updated.id, {
          firstName: updated.firstName || updated.name.split(' ')[0] || updated.name,
          lastName: updated.lastName || updated.name.split(' ').slice(1).join(' ') || 'Médico',
          email: updated.email || '',
          username: updated.username,
          password: updated.password,
          phone: updated.phone,
          licenseNumber: updated.licenseNumber,
          avatarUrl: updated.avatarUrl,
        });
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Error al actualizar el médico.');
        return false;
      }
    }
    setDoctors((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    showToast(`Perfil de Doctor ${updated.name} actualizado`);
    return true;
  };

  const removeDoctorProfile = (doctorId: string) => {
    if (getAuthToken()) {
      medicareApi.deleteDoctor(doctorId).catch((err) => {
        showToast(err instanceof Error ? err.message : 'Error al eliminar médico.');
      });
    }
    setDoctors((prev) => prev.filter((d) => d.id !== doctorId));
    setAssistants((prev) =>
      prev.map((a) => ({
        ...a,
        assignedDoctorIds: a.assignedDoctorIds.filter((id) => id !== doctorId),
      }))
    );
    showToast('Perfil de Doctor eliminado');
  };

  const saveAssistantAssignment = async (
    assignment: Omit<AssistantAssignment, 'id'> & { id?: string; password?: string }
  ): Promise<AssistantAssignment | null> => {
    if (getAuthToken()) {
      try {
        if (assignment.id && !assignment.id.startsWith('asist-')) {
          await medicareApi.updateAssistant(assignment.id, {
            firstName:
              assignment.firstName || assignment.assistantName.split(' ')[0] || assignment.assistantName,
            lastName:
              assignment.lastName ||
              assignment.assistantName.split(' ').slice(1).join(' ') ||
              'Asistente',
            email: assignment.assistantEmail,
            username: assignment.assistantUsername,
            password: assignment.password,
            phone: assignment.phone,
            assignedDoctorIds: assignment.assignedDoctorIds,
            permissions: assignment.permissions,
          });
          const updatedItem: AssistantAssignment = { ...assignment, id: assignment.id };
          setAssistants((prev) =>
            prev.map((a) => (a.id === assignment.id ? updatedItem : a))
          );
          showToast(`Asistente ${assignment.assistantName} actualizada en base de datos`);
          return updatedItem;
        } else {
          const res = await medicareApi.createAssistant({
            firstName:
              assignment.firstName || assignment.assistantName.split(' ')[0] || assignment.assistantName,
            lastName:
              assignment.lastName ||
              assignment.assistantName.split(' ').slice(1).join(' ') ||
              'Asistente',
            email: assignment.assistantEmail,
            username: assignment.assistantUsername,
            password: assignment.password || '123456',
            phone: assignment.phone,
            assignedDoctorIds: assignment.assignedDoctorIds,
            permissions: assignment.permissions,
          });
          const createdItem: AssistantAssignment = {
            ...assignment,
            id: res.id,
            assistantName: res.nombreCompleto,
            assistantUsername: res.username,
            assistantEmail: res.email,
          };
          setAssistants((prev) => [createdItem, ...prev]);
          showToast(`Asistente ${createdItem.assistantName} creada en base de datos`);
          return createdItem;
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Error al guardar asistente en base de datos.');
        return null;
      }
    }

    const id = assignment.id || `asist-${Date.now()}`;
    const nextItem: AssistantAssignment = { ...assignment, id };
    setAssistants((prev) => {
      const exists = prev.some((a) => a.id === id);
      return exists ? prev.map((a) => (a.id === id ? nextItem : a)) : [nextItem, ...prev];
    });
    showToast(`Asistente ${assignment.assistantName} guardada`);
    return nextItem;
  };

  const toggleAssistantPermission = (
    assistantId: string,
    key: keyof AssistantPermissions
  ) => {
    setAssistants((prev) =>
      prev.map((a) =>
        a.id === assistantId
          ? { ...a, permissions: { ...a.permissions, [key]: !a.permissions[key] } }
          : a
      )
    );
    showToast('Permiso de asistente actualizado');
  };

  const removeAssistantAssignment = (assistantId: string) => {
    if (getAuthToken() && !assistantId.startsWith('asist-')) {
      medicareApi.deleteAssistant(assistantId).catch((err) => {
        showToast(err instanceof Error ? err.message : 'Error al eliminar asistente.');
      });
    }
    setAssistants((prev) => prev.filter((a) => a.id !== assistantId));
    showToast('Asistente eliminado de la clínica.');
  };

  const unlinkDoctorFromAssistant = async (assistantId: string) => {
    if (!matchedDoctorId) return;
    setAssistants((prev) =>
      prev.map((a) =>
        a.id === assistantId
          ? {
              ...a,
              assignedDoctorIds: a.assignedDoctorIds.filter((id) => id !== matchedDoctorId),
            }
          : a
      )
    );
    if (getAuthToken()) {
      await medicareApi.unlinkMyAssistant(assistantId).catch(() => {});
    }
    showToast('Te desvinculaste del asistente correctamente.');
  };

  const saveClinic = async (
    clinic: Omit<ClinicProfile, 'id'> & { id?: string }
  ): Promise<ClinicProfile | null> => {
    const apiAssignments = clinic.assignments.map((a) => ({
      medicoUserId: a.doctorId,
      asistenteUserId: a.assistantId || null,
    }));

    if (getAuthToken()) {
      try {
        if (clinic.id && !clinic.id.startsWith('clinica-')) {
          await medicareApi.updateClinic(clinic.id, {
            name: clinic.name,
            rif: clinic.rif,
            phone: clinic.phone,
            email: clinic.email,
            address: clinic.address,
            assignments: apiAssignments,
          });
          const updated: ClinicProfile = { ...clinic, id: clinic.id };
          setClinics((prev) => prev.map((c) => (c.id === clinic.id ? updated : c)));
          showToast(`Clínica ${clinic.name} actualizada en base de datos`);
          return updated;
        } else {
          const res = await medicareApi.createClinic({
            name: clinic.name,
            rif: clinic.rif,
            phone: clinic.phone,
            email: clinic.email,
            address: clinic.address,
            assignments: apiAssignments,
          });
          const created: ClinicProfile = { ...clinic, id: res.id };
          setClinics((prev) => [...prev, created]);
          showToast(`Clínica ${clinic.name} creada en base de datos`);
          return created;
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Error al guardar la clínica.');
        return null;
      }
    }

    const id = clinic.id || `clinica-${Date.now()}`;
    const localClinic: ClinicProfile = { ...clinic, id };
    setClinics((prev) => {
      const exists = prev.some((c) => c.id === id);
      return exists ? prev.map((c) => (c.id === id ? localClinic : c)) : [...prev, localClinic];
    });
    showToast(`Clínica ${clinic.name} guardada`);
    return localClinic;
  };

  const removeClinic = (clinicId: string) => {
    if (getAuthToken() && !clinicId.startsWith('clinica-')) {
      medicareApi.deleteClinic(clinicId).catch((err) => {
        showToast(err instanceof Error ? err.message : 'Error al eliminar clínica.');
      });
    }
    setClinics((prev) => prev.filter((c) => c.id !== clinicId));
    showToast('Clínica eliminada');
  };

  const grantDiagnosisPermission = async (
    patientId: string,
    targetDoctorId: string,
    consultationId?: string,
    reason?: string
  ) => {
    const targetDoc = doctors.find((d) => d.id === targetDoctorId);
    const localRecord: DiagnosisPermissionRecord = {
      id: `dperm-${Date.now()}`,
      patientId,
      consultationId: consultationId || null,
      grantedByUserId: currentUser?.id || '',
      grantedByName: currentUser?.name || 'Médico',
      targetDoctorUserId: targetDoctorId,
      targetDoctorName: targetDoc?.name || 'Médico',
      reason: reason || 'Autorización de lectura de diagnóstico entre médicos',
      active: true,
      createdAt: getTodayIsoDate(),
    };

    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (getAuthToken() && guidRegex.test(patientId) && guidRegex.test(targetDoctorId)) {
      try {
        const res = await medicareApi.grantDoctorDiagnosisPermission({
          patientId,
          consultationId: consultationId && guidRegex.test(consultationId) ? consultationId : undefined,
          targetDoctorUserId: targetDoctorId,
          reason,
        });
        localRecord.id = res.id;
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Error al guardar permiso de diagnóstico.');
        return;
      }
    }

    setDiagnosisPermissions((prev) => [localRecord, ...prev]);
    showToast(`Permiso de diagnóstico concedido a ${localRecord.targetDoctorName}`);
  };

  const revokeDiagnosisPermission = async (permissionId: string) => {
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (getAuthToken() && guidRegex.test(permissionId)) {
      try {
        await medicareApi.revokeDoctorDiagnosisPermission(permissionId);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Error al revocar permiso.');
        return;
      }
    }
    setDiagnosisPermissions((prev) => prev.filter((p) => p.id !== permissionId));
    showToast('Permiso de diagnóstico revocado');
  };

  return (
    <ClinicalContext.Provider
      value={{
        currentView,
        setCurrentView,
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
        doctors,
        assistants,
        clinics,
        bcvHistory,
        diagnosisPermissions,
        triageModalAppointment,
        openTriageModal: (apt) => setTriageModalAppointment(apt),
        closeTriageModal: () => setTriageModalAppointment(null),
        vaccineModalDose,
        openVaccineModal: (patientId, dose) => setVaccineModalDose({ patientId, dose }),
        closeVaccineModal: () => setVaccineModalDose(null),
        dispatchModalConsultation,
        openDispatchModal: (patient, consultation) =>
          setDispatchModalConsultation({ patient, consultation }),
        closeDispatchModal: () => setDispatchModalConsultation(null),
        navigateToPatient360,
        navigateToPatientVaccines,
        navigateToActiveConsultation,
        addPatient,
        addAppointment,
        updateAppointmentStage,
        rescheduleAppointment,
        updateAppointment,
        removeAppointment,
        saveTriageVitals,
        addPatientStudy,
        applyVaccineDose,
        addPatientVaccine,
        toggleMasterVaccine,
        addMasterVaccine,
        updateMasterVaccine,
        deleteMasterVaccine,
        quickAddToWaitingRoom,
        assignPatientDoctor,
        sendPatientToConsultorio,
        completeConsultation,
        refreshClinicalData,
        currentDoctorHasAssistant,
        updateTemplateConfig: (partial) => setTemplateConfig((p) => ({ ...p, ...partial })),
        updateTenantConfig: (partial) => setTenantConfig((p) => ({ ...p, ...partial })),
        addPaymentRecord,
        updateBcvRate,
        aiMinutesUsed,
        whatsappMessagesSent,
        incrementAiUsage: (m = 2) => setAiMinutesUsed((p) => p + m),
        incrementWhatsappSent: (c = 1) => setWhatsappMessagesSent((p) => p + c),
        addDoctorProfile,
        updateDoctorProfile,
        removeDoctorProfile,
        saveAssistantAssignment,
        toggleAssistantPermission,
        removeAssistantAssignment,
        unlinkDoctorFromAssistant,
        saveClinic,
        removeClinic,
        grantDiagnosisPermission,
        revokeDiagnosisPermission,
      }}
    >
      {children}
    </ClinicalContext.Provider>
  );
};

export function useClinical() {
  const ctx = useContext(ClinicalContext);
  if (!ctx) {
    throw new Error('useClinical debe utilizarse dentro de <ClinicalProvider>');
  }
  return ctx;
}
