import React, { useState } from 'react';
import { Baby, FileImage, History, TrendingUp } from 'lucide-react';
import { useClinical } from '../../../../context/ClinicalContext';
import { PatientClinicalHeader } from '../components/PatientClinicalHeader';
import { ConsultationTimelineTab } from '../components/ConsultationTimelineTab';
import { PerinatalRecordTab } from '../components/PerinatalRecordTab';
import { OmsGrowthCurvesTab } from '../components/OmsGrowthCurvesTab';

type HistoryTab = 'timeline' | 'perinatal' | 'oms' | 'studies';

export const PediatricHistoryView: React.FC = () => {
  const {
    selectedPatient,
    setCurrentView,
    navigateToActiveConsultation,
    navigateToPatientVaccines,
    openDispatchModal,
  } = useClinical();
  const [activeTab, setActiveTab] = useState<HistoryTab>('timeline');

  if (!selectedPatient) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
        <p className="text-sm text-slate-600">Seleccione un paciente para ver su historial clínico pediátrico.</p>
        <button
          type="button"
          onClick={() => setCurrentView('pacientes')}
          className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold"
        >
          Ir al Directorio de Pacientes
        </button>
      </div>
    );
  }

  const tabs: { id: HistoryTab; label: string; icon: React.ReactNode }[] = [
    { id: 'timeline', label: 'Historial de Consultas', icon: <History className="w-4 h-4" /> },
    { id: 'perinatal', label: 'Antecedentes Perinatales', icon: <Baby className="w-4 h-4" /> },
    { id: 'oms', label: 'Curvas de Crecimiento OMS', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'studies', label: `Estudios (${selectedPatient.studies.length})`, icon: <FileImage className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PatientClinicalHeader
        patient={selectedPatient}
        onBack={() => setCurrentView('pacientes')}
        onStartConsultation={() => navigateToActiveConsultation(selectedPatient.id)}
        onOpenVaccines={() => navigateToPatientVaccines(selectedPatient.id)}
      />

      <div className="flex overflow-x-auto gap-2 pb-1">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
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
        <ConsultationTimelineTab
          consultations={selectedPatient.consultations}
          onOpenRecipe={(consultation) => openDispatchModal(selectedPatient, consultation)}
        />
      )}

      {activeTab === 'perinatal' && <PerinatalRecordTab perinatal={selectedPatient.perinatal} />}

      {activeTab === 'oms' && <OmsGrowthCurvesTab growthHistory={selectedPatient.growthHistory} />}

      {activeTab === 'studies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedPatient.studies.length === 0 ? (
            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
              No hay estudios o laboratorios adjuntos.
            </div>
          ) : (
            selectedPatient.studies.map((study) => (
              <div key={study.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
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
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
