import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Plus, Syringe } from 'lucide-react';
import { useClinical } from '../../../../context/ClinicalContext';
import { useAuth } from '../../../../context/AuthContext';
import { Modal } from '../../../../components/common';
import { getTodayIsoDate } from '../../../../utils/formatters';
import { PatientClinicalHeader } from '../components/PatientClinicalHeader';

const MILESTONE_OPTIONS: { label: string; months: number }[] = [
  { label: 'Al nacer', months: 0 },
  { label: '2 meses', months: 2 },
  { label: '4 meses', months: 4 },
  { label: '6 meses', months: 6 },
  { label: '12 meses', months: 12 },
  { label: '18 meses', months: 18 },
  { label: '5 años', months: 60 },
  { label: 'Refuerzo / Adicional', months: 72 },
];

interface VaccinationCardViewProps {
  embedded?: boolean;
}

export const VaccinationCardView: React.FC<VaccinationCardViewProps> = ({ embedded = false }) => {
  const {
    selectedPatient,
    patients,
    masterVaccines,
    setCurrentView,
    openVaccineModal,
    addPatientVaccine,
  } = useClinical();
  const { currentUser } = useAuth();
  const patient = selectedPatient || patients[0];

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMasterId, setSelectedMasterId] = useState<string>('');
  const [customVaccineName, setCustomVaccineName] = useState('');
  const [milestoneLabel, setMilestoneLabel] = useState('Al nacer');
  const [doseNumber, setDoseNumber] = useState('1ra Dosis');
  const [status, setStatus] = useState<'aplicada' | 'pendiente'>('aplicada');
  const [appliedDate, setAppliedDate] = useState(getTodayIsoDate());
  const [batchNumber, setBatchNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [observations, setObservations] = useState('');

  const allMilestones = useMemo(() => {
    const base = MILESTONE_OPTIONS.map((m) => m.label);
    if (!patient) return base;
    const extras = patient.vaccines
      .map((v) => v.milestoneLabel)
      .filter((label) => label && !base.includes(label));
    return Array.from(new Set([...base, ...extras]));
  }, [patient]);

  if (!patient) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        No hay pacientes cargados.
      </div>
    );
  }

  const resetForm = () => {
    setSelectedMasterId(masterVaccines[0]?.id || 'custom');
    setCustomVaccineName('');
    setMilestoneLabel('Al nacer');
    setDoseNumber('1ra Dosis');
    setStatus('aplicada');
    setAppliedDate(getTodayIsoDate());
    setBatchNumber('');
    setManufacturer('');
    setObservations('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleSaveNewVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    const masterMatch = masterVaccines.find((v) => v.id === selectedMasterId);
    const vaccineName =
      selectedMasterId === 'custom' || !masterMatch
        ? customVaccineName.trim()
        : masterMatch.commercialName;

    if (!vaccineName) return;

    const milestoneObj = MILESTONE_OPTIONS.find((m) => m.label === milestoneLabel);
    await addPatientVaccine(patient.id, {
      vaccineId: masterMatch?.id,
      vaccineName,
      milestoneLabel,
      milestoneMonths: milestoneObj?.months ?? 0,
      doseNumber: doseNumber.trim() || 'Dosis Única',
      status,
      appliedDate: status === 'aplicada' ? appliedDate : undefined,
      batchNumber: status === 'aplicada' ? batchNumber.trim() || 'N/A' : undefined,
      manufacturer: status === 'aplicada' ? manufacturer.trim() || undefined : undefined,
      appliedBy: status === 'aplicada' ? currentUser?.name || 'Personal Clínico' : undefined,
      observations: observations.trim() || undefined,
    });
    setIsAddModalOpen(false);
  };

  return (
    <div className={embedded ? 'space-y-5' : 'max-w-6xl mx-auto space-y-5'}>
      {!embedded && (
        <PatientClinicalHeader
          patient={patient}
          onBack={() => setCurrentView('paciente-detalle')}
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Syringe className="w-4 h-4 text-emerald-600" /> Carnet Digital de Vacunación Pediátrica
          </h2>
          <p className="text-xs text-slate-500">
            Esquema nacional por hitos de edad. Agregue vacunas o pulse en una dosis pendiente para registrar aplicación y lote.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Vacuna</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('vacunas-catalogo')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Ver Catálogo Maestro
          </button>
        </div>
      </div>

      {patient.vaccines.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <p className="text-sm text-slate-500">
            Este paciente aún no tiene vacunas registradas en su carnet.
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Primera Vacuna</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {allMilestones.map((milestone) => {
            const doses = patient.vaccines.filter((v) => v.milestoneLabel === milestone);
            if (doses.length === 0) return null;

            return (
              <div key={milestone} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-700">{milestone}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {doses.map((dose) => {
                    const applied = dose.status === 'aplicada';
                    return (
                      <div
                        key={dose.id}
                        className={`rounded-xl border p-3.5 flex flex-col justify-between gap-2.5 ${
                          applied ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-slate-900">{dose.vaccineName}</p>
                            {applied ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600">{dose.doseNumber}</p>
                        </div>

                        {applied ? (
                          <div className="text-[11px] text-emerald-800 space-y-0.5">
                            <p>Aplicada: {dose.appliedDate || 'Registrada'}</p>
                            <p>Lote: {dose.batchNumber || 'N/A'}</p>
                            {dose.manufacturer && <p>Laboratorio: {dose.manufacturer}</p>}
                            {dose.observations && <p className="text-emerald-700/90">{dose.observations}</p>}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openVaccineModal(patient.id, dose)}
                            className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            Registrar Aplicación
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Agregar Vacuna al Historial"
        subtitle={`Paciente: ${patient.firstName} ${patient.lastName} (${patient.historyNumber})`}
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSaveNewVaccine} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vacuna (Catálogo o Personalizada) *
              </label>
              <select
                value={selectedMasterId}
                onChange={(e) => setSelectedMasterId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium"
              >
                {masterVaccines.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.commercialName} ({v.genericName})
                  </option>
                ))}
                <option value="custom">+ Otra vacuna (escribir nombre)</option>
              </select>
            </div>

            {(selectedMasterId === 'custom' || masterVaccines.length === 0) && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de la Vacuna *</label>
                <input
                  type="text"
                  required
                  value={customVaccineName}
                  onChange={(e) => setCustomVaccineName(e.target.value)}
                  placeholder="Ej. Neumococo Conjugada 13V"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hito de Edad *</label>
              <select
                value={milestoneLabel}
                onChange={(e) => setMilestoneLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
              >
                {MILESTONE_OPTIONS.map((m) => (
                  <option key={m.label} value={m.label}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dosis *</label>
              <input
                type="text"
                required
                value={doseNumber}
                onChange={(e) => setDoseNumber(e.target.value)}
                placeholder="Ej. 1ra Dosis, Refuerzo"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estado</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('aplicada')}
                  className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                    status === 'aplicada'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Ya Aplicada
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('pendiente')}
                  className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                    status === 'pendiente'
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Pendiente por Aplicar
                </button>
              </div>
            </div>

            {status === 'aplicada' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Aplicación *</label>
                  <input
                    type="date"
                    required
                    value={appliedDate}
                    onChange={(e) => setAppliedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Número de Lote</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="Ej. LOT-2026-A"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fabricante / Laboratorio</label>
                  <input
                    type="text"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="Ej. Sanofi Pasteur / GSK"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones (opcional)</label>
              <textarea
                rows={2}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Sitio anatómico, tolerancia, próxima dosis..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Guardar Vacuna</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
