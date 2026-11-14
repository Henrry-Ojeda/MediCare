import React, { useState } from 'react';
import { Calendar as CalendarIcon, Plus, Phone, Activity, Stethoscope, X } from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Appointment, AppointmentType } from '../../types/medical';
import { Modal } from '../../components/common';
import { AppointmentFormModal } from './AppointmentFormModal';
import { normalizeWhatsappPhone } from '../../utils/whatsappFormatter';

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
  const { userRole } = useAuth();
  const {
    appointments,
    setCurrentView,
    rescheduleAppointment,
    navigateToActiveConsultation,
    navigateToPatient360,
    openTriageModal,
  } = useClinical();
  const { showToast } = useNotifications();

  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('2026-11-15');
  const [rescheduleTime, setRescheduleTime] = useState('10:30 AM');

  const filteredAppointments = appointments.filter(
    (apt) => typeFilter === 'ALL' || apt.type === typeFilter
  );

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
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

          <button
            type="button"
            onClick={() => setCurrentView('sala-espera')}
            className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-amber-600" />
            <span>Ir a Sala de Espera</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Agendar Cita</span>
        </button>
      </div>

      {/* Lista / Grid de Citas */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#0284C7]" />
            <span>Agenda Pediátrica</span>
          </div>
          <span className="font-mono">{filteredAppointments.length} citas</span>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAppointments.map((apt) => {
            const style = TYPE_STYLE[apt.type];
            return (
              <div
                key={apt.id}
                onClick={() => setSelectedAppointment(apt)}
                className={`p-4 rounded-2xl border transition-all hover:shadow-md cursor-pointer ${style.bg}`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className={`font-bold ${style.accent}`}>
                    {apt.time} ({apt.durationMinutes} min) · {style.label}
                  </span>
                  <span className="text-[11px] text-slate-500 uppercase">{apt.stage}</span>
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
          })}
        </div>
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

            <div className="p-3.5 rounded-xl bg-violet-50/70 border border-violet-200/80 space-y-2">
              <div className="text-[11px] font-bold text-violet-900 uppercase">Reprogramar Cita</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-violet-200 rounded-lg"
                />
                <input
                  type="text"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-mono bg-white border border-violet-200 rounded-lg"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  rescheduleAppointment(selectedAppointment.id, rescheduleDate, rescheduleTime);
                  setSelectedAppointment(null);
                }}
                className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer"
              >
                Guardar Nueva Fecha / Hora
              </button>
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

      <AppointmentFormModal isOpen={showNewModal} onClose={() => setShowNewModal(false)} />
    </div>
  );
};
