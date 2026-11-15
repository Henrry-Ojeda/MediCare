import React, { useState } from 'react';
import { Pencil, Plus, Save, ShieldCheck, Syringe, Trash2, X } from 'lucide-react';
import { useClinical } from '../../../../context/ClinicalContext';
import { MasterVaccineItem } from '../../../../types/vaccine.types';

export const VaccineCatalogView: React.FC = () => {
  const {
    masterVaccines,
    toggleMasterVaccine,
    addMasterVaccine,
    updateMasterVaccine,
    deleteMasterVaccine,
  } = useClinical();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [commercialName, setCommercialName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [dosesRequired, setDosesRequired] = useState(3);
  const [recommendedAges, setRecommendedAges] = useState('2m, 4m, 6m');
  const [route, setRoute] = useState<MasterVaccineItem['route']>('Intramuscular (IM)');

  const resetForm = () => {
    setEditingId(null);
    setCommercialName('');
    setGenericName('');
    setDosesRequired(3);
    setRecommendedAges('2m, 4m, 6m');
    setRoute('Intramuscular (IM)');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commercialName.trim()) return;

    if (editingId) {
      const current = masterVaccines.find((v) => v.id === editingId);
      updateMasterVaccine({
        id: editingId,
        commercialName: commercialName.trim(),
        genericName: genericName.trim() || commercialName.trim(),
        dosesRequired: Math.max(1, Number(dosesRequired) || 1),
        recommendedAges: recommendedAges.trim() || 'Según esquema',
        route,
        active: current?.active ?? true,
      });
    } else {
      addMasterVaccine({
        commercialName: commercialName.trim(),
        genericName: genericName.trim() || commercialName.trim(),
        recommendedAges: recommendedAges.trim() || 'Según esquema',
        dosesRequired: Math.max(1, Number(dosesRequired) || 1),
        route,
        active: true,
      });
    }
    resetForm();
  };

  const startEdit = (v: MasterVaccineItem) => {
    setEditingId(v.id);
    setCommercialName(v.commercialName);
    setGenericName(v.genericName);
    setDosesRequired(v.dosesRequired);
    setRecommendedAges(v.recommendedAges);
    setRoute(v.route);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
          <Syringe className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Catálogo Maestro de Vacunas</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Crea, edita, activa o elimina los biológicos disponibles en el consultorio pediátrico.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-600">
            {editingId ? 'Editando Vacuna del Catálogo' : 'Nueva Vacuna'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Cancelar edición
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <input
            type="text"
            required
            placeholder="Nombre comercial *"
            value={commercialName}
            onChange={(e) => setCommercialName(e.target.value)}
            className="lg:col-span-2 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
          <input
            type="text"
            placeholder="Principio / Genérico"
            value={genericName}
            onChange={(e) => setGenericName(e.target.value)}
            className="lg:col-span-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
          <input
            type="number"
            min={1}
            max={10}
            placeholder="Dosis"
            value={dosesRequired}
            onChange={(e) => setDosesRequired(Number(e.target.value))}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
          <input
            type="text"
            placeholder="Edades (ej. 2m, 4m)"
            value={recommendedAges}
            onChange={(e) => setRecommendedAges(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
          <select
            value={route}
            onChange={(e) => setRoute(e.target.value as MasterVaccineItem['route'])}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
          >
            <option value="Intramuscular (IM)">Intramuscular (IM)</option>
            <option value="Oral (VO)">Oral (VO)</option>
            <option value="Subcutánea (SC)">Subcutánea (SC)</option>
            <option value="Intradérmica (ID)">Intradérmica (ID)</option>
          </select>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
          >
            {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editingId ? 'Guardar Cambios' : 'Agregar Vacuna'}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {masterVaccines.map((v) => (
          <div
            key={v.id}
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-start justify-between gap-3"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">{v.commercialName}</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                  {v.dosesRequired} dosis
                </span>
              </div>
              <p className="text-xs text-slate-600">{v.genericName}</p>
              <p className="text-[11px] text-slate-400">
                Edades: {v.recommendedAges} • Vía: {v.route}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => toggleMasterVaccine(v.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                  v.active
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
                title="Activar o desactivar vacuna"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {v.active ? 'Activa' : 'Inactiva'}
              </button>
              <button
                type="button"
                onClick={() => startEdit(v)}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                title="Editar vacuna"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => deleteMasterVaccine(v.id)}
                className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                title="Eliminar vacuna"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
