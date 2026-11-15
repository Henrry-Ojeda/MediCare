import { SpecialtyModuleConfig } from '../../types/specialty.types';

export const SPECIALTY_REGISTRY: Record<string, SpecialtyModuleConfig> = {
  pediatria: {
    id: 'pediatria',
    name: 'Pediatría y Puericultura',
    activeInSprint: true,
    accentColor: '#0284C7',
    supportsPerinatal: true,
    supportsGrowthCurve: true,
    supportsPediatricVaccines: true,
    guideLabel: 'Guía y Cuidados para los Padres',
    examSections: [
      { id: 'general', label: 'Aspecto General / Hidratación' },
      { id: 'cabezaCuello', label: 'Cabeza, ORL y Cuello' },
      { id: 'cardiopulmonar', label: 'Cardiopulmonar' },
      { id: 'abdomen', label: 'Abdomen' },
      { id: 'extremidades', label: 'Extremidades / Neurológico' },
    ],
  },
};

export const ACTIVE_SPECIALTIES = Object.values(SPECIALTY_REGISTRY).filter((s) => s.activeInSprint);
