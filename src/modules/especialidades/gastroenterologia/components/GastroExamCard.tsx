import React from 'react';
import { Activity, AlertCircle, ClipboardList, Utensils } from 'lucide-react';
import { GASTRO_CIE10_LIST } from '../config/gastroCie10';

export interface GastroExamState {
  bristolType: number | null;
  symptoms: string[];
  quadrants: string[];
  intolerances: string[];
  endoscopyHistory: string;
  dietPlan: string;
}

export const INITIAL_GASTRO_EXAM: GastroExamState = {
  bristolType: 4,
  symptoms: [],
  quadrants: [],
  intolerances: [],
  endoscopyHistory: '',
  dietPlan: '',
};

const BRISTOL_TYPES: { type: number; label: string; hint: string }[] = [
  { type: 1, label: 'Tipo 1', hint: 'Heces duras separadas (estreñimiento severo)' },
  { type: 2, label: 'Tipo 2', hint: 'Forma de salchicha grumosa (estreñimiento)' },
  { type: 3, label: 'Tipo 3', hint: 'Salchicha con grietas (normal)' },
  { type: 4, label: 'Tipo 4', hint: 'Salchicha lisa y blanda (ideal)' },
  { type: 5, label: 'Tipo 5', hint: 'Trozos blandos con bordes claros' },
  { type: 6, label: 'Tipo 6', hint: 'Fragmentos pastosos (diarrea leve)' },
  { type: 7, label: 'Tipo 7', hint: 'Acuosa sin trozos sólidos (diarrea)' },
];

const SYMPTOMS = [
  'Pirosis / Reflujo',
  'Regurgitación',
  'Disfagia',
  'Distensión abdominal',
  'Náuseas / Vómitos',
  'Rectorragia / Sangrado',
];

const QUADRANTS = [
  'Epigastrio',
  'Hipocondrio derecho',
  'Hipocondrio izquierdo',
  'Mesogastrio',
  'Fosa ilíaca derecha',
  'Fosa ilíaca izquierda',
  'Hipogastrio',
  'Difuso',
];

const INTOLERANCES = ['Lactosa', 'Gluten / Trigo', 'APLV (Proteína leche)', 'FODMAP', 'Fructosa'];

interface GastroExamCardProps {
  value: GastroExamState;
  onChange: (updated: GastroExamState) => void;
  onSelectCie10?: (code: string, name: string) => void;
  selectedCie10Code?: string;
}

export const GastroExamCard: React.FC<GastroExamCardProps> = ({
  value,
  onChange,
  onSelectCie10,
  selectedCie10Code,
}) => {
  const toggleItem = (field: 'symptoms' | 'quadrants' | 'intolerances', item: string) => {
    const current = value[field];
    const next = current.includes(item)
      ? current.filter((x) => x !== item)
      : [...current, item];
    onChange({ ...value, [field]: next });
  };

  const selectedBristol = BRISTOL_TYPES.find((b) => b.type === value.bristolType);

  return (
    <div
      data-testid="gastro-exam-card"
      className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Evaluación Especializada · Gastroenterología
            </h3>
            <p className="text-[11px] text-slate-500">
              Escala de Bristol, dolor por cuadrantes, intolerancias, endoscopia y plan dietético
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
          Módulo Digestivo
        </span>
      </div>

      {/* Escala de Bristol */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700">
          Hábito Intestinal — Escala de Bristol (1 a 7)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {BRISTOL_TYPES.map((b) => {
            const active = value.bristolType === b.type;
            return (
              <button
                key={b.type}
                type="button"
                onClick={() => onChange({ ...value, bristolType: b.type })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  active
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-400'
                }`}
              >
                {b.label}
              </button>
            );
          })}
        </div>
        {selectedBristol && (
          <p className="text-[11px] text-emerald-800 font-medium">
            {selectedBristol.label}: {selectedBristol.hint}
          </p>
        )}
      </div>

      {/* Síntomas y Cuadrantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="flex items-center gap-1 text-xs font-bold text-slate-700">
            <AlertCircle className="w-3.5 h-3.5 text-emerald-600" />
            Síntomas Digestivos
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SYMPTOMS.map((sym) => {
              const active = value.symptoms.includes(sym);
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() => toggleItem('symptoms', sym)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                    active
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {sym}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Dolor Abdominal por Cuadrantes
          </label>
          <div className="flex flex-wrap gap-1.5">
            {QUADRANTS.map((q) => {
              const active = value.quadrants.includes(q);
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => toggleItem('quadrants', q)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                    active
                      ? 'bg-sky-50 border-sky-400 text-sky-800'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {q}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Intolerancias */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700">
          Intolerancias / Alergias Alimentarias Sospechadas
        </label>
        <div className="flex flex-wrap gap-1.5">
          {INTOLERANCES.map((intol) => {
            const active = value.intolerances.includes(intol);
            return (
              <button
                key={intol}
                type="button"
                onClick={() => toggleItem('intolerances', intol)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                  active
                    ? 'bg-amber-50 border-amber-400 text-amber-800'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {intol}
              </button>
            );
          })}
        </div>
      </div>

      {/* Antecedentes Endoscópicos + Plan Dietético */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-1">
            <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
            Antecedentes Endoscópicos / Hepáticos
          </label>
          <textarea
            rows={2}
            value={value.endoscopyHistory}
            onChange={(e) => onChange({ ...value, endoscopyHistory: e.target.value })}
            placeholder="Ej. EDS 2024: gastritis antral leve, H. pylori negativo; eco abdominal normal..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-1">
            <Utensils className="w-3.5 h-3.5 text-emerald-600" />
            Plan Dietético e Indicaciones Digestivas
          </label>
          <textarea
            rows={2}
            value={value.dietPlan}
            onChange={(e) => onChange({ ...value, dietPlan: e.target.value })}
            placeholder="Ej. Dieta fraccionada baja en irritantes y grasas, evitar lácteos enteros por 14 días..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
        </div>
      </div>

      {/* Selector rápido CIE-10 Digestivo */}
      {onSelectCie10 && (
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-600">
            Diagnósticos Frecuentes CIE-10 · Gastroenterología:
          </label>
          <select
            aria-label="Diagnóstico CIE-10 Gastroenterología"
            value={
              GASTRO_CIE10_LIST.some((c) => c.code === selectedCie10Code) ? selectedCie10Code : ''
            }
            onChange={(e) => {
              const found = GASTRO_CIE10_LIST.find((c) => c.code === e.target.value);
              if (found) onSelectCie10(found.code, found.name);
            }}
            className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/40 text-xs font-medium text-slate-800"
          >
            <option value="">Seleccionar diagnóstico digestivo CIE-10...</option>
            {GASTRO_CIE10_LIST.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} — {item.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
