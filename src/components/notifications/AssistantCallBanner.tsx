import React from 'react';
import { BellRing, CheckCircle2, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

export const AssistantCallBanner: React.FC = () => {
  const { activeAssistantCall, acknowledgeAssistantCall, dismissAssistantCall } =
    useNotifications();
  const { userRole } = useAuth();

  if (!activeAssistantCall) return null;

  // La Asistente ve el llamado urgente pendiente o en camino; el Pediatra/Admin ve confirmación
  const isAssistant = userRole === 'ASISTENTE';
  const isPending = activeAssistantCall.status === 'PENDIENTE';

  if (!isAssistant && isPending) {
    return (
      <div className="mx-4 sm:mx-6 mt-3 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs no-print">
        <div className="flex items-center gap-2 text-amber-900 font-semibold">
          <BellRing className="w-4 h-4 text-amber-600 animate-bounce shrink-0" />
          <span>
            Llamando a la Asistente ({activeAssistantCall.createdAt}):{' '}
            <strong>{activeAssistantCall.reason}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={dismissAssistantCall}
          className="text-amber-700 hover:text-amber-950 font-semibold cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    );
  }

  if (activeAssistantCall.status === 'EN_CAMINO' && !isAssistant) {
    return (
      <div className="mx-4 sm:mx-6 mt-3 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs no-print">
        <div className="flex items-center gap-2 text-emerald-900 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {activeAssistantCall.acknowledgedBy || 'Asistente'} confirmó tu llamado y va en camino
            ({activeAssistantCall.acknowledgedAt}).
          </span>
        </div>
        <button
          type="button"
          onClick={dismissAssistantCall}
          className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-lg cursor-pointer"
          aria-label="Cerrar confirmación"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (!isAssistant) return null;

  return (
    <>
      {isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 no-print">
          <div className="w-full max-w-md rounded-2xl bg-white border-2 border-rose-500 shadow-2xl overflow-hidden">
            <div className="bg-rose-600 text-white px-5 py-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <BellRing className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-rose-100">
                  Llamado Automático · {activeAssistantCall.consultorioLabel}
                </div>
                <h3 className="text-base font-bold">
                  {activeAssistantCall.requestedByDoctor} solicita atención
                </h3>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {activeAssistantCall.patientName && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
                  <div className="text-[11px] font-bold uppercase text-rose-700">Paciente</div>
                  <div className="text-base font-extrabold text-slate-900">
                    {activeAssistantCall.patientName}
                  </div>
                </div>
              )}
              <p className="text-sm text-slate-700 font-medium">
                {activeAssistantCall.reason} ({activeAssistantCall.createdAt})
              </p>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={acknowledgeAssistantCall}
                  className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-sm cursor-pointer"
                >
                  Confirmar: Paciente pasando / En camino
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-4 sm:mx-6 mt-3 p-4 rounded-2xl bg-rose-600 text-white shadow-lg flex flex-wrap items-center justify-between gap-3 no-print">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <BellRing className="w-5 h-5 animate-bounce" />
        </div>
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-rose-100">
            Llamado desde {activeAssistantCall.consultorioLabel} · {activeAssistantCall.createdAt}
          </div>
          <div className="text-sm font-bold">
            {activeAssistantCall.requestedByDoctor}: {activeAssistantCall.reason}
          </div>
          {activeAssistantCall.patientName && (
            <div className="text-xs text-rose-100">
              Paciente: {activeAssistantCall.patientName}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isPending ? (
          <button
            type="button"
            onClick={acknowledgeAssistantCall}
            className="px-4 py-2.5 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold shadow-xs cursor-pointer"
          >
            Confirmar: En camino
          </button>
        ) : (
          <button
            type="button"
            onClick={dismissAssistantCall}
            className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold cursor-pointer"
          >
            Marcar Atendido
          </button>
        )}
      </div>
    </div>
    </>
  );
};
