import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, MessageCircle, Search, UserPlus } from 'lucide-react';
import { Modal } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useClinical } from '../../context/ClinicalContext';
import { AppointmentType, Patient } from '../../types/medical';
import { calculateExactAgeLabel } from '../../utils/pediatricCalculations';
import { getTodayIsoDate } from '../../utils/formatters';
import { normalizeWhatsappPhone } from '../../utils/whatsappFormatter';
import { PatientForm } from '../pacientes/components/PatientForm';

export type CalendarSlotInterval = 15 | 30 | 45 | 60;

export function generateTimeSlots(
  intervalMinutes: CalendarSlotInterval = 30,
  startHour = 8,
  endHour = 18
): string[] {
  const slots: string[] = [];
  const startTotal = startHour * 60;
  const endTotal = endHour * 60;
  for (let mins = startTotal; mins <= endTotal; mins += intervalMinutes) {
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    slots.push(`${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`);
  }
  return slots;
}

export const AGENDA_TIME_SLOTS_30M = generateTimeSlots(30);

export function parseSlotToDate(dateIso: string, slotTime: string): Date | null {
  const dateParts = dateIso.split('-').map(Number);
  if (dateParts.length !== 3 || dateParts.some(Number.isNaN)) return null;
  const match = slotTime.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], hours, minutes, 0, 0);
}

export function isSlotInPast(dateIso: string, slotTime: string, now: Date = new Date()): boolean {
  const slotDate = parseSlotToDate(dateIso, slotTime);
  if (!slotDate) return false;
  return slotDate.getTime() < now.getTime();
}

export function isMoreThan24HoursAhead(
  dateIso: string,
  slotTime: string,
  now: Date = new Date()
): boolean {
  const slotDate = parseSlotToDate(dateIso, slotTime);
  if (!slotDate) return false;
  return slotDate.getTime() - now.getTime() > 24 * 60 * 60 * 1000;
}

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  initialTime?: string;
  slotIntervalMinutes?: CalendarSlotInterval;
  workingDays?: number[];
}

export const AppointmentFormModal: React.FC<AppointmentFormModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  initialTime,
  slotIntervalMinutes = 30,
  workingDays = [1, 2, 3, 4, 5, 6],
}) => {
  const { userRole, currentUser } = useAuth();
  const { patients, doctors, appointments, addAppointment } = useClinical();

  const timeSlots = useMemo(
    () => generateTimeSlots(slotIntervalMinutes),
    [slotIntervalMinutes]
  );

  const isDoctorRole = userRole === 'PEDIATRA';
  const [patientQuery, setPatientQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showNewPatientInline, setShowNewPatientInline] = useState(false);

  const [doctorId, setDoctorId] = useState(
    isDoctorRole && currentUser?.id ? currentUser.id : doctors[0]?.id || ''
  );
  const [date, setDate] = useState(initialDate || getTodayIsoDate());
  const [time, setTime] = useState(initialTime || timeSlots[0] || '09:00 AM');
  const [durationMinutes, setDurationMinutes] = useState<number>(slotIntervalMinutes);
  const [type, setType] = useState<AppointmentType>('control');
  const [reason, setReason] = useState('Control de niño sano y revisión pediátrica.');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [sendWhatsappConfirm, setSendWhatsappConfirm] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const targetDate = initialDate || getTodayIsoDate();
    setDate(targetDate);
    setDurationMinutes(slotIntervalMinutes);
    if (initialTime && !isSlotInPast(targetDate, initialTime)) {
      setTime(initialTime);
    } else {
      const nextAvailable =
        timeSlots.find((slot) => !isSlotInPast(targetDate, slot)) || timeSlots[0];
      setTime(nextAvailable);
    }
    setShowNewPatientInline(false);
  }, [isOpen, initialDate, initialTime, slotIntervalMinutes, timeSlots]);

  useEffect(() => {
    if (selectedPatient) {
      setWhatsappNumber(selectedPatient.guardianWhatsapp || '');
    }
  }, [selectedPatient]);

  const matchingPatients = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    const list = !q
      ? patients
      : patients.filter((p) =>
          `${p.firstName} ${p.lastName} ${p.historyNumber} ${p.guardianName} ${p.guardianIdDocument} ${p.guardianWhatsapp}`
            .toLowerCase()
            .includes(q)
        );
    return list.slice(0, 8);
  }, [patients, patientQuery]);

  const occupiedTimesForDate = useMemo(() => {
    return new Set(
      appointments
        .filter((a) => a.date === date && (!isDoctorRole || !currentUser?.id || a.doctorId === currentUser.id))
        .map((a) => a.time)
    );
  }, [appointments, date, isDoctorRole, currentUser?.id]);

  const selectedSlotIsPast = isSlotInPast(date, time);
  const requiresWhatsappConfirm = isMoreThan24HoursAhead(date, time);
  const selectedDayOfWeek = useMemo(() => {
    const parts = date.split('-').map(Number);
    if (parts.length !== 3) return 1;
    return new Date(parts[0], parts[1] - 1, parts[2]).getDay();
  }, [date]);
  const isNonWorkingDay = workingDays.length > 0 && !workingDays.includes(selectedDayOfWeek);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlotIsPast) return;
    const pat = selectedPatient || matchingPatients[0];
    if (!pat) return;
    const finalWhatsapp = (whatsappNumber || pat.guardianWhatsapp || '').trim();
    if (requiresWhatsappConfirm && !finalWhatsapp) return;

    const assignedDoctorId =
      isDoctorRole && currentUser?.id ? currentUser.id : doctorId || doctors[0]?.id;
    const doc = doctors.find((d) => d.id === assignedDoctorId);
    const assignedDoctorName =
      isDoctorRole && currentUser?.name ? currentUser.name : doc?.name || 'Pediatra por asignar';

    addAppointment({
      patientId: pat.id,
      patientName: `${pat.firstName} ${pat.lastName}`,
      patientAgeLabel: calculateExactAgeLabel(pat.birthDate),
      guardianName: pat.guardianName,
      guardianWhatsapp: finalWhatsapp,
      doctorId: assignedDoctorId,
      doctorName: assignedDoctorName,
      specialty: 'Pediatría',
      date,
      time,
      durationMinutes,
      type,
      reason,
      stage: 'programado',
    });

    if (requiresWhatsappConfirm && sendWhatsappConfirm && finalWhatsapp) {
      const normalized = normalizeWhatsappPhone(finalWhatsapp);
      const msg = encodeURIComponent(
        `Hola ${pat.guardianName}, le confirmamos la cita pediátrica de ${pat.firstName} ${pat.lastName} con ${assignedDoctorName} para el día ${date} a las ${time}. Por favor confirmar asistencia.`
      );
      window.open(`https://wa.me/${normalized}?text=${msg}`, '_blank', 'noopener,noreferrer');
    }

    setSelectedPatient(null);
    setPatientQuery('');
    setWhatsappNumber('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agendar Cita Pediátrica"
      subtitle={`Bloques configurados cada ${slotIntervalMinutes} min`}
      maxWidthClass="max-w-2xl"
    >
      {showNewPatientInline ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800">Registrar Nuevo Paciente para la Cita</span>
            <button
              type="button"
              onClick={() => setShowNewPatientInline(false)}
              className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
            >
              ← Volver a buscar paciente
            </button>
          </div>
          <PatientForm
            compact
            showPerinatalSection={false}
            onCancel={() => setShowNewPatientInline(false)}
            onCreated={(created) => {
              setSelectedPatient(created);
              setPatientQuery(`${created.firstName} ${created.lastName}`);
              setWhatsappNumber(created.guardianWhatsapp || '');
              setShowNewPatientInline(false);
            }}
          />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Buscador escalable de pacientes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="apt-patient-search" className="block text-xs font-semibold text-slate-700">
                Paciente *
              </label>
              <button
                type="button"
                onClick={() => setShowNewPatientInline(true)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0284C7] hover:underline cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Nuevo Paciente</span>
              </button>
            </div>

            {selectedPatient ? (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-sky-300 bg-sky-50/70">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </p>
                  <p className="text-[11px] text-slate-600 truncate">
                    {selectedPatient.historyNumber} · {calculateExactAgeLabel(selectedPatient.birthDate)} · Rep:{' '}
                    {selectedPatient.guardianName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null);
                    setPatientQuery('');
                    setWhatsappNumber('');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="apt-patient-search"
                    type="search"
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    placeholder="Buscar por nombre, N° historia, cédula o representante..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0284C7] focus:outline-none"
                  />
                </div>
                <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                  {matchingPatients.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500">
                      No hay coincidencias. Usa <strong>+ Nuevo Paciente</strong> arriba.
                    </div>
                  ) : (
                    matchingPatients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPatient(p)}
                        className="w-full text-left px-3 py-2 hover:bg-sky-50 flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {p.firstName} {p.lastName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {p.historyNumber} · {calculateExactAgeLabel(p.birthDate)} · Rep: {p.guardianName}
                          </div>
                        </div>
                        <Check className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {!isDoctorRole && doctors.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Médico Asignado</label>
              <select
                value={doctorId || doctors[0]?.id || ''}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialty})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
              <input
                type="date"
                required
                min={getTodayIsoDate()}
                value={date}
                onChange={(e) => {
                  const nextDate = e.target.value;
                  setDate(nextDate);
                  if (isSlotInPast(nextDate, time)) {
                    const firstValid = timeSlots.find((s) => !isSlotInPast(nextDate, s));
                    if (firstValid) setTime(firstValid);
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Duración</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>1 hora (60 min)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Cita</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AppointmentType)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="control">Control Niño Sano</option>
                <option value="urgencia">Urgencia / Fiebre</option>
                <option value="vacunacion">Vacunación</option>
                <option value="primera_vez">Primera Vez</option>
              </select>
            </div>
          </div>

          {isNonWorkingDay && (
            <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Nota: el día seleccionado está marcado fuera de tus días laborales habituales.
            </p>
          )}

          {/* Bloques de horario según intervalo configurado */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Horario disponible (cada {slotIntervalMinutes} min)</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {timeSlots.map((slot) => {
                const isOccupied = occupiedTimesForDate.has(slot);
                const isPast = isSlotInPast(date, slot);
                const isSelected = time === slot && !isPast;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isPast}
                    onClick={() => setTime(slot)}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-mono font-bold border transition-colors ${
                      isPast
                        ? 'bg-slate-100 border-slate-200 text-slate-300 line-through cursor-not-allowed'
                        : isSelected
                          ? 'bg-[#0284C7] border-[#0284C7] text-white cursor-pointer'
                          : isOccupied
                            ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 cursor-pointer'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-sky-300 cursor-pointer'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
            {selectedSlotIsPast && (
              <p className="text-[11px] font-semibold text-rose-600 mt-1">
                No hay horarios disponibles para hoy después de esta hora. Selecciona una fecha futura.
              </p>
            )}
          </div>

          {/* WhatsApp (obligatorio si la cita es a > 24 horas para confirmación) */}
          <div
            className={`rounded-xl border p-3 space-y-2 ${
              requiresWhatsappConfirm
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-slate-50 border-slate-200/80'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="apt-whatsapp" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  WhatsApp de confirmación {requiresWhatsappConfirm ? '*' : '(opcional)'}
                </span>
              </label>
              {requiresWhatsappConfirm && (
                <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendWhatsappConfirm}
                    onChange={(e) => setSendWhatsappConfirm(e.target.checked)}
                    className="rounded border-emerald-400"
                  />
                  <span>Enviar confirmación por WhatsApp (&gt;24h)</span>
                </label>
              )}
            </div>
            <input
              id="apt-whatsapp"
              type="tel"
              required={requiresWhatsappConfirm}
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="Ej. +584141234567"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo</label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                selectedSlotIsPast ||
                (!selectedPatient && matchingPatients.length === 0) ||
                (requiresWhatsappConfirm && !whatsappNumber.trim() && !(selectedPatient?.guardianWhatsapp || '').trim())
              }
              className="px-5 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
            >
              Guardar Cita
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
