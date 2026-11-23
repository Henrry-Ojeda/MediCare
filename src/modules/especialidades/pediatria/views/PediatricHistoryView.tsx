import React, { useEffect, useState } from 'react';
import {
  Baby,
  Camera,
  FileImage,
  FileText,
  History,
  Plus,
  Stethoscope,
  Syringe,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { useClinical } from '../../../../context/ClinicalContext';
import { useAuth } from '../../../../context/AuthContext';
import { MedicalStudyFile } from '../../../../types/medical';
import { PatientClinicalHeader } from '../components/PatientClinicalHeader';
import { ConsultationTimelineTab } from '../components/ConsultationTimelineTab';
import { PerinatalRecordTab } from '../components/PerinatalRecordTab';
import { OmsGrowthCurvesTab } from '../components/OmsGrowthCurvesTab';
import { VaccinationCardView } from './VaccinationCardView';
import { CreateRecipeModal } from '../../../../components/recipe/CreateRecipeModal';

type HistoryTab = 'timeline' | 'vaccines' | 'studies' | 'perinatal' | 'oms';

export const PediatricHistoryView: React.FC = () => {
  const { currentUser, userRole } = useAuth();
  const {
    selectedPatient,
    doctors,
    diagnosisPermissions,
    setCurrentView,
    navigateToActiveConsultation,
    openDispatchModal,
    addPatientStudy,
    completeConsultation,
    grantDiagnosisPermission,
    requestDiagnosisPermission,
    approveDiagnosisPermission,
    rejectDiagnosisPermission,
    revokeDiagnosisPermission,
    refreshPatient360,
  } = useClinical();
  const [activeTab, setActiveTab] = useState<HistoryTab>('timeline');
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);

  useEffect(() => {
    if (selectedPatient?.id) {
      void refreshPatient360(selectedPatient.id);
    }
  }, [selectedPatient?.id, refreshPatient360]);

  const [studyTitle, setStudyTitle] = useState('');
  const [studyCategory, setStudyCategory] = useState<MedicalStudyFile['category']>('Laboratorio PDF');
  const [studySummary, setStudySummary] = useState('');
  const [studyHighlight, setStudyHighlight] = useState('');
  const [studyImageUrl, setStudyImageUrl] = useState('');

  if (!selectedPatient) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
        <p className="text-sm text-slate-600">
          Para consultar el Historial 360° o el Carnet de Vacunación, busque y seleccione un paciente.
        </p>
        <button
          type="button"
          onClick={() => setCurrentView('pacientes')}
          className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold cursor-pointer"
        >
          Ir al Directorio de Pacientes
        </button>
      </div>
    );
  }

  const doctorsWhoAttended = Array.from(
    selectedPatient.consultations.reduce((acc, c) => {
      const existing = acc.get(c.doctorName);
      if (existing) {
        existing.count += 1;
        if (c.date > existing.lastDate) existing.lastDate = c.date;
      } else {
        acc.set(c.doctorName, { name: c.doctorName, count: 1, lastDate: c.date });
      }
      return acc;
    }, new Map<string, { name: string; count: number; lastDate: string }>())
  ).map(([, value]) => value);

  const handleStudyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setStudyImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddStudy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyTitle.trim() || !studySummary.trim()) return;
    addPatientStudy(selectedPatient.id, {
      title: studyTitle.trim(),
      category: studyCategory,
      date: new Date().toISOString().slice(0, 10),
      summary: studySummary.trim(),
      valuesHighlight: studyHighlight.trim() || undefined,
      imageUrl: studyImageUrl || undefined,
    });
    setStudyTitle('');
    setStudySummary('');
    setStudyHighlight('');
    setStudyImageUrl('');
  };

  const tabs: { id: HistoryTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'timeline',
      label: `Visitas y Consultas (${selectedPatient.consultations.length})`,
      icon: <History className="w-4 h-4" />,
    },
    {
      id: 'vaccines',
      label: `Vacunación (${selectedPatient.vaccines.length})`,
      icon: <Syringe className="w-4 h-4" />,
    },
    {
      id: 'studies',
      label: `Resultados y Estudios (${selectedPatient.studies.length})`,
      icon: <FileImage className="w-4 h-4" />,
    },
    { id: 'perinatal', label: 'Antecedentes Perinatales', icon: <Baby className="w-4 h-4" /> },
    { id: 'oms', label: 'Curvas de Crecimiento OMS', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  const latestConsultation = selectedPatient.consultations[0];
  const latestWithRecipe = selectedPatient.consultations.find((c) => c.prescriptions.length > 0);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PatientClinicalHeader
        patient={selectedPatient}
        onBack={() => setCurrentView('pacientes')}
        onStartConsultation={() => navigateToActiveConsultation(selectedPatient.id)}
        onOpenVaccines={() => setActiveTab('vaccines')}
        onCreateRecipe={userRole === 'PEDIATRA' ? () => setIsRecipeModalOpen(true) : undefined}
      />

      {/* Resumen Clínico Rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Últimas Medidas</p>
          <p className="text-sm font-bold text-slate-900 mt-1">
            {selectedPatient.latestVitals
              ? `${selectedPatient.latestVitals.weightKg} kg · ${selectedPatient.latestVitals.heightCm} cm`
              : 'Sin registro reciente'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {selectedPatient.latestVitals?.recordedAt || 'Pendiente de toma en consulta'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Último Diagnóstico</p>
          <p className="text-sm font-bold text-slate-900 mt-1 truncate">
            {latestConsultation ? latestConsultation.cie10Name : 'Sin consultas registradas'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {latestConsultation ? `${latestConsultation.date} · ${latestConsultation.doctorName}` : 'Primera consulta pendiente'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Último Récipe</p>
            <p className="text-xs font-bold text-slate-900 mt-1 truncate">
              {latestWithRecipe
                ? `${latestWithRecipe.prescriptions.length} medicamento(s) · ${latestWithRecipe.date}`
                : 'Sin récipes previos'}
            </p>
          </div>
          {userRole === 'PEDIATRA' && (
            <button
              type="button"
              onClick={() =>
                latestWithRecipe
                  ? openDispatchModal(selectedPatient, latestWithRecipe)
                  : setIsRecipeModalOpen(true)
              }
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 cursor-pointer"
            >
              {latestWithRecipe ? 'Ver / Reenviar' : 'Hacer Récipe'}
            </button>
          )}
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 pb-1">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                active
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2.5">
            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-sky-600" /> Médicos que han atendido a este paciente
            </p>
            {doctorsWhoAttended.length === 0 ? (
              <p className="text-xs text-slate-400">
                Aún no hay médicos registrados en visitas anteriores.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {doctorsWhoAttended.map((doc) => (
                  <span
                    key={doc.name}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-xs font-semibold text-sky-900"
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                    <span>{doc.name}</span>
                    <span className="text-[11px] text-sky-700">
                      ({doc.count} {doc.count === 1 ? 'visita' : 'visitas'} · última {doc.lastDate})
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <ConsultationTimelineTab
            patientId={selectedPatient.id}
            consultations={selectedPatient.consultations}
            currentUserId={currentUser?.id}
            currentUserName={currentUser?.name}
            userRole={userRole}
            doctors={doctors}
            diagnosisPermissions={diagnosisPermissions}
            onGrantDiagnosisPermission={(targetDoctorId, consultationId) =>
              grantDiagnosisPermission(selectedPatient.id, targetDoctorId, consultationId)
            }
            onRequestDiagnosisPermission={(consultationId, authorDoctorId, reason) =>
              requestDiagnosisPermission(selectedPatient.id, consultationId, authorDoctorId, reason)
            }
            onApproveDiagnosisPermission={(permissionId) =>
              approveDiagnosisPermission(permissionId, selectedPatient.id)
            }
            onRejectDiagnosisPermission={(permissionId) =>
              rejectDiagnosisPermission(permissionId)
            }
            onRevokeDiagnosisPermission={(permissionId) => revokeDiagnosisPermission(permissionId)}
            onOpenRecipe={(consultation) => openDispatchModal(selectedPatient, consultation)}
          />
        </div>
      )}

      {activeTab === 'vaccines' && <VaccinationCardView embedded />}

      {activeTab === 'perinatal' && <PerinatalRecordTab perinatal={selectedPatient.perinatal} />}

      {activeTab === 'oms' && <OmsGrowthCurvesTab growthHistory={selectedPatient.growthHistory} />}

      {activeTab === 'studies' && (
        <div className="space-y-4">
          <form
            onSubmit={handleAddStudy}
            className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3"
          >
            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-sky-600" /> Subir Resultado o Estudio Médico
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="Título del resultado (Ej. Hematología Completa)"
                value={studyTitle}
                onChange={(e) => setStudyTitle(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <select
                value={studyCategory}
                onChange={(e) => setStudyCategory(e.target.value as MedicalStudyFile['category'])}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs"
              >
                <option value="Laboratorio PDF">Laboratorio PDF</option>
                <option value="Ecografía">Ecografía</option>
                <option value="Radiografía">Radiografía</option>
                <option value="Informe Especialista">Informe Especialista</option>
              </select>
              <input
                type="text"
                placeholder="Valores destacados (opcional)"
                value={studyHighlight}
                onChange={(e) => setStudyHighlight(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <textarea
              required
              rows={2}
              placeholder="Resumen o hallazgos del estudio..."
              value={studySummary}
              onChange={(e) => setStudySummary(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-sky-600" />
                  {studyImageUrl ? 'Archivo adjunto listo' : 'Subir Archivo / PDF'}
                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    onChange={handleStudyFileChange}
                    className="hidden"
                  />
                </label>

                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 cursor-pointer">
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tomar Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleStudyFileChange}
                    className="hidden"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Guardar en Historial
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedPatient.studies.length === 0 ? (
              <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                No hay resultados o estudios médicos adjuntos todavía.
              </div>
            ) : (
              selectedPatient.studies.map((study) => (
                <div
                  key={study.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[11px] font-bold">
                      {study.category}
                    </span>
                    <span className="text-xs text-slate-400">{study.date}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{study.title}</h3>
                  <p className="text-xs text-slate-600">{study.summary}</p>
                  {study.valuesHighlight && (
                    <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
                      {study.valuesHighlight}
                    </p>
                  )}
                  {study.imageUrl &&
                    (study.imageUrl.startsWith('data:application/pdf') ? (
                      <a
                        href={study.imageUrl}
                        download={`${study.title || 'estudio'}.pdf`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-xs font-bold text-sky-800"
                      >
                        <FileText className="w-4 h-4 text-sky-600" />
                        <span>Abrir / Descargar PDF adjunto</span>
                      </a>
                    ) : (
                      <img
                        src={study.imageUrl}
                        alt={study.title}
                        className="w-full max-h-48 object-cover rounded-xl border border-slate-200"
                      />
                    ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <CreateRecipeModal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        patient={selectedPatient}
        onSaveRecipe={(saved) => {
          completeConsultation(
            selectedPatient.id,
            saved.consultation,
            selectedPatient.latestVitals || {
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
        }}
      />
    </div>
  );
};
