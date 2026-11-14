export interface PediatricDrugFormula {
  name: string;
  presentation: string;
  mgPerKgPerDay: number;
  concentrationMgPerMl: number;
  frequencyHours: number;
  defaultDurationDays: number;
  specialInstructions: string;
  contraindicationKeywords?: string[];
}

export interface DictationAiResult {
  motivoConsulta?: string;
  examenFisico?: {
    general?: string;
    cabezaCuello?: string;
    cardiopulmonar?: string;
    abdomen?: string;
    extremidades?: string;
  };
  cie10Code?: string;
  cie10Name?: string;
  medicamentos?: {
    nombre?: string;
    presentacion?: string;
    dosisPorToma?: string;
    frecuenciaHoras?: string;
    duracionDias?: string;
    indicacionEspecial?: string;
  }[];
  guiaPadres?: string;
  signosAlarma?: string[];
}
