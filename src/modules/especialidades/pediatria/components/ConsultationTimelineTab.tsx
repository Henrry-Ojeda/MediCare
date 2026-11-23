import React, { useState } from 'react';
import {
  Calendar,
  FileText,
  Lock,
  Pill,
  Printer,
  ShieldCheck,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import {
  DiagnosisPermissionRecord,
  DoctorProfile,
  PastConsultationSummary,
} from '../../../../types/medical';
import { UserRole } from '../../../../types/auth.types';

interface ConsultationTimelineTabProps {
  patientId: string;
  consultations: PastConsultationSummary[];
  currentUserId?: string;
  currentUserName?: string;
  userRole: UserRole;
  doctors: DoctorProfile[];
  diagnosisPermissions: DiagnosisPermissionRecord[];
  onGrantDiagnosisPermission?: (targetDoctorId: string, consultationId: string) => void;
  onRevokeDiagnosisPermission?: (permissionId: string) => void;
  onOpenRecipe?: (consultation: PastConsultationSummary) => void;
}

export const ConsultationTimelineTab: React.FC<ConsultationTimelineTabProps> = ({
  patientId,
  consultations,
  currentUserId,
  currentUserName,
  userRole,
  doctors,
  diagnosisPermissions,
  onGrantDiagnosisPermission,
  onRevokeDiagnosisPermission,
  onOpenRecipe,
}) => {
  const [selectedDoctorByCons, setSelectedDoctorByCons] = useState<Record<string, string>>({});

  if (consultations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        Este paciente aún no registra consultas previas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {consultations.map((c) => {
        const isOwnConsultation =
          userRole === 'PEDIATRA' &&
          ((Boolean(c.doctorId) && Boolean(currentUserId) && c.doctorId === currentUserId) ||
            c.doctorName.trim().toLowerCase() === (currentUserName || '').trim().toLowerCase());

        const activeGrantsForThisCons = diagnosisPermissions.filter(
          (p) =>
            p.active &&
            p.patientId === patientId &&
            (!p.consultationId || p.consultationId === c.id)
        );

        const hasAuthorizedPermission =
          userRole === 'PEDIATRA' &&
          activeGrantsForThisCons.some(
            (p) =>
              (Boolean(currentUserId) && p.targetDoctorUserId === currentUserId) ||
              p.targetDoctorName.trim().toLowerCase() === (currentUserName || '').trim().toLowerCase()
          );

        const canSeeDiagnosis =
          typeof c.hasDiagnosisAccess === 'boolean'
            ? c.hasDiagnosisAccess
            : isOwnConsultation || hasAuthorizedPermission;

        const otherDoctors = doctors.filter(
          (d) =>
            d.id !== currentUserId &&
            d.name.trim().toLowerCase() !== (currentUserName || '').trim().toLowerCase()
        );

        const ownGrantsForThisCons = activeGrantsForThisCons.filter(
          (p) =>
            (Boolean(currentUserId) && p.grantedByUserId === currentUserId) ||
            p.grantedByName.trim().toLowerCase() === (currentUserName || '').trim().toLowerCase()
        );

        return (
          <div
            key={c.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg">
                    <Calendar className="w-3.5 h-3.5" /> {c.date}
                  </span>

                  {canSeeDiagnosis ? (
                    <>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                        {c.cie10Code}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{c.cie10Name}</h3>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                      <Lock className="w-3.5 h-3.5" />
                      Diagnóstico restringido · Requiere autorización de {c.doctorName}
                    </span>
                  )}

                  {!isOwnConsultation && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                      Solo lectura · No modificable
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5" /> {c.doctorName} • Peso: {c.weightKg} kg •
                  Talla: {c.heightCm} cm • Temp: {c.temperatureC} °C • PA: {c.bloodPressure}
                </p>
              </div>

              {onOpenRecipe && (
                <button
                  type="button"
                  onClick={() => onOpenRecipe(c)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Récipe / WhatsApp
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1.5">
                <p className="font-bold text-slate-700 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" /> Motivo, Triaje y Examen Físico
                </p>
                {canSeeDiagnosis ? (
                  <>
                    <p className="text-slate-600 leading-relaxed">{c.reason}</p>
                    {c.physicalExamSummary && (
                      <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200/70 pt-1.5">
                        {c.physicalExamSummary}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-amber-700 leading-relaxed flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    Diagnóstico y notas clínicas privadas del médico tratante. Triaje visible arriba.
                  </p>
                )}
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
                        • <span className="font-semibold text-slate-800">{rx.medicationName}</span> —{' '}
                        {rx.dosePerTake} c/{rx.frequencyHours}h por {rx.durationDays}d
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {isOwnConsultation && onGrantDiagnosisPermission && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Autorizar diagnóstico a otro médico:
                  </span>
                  {otherDoctors.length > 0 ? (
                    <>
                      <select
                        value={selectedDoctorByCons[c.id] || ''}
                        onChange={(e) =>
                          setSelectedDoctorByCons((prev) => ({
                            ...prev,
                            [c.id]: e.target.value,
                          }))
                        }
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                      >
                        <option value="">Seleccionar médico...</option>
                        {otherDoctors.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!selectedDoctorByCons[c.id]}
                        onClick={() => {
                          const targetId = selectedDoctorByCons[c.id];
                          if (!targetId) return;
                          onGrantDiagnosisPermission(targetId, c.id);
                          setSelectedDoctorByCons((prev) => ({ ...prev, [c.id]: '' }));
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
                      >
                        Conceder Permiso
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-400">No hay otros médicos registrados</span>
                  )}
                </div>

                {ownGrantsForThisCons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {ownGrantsForThisCons.map((perm) => (
                      <span
                        key={perm.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold"
                      >
                        Autorizado: {perm.targetDoctorName}
                        {onRevokeDiagnosisPermission && (
                          <button
                            type="button"
                            onClick={() => onRevokeDiagnosisPermission(perm.id)}
                            className="text-rose-600 hover:text-rose-800 ml-1 cursor-pointer"
                            title="Revocar permiso"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
