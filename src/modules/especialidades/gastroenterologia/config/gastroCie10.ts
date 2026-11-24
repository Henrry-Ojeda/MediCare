export interface Cie10CatalogItem {
  code: string;
  name: string;
  specialty: string;
}

export const GASTRO_CIE10_LIST: Cie10CatalogItem[] = [
  { code: 'K21.9', name: 'Enfermedad por reflujo gastroesofágico (ERGE) sin esofagitis', specialty: 'Gastroenterología' },
  { code: 'K21.0', name: 'Enfermedad por reflujo gastroesofágico con esofagitis', specialty: 'Gastroenterología' },
  { code: 'K29.7', name: 'Gastritis, no especificada', specialty: 'Gastroenterología' },
  { code: 'K29.1', name: 'Otras gastritis agudas / Gastropatía por H. pylori', specialty: 'Gastroenterología' },
  { code: 'K58.9', name: 'Síndrome del intestino irritable sin diarrea', specialty: 'Gastroenterología' },
  { code: 'K58.0', name: 'Síndrome del intestino irritable con diarrea', specialty: 'Gastroenterología' },
  { code: 'K59.0', name: 'Estreñimiento funcional', specialty: 'Gastroenterología' },
  { code: 'A09', name: 'Gastroenteritis y colitis de origen infeccioso', specialty: 'Gastroenterología' },
  { code: 'K52.2', name: 'Gastroenteritis y colitis alérgica / Alergia a proteína de leche de vaca (APLV)', specialty: 'Gastroenterología' },
  { code: 'K90.0', name: 'Enfermedad celíaca / Enteropatía sensible al gluten', specialty: 'Gastroenterología' },
  { code: 'E73.9', name: 'Intolerancia a la lactosa, no especificada', specialty: 'Gastroenterología' },
  { code: 'K76.0', name: 'Degeneración grasa del hígado (Esteatosis hepática)', specialty: 'Gastroenterología' },
  { code: 'K80.2', name: 'Cálculo de la vesícula biliar sin colecistitis', specialty: 'Gastroenterología' },
  { code: 'K25.9', name: 'Úlcera gástrica, no especificada', specialty: 'Gastroenterología' },
  { code: 'R10.4', name: 'Otros dolores abdominales y los no especificados (Dolor abdominal funcional)', specialty: 'Gastroenterología' },
];
