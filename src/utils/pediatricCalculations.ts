import { PediatricDrugFormula } from '../types/consultation.types';
import { GrowthMeasurement } from '../types/patient.types';

// Puntos ancla OMS (edad en meses -> [mediana niños, DE niños, mediana niñas, DE niñas])
const WHO_WEIGHT_ANCHORS: [number, number, number, number, number][] = [
  [0, 3.3, 0.45, 3.2, 0.42],
  [3, 6.4, 0.72, 5.8, 0.68],
  [6, 7.9, 0.85, 7.3, 0.82],
  [12, 9.6, 1.05, 8.9, 1.0],
  [24, 12.2, 1.35, 11.5, 1.3],
  [36, 14.3, 1.65, 13.9, 1.6],
  [48, 16.3, 1.95, 16.1, 1.95],
  [60, 18.3, 2.3, 18.2, 2.35],
  [84, 22.9, 3.1, 22.4, 3.2],
  [120, 31.2, 4.8, 31.9, 5.1],
];

const WHO_HEIGHT_ANCHORS: [number, number, number, number, number][] = [
  [0, 49.9, 1.9, 49.1, 1.9],
  [3, 61.4, 2.1, 59.8, 2.1],
  [6, 67.6, 2.2, 65.7, 2.2],
  [12, 75.7, 2.5, 74.0, 2.5],
  [24, 87.8, 3.1, 86.4, 3.1],
  [36, 96.1, 3.6, 95.1, 3.6],
  [48, 103.3, 4.1, 102.7, 4.1],
  [60, 110.0, 4.5, 109.4, 4.6],
  [84, 121.7, 5.2, 120.8, 5.3],
  [120, 137.8, 6.2, 138.6, 6.4],
];

const WHO_HEAD_ANCHORS: [number, number, number, number, number][] = [
  [0, 34.5, 1.2, 33.9, 1.2],
  [3, 40.5, 1.2, 39.5, 1.2],
  [6, 43.3, 1.2, 42.2, 1.2],
  [12, 46.1, 1.3, 44.9, 1.3],
  [24, 48.3, 1.3, 47.2, 1.3],
  [36, 49.5, 1.4, 48.5, 1.4],
  [48, 50.3, 1.4, 49.3, 1.4],
  [60, 50.7, 1.4, 49.9, 1.4],
];

function interpolateWhoRef(
  anchors: [number, number, number, number, number][],
  ageMonths: number,
  sex: 'M' | 'F'
): { median: number; sd: number } {
  const clamped = Math.max(anchors[0][0], Math.min(ageMonths, anchors[anchors.length - 1][0]));
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (clamped >= a[0] && clamped <= b[0]) {
      const ratio = b[0] === a[0] ? 0 : (clamped - a[0]) / (b[0] - a[0]);
      const medIdx = sex === 'M' ? 1 : 3;
      const sdIdx = sex === 'M' ? 2 : 4;
      return {
        median: a[medIdx] + (b[medIdx] - a[medIdx]) * ratio,
        sd: a[sdIdx] + (b[sdIdx] - a[sdIdx]) * ratio,
      };
    }
  }
  const last = anchors[anchors.length - 1];
  return { median: sex === 'M' ? last[1] : last[3], sd: sex === 'M' ? last[2] : last[4] };
}

function zScoreToPercentileLabel(z: number): string {
  if (z < -2) return '< P3';
  if (z < -1) return 'P3–P15';
  if (z <= 1) return 'P15–P85';
  if (z <= 2) return 'P85–P97';
  return '> P97';
}

/**
 * Calcula la edad exacta en meses a partir de la fecha de nacimiento.
 */
export function calculateAgeInMonths(birthDateStr: string): number {
  const birth = new Date(birthDateStr);
  const now = new Date();
  if (isNaN(birth.getTime())) return 0;
  return Math.max(
    0,
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  );
}

/**
 * Formatea la edad pediátrica legible (ej. "4 años, 2 meses" o "8 meses").
 */
export function calculateExactAgeLabel(birthDateStr: string): string {
  const birth = new Date(birthDateStr);
  const now = new Date();
  if (isNaN(birth.getTime())) return 'Edad no disponible';
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years <= 0) {
    return `${Math.max(1, months)} ${months === 1 ? 'mes' : 'meses'}`;
  }
  return `${years} ${years === 1 ? 'año' : 'años'}, ${months} ${months === 1 ? 'mes' : 'meses'}`;
}

/**
 * Calcula el Índice de Masa Corporal (IMC) en kg/m².
 */
export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightMeters = heightCm / 100;
  if (heightMeters <= 0 || weightKg <= 0) return 0;
  return Number((weightKg / (heightMeters * heightMeters)).toFixed(1));
}

/**
 * Estima el estado nutricional pediátrico según estándares OMS (peso/edad, talla/edad, PC/edad).
 */
export function evaluateOmsStatus(
  weightKg: number,
  heightCm: number,
  ageMonths: number,
  sex: 'M' | 'F' = 'M',
  headCircumferenceCm?: number
): {
  bmi: number;
  statusLabel: string;
  percentileLabel: string;
  weightZ?: number;
  heightZ?: number;
  headZ?: number;
  weightPercentile: string;
  heightPercentile: string;
  headStatusLabel?: string;
} {
  const bmi = calculateBmi(weightKg, heightCm);
  if (weightKg <= 0 && heightCm <= 0) {
    return {
      bmi: 0,
      statusLabel: 'Pendiente antropometría',
      percentileLabel: 'N/A',
      weightPercentile: 'N/A',
      heightPercentile: 'N/A',
    };
  }

  const wRef = interpolateWhoRef(WHO_WEIGHT_ANCHORS, ageMonths, sex);
  const hRef = interpolateWhoRef(WHO_HEIGHT_ANCHORS, ageMonths, sex);
  const weightZ = weightKg > 0 ? Number(((weightKg - wRef.median) / wRef.sd).toFixed(2)) : undefined;
  const heightZ = heightCm > 0 ? Number(((heightCm - hRef.median) / hRef.sd).toFixed(2)) : undefined;

  let headZ: number | undefined;
  let headStatusLabel: string | undefined;
  if (headCircumferenceCm && headCircumferenceCm > 0 && ageMonths <= 60) {
    const hcRef = interpolateWhoRef(WHO_HEAD_ANCHORS, ageMonths, sex);
    headZ = Number(((headCircumferenceCm - hcRef.median) / hcRef.sd).toFixed(2));
    headStatusLabel =
      headZ < -2
        ? 'Microcefalia (< -2 DE)'
        : headZ > 2
          ? 'Macrocefalia (> +2 DE)'
          : 'PC Normal OMS';
  }

  const weightPercentile = weightZ !== undefined ? zScoreToPercentileLabel(weightZ) : 'N/A';
  const heightPercentile = heightZ !== undefined ? zScoreToPercentileLabel(heightZ) : 'N/A';

  let statusLabel = 'Eutrófico · OMS';
  if (weightZ !== undefined) {
    if (weightZ < -2) statusLabel = 'Bajo peso (< -2 DE) · OMS';
    else if (weightZ < -1) statusLabel = 'Riesgo bajo peso · OMS';
    else if (weightZ > 2) statusLabel = 'Obesidad (> +2 DE) · OMS';
    else if (weightZ > 1) statusLabel = 'Sobrepeso leve · OMS';
  }

  if (heightZ !== undefined && heightZ < -2) {
    statusLabel = `${statusLabel} / Talla baja`;
  }

  return {
    bmi,
    statusLabel,
    percentileLabel: weightPercentile,
    weightZ,
    heightZ,
    headZ,
    weightPercentile,
    heightPercentile,
    headStatusLabel,
  };
}

export interface GrowthTrendEvaluation {
  hasPrevious: boolean;
  previousDate?: string;
  monthsElapsed: number;
  deltaWeightKg: number;
  deltaHeightCm: number;
  deltaHeadCm: number;
  isNormalGrowth: boolean;
  summary: string;
  alerts: string[];
}

/**
 * Compara las medidas actuales con la última medición del historial para evaluar velocidad de crecimiento.
 */
export function evaluateGrowthTrend(
  current: { weightKg: number; heightCm: number; headCircumferenceCm?: number },
  previous: GrowthMeasurement | undefined,
  currentAgeMonths: number
): GrowthTrendEvaluation {
  if (!previous) {
    return {
      hasPrevious: false,
      monthsElapsed: 0,
      deltaWeightKg: 0,
      deltaHeightCm: 0,
      deltaHeadCm: 0,
      isNormalGrowth: true,
      summary: 'Primera medición registrada; servirá como línea base para próximas citas.',
      alerts: [],
    };
  }

  const monthsElapsed = Math.max(0.5, currentAgeMonths - previous.ageMonths);
  const deltaWeightKg = Number((current.weightKg - previous.weightKg).toFixed(2));
  const deltaHeightCm = Number((current.heightCm - previous.heightCm).toFixed(1));
  const deltaHeadCm =
    current.headCircumferenceCm && previous.headCircumferenceCm
      ? Number((current.headCircumferenceCm - previous.headCircumferenceCm).toFixed(1))
      : 0;

  const alerts: string[] = [];
  if (current.weightKg > 0 && previous.weightKg > 0) {
    if (deltaWeightKg < 0) {
      alerts.push(`Pérdida de peso (${deltaWeightKg} kg) respecto a ${previous.date}`);
    } else if (monthsElapsed >= 1 && currentAgeMonths <= 12 && deltaWeightKg / monthsElapsed < 0.2) {
      alerts.push('Ganancia ponderal lenta para la edad (< 200 g/mes)');
    }
  }

  if (current.heightCm > 0 && previous.heightCm > 0 && deltaHeightCm < 0) {
    alerts.push('Verificar talla: menor que en la cita anterior');
  } else if (
    current.heightCm > 0 &&
    previous.heightCm > 0 &&
    monthsElapsed >= 2 &&
    currentAgeMonths <= 24 &&
    deltaHeightCm / monthsElapsed < 0.4
  ) {
    alerts.push('Velocidad de crecimiento lineal baja para menor de 2 años');
  }

  if (
    current.headCircumferenceCm &&
    previous.headCircumferenceCm &&
    currentAgeMonths <= 24 &&
    deltaHeadCm < 0
  ) {
    alerts.push('Verificar perímetro cefálico: menor que en cita previa');
  }

  const isNormalGrowth = alerts.length === 0;
  const parts: string[] = [];
  if (current.weightKg > 0 && previous.weightKg > 0) {
    parts.push(`Peso ${deltaWeightKg >= 0 ? '+' : ''}${deltaWeightKg} kg`);
  }
  if (current.heightCm > 0 && previous.heightCm > 0) {
    parts.push(`Talla ${deltaHeightCm >= 0 ? '+' : ''}${deltaHeightCm} cm`);
  }
  if (current.headCircumferenceCm && previous.headCircumferenceCm) {
    parts.push(`PC ${deltaHeadCm >= 0 ? '+' : ''}${deltaHeadCm} cm`);
  }

  return {
    hasPrevious: true,
    previousDate: previous.date,
    monthsElapsed,
    deltaWeightKg,
    deltaHeightCm,
    deltaHeadCm,
    isNormalGrowth,
    summary: isNormalGrowth
      ? `Crecimiento normal respecto a ${previous.date}: ${parts.join(' · ')}`
      : `Atención en tendencia respecto a ${previous.date}: ${parts.join(' · ')}`,
    alerts,
  };
}

/**
 * Calcula la dosis pediátrica exacta por toma en ml y mg según el peso corporal.
 */
export function calculatePediatricDose(formula: PediatricDrugFormula, weightKg: number) {
  const safeWeight = Math.max(1, weightKg);
  const dosesPerDay = 24 / formula.frequencyHours;
  const totalMgPerDay = formula.mgPerKgPerDay * safeWeight;
  const mgPerTake = Math.round(totalMgPerDay / dosesPerDay);
  const mlPerTake = Math.max(0.5, Number((mgPerTake / formula.concentrationMgPerMl).toFixed(1)));
  return {
    dosePerTake: `${mlPerTake} ml (${mgPerTake} mg)`,
    calculatedMgPerKg: `${formula.mgPerKgPerDay} mg/kg/día`,
  };
}

/**
 * Verifica si un medicamento prescrito entra en conflicto con las alergias del paciente.
 */
export function findAllergyConflict(
  medicationName: string,
  patientAllergies: string[]
): string | null {
  const medLower = medicationName.toLowerCase();
  for (const allergy of patientAllergies) {
    const allergyLower = allergy.toLowerCase();
    const isPenicillinAllergy =
      allergyLower.includes('penicilina') &&
      (medLower.includes('amoxicilina') ||
        medLower.includes('ampicilina') ||
        medLower.includes('penicilina'));
    const isIbuprofenAllergy =
      (allergyLower.includes('ibuprofeno') || allergyLower.includes('aine')) &&
      (medLower.includes('ibuprofeno') || medLower.includes('diclofenac'));

    if (isPenicillinAllergy || isIbuprofenAllergy || medLower.includes(allergyLower)) {
      return allergy;
    }
  }
  return null;
}
