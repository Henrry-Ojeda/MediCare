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
  saveTriageVitals: (appointmentId: string, vitals: VitalSigns) => void;
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
  toggleMasterVaccine: (vaccineId: string) => void;
  addMasterVaccine: (item: Omit<MasterVaccineItem, 'id'>) => void;
  completeConsultation: (
    patientId: string,
    consultation: PastConsultationSummary,
    vitals: VitalSigns
  ) => void;

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
  saveAssistantAssignment: (assignment: Omit<AssistantAssignment, 'id'> & { id?: string }) => void;
  toggleAssistantPermission: (assistantId: string, key: keyof AssistantPermissions) => void;
  removeAssistantAssignment: (assistantId: string) => void;
}

const ClinicalContext = createContext<ClinicalContextValue | undefined>(undefined);

export const ClinicalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, currentUser } = useAuth();
  const { showToast, pushNotification } = useNotifications();

  const [currentView, setCurrentView] = useState<ViewId>(() =>
    isAuthenticated ? 'dashboard' : 'login'
  );
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [doctors] = useState<DoctorProfile[]>([]);

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
        setSelectedPatientId(data.patients[0].id);
      }
      if (data.appointments) setAppointments(data.appointments);
      if (data.masterVaccines) setMasterVaccines(data.masterVaccines);
    });
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

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const navigateToPatient360 = (patientId: string) => {
    setSelectedPatientId(patientId);
    setCurrentView('paciente-detalle');
  };

  const navigateToPatientVaccines = (patientId: string) => {
    setSelectedPatientId(patientId);
    setCurrentView('vacunas-carnet');
  };

  const navigateToActiveConsultation = (patientId: string) => {
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
    pushNotification({
      title: 'Consulta Finalizada — Récipe Listo',
      message: `${targetPat.firstName} ${targetPat.lastName} (${consultation.cie10Code}) listo para despacho.`,
      category: 'recipe_ready',
      targetRoles: ['ASISTENTE'],
      patientId: targetPat.id,
    });
    setDispatchModalConsultation({ patient: targetPat, consultation });
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

  const updateBcvRate = (newRate: number) => {
    setTenantConfig((prev) => ({ ...prev, bcvRate: newRate }));
    showToast(`Tasa BCV actualizada a Bs. ${newRate.toFixed(2)} / USD`);
  };

  const saveAssistantAssignment = (
    assignment: Omit<AssistantAssignment, 'id'> & { id?: string }
  ) => {
    const id = assignment.id || `asist-${Date.now()}`;
    setAssistants((prev) => {
      const exists = prev.some((a) => a.id === id);
      const nextItem: AssistantAssignment = { ...assignment, id };
      return exists ? prev.map((a) => (a.id === id ? nextItem : a)) : [nextItem, ...prev];
    });
    showToast(`Asistente ${assignment.assistantName} guardada`);
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
    setAssistants((prev) => prev.filter((a) => a.id !== assistantId));
    showToast('Asistente removida');
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
        saveTriageVitals,
        applyVaccineDose,
        toggleMasterVaccine,
        addMasterVaccine,
        completeConsultation,
        updateTemplateConfig: (partial) => setTemplateConfig((p) => ({ ...p, ...partial })),
        updateTenantConfig: (partial) => setTenantConfig((p) => ({ ...p, ...partial })),
        addPaymentRecord,
        updateBcvRate,
        aiMinutesUsed,
        whatsappMessagesSent,
        incrementAiUsage: (m = 2) => setAiMinutesUsed((p) => p + m),
        incrementWhatsappSent: (c = 1) => setWhatsappMessagesSent((p) => p + c),
        saveAssistantAssignment,
        toggleAssistantPermission,
        removeAssistantAssignment,
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
