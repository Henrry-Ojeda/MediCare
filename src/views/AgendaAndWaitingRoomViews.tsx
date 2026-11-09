import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Phone,
  Stethoscope,
  Activity,
  Volume2,
  X,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMedical, calculateExactAgeLabel } from '../context/MedicalContext';
import { Appointment, AppointmentType, Specialty, WaitingRoomStage } from '../types/medical';

/* ============================================================================
   VISTA 7: AGENDA MÉDICA Y CALENDARIO INTERACTIVO (/agenda)
============================================================================ */
export const MedicalAgendaView: React.FC = () => {
  const {
    appointments,
    patients,
    addAppointment,
    navigateToActiveConsultation,
    navigateToPatient360,
    openTriageModal,
    showToast,
  } = useMedical();

  const [viewMode, setViewMode] = useState<'Mes' | 'Semana' | 'Día' | 'Lista'>('Semana');
  const [doctorFilter, setDoctorFilter] = useState<string>('Todos');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('Todas');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showNewModal, setShowNewModal] = useState<boolean>(false);

  // New Appointment Form State
  const [newPatientId, setNewPatientId] = useState<string>(patients[0]?.id || 'pat-1');
  const [newTime, setNewTime] = useState<string>('02:30 PM');
  const [newType, setNewType] = useState<AppointmentType>('control');
  const [newReason, setNewReason] = useState<string>(
    'Control periódico de crecimiento y revisión de exámenes.'
  );

  const filteredAppointments = appointments.filter((apt) => {
    const matchDoc = doctorFilter === 'Todos' || apt.doctorName === doctorFilter;
    const matchSpec = specialtyFilter === 'Todas' || apt.specialty === specialtyFilter;
    return matchDoc && matchSpec;
  });

  const getTypeStyle = (type: AppointmentType) => {
    switch (type) {
      case 'control':
        return {
          bg: 'bg-sky-50 border-sky-200 text-sky-900',
          label: 'Control Niño Sano / Rutina',
          accent: 'text-[#0284C7]',
        };
      case 'urgencia':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-950',
          label: 'Consulta de Urgencia / Fiebre',
          accent: 'text-[#E11D48]',
        };
      case 'vacunacion':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-950',
          label: 'Vacunación Exclusiva',
          accent: 'text-[#059669]',
        };
      case 'primera_vez':
        return {
          bg: 'bg-violet-50 border-violet-200 text-violet-950',
          label: 'Primera Vez / Historia Nueva',
          accent: 'text-[#7C3AED]',
        };
    }
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find((p) => p.id === newPatientId) || patients[0];
    addAppointment({
      patientId: pat.id,
      patientName: `${pat.firstName} ${pat.lastName}`,
      patientAgeLabel: calculateExactAgeLabel(pat.birthDate),
      guardianName: pat.guardianName,
      guardianWhatsapp: pat.guardianWhatsapp,
      doctorName:
        pat.primarySpecialty === 'Ginecología' ? 'Dr. Alejandro Pérez' : 'Dra. Valeria Méndez',
      specialty: pat.primarySpecialty,
      date: '2026-11-09',
      time: newTime,
      durationMinutes: 30,
      type: newType,
      reason: newReason,
      stage: 'programado',
    });
    setShowNewModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {(['Mes', 'Semana', 'Día', 'Lista'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === m
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
          >
            <option value="Todos">Todos los médicos</option>
            <option value="Dra. Valeria Méndez">Dra. Valeria Méndez (Pediatría)</option>
            <option value="Dr. Alejandro Pérez">Dr. Alejandro Pérez (Ginecología)</option>
            <option value="Dr. Ricardo Montiel">Dr. Ricardo Montiel (Cardiología)</option>
          </select>

          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
          >
            <option value="Todas">Todas las especialidades</option>
            <option value="Pediatría">Pediatría</option>
            <option value="Ginecología">Ginecología</option>
            <option value="Medicina Interna / Cardiología">Medicina Interna / Cardiología</option>
            <option value="Traumatología">Traumatología</option>
            <option value="Dermatología">Dermatología</option>
          </select>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-2 shadow-xs hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Agendar Cita</span>
        </button>
      </div>

      {/* Color Code Legend */}
      <div className="flex flex-wrap items-center gap-6 px-2 text-xs text-slate-600">
        <span className="font-semibold text-slate-900">Código Clínico de Citas:</span>
        <span className="text-[#0284C7] font-semibold">Azul: Control Niño Sano / Rutina</span>
        <span className="text-slate-300">·</span>
        <span className="text-[#E11D48] font-semibold">Rojo: Urgencia / Fiebre Alta</span>
        <span className="text-slate-300">·</span>
        <span className="text-[#059669] font-semibold">Verde: Vacunación Exclusiva</span>
        <span className="text-slate-300">·</span>
        <span className="text-[#7C3AED] font-semibold">Púrpura: Primera Vez / Historia Nueva</span>
      </div>

      {/* Interactive Calendar / Schedule Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#0284C7]" />
            <span>Lunes, 09 de Noviembre 2026 · Vista {viewMode}</span>
          </div>
          <span className="font-mono">{filteredAppointments.length} citas programadas</span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAppointments.map((apt) => {
            const style = getTypeStyle(apt.type);
            return (
              <div
                key={apt.id}
                onClick={() => setSelectedAppointment(apt)}
                className={`p-4 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${style.bg}`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span className={`font-bold ${style.accent}`}>
                    {apt.time} ({apt.durationMinutes} min) · {style.label}
                  </span>
                  <span className="text-slate-500">{apt.specialty}</span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">
                  {apt.patientName} ({apt.patientAgeLabel})
                </h3>
                <p className="text-xs text-slate-700 mt-1 line-clamp-2">{apt.reason}</p>

                <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    Médico: <strong>{apt.doctorName}</strong>
                  </span>
                  <span className="font-mono text-slate-600">
                    Tutor: {apt.guardianName} ({apt.guardianWhatsapp})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Patient Details & WhatsApp Modal on Appointment Click */}
      <AnimatePresence>
        {selectedAppointment && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono text-[#0284C7] font-semibold">
                    DETALLE RÁPIDO DE CITA · {selectedAppointment.time}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {selectedAppointment.patientName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Edad: {selectedAppointment.patientAgeLabel} · {selectedAppointment.specialty}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                <div className="text-slate-500">Motivo de consulta:</div>
                <div className="font-medium text-slate-900">{selectedAppointment.reason}</div>
                <div className="pt-2 flex items-center justify-between border-t border-slate-200/70">
                  <span className="text-slate-600">Representante: {selectedAppointment.guardianName}</span>
                  <a
                    href={`https://wa.me/${selectedAppointment.guardianWhatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => showToast('Abriendo chat directo de WhatsApp con el representante')}
                    className="inline-flex items-center gap-1 font-mono font-bold text-[#059669] hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {selectedAppointment.guardianWhatsapp}
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  onClick={() => {
                    const apt = selectedAppointment;
                    setSelectedAppointment(null);
                    openTriageModal(apt);
                  }}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Registrar Signos Triaje
                </button>
                <button
                  onClick={() => {
                    const patId = selectedAppointment.patientId;
                    setSelectedAppointment(null);
                    navigateToActiveConsultation(patId);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold cursor-pointer"
                >
                  Iniciar Consulta IA →
                </button>
              </div>

              <button
                onClick={() => {
                  const patId = selectedAppointment.patientId;
                  setSelectedAppointment(null);
                  navigateToPatient360(patId);
                }}
                className="w-full py-2 text-center text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Ver Ficha Integral 360° del Paciente
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: + Agendar Cita */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Agendar Nueva Cita Médica</h3>
                <button
                  onClick={() => setShowNewModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateAppointment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Seleccionar Paciente
                  </label>
                  <select
                    value={newPatientId}
                    onChange={(e) => setNewPatientId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} ({p.primarySpecialty})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hora Prevista
                    </label>
                    <input
                      type="text"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tipo de Cita
                    </label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as AppointmentType)}
                      className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="control">Azul · Control Rutinario</option>
                      <option value="urgencia">Rojo · Urgencia / Fiebre</option>
                      <option value="vacunacion">Verde · Vacunación</option>
                      <option value="primera_vez">Púrpura · Primera Vez</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Motivo de la Cita
                  </label>
                  <textarea
                    rows={2}
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#0284C7] text-white text-xs font-bold cursor-pointer"
                  >
                    Guardar Cita
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ============================================================================
   VISTA 8: SALA DE ESPERA VIRTUAL / TABLERO DE TRIAJE (/sala-espera)
============================================================================ */
export const WaitingRoomKanbanView: React.FC = () => {
  const {
    appointments,
    updateAppointmentStage,
    openTriageModal,
    navigateToActiveConsultation,
    showToast,
  } = useMedical();

  const [calledPatientBanner, setCalledPatientBanner] = useState<string | null>(null);
  const [liveExtraMinutes, setLiveExtraMinutes] = useState<number>(0);

  // Live waiting timer increment
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveExtraMinutes((m) => m + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const playCallChime = (patientName: string) => {
    setCalledPatientBanner(patientName);
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.18); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    } catch {
      // ignore audio restrictions
    }
    showToast(`Llamando a consultorio: ${patientName}`);
    setTimeout(() => {
      setCalledPatientBanner(null);
    }, 5000);
  };

  const columns: {
    id: WaitingRoomStage;
    title: string;
    subtitle: string;
    headerColor: string;
  }[] = [
    {
      id: 'programado',
      title: '1. Programados para Hoy',
      subtitle: 'Lista cronológica prevista',
      headerColor: 'text-slate-700',
    },
    {
      id: 'en_sala',
      title: '2. En Sala de Espera',
      subtitle: 'Llegaron a recepción (Timer en vivo)',
      headerColor: 'text-[#0284C7]',
    },
    {
      id: 'en_triaje',
      title: '3. En Triaje / Toma de Signos',
      subtitle: 'Pesando y midiendo con asistente',
      headerColor: 'text-amber-600',
    },
    {
      id: 'en_consulta',
      title: '4. En Consulta con el Médico',
      subtitle: 'Paciente activo dentro del consultorio',
      headerColor: 'text-[#059669]',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Visual & Sound Call Alert Banner */}
      <AnimatePresence>
        {calledPatientBanner && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="p-4 rounded-2xl bg-[#0284C7] text-white shadow-md flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5" />
              <span className="text-sm font-bold">
                LLAMADO ACTIVO EN PANTALLA DE RECEPCIÓN: Paciente {calledPatientBanner} — Pasar al Consultorio 1
              </span>
            </div>
            <span className="text-xs font-mono">SONIDO EMITIDO</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4-Column Dynamic Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {columns.map((col) => {
          const colItems = appointments.filter((a) => a.stage === col.id);
          return (
            <div
              key={col.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col min-h-[540px]"
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
                  <div className="h-44 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                    <UserCheck className="w-6 h-6 mb-1.5 opacity-60" />
                    <span className="text-xs font-medium">Sin pacientes en esta etapa</span>
                  </div>
                ) : (
                  colItems.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-2.5 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="font-bold text-slate-700">{apt.time}</span>
                        {col.id === 'en_sala' || col.id === 'en_triaje' ? (
                          <span className="text-amber-600 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {apt.waitingMinutes + liveExtraMinutes} min en espera
                          </span>
                        ) : (
                          <span className="text-slate-400">{apt.specialty}</span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-xs font-bold text-slate-900">{apt.patientName}</h3>
                        <p className="text-[11px] text-slate-500">
                          Edad: {apt.patientAgeLabel} · {apt.doctorName}
                        </p>
                      </div>

                      {apt.triageVitals && (
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] font-mono text-slate-700 flex items-center justify-between">
                          <span>Peso: {apt.triageVitals.weightKg} kg</span>
                          <span>Talla: {apt.triageVitals.heightCm} cm</span>
                          <span>T: {apt.triageVitals.temperatureC} °C</span>
                        </div>
                      )}

                      {/* Quick Action Buttons */}
                      <div className="pt-1 flex flex-col gap-1.5">
                        {col.id === 'programado' && (
                          <button
                            onClick={() => updateAppointmentStage(apt.id, 'en_sala')}
                            className="w-full py-2 px-3 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0284C7] text-xs font-bold cursor-pointer"
                          >
                            Marcar Llegada a Recepción →
                          </button>
                        )}

                        {(col.id === 'en_sala' || col.id === 'en_triaje') && (
                          <button
                            onClick={() => openTriageModal(apt)}
                            className="w-full py-2 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            <span>Pasar a Triaje (Modal V9)</span>
                          </button>
                        )}

                        {col.id !== 'en_consulta' ? (
                          <button
                            onClick={() => {
                              playCallChime(apt.patientName);
                              updateAppointmentStage(apt.id, 'en_consulta');
                            }}
                            className="w-full py-2 px-3 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Llamar a Consultorio</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => navigateToActiveConsultation(apt.patientId)}
                            className="w-full py-2 px-3 rounded-lg bg-[#059669] hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Stethoscope className="w-3.5 h-3.5" />
                            <span>Abrir Puesto de Consulta IA</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
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
