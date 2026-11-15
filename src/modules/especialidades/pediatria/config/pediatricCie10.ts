import { CIE10_CATALOG } from '../../../../data/mockClinicalData';

export const PEDIATRIC_CIE10_LIST = CIE10_CATALOG.filter(
  (item) => item.specialty === 'Pediatría' || item.specialty === 'General'
);
