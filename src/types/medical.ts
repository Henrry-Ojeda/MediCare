export type Specialty =
  | 'Medicina General'
  | 'Pediatría'
  | 'Ginecología'
  | 'Medicina Interna / Cardiología'
  | 'Traumatología'
  | 'Dermatología';

export type ViewId =
  | 'login'                  // Login Institucional
  | 'dashboard'              // Dashboard Pediátrico Unificado
  | 'recuperar-password'     // Recuperación de Contraseña (Sprint 2)
  | 'reset-password'         // Restablecer Contraseña (Sprint 2)
  | 'onboarding'             // Onboarding y Setup Inicial (Sprint 2)
  | 'perfil'                 // Perfil de Usuario
  | 'firma-medico'           // Firma del Médico y Sello Digital
  | 'admin-usuarios'         // Gestión de Personal y Asistentes (Admin)
  | 'admin-doctores'         // CRUD de Doctores (Admin)
  | 'admin-asistentes'       // CRUD de Asistentes y Asignación M:N (Admin)
  | 'admin-clinicas'         // CRUD de Clínicas y Asociación Clínica-Médico-Asistente (Admin)
  | 'auditoria'              // Registro de Auditoría (Sprint 2)
  | 'agenda'                 // Agenda Médica
  | 'sala-espera'            // Sala de Espera / Triaje
  | 'pacientes'              // Directorio de Pacientes
  | 'paciente-detalle'       // Historial Clínico 360° Pediátrico
  | 'paciente-nuevo'         // Registro de Nuevo Paciente
  | 'vacunas-carnet'         // Carnet Digital de Vacunación
  | 'vacunas-catalogo'       // Catálogo Maestro de Vacunas
  | 'consulta-activa'        // Consulta Pediátrica + Dictado Clínico IA
  | 'caja'                   // Cuaderno de Caja BCV (Sprint 2)
  | 'caja-recibos'           // Recibos de Seguros (Sprint 2)
  | 'reportes'               // Dashboard Estadístico Avanzado (Sprint 2)
  | 'epidemiologia'          // Reporte Epidemiológico (Sprint 2)
  | 'configuracion'          // Ajustes de la Clínica
  | 'plantillas'             // Diseñador de Plantillas WYSIWYG (Sprint 2)
  | 'suscripcion';           // Suscripción SaaS (Sprint 2)

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
  doctorId?: string;
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

export interface DiagnosisPermission {
  id: string;
  patientId: string;
  consultationId?: string;
  grantedByDoctor: string;
  grantedBySpecialty: Specialty;
  targetSpecialty: Specialty;
  reason: string;
  createdAt: string;
  active: boolean;
}

export interface DiagnosisPermissionRecord {
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
  specialtyRecords?: Partial<Record<Specialty, Record<string, string>>>;
  diagnosisPermissions?: DiagnosisPermission[];
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
  doctorId?: string;
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
  doctorId?: string;
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
  logoDataUrl?: string;
  logoPosition: 'left' | 'center' | 'right';
  orientation?: 'vertical' | 'horizontal';
  fontFamily: 'Plus Jakarta Sans' | 'Serif Clásico' | 'Monospace Clínico';
  borderColor: '#0284C7' | '#059669' | '#7C3AED' | '#0F172A';
  showQrCode: boolean;
  showDigitalSignature: boolean;
  showWetStamp: boolean;
  footerNote: string;
  layoutMode?: 'vertical_split' | 'classic';
  leftColumnTitle?: string;
  rightColumnTitle?: string;
  showDiagnosisOnRecipe?: boolean;
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

export interface DoctorProfile {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  phone?: string;
  email?: string;
  username?: string;
  avatarUrl?: string;
  specialty: Specialty;
  licenseNumber: string;
}

export interface AssistantPermissions {
  canSchedule: boolean;
  canRegisterPatientInfo: boolean;
  canCollectPayments: boolean;
  canRescheduleOrCancel: boolean;
}

export interface AssistantAssignment {
  id: string;
  assistantName: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  phone?: string;
  assistantUsername: string;
  assistantEmail: string;
  mode: 'PERSONAL' | 'COMPARTIDA_CLINICA';
  assignedDoctorIds: string[];
  permissions: AssistantPermissions;
  allowedViews: ViewId[];
  active: boolean;
}

export interface ClinicAssignmentRecord {
  id: string;
  doctorId: string;
  doctorName?: string;
  assistantId?: string | null;
  assistantName?: string | null;
}

export interface ClinicProfile {
  id: string;
  name: string;
  rif?: string;
  phone?: string;
  email?: string;
  address?: string;
  active: boolean;
  assignments: ClinicAssignmentRecord[];
}

export interface BcvHistoryEntry {
  id: number | string;
  tasa: number;
  origen: string;
  recordedAt: string;
  updatedByName?: string | null;
  updatedByRole?: string | null;
}

export const ASSISTANT_GRANTABLE_VIEWS: { id: ViewId; label: string; description: string }[] = [
  { id: 'agenda', label: 'Agenda Médica', description: 'Agendar, posponer y acomodar citas' },
  { id: 'sala-espera', label: 'Sala de Espera / Triaje', description: 'Admisión y signos vitales' },
  { id: 'pacientes', label: 'Directorio de Pacientes', description: 'Buscar y consultar pacientes' },
  { id: 'paciente-nuevo', label: 'Registrar Paciente', description: 'Crear ficha administrativa' },
  { id: 'paciente-detalle', label: 'Expediente 360° (Datos)', description: 'Ver contacto y estudios' },
  { id: 'vacunas-carnet', label: 'Carnet de Vacunas', description: 'Consultar esquema de vacunas' },
  { id: 'caja', label: 'Cuaderno de Caja BCV', description: 'Cobros y facturación' },
  { id: 'caja-recibos', label: 'Recibos de Seguros', description: 'Emisión de recibos' },
];

export interface AdminAgendaPermissionRequest {
  id: string;
  requestedByAdminName: string;
  doctorId: string;
  doctorName: string;
  reason: string;
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  createdAt: string;
  resolvedAt?: string;
}
