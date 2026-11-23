import { getAuthToken } from './client';
import { medicareApi } from './medicareApi';
import {
  Appointment,
  MasterVaccineItem,
  MedicalStudyFile,
  Patient,
  PastConsultationSummary,
  RecipeTemplateConfig,
  VitalSigns,
  WaitingRoomStage,
} from '../types/medical';
import {
  calculateBmi,
  calculateExactAgeLabel,
  evaluateOmsStatus,
} from '../utils/pediatricCalculations';

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
    templatePatch?: Partial<RecipeTemplateConfig>;
  } | null> {
    if (!hasRealAuthSession()) return null;
    try {
      const [rawPatients, rawAppointments, rawVaccines, bootstrap] = await Promise.all([
        medicareApi.getPatients(),
        medicareApi.getAppointments(),
        medicareApi.getMasterVaccines(),
        medicareApi.getBootstrap().catch(() => null),
      ]);

      let templatePatch: Partial<RecipeTemplateConfig> | undefined;
      if (bootstrap && typeof bootstrap === 'object') {
        const b = bootstrap as Record<string, unknown>;
        const t = (b.template || null) as AnyRecord | null;
        const tenant = (b.tenant || null) as AnyRecord | null;
        if (t || tenant) {
          templatePatch = {
            ...(t?.ClinicName || t?.clinicName || tenant?.NombreComercial || tenant?.nombreComercial
              ? {
                  clinicName: String(
                    t?.ClinicName ?? t?.clinicName ?? tenant?.NombreComercial ?? tenant?.nombreComercial
                  ),
                }
              : {}),
            ...(t?.Rif || t?.rif || tenant?.Rif || tenant?.rif
              ? { rif: String(t?.Rif ?? t?.rif ?? tenant?.Rif ?? tenant?.rif) }
              : {}),
            ...(t?.Address || t?.address || tenant?.Direccion || tenant?.direccion
              ? {
                  address: String(
                    t?.Address ?? t?.address ?? tenant?.Direccion ?? tenant?.direccion
                  ),
                }
              : {}),
            ...(t?.Phone || t?.phone || tenant?.Telefono || tenant?.telefono
              ? { phone: String(t?.Phone ?? t?.phone ?? tenant?.Telefono ?? tenant?.telefono) }
              : {}),
            ...(t?.ClinicSubtitle || t?.clinicSubtitle
              ? { clinicSubtitle: String(t.ClinicSubtitle ?? t.clinicSubtitle) }
              : {}),
            ...(t?.Orientation || t?.orientation
              ? {
                  orientation: String(
                    t.Orientation ?? t.orientation
                  ) as RecipeTemplateConfig['orientation'],
                }
              : {}),
            ...(t?.BackgroundTemplateDataUrl || t?.backgroundTemplateDataUrl
              ? {
                  backgroundTemplateDataUrl: String(
                    t.BackgroundTemplateDataUrl ?? t.backgroundTemplateDataUrl
                  ),
                }
              : {}),
            ...(t?.HideDefaultHeaderOnBg !== undefined || t?.hideDefaultHeaderOnBg !== undefined
              ? {
                  hideDefaultHeaderOnBg: Boolean(
                    t.HideDefaultHeaderOnBg ?? t.hideDefaultHeaderOnBg
                  ),
                }
              : {}),
            ...(t?.ContentTopPaddingPx != null || t?.contentTopPaddingPx != null
              ? { contentTopPaddingPx: Number(t.ContentTopPaddingPx ?? t.contentTopPaddingPx) }
              : {}),
            ...(t?.ContentBottomPaddingPx != null || t?.contentBottomPaddingPx != null
              ? {
                  contentBottomPaddingPx: Number(
                    t.ContentBottomPaddingPx ?? t.contentBottomPaddingPx
                  ),
                }
              : {}),
            ...(t?.BackgroundOpacity != null || t?.backgroundOpacity != null
              ? { backgroundOpacity: Number(t.BackgroundOpacity ?? t.backgroundOpacity) }
              : {}),
            ...(t?.LogoPosition || t?.logoPosition
              ? {
                  logoPosition: String(
                    t.LogoPosition ?? t.logoPosition
                  ) as RecipeTemplateConfig['logoPosition'],
                }
              : {}),
            ...(t?.FontFamily || t?.fontFamily
              ? {
                  fontFamily: String(
                    t.FontFamily ?? t.fontFamily
                  ) as RecipeTemplateConfig['fontFamily'],
                }
              : {}),
            ...(t?.BorderColor || t?.borderColor
              ? {
                  borderColor: String(
                    t.BorderColor ?? t.borderColor
                  ) as RecipeTemplateConfig['borderColor'],
                }
              : {}),
            ...(t?.ShowQrCode !== undefined || t?.showQrCode !== undefined
              ? { showQrCode: Boolean(t.ShowQrCode ?? t.showQrCode) }
              : {}),
            ...(t?.ShowDigitalSignature !== undefined || t?.showDigitalSignature !== undefined
              ? { showDigitalSignature: Boolean(t.ShowDigitalSignature ?? t.showDigitalSignature) }
              : {}),
            ...(t?.ShowWetStamp !== undefined || t?.showWetStamp !== undefined
              ? { showWetStamp: Boolean(t.ShowWetStamp ?? t.showWetStamp) }
              : {}),
            ...(t?.FooterNote !== undefined || t?.footerNote !== undefined
              ? { footerNote: String(t.FooterNote ?? t.footerNote ?? '') }
              : {}),
          };
        }
      }

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
        templatePatch,
      };
    } catch {
      return null;
    }
  },

  async createPatient(patient: Omit<Patient, 'id' | 'historyNumber'>) {
    if (!hasRealAuthSession()) return null;
    return medicareApi.createPatient({
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

  async createAppointment(apt: Omit<Appointment, 'id' | 'waitingMinutes'>) {
    if (!hasRealAuthSession()) return null;
    return medicareApi.createAppointment({
      patientId: apt.patientId,
      doctorUserId: apt.doctorId,
      specialtyId: 1,
      date: apt.date,
      time: apt.time,
      durationMinutes: apt.durationMinutes || 30,
      type: apt.type || 'control',
      reason: apt.reason || 'Control Pediátrico',
      stage: apt.stage || 'programado',
    });
  },

  async createPatientStudy(patientId: string, study: Omit<MedicalStudyFile, 'id'>) {
    if (!hasRealAuthSession()) return null;
    return medicareApi.createPatientStudy(patientId, {
      title: study.title,
      category: study.category,
      studyDate: study.date,
      summary: study.summary,
      imageUrl: study.imageUrl,
      valuesHighlight: study.valuesHighlight,
      specialtyId: 1,
    });
  },

  async saveRecipeTemplate(cfg: RecipeTemplateConfig) {
    if (!hasRealAuthSession()) return null;
    return medicareApi.saveRecipeTemplate({
      clinicName: cfg.clinicName,
      clinicSubtitle: cfg.clinicSubtitle,
      rif: cfg.rif,
      address: cfg.address,
      phone: cfg.phone,
      logoPosition: cfg.logoPosition,
      fontFamily: cfg.fontFamily,
      borderColor: cfg.borderColor,
      orientation: cfg.orientation,
      showQrCode: cfg.showQrCode,
      showDigitalSignature: cfg.showDigitalSignature,
      showWetStamp: cfg.showWetStamp,
      footerNote: cfg.footerNote,
      backgroundTemplateDataUrl: cfg.backgroundTemplateDataUrl,
      hideDefaultHeaderOnBg: cfg.hideDefaultHeaderOnBg,
      contentTopPaddingPx: cfg.contentTopPaddingPx,
      contentBottomPaddingPx: cfg.contentBottomPaddingPx,
      backgroundOpacity: cfg.backgroundOpacity,
    });
  },

  async fetchPatient360(patientId: string): Promise<Partial<Patient> | null> {
    if (!hasRealAuthSession()) return null;
    try {
      const raw = await medicareApi.getPatientById(patientId);
      const res = raw as AnyRecord;
      const rawVitals = (Array.isArray(res.vitalsHistory) ? res.vitalsHistory : []) as AnyRecord[];
      const rawConsults = (Array.isArray(res.consultations) ? res.consultations : []) as AnyRecord[];
      const rawVaccines = (Array.isArray(res.vaccines) ? res.vaccines : []) as AnyRecord[];
      const rawStudies = (Array.isArray(res.studies) ? res.studies : []) as AnyRecord[];

      const patientSex = (String(
        pick((res.patient || {}) as AnyRecord, 'sex', 'Sex', 'M')
      ).toUpperCase() === 'F'
        ? 'F'
        : 'M') as 'M' | 'F';

      const growthHistory = [...rawVitals]
        .reverse()
        .map((v, idx) => {
          const recRaw = String(pick(v, 'recordedAt', 'RecordedAt', ''));
          const date = recRaw.includes('T') ? recRaw.split('T')[0] : recRaw;
          const ageMonths = Number(pick(v, 'ageMonths', 'AgeMonths', idx));
          const weightKg = Number(pick(v, 'weightKg', 'WeightKg', 0));
          const heightCm = Number(pick(v, 'heightCm', 'HeightCm', 0));
          const headCircumferenceCm = Number(
            pick(v, 'headCircumferenceCm', 'HeadCircumferenceCm', 0)
          );
          const oms = evaluateOmsStatus(
            weightKg,
            heightCm,
            ageMonths,
            patientSex,
            headCircumferenceCm
          );
          return {
            date,
            ageMonths,
            weightKg,
            heightCm,
            headCircumferenceCm,
            bmi: calculateBmi(weightKg, heightCm),
            percentileWeight: oms.weightPercentile,
            percentileHeight: oms.heightPercentile,
          };
        });

      const latestVitalsRaw = rawVitals[0];
      const latestVitals: VitalSigns | undefined = latestVitalsRaw
        ? {
            weightKg: Number(pick(latestVitalsRaw, 'weightKg', 'WeightKg', 0)),
            heightCm: Number(pick(latestVitalsRaw, 'heightCm', 'HeightCm', 0)),
            headCircumferenceCm: Number(
              pick(latestVitalsRaw, 'headCircumferenceCm', 'HeadCircumferenceCm', 0)
            ),
            temperatureC: Number(pick(latestVitalsRaw, 'temperatureC', 'TemperatureC', 36.8)),
            heartRateBpm: Number(pick(latestVitalsRaw, 'heartRateBpm', 'HeartRateBpm', 100)),
            spo2Percent: Number(pick(latestVitalsRaw, 'spo2Percent', 'Spo2Percent', 98)),
            systolicBp: Number(pick(latestVitalsRaw, 'systolicBp', 'SystolicBp', 95)),
            diastolicBp: Number(pick(latestVitalsRaw, 'diastolicBp', 'DiastolicBp', 60)),
            recordedAt: String(pick(latestVitalsRaw, 'recordedAt', 'RecordedAt', '')).split('T')[0],
            recordedBy: 'Triaje / Consulta',
          }
        : undefined;

      const consultations: PastConsultationSummary[] = rawConsults.map((c, idx) => {
        const cDateRaw = String(pick(c, 'consultationDate', 'ConsultationDate', ''));
        const cDate = cDateRaw.includes('T') ? cDateRaw.split('T')[0] : cDateRaw;
        const matchingVital =
          rawVitals.find((v) =>
            String(pick(v, 'recordedAt', 'RecordedAt', '')).startsWith(cDate)
          ) || rawVitals[idx];
        let alarmSigns: string[] = [];
        try {
          const rawAlarms = pick<unknown>(c, 'alarmSignsJson', 'AlarmSignsJson', '[]');
          alarmSigns = typeof rawAlarms === 'string' ? JSON.parse(rawAlarms) : Array.isArray(rawAlarms) ? rawAlarms : [];
        } catch {
          alarmSigns = [];
        }
        const rawRx = (Array.isArray(c.prescriptions) ? c.prescriptions : Array.isArray(c.Prescriptions) ? c.Prescriptions : []) as AnyRecord[];
        const tplRaw = (c.recipeTemplate ?? c.RecipeTemplate ?? null) as AnyRecord | null;
        return {
          id: String(pick(c, 'id', 'Id', `cons-${idx}`)),
          date: cDate,
          specialty: 'Pediatría',
          doctorId: String(pick(c, 'doctorUserId', 'DoctorUserId', '')),
          doctorName: String(pick(c, 'doctorName', 'DoctorName', 'Médico Tratante')),
          doctorLicense: pick<string | undefined>(c, 'doctorLicense', 'DoctorLicense', undefined),
          hasDiagnosisAccess:
            c.hasDiagnosisAccess !== undefined ? Boolean(c.hasDiagnosisAccess) : true,
          reason: String(pick(c, 'reason', 'Reason', '')),
          cie10Code: String(pick(c, 'cie10Code', 'Cie10Code', '')),
          cie10Name: String(pick(c, 'cie10Name', 'Cie10Name', '')),
          weightKg: matchingVital ? Number(pick(matchingVital, 'weightKg', 'WeightKg', 0)) : 0,
          heightCm: matchingVital ? Number(pick(matchingVital, 'heightCm', 'HeightCm', 0)) : 0,
          temperatureC: matchingVital
            ? Number(pick(matchingVital, 'temperatureC', 'TemperatureC', 36.8))
            : 36.8,
          bloodPressure: matchingVital
            ? `${pick(matchingVital, 'systolicBp', 'SystolicBp', 95)}/${pick(matchingVital, 'diastolicBp', 'DiastolicBp', 60)}`
            : '95/60',
          physicalExamSummary: String(pick(c, 'physicalExamSummary', 'PhysicalExamSummary', '') || ''),
          prescriptions: rawRx.map((rx, rIdx) => ({
            id: String(pick(rx, 'id', 'Id', `rx-${idx}-${rIdx}`)),
            medicationName: String(pick(rx, 'medicationName', 'MedicationName', '')),
            presentation: String(pick(rx, 'presentation', 'Presentation', '')),
            dosePerTake: String(pick(rx, 'dosePerTake', 'DosePerTake', '')),
            frequencyHours: String(pick(rx, 'frequencyHours', 'FrequencyHours', '')),
            durationDays: String(pick(rx, 'durationDays', 'DurationDays', '')),
            specialInstructions: String(pick(rx, 'specialInstructions', 'SpecialInstructions', '')),
            calculatedMgPerKg: pick<string | undefined>(rx, 'calculatedMgPerKg', 'CalculatedMgPerKg', undefined),
          })),
          parentGuide: String(pick(c, 'patientGuide', 'PatientGuide', '') || ''),
          alarmSigns,
          recipeTemplate: tplRaw
            ? {
                clinicName: pick<string | undefined>(tplRaw, 'clinicName', 'ClinicName', undefined),
                clinicSubtitle: pick<string | undefined>(tplRaw, 'clinicSubtitle', 'ClinicSubtitle', undefined),
                rif: pick<string | undefined>(tplRaw, 'rif', 'Rif', undefined),
                address: pick<string | undefined>(tplRaw, 'address', 'Address', undefined),
                phone: pick<string | undefined>(tplRaw, 'phone', 'Phone', undefined),
                footerNote: pick<string | undefined>(tplRaw, 'footerNote', 'FooterNote', undefined),
                borderColor: pick<RecipeTemplateConfig['borderColor']>(
                  tplRaw,
                  'borderColor',
                  'BorderColor',
                  '#0284C7'
                ),
              }
            : undefined,
        };
      });

      const vaccines = rawVaccines.map((v, idx) => {
        const milestoneMonths = Number(pick(v, 'milestoneMonths', 'MilestoneMonths', 0));
        return {
          id: String(pick(v, 'id', 'Id', `vac-${idx}`)),
          vaccineId: String(pick(v, 'vaccineId', 'VaccineId', '')),
          vaccineName: String(pick(v, 'commercialName', 'CommercialName', 'Vacuna')),
          doseLabel: String(pick(v, 'doseLabel', 'DoseLabel', 'Dosis')),
          doseNumber: String(pick(v, 'doseNumber', 'DoseNumber', `${idx + 1}ª Dosis`)),
          milestoneMonths,
          milestoneLabel: String(
            pick(
              v,
              'milestoneLabel',
              'MilestoneLabel',
              milestoneMonths === 0 ? 'Recién Nacido' : `${milestoneMonths} meses`
            )
          ),
          status: (() => {
            const rawStatus = String(pick(v, 'status', 'Status', 'aplicada')).toLowerCase();
            if (rawStatus === 'futura') return 'futura';
            if (rawStatus === 'pendiente' || rawStatus === 'atrasada') return 'pendiente';
            return 'aplicada';
          })() as 'aplicada' | 'futura' | 'pendiente',
          appliedDate: pick<string | undefined>(v, 'appliedDate', 'AppliedDate', undefined)
            ? String(pick(v, 'appliedDate', 'AppliedDate', '')).split('T')[0]
            : undefined,
          lotNumber: pick<string | undefined>(v, 'lotNumber', 'LotNumber', undefined),
          appliedBy: pick<string | undefined>(v, 'appliedBy', 'AppliedBy', undefined),
        };
      });

      const studies: MedicalStudyFile[] = rawStudies.map((s, idx) => ({
        id: String(pick(s, 'id', 'Id', `std-${idx}`)),
        title: String(pick(s, 'title', 'Title', 'Estudio')),
        category: (pick(s, 'category', 'Category', 'Laboratorio PDF') as MedicalStudyFile['category']),
        date: String(pick(s, 'studyDate', 'StudyDate', '')).split('T')[0],
        summary: String(pick(s, 'summary', 'Summary', '')),
        imageUrl: pick<string | undefined>(s, 'imageUrl', 'ImageUrl', undefined),
        valuesHighlight: pick<string | undefined>(s, 'valuesHighlight', 'ValuesHighlight', undefined),
      }));

      return {
        latestVitals,
        growthHistory,
        consultations,
        vaccines,
        studies,
      };
    } catch {
      return null;
    }
  },

  async updatePatient(id: string, patient: Omit<Patient, 'id' | 'historyNumber'>) {
    if (!hasRealAuthSession()) return;
    await medicareApi.updatePatient(id, {
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
    vitals: VitalSigns,
    appointmentId?: string
  ) {
    if (!hasRealAuthSession()) return;
    const isUuid = Boolean(
      appointmentId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appointmentId)
    );
    await medicareApi.completeConsultation({
      patientId,
      appointmentId: isUuid ? appointmentId : undefined,
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
