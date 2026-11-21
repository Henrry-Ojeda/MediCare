import { describe, expect, it } from 'vitest';
import {
  calculateAgeInMonths,
  calculateBmi,
  evaluateGrowthTrend,
  evaluateOmsStatus,
  findAllergyConflict,
} from '../pediatricCalculations';

describe('pediatricCalculations', () => {
  it('calcula el IMC correctamente y devuelve 0 con datos inválidos', () => {
    expect(calculateBmi(18, 100)).toBe(18);
    expect(calculateBmi(0, 100)).toBe(0);
    expect(calculateBmi(15, 0)).toBe(0);
  });

  it('evalúa estado nutricional OMS por edad y sexo', () => {
    expect(evaluateOmsStatus(0, 0, 24).statusLabel).toBe('Pendiente antropometría');
    expect(evaluateOmsStatus(14.3, 96, 36, 'M', 49.5).statusLabel).toContain('Eutrófico');
    expect(evaluateOmsStatus(10.0, 96, 36, 'M').statusLabel).toContain('Bajo peso');
  });

  it('evalúa tendencia de crecimiento frente a la cita anterior', () => {
    const prev = {
      date: '2026-09-20',
      ageMonths: 10,
      weightKg: 9.0,
      heightCm: 73,
      headCircumferenceCm: 45,
      bmi: 16.9,
      percentileWeight: 'P15–P85',
      percentileHeight: 'P15–P85',
    };
    const normal = evaluateGrowthTrend({ weightKg: 9.6, heightCm: 75.5, headCircumferenceCm: 46 }, prev, 12);
    expect(normal.isNormalGrowth).toBe(true);
    expect(normal.deltaWeightKg).toBe(0.6);

    const drop = evaluateGrowthTrend({ weightKg: 8.5, heightCm: 75.5, headCircumferenceCm: 46 }, prev, 12);
    expect(drop.isNormalGrowth).toBe(false);
    expect(drop.alerts.length).toBeGreaterThan(0);
  });

  it('detecta conflicto cruzado de alergia a penicilina con amoxicilina', () => {
    expect(findAllergyConflict('Amoxicilina 250mg', ['Penicilina'])).toBe('Penicilina');
    expect(findAllergyConflict('Acetaminofén', ['Penicilina'])).toBeNull();
  });

  it('retorna 0 meses si la fecha de nacimiento es inválida', () => {
    expect(calculateAgeInMonths('fecha-invalida')).toBe(0);
  });
});
