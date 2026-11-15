import React, { useState } from 'react';
import {
  Calendar,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Plus,
  Shield,
  Stethoscope,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';
import { useNotifications } from '../../context/NotificationContext';
import { AssistantAssignment } from '../../types/medical';

export const AdminUsersView: React.FC = () => {
  const {
    doctors,
    assistants,
    addDoctorProfile,
    removeDoctorProfile,
    saveAssistantAssignment,
    removeAssistantAssignment,
  } = useClinical();
  const { showToast } = useNotifications();

  // Formulario de creación de Doctor (Pediatra)
  const [docFirstName, setDocFirstName] = useState('');
  const [docLastName, setDocLastName] = useState('');
  const [docBirthDate, setDocBirthDate] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docUsername, setDocUsername] = useState('');
  const [docPassword, setDocPassword] = useState('');
  const [showDocPwd, setShowDocPwd] = useState(false);
  const [docLicense, setDocLicense] = useState('');

  // Formulario de creación de Asistente
  const [asstFirstName, setAsstFirstName] = useState('');
  const [asstLastName, setAsstLastName] = useState('');
  const [asstBirthDate, setAsstBirthDate] = useState('');
  const [asstPhone, setAsstPhone] = useState('');
  const [asstEmail, setAsstEmail] = useState('');
  const [asstUsername, setAsstUsername] = useState('');
  const [asstPassword, setAsstPassword] = useState('');
  const [showAsstPwd, setShowAsstPwd] = useState(false);

  const handleCreateDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFirstName.trim() || !docLastName.trim() || !docEmail.trim() || !docPassword.trim()) {
      return;
    }
    const fullName = `${docFirstName.trim()} ${docLastName.trim()}`;
    const username =
      docUsername.trim() ||
      docEmail.split('@')[0] ||
      `${docFirstName.trim().toLowerCase()}.${docLastName.trim().toLowerCase()}`;

    addDoctorProfile({
      name: fullName,
      firstName: docFirstName.trim(),
      lastName: docLastName.trim(),
      birthDate: docBirthDate || undefined,
      phone: docPhone.trim() || undefined,
      email: docEmail.trim(),
      username,
      specialty: 'Pediatría',
      licenseNumber: docLicense.trim() || 'MPPS Pendiente',
    });

    setDocFirstName('');
    setDocLastName('');
    setDocBirthDate('');
    setDocPhone('');
    setDocEmail('');
    setDocUsername('');
    setDocPassword('');
    setDocLicense('');
  };

  const handleCreateAssistant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!asstFirstName.trim() || !asstLastName.trim() || !asstEmail.trim() || !asstPassword.trim()) {
      return;
    }
    const fullName = `${asstFirstName.trim()} ${asstLastName.trim()}`;
    const username =
      asstUsername.trim() ||
      asstEmail.split('@')[0] ||
      `${asstFirstName.trim().toLowerCase()}.${asstLastName.trim().toLowerCase()}`;

    const created: Omit<AssistantAssignment, 'id'> = {
      assistantName: fullName,
      firstName: asstFirstName.trim(),
      lastName: asstLastName.trim(),
      birthDate: asstBirthDate || undefined,
      phone: asstPhone.trim() || undefined,
      assistantUsername: username,
      assistantEmail: asstEmail.trim(),
      mode: 'PERSONAL',
      assignedDoctorIds: doctors.map((d) => d.id),
      permissions: {
        canSchedule: true,
        canRegisterPatientInfo: true,
        canCollectPayments: false,
        canRescheduleOrCancel: true,
      },
      allowedViews: [
        'dashboard',
        'agenda',
        'sala-espera',
        'pacientes',
        'paciente-nuevo',
        'paciente-detalle',
        'vacunas-carnet',
        'perfil',
      ],
      active: true,
    };

    saveAssistantAssignment(created);
    showToast(`Perfil de Asistente ${created.assistantName} creado con usuario @${username}`);

    setAsstFirstName('');
    setAsstLastName('');
    setAsstBirthDate('');
    setAsstPhone('');
    setAsstEmail('');
    setAsstUsername('');
    setAsstPassword('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Gestión de Perfiles: Doctores y Asistentes
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              El Administrador registra los datos básicos, correo/usuario y clave inicial; luego cada usuario puede modificar su propio perfil.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 self-start sm:self-auto">
          <Lock className="w-3.5 h-3.5 text-amber-600" /> Módulo Pediatría protegido
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crear Perfil de Doctor */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-[#0284C7]" /> Crear Perfil de Doctor (Pediatra)
          </h2>

          <form onSubmit={handleCreateDoctor} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Valeria"
                  value={docFirstName}
                  onChange={(e) => setDocFirstName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Apellido *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Méndez"
                  value={docLastName}
                  onChange={(e) => setDocLastName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  value={docBirthDate}
                  onChange={(e) => setDocBirthDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Teléfono</label>
                <input
                  type="tel"
                  placeholder="+58 414-0000000"
                  value={docPhone}
                  onChange={(e) => setDocPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Correo *</label>
                <input
                  type="email"
                  required
                  placeholder="doctora@clinica.com"
                  value={docEmail}
                  onChange={(e) => setDocEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Usuario</label>
                <input
                  type="text"
                  placeholder="valeria.mendez"
                  value={docUsername}
                  onChange={(e) => setDocUsername(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Asignar Clave *
                </label>
                <div className="relative">
                  <input
                    type={showDocPwd ? 'text' : 'password'}
                    required
                    minLength={4}
                    placeholder="Mínimo 4 caracteres"
                    value={docPassword}
                    onChange={(e) => setDocPassword(e.target.value)}
                    className="w-full pl-3.5 pr-9 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDocPwd((v) => !v)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showDocPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  MPPS / Colegiado
                </label>
                <input
                  type="text"
                  placeholder="Ej. MPPS 68412"
                  value={docLicense}
                  onChange={(e) => setDocLicense(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Especialidad (Bloqueada)
              </label>
              <input
                type="text"
                disabled
                value="Pediatría y Puericultura (Fija)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-xs font-semibold"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Crear Perfil de Doctor
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="text-xs font-bold text-slate-500">Doctores registrados ({doctors.length})</p>
            {doctors.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No hay doctores creados todavía.</p>
            ) : (
              doctors.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 gap-2"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-bold text-slate-900">{doc.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {doc.specialty} • {doc.licenseNumber}
                    </p>
                    <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2">
                      {doc.username && <span>@{doc.username}</span>}
                      {doc.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {doc.email}
                        </span>
                      )}
                      {doc.birthDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {doc.birthDate}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDoctorProfile(doc.id)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                    title="Eliminar perfil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Crear Perfil de Asistente */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-violet-600" /> Crear Perfil de Asistente
          </h2>

          <form onSubmit={handleCreateAssistant} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Laura"
                  value={asstFirstName}
                  onChange={(e) => setAsstFirstName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Apellido *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Pérez"
                  value={asstLastName}
                  onChange={(e) => setAsstLastName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  value={asstBirthDate}
                  onChange={(e) => setAsstBirthDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Teléfono</label>
                <input
                  type="tel"
                  placeholder="+58 412-0000000"
                  value={asstPhone}
                  onChange={(e) => setAsstPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Correo *</label>
                <input
                  type="email"
                  required
                  placeholder="asistente@clinica.com"
                  value={asstEmail}
                  onChange={(e) => setAsstEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Usuario</label>
                <input
                  type="text"
                  placeholder="laura.asistente"
                  value={asstUsername}
                  onChange={(e) => setAsstUsername(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Asignar Clave *
              </label>
              <div className="relative">
                <input
                  type={showAsstPwd ? 'text' : 'password'}
                  required
                  minLength={4}
                  placeholder="Mínimo 4 caracteres"
                  value={asstPassword}
                  onChange={(e) => setAsstPassword(e.target.value)}
                  className="w-full pl-3.5 pr-9 py-2 rounded-xl border border-slate-200 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowAsstPwd((v) => !v)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showAsstPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Crear Perfil de Asistente
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="text-xs font-bold text-slate-500">
              Asistentes registrados ({assistants.length})
            </p>
            {assistants.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No hay asistentes creados todavía.</p>
            ) : (
              assistants.map((asst) => (
                <div
                  key={asst.id}
                  className="flex items-start justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 gap-2"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-bold text-slate-900">{asst.assistantName}</p>
                    <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2">
                      <span className="inline-flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-600" /> @{asst.assistantUsername}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {asst.assistantEmail}
                      </span>
                      {asst.birthDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {asst.birthDate}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAssistantAssignment(asst.id)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                    title="Eliminar perfil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
