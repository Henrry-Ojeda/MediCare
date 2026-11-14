export interface VaccineDoseRecord {
  id: string;
  vaccineId: string;
  vaccineName: string;
  milestoneLabel: string;
  milestoneMonths: number;
  doseNumber: string;
  status: 'aplicada' | 'pendiente' | 'futura';
  appliedDate?: string;
  batchNumber?: string;
  manufacturer?: string;
  appliedBy?: string;
  observations?: string;
}

export interface MasterVaccineItem {
  id: string;
  commercialName: string;
  genericName: string;
  dosesRequired: number;
  recommendedAges: string;
  route: 'Intramuscular (IM)' | 'Oral (VO)' | 'Subcutánea (SC)' | 'Intradérmica (ID)';
  active: boolean;
}
