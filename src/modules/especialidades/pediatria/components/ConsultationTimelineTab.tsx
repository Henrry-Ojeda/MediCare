import React from 'react';
import { Calendar, FileText, Pill, Printer, Stethoscope } from 'lucide-react';
import { PastConsultationSummary } from '../../../../types/medical';

interface ConsultationTimelineTabProps {
  consultations: PastConsultationSummary[];
  onOpenRecipe?: (consultation: PastConsultationSummary) => void;
}

export const ConsultationTimelineTab: React.FC<ConsultationTimelineTabProps> = ({
  consultations,
  onOpenRecipe,
}) => {
  if (consultations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        Este paciente aún no registra consultas previas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {consultations.map((c) => (
        <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg">
                  <Calendar className="w-3.5 h-3.5" /> {c.date}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                  {c.cie10Code}
                </span>
                <h3 className="text-sm font-bold text-slate-900">{c.cie10Name}</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" /> {c.doctorName} • Peso: {c.weightKg} kg • Talla:{' '}
                {c.heightCm} cm • Temp: {c.temperatureC} °C
              </p>
            </div>

            {onOpenRecipe && (
              <button
                type="button"
                onClick={() => onOpenRecipe(c)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold"
              >
                <Printer className="w-3.5 h-3.5" /> Récipe / WhatsApp
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <p className="font-bold text-slate-700 flex items-center gap-1 mb-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> Motivo y Evolución
              </p>
              <p className="text-slate-600 leading-relaxed">{c.reason}</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <p className="font-bold text-slate-700 flex items-center gap-1 mb-1">
                <Pill className="w-3.5 h-3.5 text-sky-600" /> Tratamiento Indicado
              </p>
              {c.prescriptions.length === 0 ? (
                <p className="text-slate-500">Sin medicamentos indicados.</p>
              ) : (
                <ul className="space-y-1 text-slate-600">
                  {c.prescriptions.map((rx) => (
                    <li key={rx.id}>
                      • <span className="font-semibold text-slate-800">{rx.medicationName}</span> — {rx.dosePerTake}{' '}
                      c/{rx.frequencyHours}h por {rx.durationDays}d
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
