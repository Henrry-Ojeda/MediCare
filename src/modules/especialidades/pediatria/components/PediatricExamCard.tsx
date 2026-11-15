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
  const fields: { key: keyof PhysicalExamState; label: string; placeholder: string }[] = [
    {
      key: 'general',
      label: 'Aspecto General / Hidratación',
      placeholder: 'Ej. Paciente activo, hidratado, normocoloreado...',
    },
    {
      key: 'cabezaCuello',
      label: 'Cabeza, ORL y Cuello',
      placeholder: 'Ej. Normocéfalo, orofaringe sin exudados, otoscopia bilateral normal...',
    },
    {
      key: 'cardiopulmonar',
      label: 'Cardiopulmonar',
      placeholder: 'Ej. Ruidos cardíacos rítmicos sin soplos, murmullo vesicular audible bilateral...',
    },
    {
      key: 'abdomen',
      label: 'Abdomen',
      placeholder: 'Ej. Blando, depresible, no doloroso a la palpación, RHA presentes...',
    },
    {
      key: 'extremidades',
      label: 'Extremidades / Neurológico',
      placeholder: 'Ej. Simétricas, llenado capilar < 2 seg, sin edemas...',
    },
  ];

  const handleFillNormalExam = () => {
    onPhysicalExamChange({
      general: 'Paciente activo, hidratado, normocoloreado.',
      cabezaCuello: 'Normocéfalo, orofaringe sin exudados, otoscopia bilateral normal.',
      cardiopulmonar: 'Ruidos cardíacos rítmicos sin soplos, murmullo vesicular audible bilateral.',
      abdomen: 'Blando, depresible, no doloroso a la palpación, RHA presentes.',
      extremidades: 'Simétricas, llenado capilar < 2 seg, sin edemas.',
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-sky-600" /> Anamnesis, Examen Físico y Diagnóstico CIE-10
        </h3>
        <button
          type="button"
          onClick={handleFillNormalExam}
          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-600 cursor-pointer"
        >
          Cargar examen normal
        </button>
      </div>

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
              placeholder={f.placeholder}
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
              const val = e.target.value;
              if (!val) {
                onSelectCie10('', '');
                return;
              }
              const found = PEDIATRIC_CIE10_LIST.find((c) => c.code === val);
              if (found) onSelectCie10(found.code, found.name);
            }}
            className="sm:col-span-3 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium"
          >
            <option value="">Seleccione un diagnóstico CIE-10...</option>
            {PEDIATRIC_CIE10_LIST.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} — {item.name}
              </option>
            ))}
          </select>
        </div>
        {cie10Code && (
          <p className="text-[11px] text-sky-700 font-semibold">
            Seleccionado: {cie10Code} — {cie10Name}
          </p>
        )}
      </div>
    </div>
  );
};
