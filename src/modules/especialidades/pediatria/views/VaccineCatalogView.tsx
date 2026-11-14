import React, { useState } from 'react';
import { Plus, ShieldCheck, Syringe } from 'lucide-react';
import { useClinical } from '../../../../context/ClinicalContext';
import { useNotifications } from '../../../../context/NotificationContext';
import { MasterVaccineItem } from '../../../../types/vaccine.types';

export const VaccineCatalogView: React.FC = () => {
  const { masterVaccines, toggleMasterVaccine, addMasterVaccine } = useClinical();
  const { showToast } = useNotifications();

  const [commercialName, setCommercialName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [recommendedAges, setRecommendedAges] = useState('2m, 4m, 6m');
  const [route, setRoute] = useState<MasterVaccineItem['route']>('Intramuscular (IM)');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commercialName.trim()) return;
    addMasterVaccine({
      commercialName: commercialName.trim(),
      genericName: genericName.trim() || commercialName.trim(),
      recommendedAges: recommendedAges.trim(),
      dosesRequired: 3,
      route,
      active: true,
    });
    showToast(`Vacuna "${commercialName.trim()}" agregada al catálogo.`);
    setCommercialName('');
    setGenericName('');
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
            Administra los biológicos disponibles en el consultorio pediátrico.
          </p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input
          type="text"
          required
          placeholder="Nombre comercial (ej. Prevenar 13)"
          value={commercialName}
          onChange={(e) => setCommercialName(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
        />
        <input
          type="text"
          placeholder="Principio / Genérico"
          value={genericName}
          onChange={(e) => setGenericName(e.target.value)}
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
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
        >
          <Plus className="w-4 h-4" /> Agregar Vacuna
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {masterVaccines.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
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
            <button
              type="button"
              onClick={() => toggleMasterVaccine(v.id)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border ${
                v.active
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {v.active ? 'Activa' : 'Inactiva'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
