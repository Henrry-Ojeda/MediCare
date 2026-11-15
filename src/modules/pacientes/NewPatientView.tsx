import React, { useState } from 'react';
import { useClinical } from '../../context/ClinicalContext';
import { calculateExactAgeLabel } from '../../utils/pediatricCalculations';

export const NewPatientView: React.FC = () => {
  const { addPatient, navigateToPatient360 } = useClinical();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [birthDate, setBirthDate] = useState('2024-03-15');
  const [bloodType, setBloodType] = useState<'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-'>('O+');

  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState<'Madre' | 'Padre' | 'Representante Legal'>('Madre');
  const [guardianIdDocument, setGuardianIdDocument] = useState('');
  const [guardianWhatsapp, setGuardianWhatsapp] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');

  const [allergiesText, setAllergiesText] = useState('');
  const [chronicText, setChronicText] = useState('');
  const [gestationalWeeks, setGestationalWeeks] = useState(39);
  const [birthWeightKg, setBirthWeightKg] = useState(3.3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = addPatient({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      sex,
      birthDate,
      bloodType,
      primarySpecialty: 'Pediatría',
      criticalAllergies: allergiesText.trim() ? [allergiesText.trim()] : [],
      chronicConditions: chronicText.trim() ? [chronicText.trim()] : [],
      previousHospitalizations: 'Sin hospitalizaciones previas',
      guardianName: guardianName.trim(),
      guardianRelation,
      guardianIdDocument: guardianIdDocument.trim(),
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
    navigateToPatient360(created.id);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            1. Datos del Paciente Pediátrico
          </h2>
          <span className="text-xs font-mono font-bold text-[#0284C7]">
            Edad: {calculateExactAgeLabel(birthDate)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombres *</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ej. Santiago Andrés"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Apellidos *</label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ej. Castillo Rivas"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fecha de Nacimiento *
            </label>
            <input
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sexo</label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value as 'M' | 'F')}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Grupo Sanguíneo</label>
            <select
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value as typeof bloodType)}
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
            >
              {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Semanas Gestación / Peso Nacer
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={gestationalWeeks}
                onChange={(e) => setGestationalWeeks(Number(e.target.value))}
                placeholder="39 sem"
                className="w-full px-2.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
              />
              <input
                type="number"
                step="0.1"
                value={birthWeightKg}
                onChange={(e) => setBirthWeightKg(Number(e.target.value))}
                placeholder="3.3 kg"
                className="w-full px-2.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
          2. Representante Legal y WhatsApp (Para Récipes)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre del Representante *
            </label>
            <input
              type="text"
              required
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="Ej. Gabriela Rivas"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Parentesco</label>
            <select
              value={guardianRelation}
              onChange={(e) => setGuardianRelation(e.target.value as typeof guardianRelation)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="Madre">Madre</option>
              <option value="Padre">Padre</option>
              <option value="Representante Legal">Representante Legal</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cédula *</label>
            <input
              type="text"
              required
              value={guardianIdDocument}
              onChange={(e) => setGuardianIdDocument(e.target.value)}
              placeholder="V-19.334.112"
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              WhatsApp (Récipes) *
            </label>
            <input
              type="text"
              required
              value={guardianWhatsapp}
              onChange={(e) => setGuardianWhatsapp(e.target.value)}
              placeholder="+58 414-7782310"
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Correo</label>
            <input
              type="email"
              value={guardianEmail}
              onChange={(e) => setGuardianEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
          3. Alergias y Antecedentes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-rose-700 mb-1">
              Alergias a Medicamentos (Opcional)
            </label>
            <input
              type="text"
              value={allergiesText}
              onChange={(e) => setAllergiesText(e.target.value)}
              placeholder="Ej. Alergia a Penicilina / Ibuprofeno"
              className="w-full px-3.5 py-2.5 text-xs bg-rose-50/50 border border-rose-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Condiciones Crónicas (Opcional)
            </label>
            <input
              type="text"
              value={chronicText}
              onChange={(e) => setChronicText(e.target.value)}
              placeholder="Ej. Asma leve / Ninguna"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Guardar Paciente y Abrir Historial →
          </button>
        </div>
      </div>
    </form>
  );
};
