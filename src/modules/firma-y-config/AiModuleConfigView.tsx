import React, { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, Save, Sparkles, Wifi } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { medicareApi } from '../../api/medicareApi';
import {
  DoctorAiConfig,
  GeminiModelOption,
  loadDoctorAiConfig,
  saveDoctorAiConfig,
} from '../../utils/aiPrefs';

export const AiModuleConfigView: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();

  const [config, setConfig] = useState<DoctorAiConfig>(() => loadDoctorAiConfig(currentUser?.id));
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveDoctorAiConfig(currentUser?.id, config);
    showToast('Configuración del Módulo IA (Gemini) guardada.');
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await medicareApi.testAiConnection({
        apiKey: config.apiKey,
        model: config.model,
      });
      setTestResult({ ok: true, message: res.message || `Conexión exitosa con ${config.model}.` });
      showToast('Conexión con Gemini verificada.');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'No se pudo conectar con Gemini. Verifica tu API Key.';
      setTestResult({ ok: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-[#0284C7]">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Módulo IA · Gemini por Médico</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configura tu propia API Key de Google Gemini para potenciar el Dictado Clínico Inteligente y el reconocimiento visual de Récipes.
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold self-start sm:self-auto ${
            config.enabled && config.apiKey.trim()
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-slate-100 border border-slate-200 text-slate-600'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {config.enabled && config.apiKey.trim() ? 'Gemini Personal Activo' : 'Usando Motor Local / Servidor'}
        </span>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Google Gemini API Key del Médico
            </label>
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                disabled={testing}
                onClick={handleTestConnection}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>{testing ? 'Probando...' : 'Probar Conexión'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Cada médico puede usar su propia clave de Google AI Studio. Se guarda asociada a tu usuario en este equipo.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Modelo Gemini Preferido
            </label>
            <select
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value as GeminiModelOption })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Recomendado · Rápido + Visión)</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash (Rápido)</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash (Compatible)</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer p-2.5 rounded-xl border border-slate-200 bg-slate-50 w-full">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="w-4 h-4 accent-[#0284C7]"
              />
              <span>Habilitar Módulo IA para mi consultorio</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableDictationAi}
              onChange={(e) => setConfig({ ...config, enableDictationAi: e.target.checked })}
              className="w-4 h-4 accent-[#0284C7] mt-0.5"
            />
            <div>
              <span className="block text-xs font-bold text-slate-900">Dictado Clínico Inteligente</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                Estructura motivo, examen físico, CIE-10, medicamentos y guía para padres desde tu voz.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableRecipeVisionAi}
              onChange={(e) => setConfig({ ...config, enableRecipeVisionAi: e.target.checked })}
              className="w-4 h-4 accent-[#0284C7] mt-0.5"
            />
            <div>
              <span className="block text-xs font-bold text-slate-900">Análisis Visual de Récipe</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                Extrae colores, orientación y datos de clínica automáticamente al subir una foto de tu récipe.
              </span>
            </div>
          </label>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold ${
              testResult.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {testResult.message}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Configuración IA</span>
          </button>
        </div>
      </form>
    </div>
  );
};
