import React from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { PEDIATRIC_CIE10_LIST } from '../config/pediatricCie10';

export interface PhysicalExamState {
  general: string;
  cabezaCuello: string;
  cardiopulmonar: string;
  abdomen: string;
  extremidades: string;
}

interface PediatricExamCardProps {
  chiefComplaint: string;
  onChiefComplaintChange: (val: string) => void;
  physicalExam: PhysicalExamState;
  onPhysicalExamChange: (val: PhysicalExamState) => void;
  cie10Code: string;
  cie10Name: string;
  onSelectCie10: (code: string, name: string) => void;
}

export const PediatricExamCard: React.FC<PediatricExamCardProps> = ({
  chiefComplaint,
  onChiefComplaintChange,
  physicalExam,
  onPhysicalExamChange,
  cie10Code,
  cie10Name,
  onSelectCie10,
}) => {
  const fields: { key: keyof PhysicalExamState; label: string }[] = [
    { key: 'general', label: 'Aspecto General / Hidratación' },
    { key: 'cabezaCuello', label: 'Cabeza, ORL y Cuello' },
    { key: 'cardiopulmonar', label: 'Cardiopulmonar' },
    { key: 'abdomen', label: 'Abdomen' },
    { key: 'extremidades', label: 'Extremidades / Neurológico' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-sky-600" /> Anamnesis, Examen Físico y Diagnóstico CIE-10
      </h3>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo de Consulta y Enfermedad Actual</label>
        <textarea
          rows={3}
          value={chiefComplaint}
          onChange={(e) => onChiefComplaintChange(e.target.value)}
          placeholder="Describa síntomas, evolución, fiebre, tolerancia oral..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {fields.map((f) => (
          <div key={f.key} className={f.key === 'extremidades' ? 'md:col-span-2' : ''}>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">{f.label}</label>
            <input
              type="text"
              value={physicalExam[f.key]}
              onChange={(e) => onPhysicalExamChange({ ...physicalExam, [f.key]: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
            />
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-100 space-y-2">
        <label className="block text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400" /> Diagnóstico Principal (CIE-10 Pediátrico)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <select
            value={cie10Code}
            onChange={(e) => {
              const found = PEDIATRIC_CIE10_LIST.find((c) => c.code === e.target.value);
              if (found) onSelectCie10(found.code, found.name);
            }}
            className="sm:col-span-3 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium"
          >
            {PEDIATRIC_CIE10_LIST.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} — {item.name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-sky-700 font-semibold">
          Seleccionado: {cie10Code} — {cie10Name}
        </p>
      </div>
    </div>
  );
};
