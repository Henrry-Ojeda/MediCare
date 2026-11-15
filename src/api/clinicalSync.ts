import { getAuthToken } from './client';
import { medicareApi } from './medicareApi';
import {
  Appointment,
  MasterVaccineItem,
  Patient,
  PastConsultationSummary,
  VitalSigns,
  WaitingRoomStage,
} from '../types/medical';
import { calculateExactAgeLabel } from '../utils/pediatricCalculations';

export function hasRealAuthSession(): boolean {
  return Boolean(getAuthToken());
}

type AnyRecord = Record<string, unknown>;

function pick<T>(row: AnyRecord, camel: string, pascal: string, fallback: T): T {
  const val = row[camel] ?? row[pascal];
  return (val !== undefined && val !== null ? val : fallback) as T;
}

export function mapApiPatientToModel(row: AnyRecord): Patient {
  const birthRaw = String(pick(row, 'birthDate', 'BirthDate', '2022-01-01'));
  const birthDate = birthRaw.includes('T') ? birthRaw.split('T')[0] : birthRaw;

  return {
    id: String(pick(row, 'id', 'Id', '')),
    historyNumber: String(pick(row, 'historyNumber', 'HistoryNumber', 'HC-000')),
    firstName: String(pick(row, 'firstName', 'FirstName', '')),
    lastName: String(pick(row, 'lastName', 'LastName', '')),
    sex: (pick(row, 'sex', 'Sex', 'M') as 'M' | 'F') || 'M',
    birthDate,
    idDocument: pick(row, 'idDocument', 'IdDocument', undefined),
    bloodType: (pick(row, 'bloodType', 'BloodType', 'O+') as Patient['bloodType']) || 'O+',
    primarySpecialty: 'Pediatría',
    criticalAllergies: [],
    chronicConditions: [],
    previousHospitalizations: '',
    guardianName: String(pick(row, 'guardianName', 'GuardianName', '')),
    guardianRelation: (pick(row, 'guardianRelation', 'GuardianRelation', 'Madre') as Patient['guardianRelation']),
    guardianIdDocument: String(pick(row, 'guardianIdDocument', 'GuardianIdDocument', '')),
    guardianOccupation: String(pick(row, 'guardianOccupation', 'GuardianOccupation', '')),
    guardianWhatsapp: String(pick(row, 'guardianWhatsapp', 'GuardianWhatsapp', '')),
    guardianEmail: String(pick(row, 'guardianEmail', 'GuardianEmail', '')),
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
  };
}

export function mapApiAppointmentToModel(row: AnyRecord): Appointment {
  const dateRaw = String(pick(row, 'date', 'Date', ''));
  const date = dateRaw.includes('T') ? dateRaw.split('T')[0] : dateRaw;
  const birthRaw = pick<string | undefined>(row, 'patientBirthDate', 'PatientBirthDate', undefined);

  return {
    id: String(pick(row, 'id', 'Id', '')),
    patientId: String(pick(row, 'patientId', 'PatientId', '')),
    patientName: String(pick(row, 'patientName', 'PatientName', 'Paciente')),
    patientAgeLabel: birthRaw ? calculateExactAgeLabel(birthRaw) : 'Pediátrico',
    guardianName: String(pick(row, 'guardianName', 'GuardianName', '')),
    guardianWhatsapp: String(pick(row, 'guardianWhatsapp', 'GuardianWhatsapp', '')),
    doctorId: String(pick(row, 'doctorUserId', 'DoctorUserId', 'doc-1')),
    doctorName: String(pick(row, 'doctorName', 'DoctorName', 'Médico Tratante')),
    specialty: 'Pediatría',
    date,
    time: String(pick(row, 'time', 'Time', '09:00 AM')),
    durationMinutes: Number(pick(row, 'durationMinutes', 'DurationMinutes', 30)),
    type: (pick(row, 'type', 'Type', 'control') as Appointment['type']) || 'control',
    reason: String(pick(row, 'reason', 'Reason', '')),
    stage: (pick(row, 'stage', 'Stage', 'programado') as WaitingRoomStage) || 'programado',
    waitingMinutes: Number(pick(row, 'waitingMinutes', 'WaitingMinutes', 0)),
  };
}

export function mapApiMasterVaccineToModel(row: AnyRecord): MasterVaccineItem {
  return {
    id: String(pick(row, 'id', 'Id', '')),
    commercialName: String(pick(row, 'commercialName', 'CommercialName', '')),
    genericName: String(pick(row, 'genericName', 'GenericName', '')),
    dosesRequired: Number(pick(row, 'dosesRequired', 'DosesRequired', 1)),
    recommendedAges: String(pick(row, 'recommendedAges', 'RecommendedAges', '')),
    route: (pick(row, 'route', 'Route', 'Intramuscular (IM)') as MasterVaccineItem['route']),
    active: Boolean(pick(row, 'active', 'Active', true)),
  };
}

export const clinicalSync = {
  async hydrateFromApi(): Promise<{
    patients?: Patient[];
    appointments?: Appointment[];
    masterVaccines?: MasterVaccineItem[];
  } | null> {
    if (!hasRealAuthSession()) return null;
    try {
      const [rawPatients, rawAppointments, rawVaccines] = await Promise.all([
        medicareApi.getPatients(),
        medicareApi.getAppointments(),
        medicareApi.getMasterVaccines(),
      ]);

      return {
        patients: Array.isArray(rawPatients) && rawPatients.length > 0
          ? rawPatients.map((r) => mapApiPatientToModel(r as AnyRecord))
          : undefined,
        appointments: Array.isArray(rawAppointments) && rawAppointments.length > 0
          ? rawAppointments.map((r) => mapApiAppointmentToModel(r as AnyRecord))
          : undefined,
        masterVaccines: Array.isArray(rawVaccines) && rawVaccines.length > 0
          ? rawVaccines.map((r) => mapApiMasterVaccineToModel(r as AnyRecord))
          : undefined,
      };
    } catch {
      return null;
    }
  },

  async createPatient(patient: Omit<Patient, 'id' | 'historyNumber'>) {
    if (!hasRealAuthSession()) return;
    await medicareApi.createPatient({
      firstName: patient.firstName,
      lastName: patient.lastName,
      sex: patient.sex,
      birthDate: patient.birthDate,
      idDocument: patient.idDocument,
      bloodType: patient.bloodType,
      primarySpecialtyId: 1,
      criticalAllergies: patient.criticalAllergies,
      chronicConditions: patient.chronicConditions,
      previousHospitalizations: patient.previousHospitalizations,
      guardianName: patient.guardianName,
      guardianRelation: patient.guardianRelation,
      guardianIdDocument: patient.guardianIdDocument,
      guardianOccupation: patient.guardianOccupation,
      guardianWhatsapp: patient.guardianWhatsapp,
      guardianEmail: patient.guardianEmail,
      specialtyData: patient.perinatal,
    });
  },

  async updateAppointmentStage(appointmentId: string, stage: WaitingRoomStage) {
    if (!hasRealAuthSession()) return;
    await medicareApi.updateAppointmentStage(appointmentId, stage);
  },

  async saveTriage(appointmentId: string, vitals: VitalSigns) {
    if (!hasRealAuthSession()) return;
    await medicareApi.saveTriage(appointmentId, {
      weightKg: vitals.weightKg,
      heightCm: vitals.heightCm,
      headCircumferenceCm: vitals.headCircumferenceCm,
      temperatureC: vitals.temperatureC,
      heartRateBpm: vitals.heartRateBpm,
      spo2Percent: vitals.spo2Percent,
      systolicBp: vitals.systolicBp,
      diastolicBp: vitals.diastolicBp,
    });
  },

  async applyVaccineDose(
    patientId: string,
    doseId: string,
    payload: {
      appliedDate: string;
      batchNumber: string;
      manufacturer: string;
      appliedBy: string;
      observations: string;
    }
  ) {
    if (!hasRealAuthSession()) return;
    await medicareApi.applyVaccineDose(patientId, doseId, payload);
  },

  async addPatientVaccineDose(
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
      observations?: string;
    }
  ): Promise<Record<string, unknown> | null> {
    if (!hasRealAuthSession()) return null;
    return medicareApi.addPatientVaccineDose(patientId, payload);
  },

  async completeConsultation(
    patientId: string,
    consultation: PastConsultationSummary,
    vitals: VitalSigns
  ) {
    if (!hasRealAuthSession()) return;
    await medicareApi.completeConsultation({
      patientId,
      specialtyId: 1,
      cie10Code: consultation.cie10Code,
      cie10Name: consultation.cie10Name,
      reason: consultation.reason,
      physicalExamSummary: consultation.physicalExamSummary,
      parentGuide: consultation.parentGuide,
      alarmSigns: consultation.alarmSigns,
      prescriptions: consultation.prescriptions,
      vitals,
    });
  },
};
