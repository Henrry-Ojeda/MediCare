import React from 'react';
import { ArrowLeft, Calendar, Phone, Pill, Stethoscope, Syringe, User } from 'lucide-react';
import { Patient } from '../../../../types/medical';
import { calculateExactAgeLabel } from '../../../../utils/pediatricCalculations';
import { AllergyAlertBadge } from '../../../../components/common';

interface PatientClinicalHeaderProps {
  patient: Patient;
  onBack: () => void;
  onStartConsultation?: () => void;
  onOpenVaccines?: () => void;
  onCreateRecipe?: () => void;
}

export const PatientClinicalHeader: React.FC<PatientClinicalHeaderProps> = ({
  patient,
  onBack,
  onStartConsultation,
  onOpenVaccines,
  onCreateRecipe,
}) => {
  const ageLabel = calculateExactAgeLabel(patient.birthDate);
  const fullName = `${patient.firstName} ${patient.lastName}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
            title="Volver al directorio"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-lg shrink-0">
            {patient.firstName[0]}
            {patient.lastName[0]}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{fullName}</h1>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                {patient.historyNumber}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold">
                {patient.bloodType}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {ageLabel} ({patient.birthDate})
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Rep: {patient.guardianName} ({patient.guardianRelation})
              </span>
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> {patient.guardianWhatsapp}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenVaccines && (
            <button
              type="button"
              onClick={onOpenVaccines}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <Syringe className="w-4 h-4 text-emerald-600" /> Carnet Vacunas
            </button>
          )}
          {onCreateRecipe && (
            <button
              type="button"
              onClick={onCreateRecipe}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 cursor-pointer"
            >
              <Pill className="w-4 h-4 text-emerald-600" /> Crear Récipe
            </button>
          )}
          {onStartConsultation && (
            <button
              type="button"
              onClick={onStartConsultation}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm cursor-pointer"
            >
              <Stethoscope className="w-4 h-4" /> Nueva Consulta
            </button>
          )}
        </div>
      </div>

      {patient.criticalAllergies.length > 0 && (
        <AllergyAlertBadge allergies={patient.criticalAllergies} />
      )}
    </div>
  );
};
