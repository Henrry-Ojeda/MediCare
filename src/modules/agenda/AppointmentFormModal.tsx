import React, { useState } from 'react';
import { Modal } from '../../components/common';
import { useClinical } from '../../context/ClinicalContext';
import { AppointmentType } from '../../types/medical';
import { calculateExactAgeLabel } from '../../utils/pediatricCalculations';
import { getTodayIsoDate } from '../../utils/formatters';

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppointmentFormModal: React.FC<AppointmentFormModalProps> = ({ isOpen, onClose }) => {
  const { patients, doctors, addAppointment } = useClinical();

  const [patientId, setPatientId] = useState(patients[0]?.id || 'pat-1');
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || '');
  const [date, setDate] = useState(getTodayIsoDate());
  const [time, setTime] = useState('02:30 PM');
  const [type, setType] = useState<AppointmentType>('control');
  const [reason, setReason] = useState('Control de niño sano y revisión pediátrica.');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find((p) => p.id === patientId) || patients[0];
    if (!pat) return;
    const doc = doctors.find((d) => d.id === doctorId) || doctors[0];
    addAppointment({
      patientId: pat.id,
      patientName: `${pat.firstName} ${pat.lastName}`,
      patientAgeLabel: calculateExactAgeLabel(pat.birthDate),
      guardianName: pat.guardianName,
      guardianWhatsapp: pat.guardianWhatsapp,
      doctorId: doc?.id,
      doctorName: doc?.name || 'Pediatra por asignar',
      specialty: 'Pediatría',
      date,
      time,
      durationMinutes: 30,
      type,
      reason,
      stage: 'programado',
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agendar Nueva Cita Pediátrica" maxWidthClass="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Paciente</label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
        </div>

        {doctors.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Médico Asignado
            </label>
            <select
              value={doctorId || doctors[0]?.id || ''}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specialty})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hora</label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Cita</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AppointmentType)}
            className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
          >
            <option value="control">Control Niño Sano</option>
            <option value="urgencia">Urgencia / Fiebre</option>
            <option value="vacunacion">Vacunación</option>
            <option value="primera_vez">Primera Vez</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo</label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
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
    </Modal>
  );
};
