import React, { useState } from 'react';
import { Columns2, Palette, Save } from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { RecipeTemplateConfig } from '../../types/medical';

export const RecipeTemplateDesignerView: React.FC = () => {
  const { templateConfig, updateTemplateConfig } = useClinical();
  const { doctorSignature } = useAuth();
  const { showToast } = useNotifications();
  const [form, setForm] = useState<RecipeTemplateConfig>({
    ...templateConfig,
    layoutMode: templateConfig.layoutMode || 'vertical_split',
    leftColumnTitle: templateConfig.leftColumnTitle || 'RP / MEDICAMENTOS Y EXÁMENES',
    rightColumnTitle: templateConfig.rightColumnTitle || 'INDICACIONES E INSTRUCCIONES',
    showDiagnosisOnRecipe: templateConfig.showDiagnosisOnRecipe !== false,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTemplateConfig(form);
    showToast('Plantilla personalizada de récipe médico guardada.');
  };

  const isVerticalSplit = form.layoutMode !== 'classic';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Personalizar Récipe Médico</h1>
            <p className="text-xs text-slate-500">
              Configura tu hoja vertical dividida (izquierda: medicina/examen · derecha: instrucciones) y estilo visual.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-xs font-bold text-[#0284C7] self-start sm:self-auto">
          <Columns2 className="w-4 h-4" /> Hoja Vertical Clínica
        </span>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Encabezado Clínica / Consultorio</label>
            <input
              type="text"
              value={form.clinicName}
              onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Subtítulo / Especialidad</label>
            <input
              type="text"
              value={form.clinicSubtitle}
              onChange={(e) => setForm({ ...form, clinicSubtitle: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">RIF / Registro</label>
            <input
              type="text"
              value={form.rif}
              onChange={(e) => setForm({ ...form, rif: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Dirección</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Formato de Hoja</label>
            <select
              value={form.layoutMode || 'vertical_split'}
              onChange={(e) =>
                setForm({
                  ...form,
                  layoutMode: e.target.value as RecipeTemplateConfig['layoutMode'],
                })
              }
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
            >
              <option value="vertical_split">Hoja Vertical Dividida (Izq: Medicina · Der: Instrucciones)</option>
              <option value="classic">Formato Clásico (Lista única)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Título Lado Izquierdo</label>
            <input
              type="text"
              value={form.leftColumnTitle || ''}
              onChange={(e) => setForm({ ...form, leftColumnTitle: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Título Lado Derecho</label>
            <input
              type="text"
              value={form.rightColumnTitle || ''}
              onChange={(e) => setForm({ ...form, rightColumnTitle: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tipografía</label>
            <select
              value={form.fontFamily}
              onChange={(e) =>
                setForm({
                  ...form,
                  fontFamily: e.target.value as RecipeTemplateConfig['fontFamily'],
                })
              }
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white"
            >
              <option value="Plus Jakarta Sans">Plus Jakarta Sans (Moderna)</option>
              <option value="Serif Clásico">Serif Clásico (Médica tradicional)</option>
              <option value="Monospace Clínico">Monospace Clínico</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Color de Borde</label>
            <select
              value={form.borderColor}
              onChange={(e) =>
                setForm({
                  ...form,
                  borderColor: e.target.value as RecipeTemplateConfig['borderColor'],
                })
              }
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white"
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
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 text-xs">
          <label className="inline-flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.showDiagnosisOnRecipe !== false}
              onChange={(e) => setForm({ ...form, showDiagnosisOnRecipe: e.target.checked })}
              className="rounded border-slate-300"
            />
            Mostrar Diagnóstico CIE-10 en el Récipe
          </label>
          <label className="inline-flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.showQrCode}
              onChange={(e) => setForm({ ...form, showQrCode: e.target.checked })}
              className="rounded border-slate-300"
            />
            Mostrar Código QR de Autenticidad
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
          >
            <Save className="w-4 h-4" /> Guardar Plantilla Personalizada
          </button>
        </div>
      </form>

      {/* Vista Previa en Vivo */}
      <div className="bg-slate-100/80 rounded-2xl border border-slate-200 p-5 space-y-3">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
          Vista Previa del Récipe Médico
        </p>
        <div
          className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 max-w-2xl mx-auto ${
            form.fontFamily === 'Serif Clásico'
              ? 'font-serif'
              : form.fontFamily === 'Monospace Clínico'
                ? 'font-mono'
                : 'font-sans'
          }`}
          style={{ borderTop: `5px solid ${form.borderColor}` }}
        >
          <div className="flex items-start justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{form.clinicName}</h3>
              <p className="text-xs text-slate-600">{form.clinicSubtitle}</p>
              <p className="text-[11px] text-slate-400">
                RIF: {form.rif} · {form.address}
              </p>
            </div>
            <div className="text-right text-xs font-mono text-slate-500">
              <div>RÉCIPE MÉDICO</div>
              <div className="font-bold text-slate-800">{doctorSignature.doctorName}</div>
            </div>
          </div>

          {isVerticalSplit ? (
            <div className="rounded-xl border border-slate-300 grid grid-cols-2 divide-x divide-slate-300 min-h-[170px]">
              <div className="p-3.5 space-y-2">
                <div className="text-[10px] font-bold uppercase text-slate-800 border-b border-slate-200 pb-1">
                  {form.leftColumnTitle || 'RP / MEDICAMENTOS Y EXÁMENES'}
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-900">1. Amoxicilina Pediátrica</p>
                  <p className="text-[11px] text-slate-500 font-mono">Suspensión 250mg/5ml</p>
                </div>
              </div>
              <div className="p-3.5 space-y-2 bg-slate-50/40">
                <div className="text-[10px] font-bold uppercase text-slate-800 border-b border-slate-200 pb-1">
                  {form.rightColumnTitle || 'INDICACIONES E INSTRUCCIONES'}
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-[#0284C7]">1. 5 ml · c/8h · 7d</p>
                  <p className="text-[11px] text-slate-600">Administrar después de las comidas.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-900">1. Amoxicilina Pediátrica — Suspensión 250mg/5ml</p>
              <p className="text-[#0284C7] font-semibold">5 ml · c/8h · 7 días</p>
            </div>
          )}

          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between">
            <span>{form.footerNote}</span>
            <span>{form.showQrCode ? 'QR Activo' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
