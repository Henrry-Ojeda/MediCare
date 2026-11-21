import React, { useState } from 'react';
import { Building2, Camera, Lock, Plus, Save, ShieldCheck, Unlink, User, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useClinical } from '../../context/ClinicalContext';
import { useNotifications } from '../../context/NotificationContext';

export const UserProfileView: React.FC = () => {
  const { currentUser, userRole, setCurrentUser } = useAuth();
  const {
    assistants,
    doctors,
    clinics,
    unlinkDoctorFromAssistant,
    saveAssistantAssignment,
  } = useClinical();
  const { showToast } = useNotifications();

  const [showNewAssistantForm, setShowNewAssistantForm] = useState(false);
  const [asistFirstName, setAsistFirstName] = useState('');
  const [asistLastName, setAsistLastName] = useState('');
  const [asistEmail, setAsistEmail] = useState('');
  const [asistUsername, setAsistUsername] = useState('');
  const [asistPhone, setAsistPhone] = useState('');
  const [asistPassword, setAsistPassword] = useState('');
  const [creatingAssistant, setCreatingAssistant] = useState(false);

  const currentDoctorProfile = doctors.find(
    (d) =>
      d.id === currentUser?.id ||
      (currentUser?.email && d.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser?.username && d.username?.toLowerCase() === currentUser.username.toLowerCase())
  );
  const matchedDoctorId = currentDoctorProfile?.id || currentUser?.id;
  const linkedAssistants =
    userRole === 'PEDIATRA' && matchedDoctorId
      ? assistants.filter(
          (a) => a.active && (a.assignedDoctorIds || []).includes(matchedDoctorId)
        )
      : [];
  const linkedClinics =
    userRole === 'PEDIATRA' && matchedDoctorId
      ? clinics.filter(
          (c) => c.active && (c.assignments || []).some((a) => a.doctorId === matchedDoctorId)
        )
      : [];

  const handleCreatePersonalAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedDoctorId || !asistFirstName.trim() || !asistLastName.trim() || !asistEmail.trim() || !asistPassword.trim()) {
      return;
    }
    setCreatingAssistant(true);
    try {
      const fullName = `${asistFirstName.trim()} ${asistLastName.trim()}`;
      const created = await saveAssistantAssignment({
        assistantName: fullName,
        firstName: asistFirstName.trim(),
        lastName: asistLastName.trim(),
        assistantEmail: asistEmail.trim(),
        assistantUsername: asistUsername.trim() || asistEmail.trim().split('@')[0].toLowerCase(),
        phone: asistPhone.trim() || undefined,
        password: asistPassword.trim(),
        mode: 'PERSONAL',
        assignedDoctorIds: [matchedDoctorId],
        permissions: {
          canSchedule: true,
          canRegisterPatientInfo: true,
          canCollectPayments: true,
          canRescheduleOrCancel: true,
        },
        allowedViews: ['agenda', 'sala-espera', 'pacientes', 'paciente-nuevo'],
        active: true,
      });
      if (created) {
        setAsistFirstName('');
        setAsistLastName('');
        setAsistEmail('');
        setAsistUsername('');
        setAsistPhone('');
        setAsistPassword('');
        setShowNewAssistantForm(false);
      }
    } finally {
      setCreatingAssistant(false);
    }
  };

  const nameParts = (currentUser?.name || '').trim().split(/\s+/);
  const [firstName, setFirstName] = useState(currentUser?.firstName || nameParts[0] || '');
  const [lastName, setLastName] = useState(
    currentUser?.lastName || nameParts.slice(1).join(' ') || ''
  );
  const [birthDate, setBirthDate] = useState(currentUser?.birthDate || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [licenseNumber, setLicenseNumber] = useState(currentUser?.licenseNumber || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim() || currentUser.name;
    setCurrentUser({
      ...currentUser,
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: birthDate || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || currentUser.email,
      username: username.trim() || currentUser.username,
      avatarUrl: avatarUrl || undefined,
      licenseNumber: userRole === 'PEDIATRA' ? licenseNumber.trim() : currentUser.licenseNumber,
    });
    setNewPassword('');
    showToast('Tu perfil ha sido actualizado correctamente.');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-[#0284C7] overflow-hidden shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Mi Perfil ({userRole})</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Actualiza tus datos personales, correo, usuario y clave de acceso.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4" /> {currentUser?.roleName || userRole}
        </span>
      </div>

      {userRole === 'ADMIN' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-xs text-amber-900">
          <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Alcance del Perfil Administrador</p>
            <p className="text-amber-800 mt-0.5">
              Puedes crear perfiles de Doctores y Asistentes y configurar la clínica, pero no puedes crear pacientes ni modificar el módulo clínico de Pediatría.
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4"
      >
        <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-700">Foto de perfil (opcional)</p>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer">
                <Camera className="w-3.5 h-3.5" />
                {avatarUrl ? 'Cambiar foto' : 'Subir foto'}
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre *</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Apellido *</label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Fecha de Nacimiento
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+58 414-0000000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Correo Electrónico *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="profile-new-password" className="block text-xs font-semibold text-slate-600 mb-1">
              Nueva Clave de Acceso (opcional, mínimo 8 caracteres)
            </label>
            <input
              id="profile-new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Dejar vacío para mantener la clave actual"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          {userRole === 'PEDIATRA' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Registro MPPS / Colegio de Médicos
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold cursor-pointer"
        >
          <Save className="w-4 h-4" /> Guardar Cambios de Perfil
        </button>
      </form>

      {userRole === 'PEDIATRA' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#0284C7]" /> Plan MediCare y Modalidad
              </h2>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  linkedClinics.length > 0
                    ? 'bg-sky-50 text-sky-800 border border-sky-200'
                    : 'bg-violet-50 text-violet-800 border border-violet-200'
                }`}
              >
                {linkedClinics.length > 0 ? 'Plan Clínica' : 'Plan Personal'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <p className="font-bold text-slate-700">Clínica</p>
                <p className="text-slate-600 mt-1">
                  {linkedClinics.length > 0
                    ? linkedClinics.map((c) => c.name).join(', ')
                    : 'Sin clínica asignada (consulta independiente)'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <p className="font-bold text-slate-700">Asistente / Sala de Espera</p>
                <p className="text-slate-600 mt-1">
                  {linkedAssistants.length > 0
                    ? `${linkedAssistants.length} asistente(s) activo(s) — Sala de espera digital activa`
                    : 'Sin asistente — Atención directa por orden de llegada'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0284C7]" /> Mis Asistentes Vinculados
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  En Plan Personal puedes crear un asistente PERSONAL (exclusivo para ti) o trabajar sin asistente. En Plan Clínica el administrador asigna asistentes compartidos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewAssistantForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showNewAssistantForm ? 'Cancelar' : 'Crear Asistente Personal'}</span>
              </button>
            </div>

            {showNewAssistantForm && (
              <form
                onSubmit={handleCreatePersonalAssistant}
                className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3"
              >
                <p className="text-xs font-bold text-emerald-900">
                  Nuevo Asistente Personal (vinculado únicamente a tu consultorio)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Nombre *"
                    value={asistFirstName}
                    onChange={(e) => setAsistFirstName(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Apellido *"
                    value={asistLastName}
                    onChange={(e) => setAsistLastName(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Correo *"
                    value={asistEmail}
                    onChange={(e) => setAsistEmail(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Usuario (opcional)"
                    value={asistUsername}
                    onChange={(e) => setAsistUsername(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Teléfono / WhatsApp"
                    value={asistPhone}
                    onChange={(e) => setAsistPhone(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                  <input
                    id="assistant-password"
                    name="assistantPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder="Clave de acceso (mín. 8 caracteres) *"
                    value={asistPassword}
                    onChange={(e) => setAsistPassword(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={creatingAssistant}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{creatingAssistant ? 'Creando...' : 'Guardar Asistente Personal'}</span>
                  </button>
                </div>
              </form>
            )}

            {linkedAssistants.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">
                No tienes asistentes vinculados actualmente (atención directa sin sala de espera digital).
              </p>
            ) : (
              <div className="space-y-2.5">
                {linkedAssistants.map((assistant) => {
                  const isClinicShared = (assistant.assignedDoctorIds || []).length > 1;
                  return (
                    <div
                      key={assistant.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{assistant.assistantName}</p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isClinicShared
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isClinicShared ? 'Asistente Clínico (Multi-doctor)' : 'Asistente Personal'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {assistant.assistantEmail || assistant.assistantUsername}
                          {assistant.phone ? ` · ${assistant.phone}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => unlinkDoctorFromAssistant(assistant.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>Desvincular Asistente</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
