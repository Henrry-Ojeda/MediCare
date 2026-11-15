import { PEDIATRIC_FORMULARY } from '../../../../data/mockClinicalData';
import { PediatricDrugFormula } from '../../../../types/consultation.types';

export const PEDIATRIC_DRUG_FORMULAS: PediatricDrugFormula[] = PEDIATRIC_FORMULARY.map((item) => ({
  name: item.name,
  presentation: item.presentation,
  mgPerKgPerDay: item.mgPerKgPerDay,
  concentrationMgPerMl: item.concentrationMgPerMl,
  frequencyHours: item.frequencyHours,
  defaultDurationDays: item.defaultDurationDays,
  specialInstructions: item.specialInstructions,
}));
