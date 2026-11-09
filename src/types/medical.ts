export type Specialty =
  | 'Pediatría'
  | 'Ginecología'
  | 'Medicina Interna / Cardiología'
  | 'Traumatología'
  | 'Dermatología';

export type ViewId =
  | 'login'                  // Vista 1: Login Multi-Tenant (/login)
  | 'recuperar-password'     // Vista 2: Recuperación de Contraseña (/recuperar-password)
  | 'reset-password'         // Vista 3: Restablecer Contraseña (/reset-password)
  | 'onboarding'             // Vista 4: Onboarding y Setup Inicial (/onboarding)
  | 'perfil'                 // Vista 5: Perfil del Médico (/perfil)
  | 'auditoria'              // Vista 6: Registro de Auditoría (/seguridad/auditoria)
  | 'agenda'                 // Vista 7: Agenda Médica (/agenda)
  | 'sala-espera'            // Vista 8: Sala de Espera Virtual (/sala-espera) + Vista 9 Modal Triaje
  | 'pacientes'              // Vista 10: Directorio General de Pacientes (/pacientes)
  | 'paciente-detalle'       // Vista 11: Ficha Integral del Paciente 360° (/pacientes/:id)
  | 'paciente-nuevo'         // Vista 12: Formulario de Registro de Nuevo Paciente (/pacientes/nuevo)
  | 'vacunas-carnet'         // Vista 13: Carnet Digital de Vacunación (/pacientes/:id/vacunas) + Vista 14 Modal Dosis
  | 'vacunas-catalogo'       // Vista 15: Catálogo Maestro de Vacunas (/configuracion/vacunas)
  | 'consulta-activa'        // Vista 16: Puesto de Consulta Médica Activa (/consulta/:id) + Vista 17 Modal Despacho
  | 'caja'                   // Vista 18: Cuaderno de Caja y Cobros (/caja)
  | 'caja-recibos'           // Vista 19: Emisión y Control de Recibos (/caja/recibos)
  | 'reportes'               // Vista 20: Dashboard Estadístico (/reportes)
  | 'epidemiologia'          // Vista 21: Reporte Epidemiológico (/reportes/epidemiologia)
  | 'configuracion'          // Vista 22: Ajustes de la Clínica (/configuracion)
  | 'plantillas'             // Vista 23: Diseñador de Plantillas (/configuracion/plantillas)
  | 'suscripcion';           // Vista 24: Mi Suscripción SaaS (/configuracion/suscripcion)

export interface VitalSigns {
  weightKg: number;
  heightCm: number;
  headCircumferenceCm?: number;
  temperatureC: number;
  heartRateBpm: number;
  spo2Percent: number;
  systolicBp: number;
  diastolicBp: number;
  recordedAt: string;
  recordedBy: string;
}

export interface PerinatalRecord {
  gestationalWeeks: number;
  apgar1Min: number;
  apgar5Min: number;
  birthWeightKg: number;
  birthHeightCm: number;
  birthHeadCircumferenceCm: number;
  deliveryType: 'Parto Eutócico Simple' | 'Cesárea Segmentaria' | 'Parto Instrumental';
  neonatalComplications: string;
  maternalBloodType: string;
  exclusiveBreastfeedingMonths: number;
}

export interface GrowthMeasurement {
  date: string;
  ageMonths: number;
  weightKg: number;
  heightCm: number;
  headCircumferenceCm?: number;
  bmi: number;
  percentileWeight: string;
  percentileHeight: string;
}

export interface VaccineDoseRecord {
  id: string;
  vaccineId: string;
  vaccineName: string;
  milestoneLabel: string;
  milestoneMonths: number;
  doseNumber: string;
  status: 'aplicada' | 'pendiente' | 'futura';
  appliedDate?: string;
  batchNumber?: string;
  manufacturer?: string;
  appliedBy?: string;
  observations?: string;
}

export interface MasterVaccineItem {
  id: string;
  commercialName: string;
  genericName: string;
  dosesRequired: number;
  recommendedAges: string;
  route: 'Intramuscular (IM)' | 'Oral (VO)' | 'Subcutánea (SC)' | 'Intradérmica (ID)';
  active: boolean;
}

export interface MedicalStudyFile {
  id: string;
  title: string;
  category: 'Ecografía' | 'Laboratorio PDF' | 'Radiografía' | 'Informe Especialista';
  date: string;
  summary: string;
  imageUrl?: string;
  valuesHighlight?: string;
}

export interface PrescriptionItem {
  id: string;
  medicationName: string;
  presentation: string;
  dosePerTake: string;
  frequencyHours: string;
  durationDays: string;
  specialInstructions: string;
  calculatedMgPerKg?: string;
}

export interface PastConsultationSummary {
  id: string;
  date: string;
  specialty: Specialty;
  doctorName: string;
  reason: string;
  cie10Code: string;
  cie10Name: string;
  weightKg: number;
  heightCm: number;
  temperatureC: number;
  bloodPressure: string;
  physicalExamSummary: string;
  prescriptions: PrescriptionItem[];
  parentGuide: string;
  alarmSigns: string[];
}

export interface Patient {
  id: string;
  historyNumber: string;
  firstName: string;
  lastName: string;
  sex: 'M' | 'F';
  birthDate: string;
  idDocument?: string;
  bloodType: 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';
  primarySpecialty: Specialty;
  criticalAllergies: string[];
  chronicConditions: string[];
  previousHospitalizations: string;
  guardianName: string;
  guardianRelation: 'Madre' | 'Padre' | 'Representante Legal' | 'Titular / Paciente Adulto';
  guardianIdDocument: string;
  guardianOccupation: string;
  guardianWhatsapp: string;
  guardianEmail: string;
  perinatal: PerinatalRecord;
  growthHistory: GrowthMeasurement[];
  vaccines: VaccineDoseRecord[];
  studies: MedicalStudyFile[];
  consultations: PastConsultationSummary[];
  latestVitals?: VitalSigns;
}

export type AppointmentType = 'control' | 'urgencia' | 'vacunacion' | 'primera_vez';

export type WaitingRoomStage = 'programado' | 'en_sala' | 'en_triaje' | 'en_consulta' | 'completado';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientAgeLabel: string;
  guardianName: string;
  guardianWhatsapp: string;
  doctorName: string;
  specialty: Specialty;
  date: string;
  time: string;
  durationMinutes: number;
  type: AppointmentType;
  reason: string;
  stage: WaitingRoomStage;
  waitingMinutes: number;
  triageVitals?: VitalSigns;
}

export interface PaymentRecord {
  id: string;
  receiptNumber: string;
  date: string;
  time: string;
  patientId: string;
  patientName: string;
  guardianName: string;
  guardianIdDocument: string;
  doctorName: string;
  specialty: Specialty;
  concept: 'Consulta Especializada' | 'Control de Niño Sano' | 'Esquema de Vacunación' | 'Certificado Médico' | 'Ecografía Diagnóstica';
  cie10Code: string;
  cie10Name: string;
  amountUsd: number;
  bcvRate: number;
  amountVes: number;
  method: 'Pago Móvil' | 'Punto de Venta' | 'Efectivo USD' | 'Zelle';
  reference: string;
  insuranceCompany?: 'Mercantil Seguros' | 'Seguros Caracas' | 'Seguros Pirámide' | 'Mapfre' | 'Particular (Sin Seguro)';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  role: 'Médico Especialista' | 'Enfermera de Triaje' | 'Recepción / Caja' | 'Administrador Tenant';
  action: 'Creación de Consulta' | 'Modificación de Diagnóstico' | 'Consulta de Carnet de Vacunas' | 'Descarga de PDF' | 'Aplicación de Dosis' | 'Actualización de Tasa BCV';
  patientName: string;
  ipAddress: string;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
}

export interface RecipeTemplateConfig {
  clinicName: string;
  clinicSubtitle: string;
  rif: string;
  address: string;
  phone: string;
  logoPosition: 'left' | 'center' | 'right';
  fontFamily: 'Plus Jakarta Sans' | 'Serif Clásico' | 'Monospace Clínico';
  borderColor: '#0284C7' | '#059669' | '#7C3AED' | '#0F172A';
  showQrCode: boolean;
  showDigitalSignature: boolean;
  showWetStamp: boolean;
  footerNote: string;
}

export interface ClinicTenantConfig {
  businessName: string;
  subdomain: string;
  rif: string;
  phone: string;
  email: string;
  address: string;
  activeSpecialties: Specialty[];
  scheduleWeekdays: string;
  scheduleSaturdays: string;
  billingCurrency: 'USD' | 'VES';
  autoSyncBcv: boolean;
  bcvRate: number;
}
