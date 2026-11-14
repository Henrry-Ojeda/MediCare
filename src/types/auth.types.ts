export type UserRole = 'PEDIATRA' | 'ASISTENTE' | 'ADMIN';

export interface DoctorSignatureConfig {
  doctorName: string;
  specialtyLabel: string;
  mppsNumber: string;
  colegioNumber: string;
  signatureDataUrl?: string;
  wetStampDataUrl?: string;
  useDigitalSignature: boolean;
  useWetStamp: boolean;
}

export interface AuthUser {
  id: string;
  username?: string;
  name: string;
  email: string;
  role: UserRole;
  roleCode: string;
  roleName: string;
  esSuperAdmin?: boolean;
  specialty?: string;
  licenseNumber?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  active: boolean;
  assignedDoctorIds?: string[];
}
