import { SpecialtyModuleConfig } from '../../types/specialty.types';

export interface SpecialtyPluginMeta extends SpecialtyModuleConfig {
  code: string;
  shortLabel: string;
  isPediatricOnly?: boolean;
}

export const SPECIALTY_REGISTRY: Record<string, SpecialtyPluginMeta> = {
  pediatria: {
    id: 'pediatria',
    code: 'PEDIATRIA',
    shortLabel: 'Pediatría',
    name: 'Pediatría y Puericultura',
    activeInSprint: true,
    isPediatricOnly: true,
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
  gastroenterologia: {
    id: 'gastroenterologia',
    code: 'GASTROENTEROLOGIA',
    shortLabel: 'Gastroenterología',
    name: 'Gastroenterología y Endoscopia',
    activeInSprint: true,
    isPediatricOnly: false,
    accentColor: '#059669',
    supportsPerinatal: false,
    supportsGrowthCurve: false,
    supportsPediatricVaccines: false,
    guideLabel: 'Plan dietético e indicaciones digestivas',
    examSections: [
      { id: 'bristol', label: 'Escala de Bristol' },
      { id: 'quadrants', label: 'Dolor por Cuadrantes' },
      { id: 'intolerances', label: 'Intolerancias Alimentarias' },
      { id: 'endoscopy', label: 'Antecedentes Endoscópicos' },
    ],
  },
};

export const ACTIVE_SPECIALTIES = Object.values(SPECIALTY_REGISTRY).filter((s) => s.activeInSprint);

/**
 * Resuelve los plugins de especialidad activos para una consulta (N:M componible).
 * Si el médico tiene múltiples especialidades (ej. Pediatría + Gastro),
 * apaga automáticamente los plugins exclusivos pediátricos cuando el paciente es adulto (>= 18 años).
 */
export function resolveActiveSpecialtyPlugins(
  doctorSpecialtyCodes: string[] = ['PEDIATRIA'],
  patientAgeMonths: number,
  manualSelection?: string[]
): SpecialtyPluginMeta[] {
  const normalizedDoctor = doctorSpecialtyCodes.map((c) => c.trim().toLowerCase());
  const sourceCodes =
    manualSelection && manualSelection.length > 0
      ? manualSelection.map((c) => c.trim().toLowerCase())
      : normalizedDoctor;

  const isAdult = patientAgeMonths >= 216;
  const matched = sourceCodes
    .map((code) => SPECIALTY_REGISTRY[code])
    .filter((plugin): plugin is SpecialtyPluginMeta => Boolean(plugin && plugin.activeInSprint))
    .filter((plugin) => {
      if (manualSelection && manualSelection.length > 0) return true;
      if (isAdult && plugin.isPediatricOnly && sourceCodes.length > 1) return false;
      return true;
    });

  return matched.length > 0 ? matched : [SPECIALTY_REGISTRY.pediatria];
}
