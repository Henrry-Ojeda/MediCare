export interface VitalSigns {
  weightKg: number;
  heightCm: number;
  headCircumferenceCm?: number;
  temperatureC: number;
  heartRateBpm: number;
  respiratoryRateRpm?: number;
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

export interface MedicalStudyFile {
  id: string;
  title: string;
  category: 'Ecografía' | 'Laboratorio PDF' | 'Radiografía' | 'Informe Especialista';
  date: string;
  summary: string;
  imageUrl?: string;
  valuesHighlight?: string;
}
