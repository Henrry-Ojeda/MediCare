import React, { useRef, useState } from 'react';
import { Award, CheckCircle2, FileSignature, Save, ShieldCheck, Stamp, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { SignaturePadCanvas } from './SignaturePadCanvas';

export const DoctorSignatureView: React.FC = () => {
  const { doctorSignature, updateDoctorSignature } = useAuth();
  const { showToast } = useNotifications();
  const stampInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState(doctorSignature);

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, wetStampDataUrl: reader.result as string, useWetStamp: true }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateDoctorSignature(form);
    showToast('Firma del médico y credenciales MPPS guardadas correctamente.');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <FileSignature className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Firma del Médico y Sello Digital</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Se estampa automáticamente en todos los récipes médicos e indicaciones enviadas por WhatsApp o PDF.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4" /> Activa para Récipes
        </span>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-sky-600" /> Credenciales Profesionales
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre en Récipe</label>
                <input
                  type="text"
                  required
                  value={form.doctorName}
                  onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Especialidad</label>
                <input
                  type="text"
                  required
                  value={form.specialtyLabel}
                  onChange={(e) => setForm({ ...form, specialtyLabel: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Número MPPS</label>
                <input
                  type="text"
                  required
                  value={form.mppsNumber}
                  onChange={(e) => setForm({ ...form, mppsNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Colegio de Médicos</label>
                <input
                  type="text"
                  required
                  value={form.colegioNumber}
                  onChange={(e) => setForm({ ...form, colegioNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">Trazo de Firma Digital</h2>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.useDigitalSignature}
                  onChange={(e) => setForm({ ...form, useDigitalSignature: e.target.checked })}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                Incluir en récipe
              </label>
            </div>

            <SignaturePadCanvas
              value={form.signatureDataUrl}
              onChange={(dataUrl) => setForm((prev) => ({ ...prev, signatureDataUrl: dataUrl }))}
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Stamp className="w-4 h-4 text-sky-600" /> Sello Húmedo (Opcional)
              </h2>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.useWetStamp}
                  onChange={(e) => setForm({ ...form, useWetStamp: e.target.checked })}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                Mostrar sello
              </label>
            </div>

            <input
              ref={stampInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleStampUpload}
              className="hidden"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => stampInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Upload className="w-3.5 h-3.5" /> Cargar imagen de sello (PNG)
              </button>
              {form.wetStampDataUrl && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, wetStampDataUrl: undefined })}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Quitar imagen
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" /> Guardar Firma y Credenciales
          </button>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sticky top-20 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Vista Previa en Pie de Récipe
            </h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center text-center space-y-2">
              <div className="flex items-end justify-center gap-6 min-h-[84px]">
                {form.useDigitalSignature && (
                  <div className="flex flex-col items-center">
                    {form.signatureDataUrl ? (
                      <img src={form.signatureDataUrl} alt="Firma médica" className="h-16 object-contain" />
                    ) : (
                      <span className="font-serif italic text-xl text-slate-700 pb-1">{form.doctorName}</span>
                    )}
                  </div>
                )}
                {form.useWetStamp && (
                  <div className="flex items-center justify-center">
                    {form.wetStampDataUrl ? (
                      <img src={form.wetStampDataUrl} alt="Sello médico" className="h-16 w-16 object-contain opacity-90" />
                    ) : (
                      <div className="w-20 h-20 rounded-full border-2 border-dashed border-sky-500/70 flex flex-col items-center justify-center text-[8px] font-bold text-sky-700 leading-tight px-1">
                        <span>{form.specialtyLabel.toUpperCase()}</span>
                        <span className="mt-0.5">{form.mppsNumber}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="w-56 border-t border-slate-400 pt-2">
                <p className="text-xs font-bold text-slate-900">{form.doctorName}</p>
                <p className="text-[11px] font-medium text-slate-600">{form.specialtyLabel}</p>
                <p className="text-[10px] text-slate-500">
                  {form.mppsNumber} • {form.colegioNumber}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Esta firma se aplicará en las dos páginas del récipe (Rp/ e Indicaciones) al imprimir o enviar por WhatsApp.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
