import React, { useState } from 'react';
import { UserPlus, Phone, Syringe, FileText, Stethoscope, Pill, Pencil } from 'lucide-react';
import { DataTable, AllergyAlertBadge, Modal } from '../../components/common';
import { CreateRecipeModal } from '../../components/recipe/CreateRecipeModal';
import { PatientForm } from './components/PatientForm';
import { useClinical } from '../../context/ClinicalContext';
import { useAuth } from '../../context/AuthContext';
import { ROLE_PERMISSIONS } from '../../config/permissions.config';
import { Patient } from '../../types/medical';
import { calculateExactAgeLabel } from '../../utils/pediatricCalculations';
import { normalizeWhatsappPhone } from '../../utils/whatsappFormatter';

export const PatientDirectoryView: React.FC = () => {
  const { userRole, currentUser } = useAuth();
  const {
    patients,
    setCurrentView,
    navigateToPatient360,
    navigateToPatientVaccines,
    navigateToActiveConsultation,
    completeConsultation,
  } = useClinical();
  const [recipePatient, setRecipePatient] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  return (
    <div className="space-y-4">
      <DataTable<Patient>
        data={patients}
        keyExtractor={(p) => p.id}
        searchPlaceholder="Buscar por niño, N° historia, cédula o WhatsApp..."
        searchFilter={(p, q) => {
          const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
          return (
            fullName.includes(q) ||
            p.historyNumber.toLowerCase().includes(q) ||
            p.guardianIdDocument.toLowerCase().includes(q) ||
            p.guardianWhatsapp.toLowerCase().includes(q) ||
            p.guardianName.toLowerCase().includes(q)
          );
        }}
        pageSize={8}
        emptyMessage="No se encontraron pacientes pediátricos con ese criterio."
        headerActions={
          ROLE_PERMISSIONS[userRole].canCreatePatient ? (
            <button
              type="button"
              onClick={() => setCurrentView('paciente-nuevo')}
              className="px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Paciente</span>
            </button>
          ) : undefined
        }
        columns={[
          {
            key: 'patient',
            header: 'Paciente Pediátrico',
            sortable: true,
            sortValue: (p) => `${p.firstName} ${p.lastName}`,
            render: (patient) => (
              <div className="flex items-center gap-3 min-w-[200px]">
                <div className="w-9 h-9 rounded-xl bg-[#F0F9FF] text-[#0284C7] font-bold text-xs flex items-center justify-center border border-sky-200 shrink-0">
                  {patient.firstName[0]}
                  {patient.lastName[0]}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => navigateToPatient360(patient.id)}
                    className="text-xs font-bold text-slate-900 hover:text-[#0284C7] cursor-pointer text-left"
                  >
                    {patient.firstName} {patient.lastName}
                  </button>
                  <div className="text-[11px] font-mono text-slate-500">
                    {patient.historyNumber} · {calculateExactAgeLabel(patient.birthDate)}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: 'guardian',
            header: 'Representante / WhatsApp',
            render: (patient) => (
              <div className="text-xs">
                <div className="font-semibold text-slate-800">{patient.guardianName}</div>
                <a
                  href={`https://wa.me/${normalizeWhatsappPhone(patient.guardianWhatsapp)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[#059669] hover:underline"
                >
                  <Phone className="w-3 h-3" />
                  {patient.guardianWhatsapp}
                </a>
              </div>
            ),
          },
          {
            key: 'alerts',
            header: 'Alergias',
            render: (patient) => <AllergyAlertBadge allergies={patient.criticalAllergies} compact />,
          },
          {
            key: 'actions',
            header: 'Acciones',
            render: (patient) => (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => navigateToPatientVaccines(patient.id)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <Syringe className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Vacunas</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateToPatient360(patient.id)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#0284C7]" />
                  <span>Historial</span>
                </button>
                {userRole === 'PEDIATRA' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setRecipePatient(patient)}
                      className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Pill className="w-3.5 h-3.5" />
                      <span>Récipe</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPatient(patient)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToActiveConsultation(patient.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Consulta</span>
                    </button>
                  </>
                )}
              </div>
            ),
          },
        ]}
      />

      {recipePatient && (
        <CreateRecipeModal
          isOpen={Boolean(recipePatient)}
          onClose={() => setRecipePatient(null)}
          patient={recipePatient}
          onSaveRecipe={(saved) => {
            completeConsultation(
              recipePatient.id,
              saved.consultation,
              recipePatient.latestVitals || {
                weightKg: 0,
                heightCm: 0,
                headCircumferenceCm: 0,
                temperatureC: 0,
                heartRateBpm: 0,
                spo2Percent: 0,
                systolicBp: 0,
                diastolicBp: 0,
                recordedAt: 'Ahora',
                recordedBy: currentUser?.name || 'Pediatra',
              }
            );
            setRecipePatient(null);
          }}
        />
      )}
      {editingPatient && (
        <Modal
          isOpen={Boolean(editingPatient)}
          onClose={() => setEditingPatient(null)}
          title={`Editar Paciente · ${editingPatient.historyNumber}`}
          subtitle={`${editingPatient.firstName} ${editingPatient.lastName}`}
          maxWidthClass="max-w-3xl"
        >
          <PatientForm
            initialPatient={editingPatient}
            compact
            onCancel={() => setEditingPatient(null)}
            onUpdated={() => setEditingPatient(null)}
          />
        </Modal>
      )}
    </div>
  );
};
