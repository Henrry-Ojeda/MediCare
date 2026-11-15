import { PediatricDrugFormula } from '../types/consultation.types';

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
 * Estima el estado nutricional pediátrico según IMC y edad en meses (referencia OMS).
 */
export function evaluateOmsStatus(weightKg: number, heightCm: number, ageMonths: number): {
  bmi: number;
  statusLabel: string;
  percentileLabel: string;
} {
  const bmi = calculateBmi(weightKg, heightCm);
  if (bmi === 0) {
    return { bmi: 0, statusLabel: 'Pendiente antropometría', percentileLabel: 'N/A' };
  }
  if (bmi < 14.0) {
    return { bmi, statusLabel: 'Riesgo Bajo Peso · OMS', percentileLabel: 'P10–P15' };
  }
  if (bmi > 18.5 && ageMonths < 72) {
    return { bmi, statusLabel: 'Sobrepeso Leve · OMS', percentileLabel: 'P85–P92' };
  }
  return { bmi, statusLabel: 'Eutrófico · OMS', percentileLabel: 'P50–P65' };
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
