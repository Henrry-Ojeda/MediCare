import React, { useState } from 'react';
import { BellRing, Mic, Pause, Play, Sparkles, Square, Volume2 } from 'lucide-react';
import { useClinicalDictation } from '../../../../hooks/useClinicalDictation';
import { DictationAiResult } from '../../../../types/consultation.types';
import { DEMO_DICTATION_SCRIPTS } from '../../../../data/mockClinicalData';
import { useNotifications } from '../../../../context/NotificationContext';
import { useAuth } from '../../../../context/AuthContext';

interface ClinicalDictationBarProps {
  patientName: string;
  patientAge: string;
  weightKg: number;
  onApplyAiResult: (result: DictationAiResult | null, rawTranscript: string) => void;
}

export const ClinicalDictationBar: React.FC<ClinicalDictationBarProps> = ({
  patientName,
  patientAge,
  weightKg,
  onApplyAiResult,
}) => {
  const {
    isRecording,
    isPaused,
    secondsElapsed,
    status,
    transcript,
    speechSupported,
    setTranscript,
    startRecording,
    stopRecording,
    togglePause,
    processTranscriptWithAi,
  } = useClinicalDictation();
  const { callAssistantFromConsultorio, showToast } = useNotifications();
  const { currentUser } = useAuth();
  const [showTranscriptBox, setShowTranscriptBox] = useState(true);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleProcess = async () => {
    const res = await processTranscriptWithAi({
      patientName,
      patientAge,
      weightKg,
    });
    onApplyAiResult(res.data, transcript);
    showToast(
      res.data
        ? 'Dictado estructurado con IA en la historia clínica.'
        : 'Dictado aplicado mediante motor clínico pediátrico local.'
    );
  };

  const handleCallAssistant = () => {
    callAssistantFromConsultorio(
      `Asistencia requerida en Consultorio 1 (${currentUser?.name || 'Pediatra'})`,
      patientName
    );
    showToast('Llamado enviado al asistente en tiempo real.');
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md space-y-3.5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isRecording && !isPaused ? 'bg-rose-500 animate-pulse' : 'bg-sky-500/20 border border-sky-400/40'
            }`}
          >
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold">Dictado Clínico Inteligente</h2>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-semibold">
                {speechSupported ? 'Voz en Vivo + IA' : 'Modo Texto / Demo'}
              </span>
            </div>
            <p className="text-xs text-sky-200/80">
              {isRecording
                ? `Grabando (${formatTimer(secondsElapsed)}) — Hable naturalmente el examen físico y diagnóstico.`
                : 'Dicte la consulta o seleccione un caso rápido para autocompletar historia y récipe.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-bold shadow-sm transition-colors"
            >
              <Mic className="w-4 h-4" /> Iniciar Dictado
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={togglePause}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-bold"
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                {isPaused ? 'Reanudar' : 'Pausar'}
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold"
              >
                <Square className="w-3.5 h-3.5" /> Detener
              </button>
            </>
          )}

          <button
            type="button"
            disabled={status === 'processing' || !transcript.trim()}
            onClick={handleProcess}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-xs font-bold transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {status === 'processing' ? 'Estructurando...' : 'Estructurar con IA'}
          </button>

          <button
            type="button"
            onClick={handleCallAssistant}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-bold transition-colors"
            title="Enviar alerta sonora al asistente"
          >
            <BellRing className="w-4 h-4" /> Llamar Asistente
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-sky-200/70 flex items-center gap-1 mr-1">
            <Volume2 className="w-3.5 h-3.5" /> Plantillas rápidas:
          </span>
          {Object.entries(DEMO_DICTATION_SCRIPTS)
            .filter(([key]) => key.startsWith('pediatria'))
            .map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTranscript(item.transcript)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-medium transition-colors"
              >
                {item.label}
              </button>
            ))}
        </div>

        <button
          type="button"
          onClick={() => setShowTranscriptBox((v) => !v)}
          className="text-[11px] text-sky-300 hover:underline"
        >
          {showTranscriptBox ? 'Ocultar transcripción' : 'Ver transcripción'}
        </button>
      </div>

      {showTranscriptBox && (
        <textarea
          rows={3}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="La transcripción de voz aparecerá aquí en tiempo real..."
          className="w-full rounded-xl bg-slate-950/60 border border-white/15 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
        />
      )}
    </div>
  );
};
