export type SpecialtyId =
  | 'pediatria'
  | 'gastroenterologia'
  | 'medicina-general'
  | 'ginecologia'
  | 'cardiologia'
  | 'traumatologia'
  | 'dermatologia';

export interface SpecialtyModuleConfig {
  id: SpecialtyId;
  name: string;
  activeInSprint: boolean;
  accentColor: string;
  supportsPerinatal: boolean;
  supportsGrowthCurve: boolean;
  supportsPediatricVaccines: boolean;
  guideLabel: string;
  examSections: { id: string; label: string }[];
}
