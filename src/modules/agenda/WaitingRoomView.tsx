import React, { useState, useEffect } from 'react';
import { Activity, Clock, Volume2, Stethoscope, ArrowRight, UserCheck } from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { WaitingRoomStage } from '../../types/medical';
import { playClinicalChime } from '../../utils/soundAndVibrate';

const COLUMNS: {
  id: WaitingRoomStage;
  title: string;
  shortTitle: string;
  subtitle: string;
  headerColor: string;
}[] = [
  {
    id: 'programado',
    title: '1. Programados Hoy',
    shortTitle: 'Programados',
    subtitle: 'Citas por llegar',
    headerColor: 'text-slate-700',
  },
  {
    id: 'en_sala',
    title: '2. En Sala de Espera',
    shortTitle: 'En Sala',
    subtitle: 'Llegaron a recepción',
    headerColor: 'text-[#0284C7]',
  },
  {
    id: 'en_triaje',
    title: '3. En Triaje',
    shortTitle: 'Triaje',
    subtitle: 'Peso, talla y temperatura',
    headerColor: 'text-amber-600',
  },
  {
    id: 'en_consulta',
    title: '4. En Consultorio',
    shortTitle: 'Consultorio',
    subtitle: 'Listo o en atención',
    headerColor: 'text-[#059669]',
  },
];

export const WaitingRoomView: React.FC = () => {
  const { userRole } = useAuth();
  const {
    appointments,
    updateAppointmentStage,
    openTriageModal,
    navigateToActiveConsultation,
  } = useClinical();
  const { showToast } = useNotifications();

  const [mobileStage, setMobileStage] = useState<WaitingRoomStage>('en_sala');
  const [calledBanner, setCalledBanner] = useState<string | null>(null);
  const [liveExtraMinutes, setLiveExtraMinutes] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setLiveExtraMinutes((m) => m + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleCallPatient = (patientName: string, appointmentId: string) => {
    setCalledBanner(patientName);
    playClinicalChime('patient');
    updateAppointmentStage(appointmentId, 'en_consulta');
    showToast(`Llamando a consultorio: ${patientName}`);
    setTimeout(() => setCalledBanner(null), 5000);
  };

  return (
    <div className="space-y-4">
      {calledBanner && (
        <div className="p-4 rounded-2xl bg-[#0284C7] text-white shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">
              LLAMANDO A CONSULTORIO: {calledBanner}
            </span>
          </div>
          <span className="text-[11px] font-mono">TIMBRE EMITIDO</span>
        </div>
      )}

      {/* Selector de pestañas táctiles solo en Teléfono/Tablet (< xl) */}
      <div className="grid grid-cols-4 gap-1.5 xl:hidden bg-white p-1.5 rounded-2xl border border-slate-200/80">
        {COLUMNS.map((col) => {
          const count = appointments.filter((a) => a.stage === col.id).length;
          const active = mobileStage === col.id;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setMobileStage(col.id)}
              className={`py-2 px-1.5 rounded-xl text-[11px] font-bold text-center transition-colors cursor-pointer ${
                active ? 'bg-[#0284C7] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div>{col.shortTitle}</div>
              <div className={`text-[10px] font-mono ${active ? 'text-sky-100' : 'text-slate-400'}`}>
                ({count})
              </div>
            </button>
          );
        })}
      </div>

      {/* Tablero Kanban: 4 columnas en xl, columna activa en móvil/tablet */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          const colItems = appointments.filter((a) => a.stage === col.id);
          const hiddenOnMobile = mobileStage !== col.id ? 'hidden xl:flex' : 'flex';
          return (
            <div
              key={col.id}
              className={`${hiddenOnMobile} bg-white rounded-2xl border border-slate-200/80 shadow-xs flex-col min-h-[380px] xl:min-h-[520px]`}
            >
              <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/60">
                <div>
                  <h2 className={`text-xs font-bold ${col.headerColor}`}>{col.title}</h2>
                  <p className="text-[11px] text-slate-500">{col.subtitle}</p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-700">
                  {colItems.length}
                </span>
              </div>

              <div className="p-3.5 space-y-3 flex-1">
                {colItems.length === 0 ? (
                  <div className="h-40 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                    <UserCheck className="w-6 h-6 mb-1.5 opacity-60" />
                    <span className="text-xs font-medium">Sin pacientes</span>
                  </div>
                ) : (
                  colItems.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="font-bold text-slate-700">{apt.time}</span>
                        {(col.id === 'en_sala' || col.id === 'en_triaje') && (
                          <span className="text-amber-600 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {apt.waitingMinutes + liveExtraMinutes} min
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-xs font-bold text-slate-900">{apt.patientName}</h3>
                        <p className="text-[11px] text-slate-500">{apt.patientAgeLabel}</p>
                      </div>

                      {apt.triageVitals && (
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] font-mono text-slate-700 flex items-center justify-between">
                          <span>{apt.triageVitals.weightKg} kg</span>
                          <span>{apt.triageVitals.heightCm} cm</span>
                          <span
                            className={
                              apt.triageVitals.temperatureC >= 38 ? 'text-rose-600 font-bold' : ''
                            }
                          >
                            {apt.triageVitals.temperatureC} °C
                          </span>
                        </div>
                      )}

                      <div className="pt-1 flex flex-col gap-1.5">
                        {col.id === 'programado' && (
                          <button
                            type="button"
                            onClick={() => updateAppointmentStage(apt.id, 'en_sala')}
                            className="w-full py-2.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#0284C7] text-xs font-bold cursor-pointer"
                          >
                            Marcar Llegada a Sala →
                          </button>
                        )}

                        {(col.id === 'en_sala' || col.id === 'en_triaje') && (
                          <button
                            type="button"
                            onClick={() => openTriageModal(apt)}
                            className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            <span>Registrar Triaje</span>
                          </button>
                        )}

                        {col.id !== 'en_consulta' ? (
                          <button
                            type="button"
                            onClick={() => handleCallPatient(apt.patientName, apt.id)}
                            className="w-full py-2.5 px-3 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Llamar a Consultorio</span>
                          </button>
                        ) : (
                          userRole === 'PEDIATRA' && (
                            <button
                              type="button"
                              onClick={() => navigateToActiveConsultation(apt.patientId)}
                              className="w-full py-2.5 px-3 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>Abrir Consulta</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
