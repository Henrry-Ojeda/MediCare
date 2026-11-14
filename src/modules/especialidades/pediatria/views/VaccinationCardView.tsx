import React from 'react';
import { CheckCircle2, Clock, Syringe } from 'lucide-react';
import { useClinical } from '../../../../context/ClinicalContext';
import { PatientClinicalHeader } from '../components/PatientClinicalHeader';

const MILESTONES = [
  'Al nacer',
  '2 meses',
  '4 meses',
  '6 meses',
  '12 meses',
  '18 meses',
  '5 años',
];

export const VaccinationCardView: React.FC = () => {
  const { selectedPatient, patients, setCurrentView, openVaccineModal } = useClinical();
  const patient = selectedPatient || patients[0];

  if (!patient) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        No hay pacientes cargados.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PatientClinicalHeader
        patient={patient}
        onBack={() => setCurrentView('paciente-detalle')}
      />

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Syringe className="w-4 h-4 text-emerald-600" /> Carnet Digital de Vacunación Pediátrica
          </h2>
          <p className="text-xs text-slate-500">
            Esquema nacional por hitos de edad. Pulse en una dosis pendiente para registrar aplicación y lote.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCurrentView('vacunas-catalogo')}
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          Ver Catálogo Maestro
        </button>
      </div>

      <div className="space-y-4">
        {MILESTONES.map((milestone) => {
          const doses = patient.vaccines.filter((v) => v.milestoneLabel === milestone);
          if (doses.length === 0) return null;

          return (
            <div key={milestone} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-700">{milestone}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {doses.map((dose) => {
                  const applied = dose.status === 'aplicada';
                  return (
                    <div
                      key={dose.id}
                      className={`rounded-xl border p-3.5 flex flex-col justify-between gap-2.5 ${
                        applied ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900">{dose.vaccineName}</p>
                          {applied ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600">{dose.doseNumber}</p>
                      </div>

                      {applied ? (
                        <div className="text-[11px] text-emerald-800 space-y-0.5">
                          <p>Aplicada: {dose.appliedDate}</p>
                          <p>Lote: {dose.batchNumber || 'N/A'}</p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openVaccineModal(patient.id, dose)}
                          className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                        >
                          Registrar Aplicación
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
