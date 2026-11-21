import React from 'react';
import { QrCode, AlertTriangle, Clock } from 'lucide-react';
import { Patient, PastConsultationSummary, RecipeTemplateConfig } from '../../types/medical';
import { DoctorSignatureConfig } from '../../types/auth.types';
import { calculateExactAgeLabel } from '../../utils/pediatricCalculations';

interface RecipeDocumentPreviewProps {
  patient: Patient;
  consultation: PastConsultationSummary;
  templateConfig: RecipeTemplateConfig;
  doctorSignature: DoctorSignatureConfig;
  activePage: 1 | 2;
}

export const RecipeDocumentPreview: React.FC<RecipeDocumentPreviewProps> = ({
  patient,
  consultation,
  templateConfig,
  doctorSignature,
  activePage,
}) => {
  const isVerticalSplit = templateConfig.layoutMode !== 'classic';
  const isHorizontal = templateConfig.orientation === 'horizontal';
  const fontClass =
    templateConfig.fontFamily === 'Serif Clásico'
      ? 'font-serif'
      : templateConfig.fontFamily === 'Monospace Clínico'
        ? 'font-mono'
        : 'font-sans';

  return (
    <div
      className={`bg-white w-full ${isHorizontal ? 'max-w-4xl' : 'max-w-2xl'} rounded-xl border border-slate-200 shadow-sm p-5 sm:p-8 flex flex-col justify-between ${fontClass}`}
      style={{ borderTop: `5px solid ${templateConfig.borderColor}` }}
    >
      {activePage === 1 ? (
        <div className="space-y-6">
          <div
            className={`flex flex-wrap items-start gap-3 border-b border-slate-200 pb-4 ${
              templateConfig.logoPosition === 'center'
                ? 'flex-col items-center text-center'
                : templateConfig.logoPosition === 'right'
                  ? 'flex-row-reverse justify-between'
                  : 'justify-between'
            }`}
          >
            <div className="flex items-center gap-3">
              {templateConfig.logoDataUrl && (
                <img
                  src={templateConfig.logoDataUrl}
                  alt="Logo"
                  className="h-12 w-auto object-contain rounded-lg"
                />
              )}
              <div>
                <h4 className="text-base font-bold text-slate-900">{templateConfig.clinicName}</h4>
                <p className="text-xs text-slate-600">{templateConfig.clinicSubtitle}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  RIF: {templateConfig.rif} · {templateConfig.address}
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-xs text-slate-500">
              <div>RÉCIPE MÉDICO</div>
              <div className="font-bold text-slate-900">{consultation.date}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Paciente</span>
              <span className="font-bold text-slate-900">
                {patient.firstName} {patient.lastName}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Edad / Peso</span>
              <span className="font-mono font-semibold text-slate-900">
                {calculateExactAgeLabel(patient.birthDate)} · {consultation.weightKg} kg
              </span>
            </div>
            {templateConfig.showDiagnosisOnRecipe !== false && (
              <div className="col-span-2">
                <span className="text-slate-400 block text-[11px]">Diagnóstico CIE-10</span>
                <span className="font-semibold text-slate-900">
                  {consultation.cie10Code} — {consultation.cie10Name}
                </span>
              </div>
            )}
          </div>

          {isVerticalSplit ? (
            <div className="rounded-xl border border-slate-300 overflow-hidden bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 min-h-[260px]">
                {/* Lado Izquierdo: Medicina o Examen */}
                <div className="p-4 space-y-3">
                  <div className="text-[11px] font-bold text-slate-900 tracking-wide uppercase border-b border-slate-200 pb-1.5">
                    {templateConfig.leftColumnTitle || 'RP / MEDICAMENTOS Y EXÁMENES'}
                  </div>
                  {consultation.prescriptions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Sin medicamentos o exámenes indicados.</p>
                  ) : (
                    <ol className="space-y-2.5">
                      {consultation.prescriptions.map((rx, idx) => (
                        <li key={rx.id || idx} className="text-xs space-y-0.5">
                          <div className="font-bold text-slate-900">
                            {idx + 1}. {rx.medicationName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono pl-3">
                            {rx.presentation}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                {/* Lado Derecho: Instrucciones */}
                <div className="p-4 space-y-3 bg-slate-50/40">
                  <div className="text-[11px] font-bold text-slate-900 tracking-wide uppercase border-b border-slate-200 pb-1.5">
                    {templateConfig.rightColumnTitle || 'INDICACIONES E INSTRUCCIONES'}
                  </div>
                  {consultation.prescriptions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Sin instrucciones registradas.</p>
                  ) : (
                    <ol className="space-y-2.5">
                      {consultation.prescriptions.map((rx, idx) => (
                        <li key={rx.id || idx} className="text-xs space-y-0.5">
                          <div className="font-semibold text-[#0284C7]">
                            {idx + 1}. {rx.dosePerTake} · c/{rx.frequencyHours}h · {rx.durationDays}d
                          </div>
                          {rx.specialInstructions && (
                            <p className="text-[11px] text-slate-600 pl-3">
                              {rx.specialInstructions}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                  {consultation.parentGuide && (
                    <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
                      <span className="font-bold text-slate-800 block">Indicaciones generales:</span>
                      {consultation.parentGuide}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-900 tracking-tight border-b border-slate-200 pb-1.5">
                RP / PRESCRIPCIÓN FARMACOLÓGICA E INDICACIONES
              </div>
              {consultation.prescriptions.map((rx, idx) => (
                <div key={rx.id || idx} className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {idx + 1}. {rx.medicationName}
                    </span>
                    <span className="text-xs font-mono text-slate-500">{rx.presentation}</span>
                  </div>
                  <div className="text-xs font-mono font-semibold text-[#0284C7]">
                    Dosis: {rx.dosePerTake} · {rx.frequencyHours} · {rx.durationDays}
                  </div>
                  <p className="text-xs text-slate-600">{rx.specialInstructions}</p>
                </div>
              ))}
            </div>
          )}

          <div className="pt-8 border-t border-slate-200 flex flex-wrap items-end justify-between gap-4">
            {templateConfig.showQrCode ? (
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700 shrink-0">
                  <QrCode className="w-9 h-9" />
                </div>
                <div className="text-[11px] text-slate-500">
                  <div className="font-semibold text-slate-800">Autenticidad Verificada QR</div>
                  <div className="font-mono">HASH: MC-{consultation.id.slice(-6).toUpperCase()}</div>
                  <div>{templateConfig.footerNote}</div>
                </div>
              </div>
            ) : (
              <div />
            )}

            <div className="text-right shrink-0 ml-auto">
              {doctorSignature.useDigitalSignature && (
                <div className="mb-1 flex justify-end">
                  {doctorSignature.signatureDataUrl ? (
                    <img
                      src={doctorSignature.signatureDataUrl}
                      alt="Firma del médico"
                      className="h-14 object-contain"
                    />
                  ) : (
                    <div className="italic font-serif text-lg text-sky-900">
                      {doctorSignature.doctorName}
                    </div>
                  )}
                </div>
              )}
              <div className="border-t border-slate-300 pt-1 text-xs font-bold text-slate-900">
                {doctorSignature.doctorName}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {doctorSignature.specialtyLabel} · MPPS {doctorSignature.mppsNumber} · CM{' '}
                {doctorSignature.colegioNumber}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <span className="text-[11px] font-mono text-[#7C3AED] font-semibold">
                PÁGINA 2 · GUÍA PARA PADRES Y CUIDADOS EN CASA
              </span>
              <h4 className="text-base font-bold text-slate-900 mt-0.5">
                Indicaciones para la familia de {patient.firstName}
              </h4>
            </div>
            <Clock className="w-6 h-6 text-[#0284C7] shrink-0" />
          </div>

          <div className="p-4 rounded-xl bg-[#F0F9FF] border border-sky-200/70 space-y-1.5">
            <div className="text-xs font-bold text-sky-950">Explicación Médica y Cuidados</div>
            <p className="text-xs text-slate-700 leading-relaxed">{consultation.parentGuide}</p>
          </div>

          <div className="overflow-x-auto">
            <div className="text-xs font-bold text-slate-900 mb-2">Tabla de Administración</div>
            <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 text-left">Medicamento</th>
                  <th className="py-2 px-3 text-left">Dosis</th>
                  <th className="py-2 px-3 text-left">Frecuencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {consultation.prescriptions.map((rx, i) => (
                  <tr key={i}>
                    <td className="py-2 px-3 font-semibold text-slate-900">{rx.medicationName}</td>
                    <td className="py-2 px-3 font-mono font-bold text-[#059669]">
                      {rx.dosePerTake}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600">{rx.frequencyHours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Signos de Alarma (Acudir a Emergencias de Inmediato)</span>
            </div>
            <ul className="space-y-1 text-xs text-rose-900">
              {consultation.alarmSigns.map((sign, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
                  <span>{sign}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
