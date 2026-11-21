import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  MessageCircle,
  Pill,
  Plus,
  Printer,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import { Modal } from '../common';
import { RecipeDocumentPreview } from './RecipeDocumentPreview';
import { useClinical } from '../../context/ClinicalContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { PastConsultationSummary, Patient, PrescriptionItem } from '../../types/medical';
import { PEDIATRIC_DRUG_FORMULAS } from '../../modules/especialidades/pediatria/config/pediatricFormulary';
import { PEDIATRIC_CIE10_LIST } from '../../modules/especialidades/pediatria/config/pediatricCie10';
import {
  calculatePediatricDose,
  findAllergyConflict,
} from '../../utils/pediatricCalculations';
import { getTodayIsoDate } from '../../utils/formatters';
import { buildRecipeWhatsappUrl } from '../../utils/whatsappFormatter';

interface CreateRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  initialPrescriptions?: PrescriptionItem[];
  initialCie10Code?: string;
  initialCie10Name?: string;
  initialReason?: string;
  initialParentGuide?: string;
  initialAlarmSigns?: string[];
  weightKg?: number;
  onSaveRecipe: (data: {
    prescriptions: PrescriptionItem[];
    cie10Code: string;
    cie10Name: string;
    reason: string;
    parentGuide: string;
    alarmSigns: string[];
    consultation: PastConsultationSummary;
  }) => void;
}

export const CreateRecipeModal: React.FC<CreateRecipeModalProps> = ({
  isOpen,
  onClose,
  patient,
  initialPrescriptions = [],
  initialCie10Code = '',
  initialCie10Name = '',
  initialReason = '',
  initialParentGuide = '',
  initialAlarmSigns = [],
  weightKg,
  onSaveRecipe,
}) => {
  const { templateConfig, incrementWhatsappSent } = useClinical();
  const { currentUser, doctorSignature } = useAuth();
  const { showToast } = useNotifications();

  const effectiveWeight = weightKg ?? patient.latestVitals?.weightKg ?? 0;

  const [step, setStep] = useState<'edit' | 'saved'>('edit');
  const [editTab, setEditTab] = useState<'form' | 'preview'>('form');
  const [activePdfPage, setActivePdfPage] = useState<1 | 2>(1);
  const [whatsappSent, setWhatsappSent] = useState(false);

  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>(initialPrescriptions);
  const [cie10Code, setCie10Code] = useState(initialCie10Code);
  const [cie10Name, setCie10Name] = useState(initialCie10Name);
  const [reason, setReason] = useState(initialReason);
  const [parentGuide, setParentGuide] = useState(initialParentGuide);
  const [alarmSignsText, setAlarmSignsText] = useState(initialAlarmSigns.join('\n'));
  const [selectedDrugName, setSelectedDrugName] = useState(PEDIATRIC_DRUG_FORMULAS[0]?.name || '');
  const [savedConsultation, setSavedConsultation] = useState<PastConsultationSummary | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('edit');
      setActivePdfPage(1);
      setWhatsappSent(false);
      setSavedConsultation(null);
      setPrescriptions(initialPrescriptions);
      setCie10Code(initialCie10Code);
      setCie10Name(initialCie10Name);
      setReason(initialReason);
      setParentGuide(initialParentGuide);
      setAlarmSignsText(initialAlarmSigns.join('\n'));
    }
  }, [
    isOpen,
    initialPrescriptions,
    initialCie10Code,
    initialCie10Name,
    initialReason,
    initialParentGuide,
    initialAlarmSigns,
  ]);

  const selectedFormula = PEDIATRIC_DRUG_FORMULAS.find((d) => d.name === selectedDrugName);
  const allergyConflict = selectedFormula
    ? findAllergyConflict(selectedFormula.name, patient.criticalAllergies)
    : null;

  const handleAddCalculatedDrug = () => {
    if (!selectedFormula) return;
    const { dosePerTake, calculatedMgPerKg } = calculatePediatricDose(
      selectedFormula,
      effectiveWeight > 0 ? effectiveWeight : 10
    );
    setPrescriptions((prev) => [
      ...prev,
      {
        id: `rx-${Date.now()}`,
        medicationName: selectedFormula.name,
        presentation: selectedFormula.presentation,
        dosePerTake,
        frequencyHours: String(selectedFormula.frequencyHours),
        durationDays: String(selectedFormula.defaultDurationDays),
        specialInstructions: selectedFormula.specialInstructions,
        calculatedMgPerKg,
      },
    ]);
  };

  const handleAddManualRow = () => {
    setPrescriptions((prev) => [
      ...prev,
      {
        id: `rx-${Date.now()}`,
        medicationName: '',
        presentation: '',
        dosePerTake: '',
        frequencyHours: '',
        durationDays: '',
        specialInstructions: '',
      },
    ]);
  };

  const updateItem = (id: string, patch: Partial<PrescriptionItem>) => {
    setPrescriptions((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    setPrescriptions((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrescriptions = prescriptions.filter(
      (rx) => rx.medicationName.trim() || rx.specialInstructions.trim()
    );
    if (cleanPrescriptions.length === 0) {
      showToast('Agregue al menos un medicamento o examen al récipe.');
      return;
    }

    const alarmSigns = alarmSignsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const consultation: PastConsultationSummary = {
      id: `cons-rx-${Date.now()}`,
      date: getTodayIsoDate(),
      doctorId: currentUser?.id,
      doctorName: currentUser?.name || doctorSignature.doctorName || 'Pediatra',
      specialty: 'Pediatría',
      cie10Code: cie10Code || 'Z00.1',
      cie10Name: cie10Name || 'Indicación Médica / Récipe',
      reason: reason.trim() || 'Emisión de récipe médico.',
      weightKg: effectiveWeight || 0,
      heightCm: patient.latestVitals?.heightCm || 0,
      temperatureC: patient.latestVitals?.temperatureC || 0,
      bloodPressure: patient.latestVitals
        ? `${patient.latestVitals.systolicBp}/${patient.latestVitals.diastolicBp}`
        : 'N/A',
      physicalExamSummary: '',
      prescriptions: cleanPrescriptions,
      parentGuide: parentGuide.trim(),
      alarmSigns,
    };

    onSaveRecipe({
      prescriptions: cleanPrescriptions,
      cie10Code,
      cie10Name,
      reason: reason.trim(),
      parentGuide: parentGuide.trim(),
      alarmSigns,
      consultation,
    });

    setSavedConsultation(consultation);
    setStep('saved');
    showToast('Récipe guardado. Puede enviarlo por WhatsApp o imprimirlo.');
  };

  const handleSendWhatsapp = () => {
    if (!savedConsultation) return;
    const whatsappUrl = buildRecipeWhatsappUrl(
      patient,
      savedConsultation,
      templateConfig.clinicName
    );
    incrementWhatsappSent(1);
    setWhatsappSent(true);
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    showToast(`Abriendo WhatsApp para enviar récipe a ${patient.guardianWhatsapp}`);
  };

  const draftConsultation: PastConsultationSummary = {
    id: 'cons-draft-preview',
    date: getTodayIsoDate(),
    doctorId: currentUser?.id,
    doctorName: currentUser?.name || doctorSignature.doctorName || 'Pediatra',
    specialty: 'Pediatría',
    cie10Code: cie10Code || 'Z00.1',
    cie10Name: cie10Name || 'Indicación Médica / Récipe',
    reason: reason.trim() || 'Emisión de récipe médico.',
    weightKg: effectiveWeight || 0,
    heightCm: patient.latestVitals?.heightCm || 0,
    temperatureC: patient.latestVitals?.temperatureC || 0,
    bloodPressure: patient.latestVitals
      ? `${patient.latestVitals.systolicBp}/${patient.latestVitals.diastolicBp}`
      : 'N/A',
    physicalExamSummary: '',
    prescriptions: prescriptions.filter(
      (rx) => rx.medicationName.trim() || rx.specialInstructions.trim()
    ),
    parentGuide: parentGuide.trim(),
    alarmSigns: alarmSignsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'edit' ? 'Crear Récipe Médico' : 'Récipe Guardado — Listo para Enviar'}
      subtitle={`Paciente: ${patient.firstName} ${patient.lastName} · Peso: ${effectiveWeight || 'N/A'} kg`}
      maxWidthClass="max-w-6xl"
    >
      {step === 'edit' ? (
        <div className="space-y-3">
          <div className="flex lg:hidden items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setEditTab('form')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                editTab === 'form' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" /> Editar Récipe
            </button>
            <button
              type="button"
              onClick={() => setEditTab('preview')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                editTab === 'preview' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Vista Previa en Vivo
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <form
              onSubmit={handleSave}
              className={`lg:col-span-7 min-w-0 space-y-4 ${editTab === 'preview' ? 'hidden lg:block' : ''}`}
            >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Diagnóstico CIE-10 (opcional)
              </label>
              <select
                value={cie10Code}
                onChange={(e) => {
                  const found = PEDIATRIC_CIE10_LIST.find((c) => c.code === e.target.value);
                  setCie10Code(found ? found.code : '');
                  setCie10Name(found ? found.name : '');
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
              >
                <option value="">Seleccione un diagnóstico...</option>
                {PEDIATRIC_CIE10_LIST.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo / Nota Clínica (opcional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej. Control febril, tratamiento ambulatorio..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-sky-600" /> Calculadora Pediátrica mg/kg/día
              </label>
              <button
                type="button"
                onClick={handleAddManualRow}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Línea Manual
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 min-w-0">
              <select
                value={selectedDrugName}
                onChange={(e) => setSelectedDrugName(e.target.value)}
                className="flex-1 min-w-0 w-full truncate px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium"
              >
                {PEDIATRIC_DRUG_FORMULAS.map((drug) => (
                  <option key={drug.name} value={drug.name}>
                    {drug.name} ({drug.presentation}) — {drug.mgPerKgPerDay} mg/kg/día
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddCalculatedDrug}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Calcular y Agregar
              </button>
            </div>
            {allergyConflict && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Alerta de Alergia: El paciente registra "{allergyConflict}".
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-sky-600" /> Contenido del Récipe (Izquierda: Medicina/Examen · Derecha: Instrucciones)
              </p>
              <span className="text-[11px] text-slate-500">{prescriptions.length} ítems</span>
            </div>

            {prescriptions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
                No hay medicamentos o exámenes agregados todavía. Use la calculadora o pulse "Agregar Línea Manual".
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {prescriptions.map((rx, idx) => (
                  <div
                    key={rx.id}
                    className="rounded-xl border border-slate-200 p-3 bg-white grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start"
                  >
                    <div className="md:col-span-5 space-y-2 md:border-r md:border-slate-100 md:pr-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-sky-700">Ítem #{idx + 1} · Rp / Examen</span>
                      </div>
                      <input
                        type="text"
                        value={rx.medicationName}
                        onChange={(e) => updateItem(rx.id, { medicationName: e.target.value })}
                        placeholder="Medicamento o Examen (ej. Amoxicilina)"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={rx.presentation}
                          onChange={(e) => updateItem(rx.id, { presentation: e.target.value })}
                          placeholder="Presentación"
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                        />
                        <input
                          type="text"
                          value={rx.dosePerTake}
                          onChange={(e) => updateItem(rx.id, { dosePerTake: e.target.value })}
                          placeholder="Dosis (ej. 5 ml)"
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-sky-700"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-7 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-700">Indicaciones / Instrucciones</span>
                        <button
                          type="button"
                          onClick={() => removeItem(rx.id)}
                          className="text-rose-600 hover:bg-rose-50 p-1 rounded-lg cursor-pointer"
                          title="Eliminar ítem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={rx.frequencyHours}
                          onChange={(e) => updateItem(rx.id, { frequencyHours: e.target.value })}
                          placeholder="Cada cuántas horas (ej. 8)"
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                        />
                        <input
                          type="text"
                          value={rx.durationDays}
                          onChange={(e) => updateItem(rx.id, { durationDays: e.target.value })}
                          placeholder="Duración en días (ej. 7)"
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                        />
                      </div>
                      <input
                        type="text"
                        value={rx.specialInstructions}
                        onChange={(e) => updateItem(rx.id, { specialInstructions: e.target.value })}
                        placeholder="Instrucciones para el representante..."
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Guía y Cuidados para los Padres (opcional)
              </label>
              <textarea
                rows={2}
                value={parentGuide}
                onChange={(e) => setParentGuide(e.target.value)}
                placeholder="Hidratación, reposo, dieta, control térmico..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-rose-700 mb-1">
                Signos de Alarma (1 por línea, opcional)
              </label>
              <textarea
                rows={2}
                value={alarmSignsText}
                onChange={(e) => setAlarmSignsText(e.target.value)}
                placeholder="Ej. Fiebre > 39°C por más de 48 horas&#10;Dificultad para respirar"
                className="w-full px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/30 text-xs"
              />
            </div>
          </div>

          <div className="sticky bottom-0 bg-white flex justify-end gap-2 pt-3 pb-1 border-t border-slate-100 z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Récipe</span>
            </button>
          </div>
        </form>

            <div
              className={`lg:col-span-5 min-w-0 bg-slate-100/80 border border-slate-200 rounded-2xl p-3 space-y-2.5 ${
                editTab === 'form' ? 'hidden lg:block' : ''
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-700 inline-flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-sky-600" /> Vista Previa en Vivo
                </span>
                <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActivePdfPage(1)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer ${
                      activePdfPage === 1 ? 'bg-sky-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    Récipe
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePdfPage(2)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer ${
                      activePdfPage === 2 ? 'bg-sky-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    Guía Padres
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto flex justify-center">
                <div className="origin-top scale-[0.78] sm:scale-[0.82] -mb-20">
                  <RecipeDocumentPreview
                    patient={patient}
                    consultation={draftConsultation}
                    templateConfig={templateConfig}
                    doctorSignature={doctorSignature}
                    activePage={activePdfPage}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        savedConsultation && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex flex-wrap items-center justify-between gap-2 font-semibold">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Récipe guardado correctamente. Ahora puede enviarlo por WhatsApp o imprimirlo.
              </span>
              <button
                type="button"
                onClick={() => setStep('edit')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-[11px] font-bold cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Editar Récipe
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActivePdfPage(1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    activePdfPage === 1 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Página 1: Récipe Legal
                </button>
                <button
                  type="button"
                  onClick={() => setActivePdfPage(2)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    activePdfPage === 2 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Página 2: Guía para Padres
                </button>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <FileText className="w-4 h-4 text-sky-600" /> Firmado por {doctorSignature.doctorName}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-8 bg-slate-100/70 p-3 sm:p-5 rounded-xl flex justify-center">
                <RecipeDocumentPreview
                  patient={patient}
                  consultation={savedConsultation}
                  templateConfig={templateConfig}
                  doctorSignature={doctorSignature}
                  activePage={activePdfPage}
                />
              </div>

              <div className="lg:col-span-4 space-y-4 no-print">
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <MessageCircle className="w-4 h-4 text-[#059669]" />
                    <span>WhatsApp del Representante</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800">{patient.guardianName}</div>
                  <div className="text-xs font-mono font-bold text-[#059669]">
                    {patient.guardianWhatsapp}
                  </div>
                </div>

                {whatsappSent && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>WhatsApp abierto con el récipe listo para enviar.</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSendWhatsapp}
                  className="w-full py-3 px-4 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar al WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Guardar PDF / Imprimir</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 px-4 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )
      )}
    </Modal>
  );
};
