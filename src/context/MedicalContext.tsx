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

interface MedicalContextValue {
  currentView: ViewId;
  setCurrentView: (view: ViewId) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
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

export const MedicalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // User requested to start on Login view (/login) and follow the full flow
  const [currentView, setCurrentView] = useState<ViewId>('login');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('pat-1');

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

  return (
    <MedicalContext.Provider
      value={{
        currentView,
        setCurrentView,
        isAuthenticated,
        setIsAuthenticated,
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
