import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  GripVertical,
  Phone,
  Plus,
  Activity,
  SlidersHorizontal,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Appointment, AppointmentType } from '../../types/medical';
import { Modal } from '../../components/common';
import {
  AppointmentFormModal,
  CalendarSlotInterval,
  generateTimeSlots,
  isSlotInPast,
} from './AppointmentFormModal';
import { normalizeWhatsappPhone } from '../../utils/whatsappFormatter';
import { getTodayIsoDate } from '../../utils/formatters';

const WORKING_DAY_OPTIONS = [
  { day: 1, label: 'Lun' },
  { day: 2, label: 'Mar' },
  { day: 3, label: 'Mié' },
  { day: 4, label: 'Jue' },
  { day: 5, label: 'Vie' },
  { day: 6, label: 'Sáb' },
  { day: 0, label: 'Dom' },
];

function getWeekDaysFromIso(anchorIso: string): { iso: string; label: string; dayOfWeek: number }[] {
  const parts = anchorIso.split('-').map(Number);
  const base = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
  const day = base.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + diffToMonday);
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dow = d.getDay();
    return {
      iso: `${y}-${m}-${dd}`,
      label: `${dayNames[dow]} ${dd}/${m}`,
      dayOfWeek: dow,
    };
  });
}

function shiftIsoDate(iso: string, deltaDays: number): string {
  const parts = iso.split('-').map(Number);
  const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const TYPE_STYLE: Record<AppointmentType, { bg: string; label: string; accent: string }> = {
  control: {
    bg: 'bg-sky-50 border-sky-200 text-sky-900',
    label: 'Control Niño Sano',
    accent: 'text-[#0284C7]',
  },
  urgencia: {
    bg: 'bg-rose-50 border-rose-200 text-rose-950',
    label: 'Urgencia / Fiebre',
    accent: 'text-[#E11D48]',
  },
  vacunacion: {
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-950',
    label: 'Vacunación',
    accent: 'text-[#059669]',
  },
  primera_vez: {
    bg: 'bg-violet-50 border-violet-200 text-violet-950',
    label: 'Primera Vez',
    accent: 'text-[#7C3AED]',
  },
};

export const AgendaView: React.FC = () => {
  const { userRole, currentUser } = useAuth();
  const {
    appointments,
    doctors,
    currentDoctorHasAssistant,
    setCurrentView,
    updateAppointment,
    removeAppointment,
    navigateToActiveConsultation,
    navigateToPatient360,
    openTriageModal,
  } = useClinical();
  const { showToast } = useNotifications();

  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [dateScope, setDateScope] = useState<'calendario' | 'proximas' | 'historico'>('calendario');
  const [calendarMode, setCalendarMode] = useState<'dia' | 'semana'>(() => {
    try {
      const saved = localStorage.getItem('medicare_agenda_calendar_mode');
      return saved === 'semana' ? 'semana' : 'dia';
    } catch {
      return 'dia';
    }
  });
  const [calendarDate, setCalendarDate] = useState<string>(getTodayIsoDate());
  const [draggedAptId, setDraggedAptId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [modalPrefillDate, setModalPrefillDate] = useState<string | undefined>(undefined);
  const [slotPrefillTime, setSlotPrefillTime] = useState<string | undefined>(undefined);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const calendarPrefsKey = `medicare_agenda_prefs_${currentUser?.id || 'default'}`;
  const [showCalendarConfig, setShowCalendarConfig] = useState(false);
  const [slotInterval, setSlotInterval] = useState<CalendarSlotInterval>(() => {
    try {
      const raw = localStorage.getItem(calendarPrefsKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { slotInterval?: CalendarSlotInterval };
        if (parsed.slotInterval && [15, 30, 45, 60].includes(parsed.slotInterval)) {
          return parsed.slotInterval;
        }
      }
    } catch {
      // ignore
    }
    return 30;
  });
  const [workingDays, setWorkingDays] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(calendarPrefsKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { workingDays?: number[] };
        if (Array.isArray(parsed.workingDays) && parsed.workingDays.length > 0) {
          return parsed.workingDays;
        }
      }
    } catch {
      // ignore
    }
    return [1, 2, 3, 4, 5, 6];
  });

  const saveCalendarPrefs = (nextInterval: CalendarSlotInterval, nextDays: number[]) => {
    setSlotInterval(nextInterval);
    setWorkingDays(nextDays);
    try {
      localStorage.setItem(
        calendarPrefsKey,
        JSON.stringify({ slotInterval: nextInterval, workingDays: nextDays })
      );
    } catch {
      // ignore
    }
  };

  const toggleWorkingDay = (day: number) => {
    const exists = workingDays.includes(day);
    if (exists && workingDays.length === 1) return;
    const nextDays = exists ? workingDays.filter((d) => d !== day) : [...workingDays, day];
    saveCalendarPrefs(slotInterval, nextDays);
  };

  const timeSlots = useMemo(() => generateTimeSlots(slotInterval), [slotInterval]);

  const changeCalendarMode = (mode: 'dia' | 'semana') => {
    setCalendarMode(mode);
    try {
      localStorage.setItem('medicare_agenda_calendar_mode', mode);
    } catch {
      // ignore storage errors
    }
  };
  const [showNewModal, setShowNewModal] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editType, setEditType] = useState<AppointmentType>('control');
  const [editDuration, setEditDuration] = useState(30);
  const [editDoctorId, setEditDoctorId] = useState('');
  const [editReason, setEditReason] = useState('');

  const openAppointmentModal = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setEditDate(apt.date);
    setEditTime(apt.time);
    setEditType(apt.type);
    setEditDuration(apt.durationMinutes || 30);
    setEditDoctorId(apt.doctorId || '');
    setEditReason(apt.reason || '');
  };

  const roleVisibleAppointments = appointments.filter((apt) => {
    if (userRole !== 'PEDIATRA') return true;
    // Si el paciente no tiene médico asignado, el doctor no puede verlo en su Agenda
    if (!apt.doctorId) return false;
    if (currentUser?.id && apt.doctorId === currentUser.id) return true;
    if (
      apt.doctorName &&
      currentUser?.name &&
      apt.doctorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
    ) {
      return true;
    }
    return false;
  });

  const todayIso = getTodayIsoDate();
  const allWeekDays = useMemo(() => getWeekDaysFromIso(calendarDate), [calendarDate]);
  const weekDays = useMemo(
    () => allWeekDays.filter((d) => workingDays.includes(d.dayOfWeek)),
    [allWeekDays, workingDays]
  );
  const weekIsoSet = useMemo(() => new Set(weekDays.map((d) => d.iso)), [weekDays]);

  const filteredAppointments = roleVisibleAppointments
    .filter((apt) => typeFilter === 'ALL' || apt.type === typeFilter)
    .filter((apt) => {
      if (dateScope === 'calendario') {
        return calendarMode === 'semana' ? weekIsoSet.has(apt.date) : apt.date === calendarDate;
      }
      if (dateScope === 'proximas') return apt.date > todayIso;
      return apt.date < todayIso;
    })
    .sort((a, b) =>
      dateScope === 'historico' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
    );

  const handleDropOnSlot = (slotTime: string, targetDate: string = calendarDate) => {
    setDragOverSlot(null);
    if (!draggedAptId) return;
    const apt = roleVisibleAppointments.find((a) => a.id === draggedAptId);
    setDraggedAptId(null);
    if (!apt || (apt.time === slotTime && apt.date === targetDate)) return;
    if (isSlotInPast(targetDate, slotTime)) {
      showToast('No puedes mover una cita a una fecha u hora que ya pasó.');
      return;
    }
    updateAppointment(apt.id, { date: targetDate, time: slotTime });
    showToast(`Cita de ${apt.patientName} movida a ${targetDate} · ${slotTime}`);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            {(
              [
                { id: 'calendario', label: 'Calendario' },
                { id: 'proximas', label: 'Próximas' },
                { id: 'historico', label: 'Histórico' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDateScope(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  dateScope === tab.id
                    ? 'bg-white text-[#0284C7] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {dateScope === 'calendario' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => changeCalendarMode('dia')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    calendarMode === 'dia' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Día
                </button>
                <button
                  type="button"
                  onClick={() => changeCalendarMode('semana')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    calendarMode === 'semana' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Semana
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarDate((prev) => shiftIsoDate(prev, calendarMode === 'semana' ? -7 : -1))
                  }
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  aria-label="Fecha del calendario"
                  value={calendarDate}
                  onChange={(e) => setCalendarDate(e.target.value || todayIso)}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
                <button
                  type="button"
                  onClick={() =>
                    setCalendarDate((prev) => shiftIsoDate(prev, calendarMode === 'semana' ? 7 : 1))
                  }
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer"
                  aria-label="Siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {calendarDate !== todayIso && (
                <button
                  type="button"
                  onClick={() => setCalendarDate(todayIso)}
                  className="px-2.5 py-1.5 text-xs font-bold text-[#0284C7] hover:underline cursor-pointer"
                >
                  Hoy
                </button>
              )}
            </div>
          )}

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
          >
            <option value="ALL">Todos los tipos de cita</option>
            <option value="control">Control Niño Sano</option>
            <option value="urgencia">Urgencia / Fiebre</option>
            <option value="vacunacion">Vacunación</option>
            <option value="primera_vez">Primera Vez</option>
          </select>

          {(userRole !== 'PEDIATRA' || currentDoctorHasAssistant) && (
            <button
              type="button"
              onClick={() => setCurrentView('sala-espera')}
              className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              <span>Ir a Sala de Espera</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCalendarConfig((v) => !v)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              showCalendarConfig
                ? 'bg-sky-50 border-sky-300 text-sky-900'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>Configurar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalPrefillDate(calendarDate < todayIso ? todayIso : calendarDate);
              setSlotPrefillTime(undefined);
              setShowNewModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar Cita</span>
          </button>
        </div>
      </div>

      {showCalendarConfig && (
        <div className="bg-white rounded-2xl border border-sky-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="block text-[11px] font-bold text-slate-500 uppercase">
              Duración por bloque
            </span>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1">
              {([15, 30, 45, 60] as CalendarSlotInterval[]).map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => saveCalendarPrefs(mins, workingDays)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    slotInterval === mins ? 'bg-[#0284C7] text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mins === 60 ? '1 hora' : `${mins} min`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-[11px] font-bold text-slate-500 uppercase">
              Días que trabaja el doctor
            </span>
            <div className="flex flex-wrap gap-1.5">
              {WORKING_DAY_OPTIONS.map((opt) => {
                const active = workingDays.includes(opt.day);
                return (
                  <button
                    key={opt.day}
                    type="button"
                    onClick={() => toggleWorkingDay(opt.day)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                      active
                        ? 'bg-sky-50 border-sky-300 text-sky-900'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Vista Calendario con Drag & Drop (Día o Semana) o Lista */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#0284C7]" />
            <span>
              {dateScope === 'calendario'
                ? calendarMode === 'semana' && weekDays.length > 0
                  ? `Semana (${weekDays[0].label} – ${weekDays[weekDays.length - 1].label}) · doble clic en una hora para agendar`
                  : `Agenda · ${calendarDate} (doble clic en una hora para agendar o arrastra para mover)`
                : dateScope === 'proximas'
                  ? 'Citas Próximas'
                  : 'Histórico de Citas'}
            </span>
          </div>
          <span className="font-mono">{filteredAppointments.length} citas</span>
        </div>

        {dateScope === 'calendario' && calendarMode === 'semana' ? (
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div
                className="grid border-b border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-700"
                style={{ gridTemplateColumns: `96px repeat(${weekDays.length}, minmax(0, 1fr))` }}
              >
                <div className="px-3 py-2.5 border-r border-slate-200 text-slate-500 font-mono">Hora</div>
                {weekDays.map((day) => (
                  <div
                    key={day.iso}
                    className={`px-2.5 py-2.5 border-r last:border-r-0 border-slate-200 text-center ${
                      day.iso === todayIso ? 'bg-sky-50 text-[#0284C7]' : ''
                    }`}
                  >
                    {day.label}
                  </div>
                ))}
              </div>
              <div className="divide-y divide-slate-100">
                {timeSlots.map((slot) => (
                  <div
                    key={slot}
                    className="grid"
                    style={{ gridTemplateColumns: `96px repeat(${weekDays.length}, minmax(0, 1fr))` }}
                  >
                    <div className="px-3 py-2.5 border-r border-slate-100 text-[11px] font-mono font-bold text-slate-500 flex items-center">
                      {slot}
                    </div>
                    {weekDays.map((day) => {
                      const cellKey = `${day.iso}|${slot}`;
                      const cellApts = filteredAppointments.filter(
                        (a) => a.date === day.iso && a.time === slot
                      );
                      const isPastCell = isSlotInPast(day.iso, slot);
                      const isDropTarget = dragOverSlot === cellKey;
                      return (
                        <div
                          key={cellKey}
                          onDoubleClick={() => {
                            if (isPastCell || cellApts.length > 0) return;
                            setModalPrefillDate(day.iso);
                            setSlotPrefillTime(slot);
                            setShowNewModal(true);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (!isPastCell && dragOverSlot !== cellKey) setDragOverSlot(cellKey);
                          }}
                          onDragLeave={() => {
                            if (dragOverSlot === cellKey) setDragOverSlot(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleDropOnSlot(slot, day.iso);
                          }}
                          className={`p-1.5 border-r last:border-r-0 border-slate-100 min-h-[48px] transition-colors ${
                            isDropTarget
                              ? 'bg-sky-50 ring-2 ring-inset ring-sky-400'
                              : isPastCell
                                ? 'bg-slate-50/70'
                                : 'hover:bg-sky-50/30 cursor-pointer'
                          }`}
                          title={!isPastCell && cellApts.length === 0 ? `Doble clic o + para agendar ${day.label} ${slot}` : undefined}
                        >
                          {cellApts.length === 0 ? (
                            !isPastCell && (
                              <button
                                type="button"
                                onClick={() => {
                                  setModalPrefillDate(day.iso);
                                  setSlotPrefillTime(slot);
                                  setShowNewModal(true);
                                }}
                                className="w-full h-full min-h-[34px] rounded-lg text-[10px] font-semibold text-slate-300 hover:text-[#0284C7] hover:bg-sky-50 cursor-pointer transition-colors"
                              >
                                +
                              </button>
                            )
                          ) : (
                            <div className="space-y-1">
                              {cellApts.map((apt) => {
                                const style = TYPE_STYLE[apt.type];
                                return (
                                  <div
                                    key={apt.id}
                                    draggable
                                    onDragStart={() => setDraggedAptId(apt.id)}
                                    onDragEnd={() => {
                                      setDraggedAptId(null);
                                      setDragOverSlot(null);
                                    }}
                                    onClick={() => openAppointmentModal(apt)}
                                    className={`px-2 py-1 rounded-lg border text-[10px] font-bold truncate cursor-grab active:cursor-grabbing ${style.bg}`}
                                    title={`${apt.patientName} · ${apt.time} · ${style.label}`}
                                  >
                                    {apt.patientName}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : dateScope === 'calendario' ? (
          <div className="divide-y divide-slate-100">
            {timeSlots.map((slot) => {
              const slotApts = filteredAppointments.filter((a) => a.time === slot);
              const isPastSlot = isSlotInPast(calendarDate, slot);
              const isDropTarget = dragOverSlot === slot;
              return (
                <div
                  key={slot}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isPastSlot && dragOverSlot !== slot) setDragOverSlot(slot);
                  }}
                  onDragLeave={() => {
                    if (dragOverSlot === slot) setDragOverSlot(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropOnSlot(slot, calendarDate);
                  }}
                  className={`flex flex-col sm:flex-row sm:items-stretch transition-colors ${
                    isDropTarget
                      ? 'bg-sky-50/90 ring-2 ring-inset ring-sky-400'
                      : isPastSlot
                        ? 'bg-slate-50/50'
                        : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="sm:w-28 px-4 py-3 flex items-center gap-1.5 text-xs font-mono font-bold text-slate-500 border-b sm:border-b-0 sm:border-r border-slate-100 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{slot}</span>
                  </div>
                  <div className="flex-1 p-2.5 flex flex-wrap items-center gap-2.5 min-h-[54px]">
                    {slotApts.length === 0 ? (
                      isPastSlot ? (
                        <span className="text-[11px] text-slate-300 px-2.5 py-1">Hora pasada</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setModalPrefillDate(calendarDate);
                            setSlotPrefillTime(slot);
                            setShowNewModal(true);
                          }}
                          className="text-xs text-slate-400 hover:text-[#0284C7] font-medium px-2.5 py-1 rounded-lg hover:bg-sky-50 cursor-pointer transition-colors"
                        >
                          + Agendar en {slot}
                        </button>
                      )
                    ) : (
                      slotApts.map((apt) => {
                        const style = TYPE_STYLE[apt.type];
                        return (
                          <div
                            key={apt.id}
                            draggable
                            onDragStart={() => setDraggedAptId(apt.id)}
                            onDragEnd={() => {
                              setDraggedAptId(null);
                              setDragOverSlot(null);
                            }}
                            onClick={() => openAppointmentModal(apt)}
                            className={`flex-1 min-w-[230px] p-3 rounded-xl border cursor-grab active:cursor-grabbing transition-all hover:shadow-sm flex items-center justify-between gap-2 ${style.bg}`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {apt.patientName} ({apt.patientAgeLabel})
                                </div>
                                <div className="text-[11px] text-slate-600 truncate">
                                  {style.label} · {apt.durationMinutes || 30} min · {apt.stage}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeAppointment(apt.id);
                              }}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100/80 cursor-pointer shrink-0"
                              title="Eliminar cita"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAppointments.length === 0 ? (
              <div className="md:col-span-2 py-8 text-center text-xs text-slate-400">
                No hay citas en esta categoría.
              </div>
            ) : (
              filteredAppointments.map((apt) => {
                const style = TYPE_STYLE[apt.type];
                return (
                  <div
                    key={apt.id}
                    onClick={() => openAppointmentModal(apt)}
                    className={`p-4 rounded-2xl border transition-all hover:shadow-md cursor-pointer ${style.bg}`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                      <span className={`font-bold ${style.accent}`}>
                        {apt.date} · {apt.time} ({apt.durationMinutes} min) · {style.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 uppercase">{apt.stage}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAppointment(apt.id);
                          }}
                          className="p-1 rounded-lg text-rose-600 hover:bg-rose-100/80 cursor-pointer"
                          title="Eliminar cita"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {apt.patientName} ({apt.patientAgeLabel})
                    </h3>
                    <p className="text-xs text-slate-700 mt-1 line-clamp-2">{apt.reason}</p>
                    <div className="mt-3 pt-2.5 border-t border-black/5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                      <span>Rep: {apt.guardianName}</span>
                      <span className="font-mono">{apt.guardianWhatsapp}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modal detalle de cita */}
      <Modal
        isOpen={Boolean(selectedAppointment)}
        onClose={() => setSelectedAppointment(null)}
        title={selectedAppointment?.patientName || ''}
        subtitle={
          selectedAppointment
            ? `Cita ${selectedAppointment.time} · ${selectedAppointment.patientAgeLabel}`
            : ''
        }
        maxWidthClass="max-w-md"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
              <div className="text-slate-500">Motivo de consulta:</div>
              <div className="font-medium text-slate-900">{selectedAppointment.reason}</div>
              <div className="pt-2 flex items-center justify-between border-t border-slate-200/70">
                <span className="text-slate-600">Rep: {selectedAppointment.guardianName}</span>
                <a
                  href={`https://wa.me/${normalizeWhatsappPhone(selectedAppointment.guardianWhatsapp)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => showToast('Abriendo WhatsApp del representante')}
                  className="inline-flex items-center gap-1 font-mono font-bold text-[#059669] hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {selectedAppointment.guardianWhatsapp}
                </a>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-violet-50/70 border border-violet-200/80 space-y-2.5">
              <div className="text-[11px] font-bold text-violet-900 uppercase">
                Modificar / Cambiar Fecha de Cita
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-violet-900 mb-0.5">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-violet-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-violet-900 mb-0.5">
                    Hora
                  </label>
                  <input
                    type="text"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-violet-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-violet-900 mb-0.5">
                    Tipo de Cita
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as AppointmentType)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-violet-200 rounded-lg"
                  >
                    <option value="control">Control Niño Sano</option>
                    <option value="urgencia">Urgencia / Fiebre</option>
                    <option value="vacunacion">Vacunación</option>
                    <option value="primera_vez">Primera Vez</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-violet-900 mb-0.5">
                    Duración (min)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    step={5}
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value) || 30)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-violet-200 rounded-lg"
                  />
                </div>
              </div>
              {doctors.length > 0 && (
                <div>
                  <label className="block text-[10px] font-semibold text-violet-900 mb-0.5">
                    Médico Asignado
                  </label>
                  <select
                    value={editDoctorId}
                    onChange={(e) => setEditDoctorId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-violet-200 rounded-lg"
                  >
                    <option value="">Sin cambio / Actual</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-semibold text-violet-900 mb-0.5">
                  Motivo de Consulta
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-violet-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    updateAppointment(selectedAppointment.id, {
                      date: editDate,
                      time: editTime,
                      type: editType,
                      durationMinutes: editDuration,
                      doctorId: editDoctorId || undefined,
                      reason: editReason,
                    });
                    setSelectedAppointment(null);
                  }}
                  className="py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer"
                >
                  Guardar Cambios
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeAppointment(selectedAppointment.id);
                    setSelectedAppointment(null);
                  }}
                  className="py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar Cita
                </button>
              </div>
            </div>

            <div className={`grid gap-2.5 ${userRole === 'PEDIATRA' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <button
                type="button"
                onClick={() => {
                  const apt = selectedAppointment;
                  setSelectedAppointment(null);
                  openTriageModal(apt);
                }}
                className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Registrar Triaje
              </button>
              {userRole === 'PEDIATRA' && (
                <button
                  type="button"
                  onClick={() => {
                    const patId = selectedAppointment.patientId;
                    setSelectedAppointment(null);
                    navigateToActiveConsultation(patId);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Iniciar Consulta</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                const patId = selectedAppointment.patientId;
                setSelectedAppointment(null);
                navigateToPatient360(patId);
              }}
              className="w-full py-2 text-center text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              Ver Historial 360° del Paciente
            </button>
          </div>
        )}
      </Modal>

      <AppointmentFormModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        initialDate={modalPrefillDate || calendarDate}
        initialTime={slotPrefillTime}
        slotIntervalMinutes={slotInterval}
        workingDays={workingDays}
      />
    </div>
  );
};
