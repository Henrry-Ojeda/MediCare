import React, { useState } from 'react';
import { AlertTriangle, Calculator, Pill, Plus, Trash2 } from 'lucide-react';
import { PrescriptionItem } from '../../../../types/medical';
import { PEDIATRIC_DRUG_FORMULAS } from '../config/pediatricFormulary';
import { calculatePediatricDose, findAllergyConflict } from '../../../../utils/pediatricCalculations';

interface PediatricPrescriptionCardProps {
  weightKg: number;
  criticalAllergies: string[];
  prescriptions: PrescriptionItem[];
  onChange: (items: PrescriptionItem[]) => void;
}

export const PediatricPrescriptionCard: React.FC<PediatricPrescriptionCardProps> = ({
  weightKg,
  criticalAllergies,
  prescriptions,
  onChange,
}) => {
  const [selectedDrugName, setSelectedDrugName] = useState(PEDIATRIC_DRUG_FORMULAS[0]?.name || '');

  const selectedFormula = PEDIATRIC_DRUG_FORMULAS.find((d) => d.name === selectedDrugName);
  const allergyConflict = selectedFormula
    ? findAllergyConflict(selectedFormula.name, criticalAllergies)
    : null;

  const handleAddCalculatedDrug = () => {
    if (!selectedFormula) return;
    const { dosePerTake, calculatedMgPerKg } = calculatePediatricDose(selectedFormula, weightKg);

    const newItem: PrescriptionItem = {
      id: `rx-${Date.now()}`,
      medicationName: selectedFormula.name,
      presentation: selectedFormula.presentation,
      dosePerTake,
      frequencyHours: String(selectedFormula.frequencyHours),
      durationDays: String(selectedFormula.defaultDurationDays),
      specialInstructions: selectedFormula.specialInstructions,
      calculatedMgPerKg,
    };

    onChange([...prescriptions, newItem]);
  };

  const handleAddManualDrug = () => {
    const newItem: PrescriptionItem = {
      id: `rx-${Date.now()}`,
      medicationName: 'Nuevo Medicamento',
      presentation: 'Suspensión / Tabletas',
      dosePerTake: '5 ml',
      frequencyHours: '8',
      durationDays: '5',
      specialInstructions: 'Administrar después de los alimentos.',
    };
    onChange([...prescriptions, newItem]);
  };

  const updateItem = (id: string, patch: Partial<PrescriptionItem>) => {
    onChange(prescriptions.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    onChange(prescriptions.filter((item) => item.id !== id));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Pill className="w-4 h-4 text-sky-600" /> Récipe Médico y Dosificación Pediátrica ({weightKg} kg)
        </h3>
        <button
          type="button"
          onClick={handleAddManualDrug}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <Plus className="w-3.5 h-3.5" /> Línea Manual
        </button>
      </div>

      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2.5">
        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5 text-sky-600" /> Calculadora Automática mg/kg/día
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedDrugName}
            onChange={(e) => setSelectedDrugName(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium"
          >
            {PEDIATRIC_DRUG_FORMULAS.map((drug) => (
              <option key={drug.name} value={drug.name}>
                {drug.name} ({drug.presentation}) — {drug.mgPerKgPerDay} mg/kg/día
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddCalculatedDrug}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shrink-0"
          >
            <Plus className="w-4 h-4" /> Calcular y Agregar
          </button>
        </div>

        {allergyConflict && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Alerta de Alergia: El paciente registra "{allergyConflict}". Verifique antes de prescribir.
          </div>
        )}
      </div>

      {prescriptions.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-4">
          No hay medicamentos agregados al récipe todavía.
        </p>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx, idx) => (
            <div key={rx.id} className="rounded-xl border border-slate-200 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-sky-700">Medicamento #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeItem(rx.id)}
                  className="text-rose-600 hover:bg-rose-50 p-1 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <input
                  type="text"
                  value={rx.medicationName}
                  onChange={(e) => updateItem(rx.id, { medicationName: e.target.value })}
                  placeholder="Medicamento"
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold"
                />
                <input
                  type="text"
                  value={rx.dosePerTake}
                  onChange={(e) => updateItem(rx.id, { dosePerTake: e.target.value })}
                  placeholder="Dosis (ej. 5 ml)"
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-sky-700"
                />
                <input
                  type="text"
                  value={rx.frequencyHours}
                  onChange={(e) => updateItem(rx.id, { frequencyHours: e.target.value })}
                  placeholder="Cada (h)"
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  value={rx.durationDays}
                  onChange={(e) => updateItem(rx.id, { durationDays: e.target.value })}
                  placeholder="Días"
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>
              <input
                type="text"
                value={rx.specialInstructions}
                onChange={(e) => updateItem(rx.id, { specialInstructions: e.target.value })}
                placeholder="Indicaciones especiales para los padres"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
