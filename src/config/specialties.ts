import type { Specialty } from '../types/medical';

export interface SpecialtyRecordField {
  key: string;
  label: string;
  placeholder: string;
}

export interface SpecialtyConfig {
  code: string;
  name: Specialty;
  saasModuleCode: string;
  supportsPerinatal: boolean;
  supportsGrowthCurve: boolean;
  supportsPediatricVaccines: boolean;
  guideLabel: string;
  examSections: string[];
  recordFields: SpecialtyRecordField[];
  accentColor: string;
}

export const SPECIALTY_REGISTRY: Record<Specialty, SpecialtyConfig> = {
  'Medicina General': {
    code: 'MEDICINA_GENERAL',
    name: 'Medicina General',
    saasModuleCode: 'esp_medicina_general',
    supportsPerinatal: false,
    supportsGrowthCurve: false,
    supportsPediatricVaccines: false,
    guideLabel: 'Indicaciones médicas y referencia',
    examSections: ['General', 'Cabeza y Cuello', 'Cardiopulmonar', 'Abdomen', 'Extremidades'],
    recordFields: [
      { key: 'motivoIngreso', label: 'Evaluación Integral / Triaje Base', placeholder: 'Ej. Chequeo general y solicitud de perfil lipídico' },
      { key: 'habitos', label: 'Hábitos y Estilo de Vida', placeholder: 'Ej. Dieta balanceada, actividad física moderada' },
      { key: 'antecedentesFamiliares', label: 'Antecedentes Familiares Relevantes', placeholder: 'Ej. Padre con HTA, madre con DM2' },
      { key: 'referenciaEspecialista', label: 'Especialista Recomendado', placeholder: 'Ej. Cardiología / Traumatología según resultados' },
    ],
    accentColor: '#0F766E',
  },
  Pediatría: {
    code: 'PEDIATRIA',
    name: 'Pediatría',
    saasModuleCode: 'esp_pediatria',
    supportsPerinatal: true,
    supportsGrowthCurve: true,
    supportsPediatricVaccines: true,
    guideLabel: 'Guía para padres y cuidadores',
    examSections: ['General', 'Cabeza y Cuello', 'Cardiopulmonar', 'Abdomen', 'Extremidades'],
    recordFields: [],
    accentColor: '#0284C7',
  },
  Ginecología: {
    code: 'GINECOLOGIA',
    name: 'Ginecología',
    saasModuleCode: 'esp_ginecologia',
    supportsPerinatal: false,
    supportsGrowthCurve: false,
    supportsPediatricVaccines: false,
    guideLabel: 'Indicaciones y plan para la paciente',
    examSections: ['General', 'Mamas', 'Abdomen / Pelvis', 'Especuloscopía / Tacto', 'Extremidades'],
    recordFields: [
      { key: 'menarquia', label: 'Menarquia / Ciclo', placeholder: 'Ej. 12 años · Ciclos 28/4 regulares' },
      { key: 'fum', label: 'FUM (Última Menstruación)', placeholder: 'Ej. 2026-10-22' },
      { key: 'gestas', label: 'Fórmula Obstétrica (G/P/C/A)', placeholder: 'Ej. G2 P1 C1 A0' },
      { key: 'citologia', label: 'Última Citología / VPH', placeholder: 'Ej. Negativa para lesión intraepitelial (2026)' },
      { key: 'anticoncepcion', label: 'Método Anticonceptivo', placeholder: 'Ej. DIU hormonal / Ninguno' },
    ],
    accentColor: '#DB2777',
  },
  'Medicina Interna / Cardiología': {
    code: 'CARDIOLOGIA',
    name: 'Medicina Interna / Cardiología',
    saasModuleCode: 'esp_cardiologia',
    supportsPerinatal: false,
    supportsGrowthCurve: false,
    supportsPediatricVaccines: false,
    guideLabel: 'Plan terapéutico y signos de alarma',
    examSections: ['General', 'Cuello / Yugular', 'Ruidos Cardíacos y Pulmonares', 'Abdomen', 'Pulsos Periféricos'],
    recordFields: [
      { key: 'riesgoCv', label: 'Riesgo Cardiovascular', placeholder: 'Ej. Moderado · SCORE2 6%' },
      { key: 'htaControl', label: 'Control de HTA / Dislipidemia', placeholder: 'Ej. Losartán 50 mg/día · Meta < 130/80' },
      { key: 'ecg', label: 'Último Electrocardiograma (ECG)', placeholder: 'Ej. Ritmo sinusal 72 lpm, sin bloqueos' },
      { key: 'ecocardio', label: 'Ecocardiograma / FEVI', placeholder: 'Ej. FEVI 62%, sin valvulopatías' },
      { key: 'habitos', label: 'Hábitos Tabáquicos / Actividad', placeholder: 'Ej. No fumador · Caminata 30 min/día' },
    ],
    accentColor: '#DC2626',
  },
  Traumatología: {
    code: 'TRAUMATOLOGIA',
    name: 'Traumatología',
    saasModuleCode: 'esp_traumatologia',
    supportsPerinatal: false,
    supportsGrowthCurve: false,
    supportsPediatricVaccines: false,
    guideLabel: 'Indicaciones de reposo y rehabilitación',
    examSections: ['Inspección', 'Palpación Ósea', 'Arcos de Movilidad', 'Fuerza Muscular', 'Neurovascular Distal'],
    recordFields: [
      { key: 'zonaAfectada', label: 'Región Anatómica Principal', placeholder: 'Ej. Rodilla derecha / Columna lumbar' },
      { key: 'lesionPrevia', label: 'Fracturas o Lesiones Previas', placeholder: 'Ej. Esguince grado II tobillo izq. (2024)' },
      { key: 'cirugias', label: 'Cirugías / Osteosíntesis', placeholder: 'Ej. Artroscopia LCA 2023' },
      { key: 'imagenologia', label: 'Última Radiografía / RMN', placeholder: 'Ej. RMN sin ruptura meniscal' },
      { key: 'fisioterapia', label: 'Plan de Fisioterapia', placeholder: 'Ej. 10 sesiones fortalecimiento cuádriceps' },
    ],
    accentColor: '#D97706',
  },
  Dermatología: {
    code: 'DERMATOLOGIA',
    name: 'Dermatología',
    saasModuleCode: 'esp_dermatologia',
    supportsPerinatal: false,
    supportsGrowthCurve: false,
    supportsPediatricVaccines: false,
    guideLabel: 'Cuidados dermatológicos y fotoprotección',
    examSections: ['Topografía', 'Morfología de Lesión', 'Dermatoscopía', 'Anexos (Pelo/Uñas)', 'Mucosas'],
    recordFields: [
      { key: 'fototipo', label: 'Fototipo Fitzpatrick', placeholder: 'Ej. Tipo III' },
      { key: 'topografia', label: 'Topografía / Distribución', placeholder: 'Ej. Región malar y dorso nasal' },
      { key: 'dermatoscopia', label: 'Hallazgos Dermatoscópicos', placeholder: 'Ej. Red pigmentada regular, sin atipia' },
      { key: 'fotoproteccion', label: 'Rutina de Fotoprotección', placeholder: 'Ej. FPS 50+ cada 3 horas' },
      { key: 'biopsia', label: 'Biopsias / Antecedentes Oncología Cutánea', placeholder: 'Ej. Sin lesiones sospechosas' },
    ],
    accentColor: '#7C3AED',
  },
};

export function getSpecialtyConfig(specialty: Specialty): SpecialtyConfig {
  return SPECIALTY_REGISTRY[specialty] || SPECIALTY_REGISTRY['Pediatría'];
}

