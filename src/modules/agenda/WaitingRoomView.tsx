import React, { useState, useEffect } from 'react';
import {
  Activity,
  Clock,
  Volume2,
  Stethoscope,
  ArrowRight,
  UserCheck,
  UserPlus,
  Send,
  BellRing,
} from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';
import { useAuth } from '../../context/AuthContext';
import { ROLE_PERMISSIONS } from '../../config/permissions.config';
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
  const { userRole, currentUser } = useAuth();
  const {
    appointments,
    patients,
    doctors,
    currentDoctorHasAssistant,
    updateAppointmentStage,
    openTriageModal,
    navigateToActiveConsultation,
    quickAddToWaitingRoom,
    assignPatientDoctor,
    sendPatientToConsultorio,
    setCurrentView,
  } = useClinical();
  const { showToast, callAssistantFromConsultorio } = useNotifications();

  const [mobileStage, setMobileStage] = useState<WaitingRoomStage>('en_sala');
  const [calledBanner, setCalledBanner] = useState<string | null>(null);
  const [liveExtraMinutes, setLiveExtraMinutes] = useState(0);
  const [doctorFilterId, setDoctorFilterId] = useState<string>('ALL');

  // Ingreso rápido por Nombre (Asistente / Recepción)
  const [quickPatientId, setQuickPatientId] = useState<string | undefined>(undefined);
  const [quickName, setQuickName] = useState('');
  const [quickIdDoc, setQuickIdDoc] = useState('');
  const [quickReason, setQuickReason] = useState('');
  const [quickDoctorId, setQuickDoctorId] = useState('');
  const [quickType, setQuickType] = useState<'control' | 'urgencia'>('control');
  const [showQuickMatches, setShowQuickMatches] = useState(false);

  const quickMatchingPatients =
    quickName.trim().length >= 2 || quickIdDoc.trim().length >= 2
      ? patients
          .filter((p) => {
            const qName = quickName.trim().toLowerCase();
            const qDoc = quickIdDoc.trim().toLowerCase();
            const full = `${p.firstName} ${p.lastName} ${p.guardianName}`.toLowerCase();
            const doc = (p.idDocument || p.guardianIdDocument || p.historyNumber || '').toLowerCase();
            return (qName && full.includes(qName)) || (qDoc && doc.includes(qDoc));
          })
          .slice(0, 5)
      : [];

  useEffect(() => {
    const interval = setInterval(() => setLiveExtraMinutes((m) => m + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim() && !quickPatientId) return;
    quickAddToWaitingRoom({
      patientId: quickPatientId,
      fullName: quickName,
      idDocument: quickIdDoc,
      reason: quickReason,
      doctorId: quickDoctorId || doctors[0]?.id,
      type: quickType,
    });
    setQuickPatientId(undefined);
    setQuickName('');
    setQuickIdDoc('');
    setQuickReason('');
    setQuickType('control');
    setShowQuickMatches(false);
    setMobileStage('en_sala');
  };

  const handleCallPatient = (patientName: string, appointmentId: string, patientId: string) => {
    setCalledBanner(patientName);
    playClinicalChime('patient');
    updateAppointmentStage(appointmentId, 'en_consulta');
    callAssistantFromConsultorio('Solicita pasar al consultorio', patientName);
    showToast(`Llamando a consultorio: ${patientName} (Asistente notificado)`);
    if (userRole === 'PEDIATRA') {
      navigateToActiveConsultation(patientId);
    }
    setTimeout(() => setCalledBanner(null), 5000);
  };

  const nextWaitingAppointment =
    appointments.find((a) => a.stage === 'en_triaje') ||
    appointments.find((a) => a.stage === 'en_sala') ||
    appointments.find((a) => a.stage === 'programado');

  if (userRole === 'PEDIATRA' && !currentDoctorHasAssistant) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0284C7] flex items-center justify-center mx-auto">
          <Stethoscope className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Sala de Espera Digital Desactivada</h2>
        <p className="text-xs text-slate-600">
          No tienes un asistente asignado, por lo que no se gestiona sala de espera digital. Los pacientes hacen su fila por orden de llegada y puedes buscarlos directamente para atenderlos.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => setCurrentView('pacientes')}
            className="px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold cursor-pointer"
          >
            Buscar Paciente
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('consulta-activa')}
            className="px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold cursor-pointer"
          >
            Ir a Consulta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra superior: Ingreso rápido a Sala de Espera + Llamar Siguiente Paciente */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#0284C7]" />
              Ingreso Rápido a Sala de Espera
            </h2>
            <p className="text-[11px] text-slate-500">
              Ingrese el nombre del paciente para agregarlo directo a Sala de Espera.
            </p>
          </div>

          {nextWaitingAppointment && (userRole === 'PEDIATRA' || userRole === 'ADMIN') && (
            <button
              type="button"
              onClick={() =>
                handleCallPatient(
                  nextWaitingAppointment.patientName,
                  nextWaitingAppointment.id,
                  nextWaitingAppointment.patientId
                )
              }
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold shadow-sm cursor-pointer shrink-0"
            >
              <BellRing className="w-4 h-4" />
              <span>Llamar al Siguiente ({nextWaitingAppointment.patientName})</span>
            </button>
          )}
        </div>

        {ROLE_PERMISSIONS[userRole].canCreatePatient && (
          <form onSubmit={handleQuickAdd} className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-3 relative">
                <input
                  type="text"
                  required
                  placeholder="Buscar o escribir nombre del paciente *"
                  value={quickName}
                  onFocus={() => setShowQuickMatches(true)}
                  onChange={(e) => {
                    setQuickName(e.target.value);
                    setQuickPatientId(undefined);
                    setShowQuickMatches(true);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#0284C7]"
                />
                {showQuickMatches && quickMatchingPatients.length > 0 && !quickPatientId && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {quickMatchingPatients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setQuickPatientId(p.id);
                          setQuickName(`${p.firstName} ${p.lastName}`);
                          setQuickIdDoc(p.idDocument || p.guardianIdDocument || '');
                          setShowQuickMatches(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-sky-50 text-xs border-b border-slate-100 last:border-b-0 cursor-pointer"
                      >
                        <div className="font-bold text-slate-900">
                          {p.firstName} {p.lastName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {p.historyNumber} · Rep: {p.guardianName}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder="Cédula / Doc."
                value={quickIdDoc}
                onChange={(e) => setQuickIdDoc(e.target.value)}
                className="sm:col-span-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#0284C7]"
              />
              <input
                type="text"
                placeholder="Motivo (ej. Control)"
                value={quickReason}
                onChange={(e) => setQuickReason(e.target.value)}
                className="sm:col-span-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#0284C7]"
              />
              <select
                value={quickType}
                onChange={(e) => setQuickType(e.target.value as 'control' | 'urgencia')}
                className={`sm:col-span-1 px-2.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none ${
                  quickType === 'urgencia'
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
                title="Prioridad de atención"
              >
                <option value="control">Normal</option>
                <option value="urgencia">Urgente</option>
              </select>
              <select
                value={quickDoctorId || doctors[0]?.id || ''}
                onChange={(e) => setQuickDoctorId(e.target.value)}
                className="sm:col-span-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#0284C7]"
              >
                {doctors.length === 0 ? (
                  <option value="">Pediatra por defecto</option>
                ) : (
                  doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))
                )}
              </select>
              <button
                type="submit"
                className={`sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold cursor-pointer ${
                  quickType === 'urgencia'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#059669] hover:bg-emerald-700'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>{quickType === 'urgencia' ? 'Ingreso Urgente' : 'Agregar a Sala'}</span>
              </button>
            </div>
            {quickPatientId && (
              <p className="text-[11px] font-semibold text-emerald-700">
                Paciente existente seleccionado ({quickName}). Se agregará directo a sala de espera.
              </p>
            )}
          </form>
        )}

        {doctors.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500">Filtrar por Médico:</span>
            <button
              type="button"
              onClick={() => setDoctorFilterId('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                doctorFilterId === 'ALL'
                  ? 'bg-[#0284C7] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            {doctors.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setDoctorFilterId(doc.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                  doctorFilterId === doc.id
                    ? 'bg-[#0284C7] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {doc.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {calledBanner && (
        <div className="p-4 rounded-2xl bg-[#0284C7] text-white shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">
              LLAMANDO A CONSULTORIO: {calledBanner}
            </span>
          </div>
          <span className="text-[11px] font-mono">ASISTENTE NOTIFICADO</span>
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
          const colItems = appointments
            .filter(
              (a) =>
                a.stage === col.id &&
                (doctorFilterId === 'ALL' || a.doctorId === doctorFilterId)
            )
            .sort((a, b) => {
              if (a.type === 'urgencia' && b.type !== 'urgencia') return -1;
              if (a.type !== 'urgencia' && b.type === 'urgencia') return 1;
              return 0;
            });
          const hiddenOnMobile = mobileStage !== col.id ? 'hidden xl:flex' : 'flex';
          return (
            <div
              key={col.id}
              className={`${hiddenOnMobile} bg-white rounded-2xl border border-slate-200/80 shadow-xs flex-col min-h-[380px] xl:min-h-[500px]`}
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
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-700">{apt.time}</span>
                          {apt.type === 'urgencia' && (
                            <span className="px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold uppercase">
                              URGENTE
                            </span>
                          )}
                        </div>
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
                        {apt.reason && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{apt.reason}</p>
                        )}
                      </div>

                      {doctors.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
                          <select
                            value={apt.doctorId || ''}
                            onChange={(e) => assignPatientDoctor(apt.id, e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700"
                            title="Asignar médico al paciente"
                          >
                            <option value="" disabled>
                              Asignar médico...
                            </option>
                            {doctors.map((doc) => (
                              <option key={doc.id} value={doc.id}>
                                {doc.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <p className="text-[11px] font-medium text-sky-700 flex items-center gap-1">
                          <Stethoscope className="w-3 h-3" /> {apt.doctorName}
                        </p>
                      )}

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
                          userRole === 'ASISTENTE' ? (
                            <button
                              type="button"
                              onClick={() => sendPatientToConsultorio(apt.id)}
                              className="w-full py-2.5 px-3 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Enviar a Consultorio</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleCallPatient(apt.patientName, apt.id, apt.patientId)
                              }
                              className="w-full py-2.5 px-3 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Llamar a Consultorio</span>
                            </button>
                          )
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
