import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Stethoscope, UserPlus } from 'lucide-react';
import { useClinical } from '../../../context/ClinicalContext';
import { Patient } from '../../../types/medical';
import { calculateExactAgeLabel } from '../../../utils/pediatricCalculations';

export interface PatientFormProps {
  compact?: boolean;
  showPerinatalSection?: boolean;
  onCancel?: () => void;
  onCreated?: (patient: Patient, action: 'history' | 'consultation') => void;
}

export const PatientForm: React.FC<PatientFormProps> = ({
  compact = false,
  showPerinatalSection = true,
  onCancel,
  onCreated,
}) => {
  const { addPatient, navigateToPatient360, navigateToActiveConsultation } = useClinical();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [birthDate, setBirthDate] = useState('2022-01-01');
  const [idDocument, setIdDocument] = useState('');

  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState<'Madre' | 'Padre' | 'Representante Legal'>('Madre');
  const [guardianIdDocument, setGuardianIdDocument] = useState('');
  const [guardianWhatsapp, setGuardianWhatsapp] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');

  const [showOptional, setShowOptional] = useState(false);
  const [bloodType, setBloodType] = useState<'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-'>('O+');
  const [allergiesText, setAllergiesText] = useState('');
  const [chronicText, setChronicText] = useState('');
  const [gestationalWeeks, setGestationalWeeks] = useState(39);
  const [birthWeightKg, setBirthWeightKg] = useState(3.2);

  const createFromForm = (action: 'history' | 'consultation') => {
    if (!firstName.trim()) return;
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim() || 'Paciente';
    const created = addPatient({
      firstName: cleanFirst,
      lastName: cleanLast,
      sex,
      birthDate: birthDate || '2022-01-01',
      idDocument: idDocument.trim() || undefined,
      bloodType,
      primarySpecialty: 'Pediatría',
      criticalAllergies: allergiesText.trim() ? [allergiesText.trim()] : [],
      chronicConditions: chronicText.trim() ? [chronicText.trim()] : [],
      previousHospitalizations: 'Sin hospitalizaciones previas',
      guardianName: guardianName.trim() || `${cleanFirst} ${cleanLast}`.trim(),
      guardianRelation,
      guardianIdDocument: guardianIdDocument.trim() || idDocument.trim(),
      guardianOccupation: '',
      guardianWhatsapp: guardianWhatsapp.trim(),
      guardianEmail: guardianEmail.trim(),
      perinatal: {
        gestationalWeeks,
        apgar1Min: 9,
        apgar5Min: 10,
        birthWeightKg,
        birthHeightCm: 50,
        birthHeadCircumferenceCm: 34.5,
        deliveryType: 'Parto Eutócico Simple',
        neonatalComplications: 'Ninguna',
        maternalBloodType: bloodType,
        exclusiveBreastfeedingMonths: 6,
      },
      growthHistory: [],
      vaccines: [],
      studies: [],
      consultations: [],
    });

    if (onCreated) {
      onCreated(created, action);
      return;
    }

    if (action === 'consultation') {
      navigateToActiveConsultation(created.id);
    } else {
      navigateToPatient360(created.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createFromForm(compact ? 'consultation' : 'history');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <h3 className="text-sm font-bold text-slate-900">Datos Esenciales del Paciente</h3>
          <span className="text-xs font-mono font-bold text-[#0284C7]">
            Edad: {calculateExactAgeLabel(birthDate)}
          </span>
        </div>

        <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3`}>
          <div>
            <label htmlFor="pf-first-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Nombres *
            </label>
            <input
              id="pf-first-name"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ej. Santiago Andrés"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label htmlFor="pf-last-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Apellidos {!compact && '*'}
            </label>
            <input
              id="pf-last-name"
              type="text"
              required={!compact}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ej. Castillo Rivas"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label htmlFor="pf-birth-date" className="block text-xs font-semibold text-slate-700 mb-1">
              Fecha de Nacimiento *
            </label>
            <input
              id="pf-birth-date"
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label htmlFor="pf-sex" className="block text-xs font-semibold text-slate-700 mb-1">
              Sexo
            </label>
            <select
              id="pf-sex"
              value={sex}
              onChange={(e) => setSex(e.target.value as 'M' | 'F')}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </div>
          <div>
            <label htmlFor="pf-guardian-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Representante {!compact && '*'}
            </label>
            <input
              id="pf-guardian-name"
              type="text"
              required={!compact}
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="Nombre madre/padre"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label htmlFor="pf-guardian-doc" className="block text-xs font-semibold text-slate-700 mb-1">
              Cédula / Documento
            </label>
            <input
              id="pf-guardian-doc"
              type="text"
              value={guardianIdDocument}
              onChange={(e) => {
                setGuardianIdDocument(e.target.value);
                setIdDocument(e.target.value);
              }}
              placeholder="Ej. V-22445566"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label htmlFor="pf-guardian-whatsapp" className="block text-xs font-semibold text-slate-700 mb-1">
              WhatsApp Representante
            </label>
            <input
              id="pf-guardian-whatsapp"
              type="tel"
              value={guardianWhatsapp}
              onChange={(e) => setGuardianWhatsapp(e.target.value)}
              placeholder="Ej. +584141234567"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label htmlFor="pf-guardian-relation" className="block text-xs font-semibold text-slate-700 mb-1">
              Parentesco
            </label>
            <select
              id="pf-guardian-relation"
              value={guardianRelation}
              onChange={(e) => setGuardianRelation(e.target.value as typeof guardianRelation)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="Madre">Madre</option>
              <option value="Padre">Padre</option>
              <option value="Representante Legal">Representante Legal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sección opcional colapsable — extensible para otros módulos */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowOptional((prev) => !prev)}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <span>Datos opcionales (Alergias, Tipo de Sangre{showPerinatalSection ? ', Perinatales' : ''})</span>
          {showOptional ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showOptional && (
          <div className="px-4 pb-4 pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="pf-blood-type" className="block text-xs font-semibold text-slate-700 mb-1">
                Grupo Sanguíneo
              </label>
              <select
                id="pf-blood-type"
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value as typeof bloodType)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              >
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pf-guardian-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <input
                id="pf-guardian-email"
                type="email"
                value={guardianEmail}
                onChange={(e) => setGuardianEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label htmlFor="pf-allergies" className="block text-xs font-semibold text-rose-700 mb-1">
                Alergias Críticas
              </label>
              <input
                id="pf-allergies"
                type="text"
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
                placeholder="Ej. Penicilina, Ibuprofeno (opcional)"
                className="w-full px-3 py-2 text-xs bg-rose-50/40 border border-rose-200 rounded-xl"
              />
            </div>
            <div>
              <label htmlFor="pf-chronic" className="block text-xs font-semibold text-slate-700 mb-1">
                Condiciones Crónicas
              </label>
              <input
                id="pf-chronic"
                type="text"
                value={chronicText}
                onChange={(e) => setChronicText(e.target.value)}
                placeholder="Ej. Asma leve (opcional)"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            {showPerinatalSection && (
              <>
                <div>
                  <label htmlFor="pf-gest-weeks" className="block text-xs font-semibold text-slate-700 mb-1">
                    Semanas de Gestación
                  </label>
                  <input
                    id="pf-gest-weeks"
                    type="number"
                    min={24}
                    max={43}
                    value={gestationalWeeks}
                    onChange={(e) => setGestationalWeeks(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label htmlFor="pf-birth-weight" className="block text-xs font-semibold text-slate-700 mb-1">
                    Peso al Nacer (kg)
                  </label>
                  <input
                    id="pf-birth-weight"
                    type="number"
                    step="0.1"
                    min={0.5}
                    max={6}
                    value={birthWeightKg}
                    onChange={(e) => setBirthWeightKg(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
          >
            Cancelar
          </button>
        )}
        {!compact && (
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl border border-[#0284C7] text-[#0284C7] hover:bg-sky-50 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Guardar y Ver Historial</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => createFromForm('consultation')}
          className="px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
        >
          <Stethoscope className="w-3.5 h-3.5" />
          <span>Guardar e Iniciar Consulta</span>
        </button>
      </div>
    </form>
  );
};
