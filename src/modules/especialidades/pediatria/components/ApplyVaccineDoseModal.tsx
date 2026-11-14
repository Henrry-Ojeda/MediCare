import React, { useEffect, useState } from 'react';
import { Syringe } from 'lucide-react';
import { Modal } from '../../../../components/common';
import { useClinical } from '../../../../context/ClinicalContext';
import { useAuth } from '../../../../context/AuthContext';
import { useNotifications } from '../../../../context/NotificationContext';
import { getTodayIsoDate } from '../../../../utils/formatters';

export const ApplyVaccineDoseModal: React.FC = () => {
  const { vaccineModalDose, closeVaccineModal, applyVaccineDose, patients } = useClinical();
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();

  const [batchNumber, setBatchNumber] = useState('LOT-VE-2026');
  const [manufacturer, setManufacturer] = useState('Sanofi Pasteur');
  const [appliedDate, setAppliedDate] = useState(getTodayIsoDate());
  const [observations, setObservations] = useState('');

  useEffect(() => {
    if (vaccineModalDose) {
      setBatchNumber('LOT-VE-2026');
      setManufacturer('Sanofi Pasteur');
      setAppliedDate(getTodayIsoDate());
      setObservations('');
    }
  }, [vaccineModalDose]);

  if (!vaccineModalDose) return null;

  const patient = patients.find((p) => p.id === vaccineModalDose.patientId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyVaccineDose(vaccineModalDose.patientId, vaccineModalDose.dose.id, {
      appliedDate,
      batchNumber: batchNumber.trim() || 'S/L',
      manufacturer: manufacturer.trim() || 'N/A',
      appliedBy: currentUser?.name || 'Pediatra',
      observations: observations.trim() || 'Sin reacciones adversas inmediatas.',
    });
    showToast(
      `Vacuna ${vaccineModalDose.dose.vaccineName} (${vaccineModalDose.dose.doseNumber}) registrada.`
    );
    closeVaccineModal();
  };

  return (
    <Modal
      isOpen={Boolean(vaccineModalDose)}
      onClose={closeVaccineModal}
      title="Registrar Aplicación de Vacuna"
      subtitle={
        patient
          ? `${patient.firstName} ${patient.lastName} • ${vaccineModalDose.dose.vaccineName} (${vaccineModalDose.dose.doseNumber})`
          : vaccineModalDose.dose.vaccineName
      }
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Número de Lote</label>
            <input
              type="text"
              required
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha de Aplicación</label>
            <input
              type="date"
              required
              value={appliedDate}
              onChange={(e) => setAppliedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Laboratorio / Fabricante</label>
          <input
            type="text"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Observaciones Clínicas</label>
          <textarea
            rows={2}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Sin reacciones adversas inmediatas..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={closeVaccineModal}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
          >
            <Syringe className="w-4 h-4" /> Confirmar Dosis
          </button>
        </div>
      </form>
    </Modal>
  );
};
