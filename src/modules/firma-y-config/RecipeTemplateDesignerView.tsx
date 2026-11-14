import React, { useState } from 'react';
import { Palette, Save } from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';
import { useNotifications } from '../../context/NotificationContext';
import { RecipeTemplateConfig } from '../../types/medical';

export const RecipeTemplateDesignerView: React.FC = () => {
  const { templateConfig, updateTemplateConfig } = useClinical();
  const { showToast } = useNotifications();
  const [form, setForm] = useState<RecipeTemplateConfig>(templateConfig);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTemplateConfig(form);
    showToast('Plantilla de récipe actualizada (Sprint 2).');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600">
          <Palette className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Diseñador de Plantilla de Récipe</h1>
          <p className="text-xs text-slate-500">Módulo avanzado habilitado en Sprint 2.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Encabezado Clínica</label>
            <input
              type="text"
              value={form.clinicName}
              onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Subtítulo</label>
            <input
              type="text"
              value={form.clinicSubtitle}
              onChange={(e) => setForm({ ...form, clinicSubtitle: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Color de Borde</label>
            <select
              value={form.borderColor}
              onChange={(e) => setForm({ ...form, borderColor: e.target.value as RecipeTemplateConfig['borderColor'] })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="#0284C7">Azul Clínico (#0284C7)</option>
              <option value="#059669">Esmeralda (#059669)</option>
              <option value="#7C3AED">Violeta (#7C3AED)</option>
              <option value="#0F172A">Slate Oscuro (#0F172A)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nota al Pie</label>
            <input
              type="text"
              value={form.footerNote}
              onChange={(e) => setForm({ ...form, footerNote: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold"
        >
          <Save className="w-4 h-4" /> Guardar Plantilla
        </button>
      </form>
    </div>
  );
};
