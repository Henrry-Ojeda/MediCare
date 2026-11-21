import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  Camera,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Pencil,
  Plus,
  Save,
  Search,
  Stethoscope,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';
import { DoctorProfile } from '../../types/medical';

export const AdminDoctorsView: React.FC = () => {
  const {
    doctors,
    assistants,
    clinics,
    addDoctorProfile,
    updateDoctorProfile,
    removeDoctorProfile,
    saveAssistantAssignment,
    saveClinic,
  } = useClinical();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedAssistantIds, setSelectedAssistantIds] = useState<string[]>([]);
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setFirstName('');
    setLastName('');
    setBirthDate('');
    setPhone('');
    setEmail('');
    setUsername('');
    setPassword('');
    setLicenseNumber('');
    setAvatarUrl('');
    setSelectedAssistantIds([]);
    setSelectedClinicIds([]);
  };

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

  const syncClinicsForDoctor = async (
    doctorId: string,
    doctorName: string,
    clinicIds: string[],
    assistantIds: string[]
  ) => {
    for (const clinic of clinics) {
      const currentAssignments = clinic.assignments || [];
      const hasDoctor = currentAssignments.some((a) => a.doctorId === doctorId);
      const shouldHaveDoctor = clinicIds.includes(clinic.id);
      if (!hasDoctor && !shouldHaveDoctor) continue;

      const withoutDoctor = currentAssignments.filter((a) => a.doctorId !== doctorId);
      let nextAssignments = withoutDoctor;

      if (shouldHaveDoctor) {
        const existingDoctorRows = currentAssignments.filter((a) => a.doctorId === doctorId);
        if (existingDoctorRows.length > 0) {
          nextAssignments = [...withoutDoctor, ...existingDoctorRows];
        } else if (assistantIds.length > 0) {
          const added = assistantIds.map((asstId) => {
            const asst = assistants.find((a) => a.id === asstId);
            return {
              id: `tmp-${doctorId}-${asstId}`,
              doctorId,
              doctorName,
              assistantId: asstId,
              assistantName: asst?.assistantName || null,
            };
          });
          nextAssignments = [...withoutDoctor, ...added];
        } else {
          nextAssignments = [
            ...withoutDoctor,
            {
              id: `tmp-${doctorId}-none`,
              doctorId,
              doctorName,
              assistantId: null,
              assistantName: null,
            },
          ];
        }
      }

      if (hasDoctor !== shouldHaveDoctor) {
        await saveClinic({
          id: clinic.id,
          name: clinic.name,
          rif: clinic.rif,
          phone: clinic.phone,
          email: clinic.email,
          address: clinic.address,
          active: clinic.active,
          assignments: nextAssignments,
        });
      }
    }
  };

  const syncAssistantsForDoctor = (doctorId: string, assistantIds: string[]) => {
    assistants.forEach((asst) => {
      const shouldBeAssigned = assistantIds.includes(asst.id);
      const isCurrentlyAssigned = asst.assignedDoctorIds.includes(doctorId);
      if (shouldBeAssigned !== isCurrentlyAssigned) {
        const nextDoctors = shouldBeAssigned
          ? [...asst.assignedDoctorIds, doctorId]
          : asst.assignedDoctorIds.filter((id) => id !== doctorId);
        saveAssistantAssignment({ ...asst, assignedDoctorIds: nextDoctors });
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return;
    if (!editingId && !password.trim()) return;

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const cleanUsername =
      username.trim() ||
      email.split('@')[0] ||
      `${firstName.trim().toLowerCase()}.${lastName.trim().toLowerCase()}`;

    if (editingId) {
      const updated: DoctorProfile & { password?: string } = {
        id: editingId,
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate || undefined,
        phone: phone.trim() || undefined,
        email: email.trim(),
        username: cleanUsername,
        avatarUrl: avatarUrl || undefined,
        specialty: 'Pediatría',
        licenseNumber: licenseNumber.trim() || 'MPPS Pendiente',
        password: password.trim() || undefined,
      };
      const ok = await updateDoctorProfile(updated);
      if (!ok) return;
      syncAssistantsForDoctor(editingId, selectedAssistantIds);
      await syncClinicsForDoctor(editingId, fullName, selectedClinicIds, selectedAssistantIds);
    } else {
      const created = await addDoctorProfile({
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate || undefined,
        phone: phone.trim() || undefined,
        email: email.trim(),
        username: cleanUsername,
        avatarUrl: avatarUrl || undefined,
        specialty: 'Pediatría',
        licenseNumber: licenseNumber.trim() || 'MPPS Pendiente',
        password: password.trim(),
      });
      if (!created) return;
      syncAssistantsForDoctor(created.id, selectedAssistantIds);
      await syncClinicsForDoctor(created.id, fullName, selectedClinicIds, selectedAssistantIds);
    }

    resetForm();
  };

  const startEdit = (doc: DoctorProfile) => {
    const parts = doc.name.trim().split(/\s+/);
    setEditingId(doc.id);
    setFirstName(doc.firstName || parts[0] || '');
    setLastName(doc.lastName || parts.slice(1).join(' ') || '');
    setBirthDate(doc.birthDate || '');
    setPhone(doc.phone || '');
    setEmail(doc.email || '');
    setUsername(doc.username || '');
    setPassword('');
    setLicenseNumber(doc.licenseNumber);
    setAvatarUrl(doc.avatarUrl || '');
    setSelectedAssistantIds(
      assistants.filter((a) => a.assignedDoctorIds.includes(doc.id)).map((a) => a.id)
    );
    setSelectedClinicIds(
      clinics
        .filter((c) => (c.assignments || []).some((a) => a.doctorId === doc.id))
        .map((c) => c.id)
    );
  };

  const toggleClinicSelection = (clinicId: string) => {
    setSelectedClinicIds((prev) =>
      prev.includes(clinicId) ? prev.filter((id) => id !== clinicId) : [...prev, clinicId]
    );
  };

  const toggleAssistantSelection = (assistantId: string) => {
    setSelectedAssistantIds((prev) =>
      prev.includes(assistantId) ? prev.filter((id) => id !== assistantId) : [...prev, assistantId]
    );
  };

  const filteredDoctors = doctors.filter((doc) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const assignedNames = assistants
      .filter((a) => a.assignedDoctorIds.includes(doc.id))
      .map((a) => a.assistantName.toLowerCase())
      .join(' ');
    return (
      doc.name.toLowerCase().includes(q) ||
      (doc.username || '').toLowerCase().includes(q) ||
      (doc.email || '').toLowerCase().includes(q) ||
      doc.licenseNumber.toLowerCase().includes(q) ||
      assignedNames.includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-[#0284C7]">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Gestión de Doctores (Pediatría)</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Crea, edita o elimina perfiles de médicos y asígnales uno o varios asistentes.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 self-start sm:self-auto">
          <Lock className="w-3.5 h-3.5 text-amber-600" /> Especialidad Pediatría fija
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-600">
            {editingId ? 'Editar Perfil de Doctor' : 'Nuevo Perfil de Doctor'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Cancelar edición
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nombre *</label>
            <input
              type="text"
              required
              placeholder="Ej. Valeria"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Apellido *</label>
            <input
              type="text"
              required
              placeholder="Ej. Méndez"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Fecha de Nacimiento
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Teléfono</label>
            <input
              type="tel"
              placeholder="+58 414-0000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Correo *</label>
            <input
              type="email"
              required
              placeholder="doctora@clinica.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Usuario</label>
            <input
              type="text"
              placeholder="valeria.mendez"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {editingId ? 'Nueva Clave (opcional)' : 'Asignar Clave *'}
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                required={!editingId}
                minLength={4}
                placeholder="Mínimo 4 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3.5 pr-9 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto del médico" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-slate-700">Foto de perfil (opcional)</p>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 cursor-pointer">
                <Camera className="w-3.5 h-3.5" />
                {avatarUrl ? 'Cambiar foto' : 'Subir foto'}
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold cursor-pointer"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-2">
          <p className="text-[11px] font-bold text-slate-600">
            Clínicas donde atiende (puede seleccionar varias clínicas registradas en el sistema):
          </p>
          {clinics.length === 0 ? (
            <p className="text-[11px] text-slate-400">
              No hay clínicas registradas en el sistema todavía. Créalas primero en la sección Clínicas.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {clinics.map((clinic) => {
                const active = selectedClinicIds.includes(clinic.id);
                return (
                  <button
                    key={clinic.id}
                    type="button"
                    onClick={() => toggleClinicSelection(clinic.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                      active
                        ? 'bg-sky-50 border-[#0284C7] text-[#0284C7]'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    {clinic.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {assistants.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="text-[11px] font-bold text-slate-600">
              Asistentes asignados a este médico (M:N):
            </p>
            <div className="flex flex-wrap gap-2">
              {assistants.map((asst) => {
                const active = selectedAssistantIds.includes(asst.id);
                return (
                  <button
                    key={asst.id}
                    type="button"
                    onClick={() => toggleAssistantSelection(asst.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                      active
                        ? 'bg-violet-50 border-violet-300 text-violet-800'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    {asst.assistantName}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold cursor-pointer"
          >
            {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editingId ? 'Guardar Cambios' : 'Crear Perfil de Doctor'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Buscar médico por nombre, usuario, correo, MPPS o asistente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#0284C7]"
          />
        </div>
        <span className="text-xs font-bold text-slate-500 shrink-0">
          {filteredDoctors.length} de {doctors.length} doctores
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDoctors.length === 0 ? (
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
            {doctors.length === 0
              ? 'No hay doctores registrados todavía.'
              : 'No se encontraron doctores con ese criterio de búsqueda.'}
          </div>
        ) : (
          filteredDoctors.map((doc) => {
            const docAssistants = assistants.filter((a) => a.assignedDoctorIds.includes(doc.id));
            const docClinics = clinics.filter((c) =>
              (c.assignments || []).some((a) => a.doctorId === doc.id)
            );
            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-[#0284C7] overflow-hidden shrink-0">
                    {doc.avatarUrl ? (
                      <img src={doc.avatarUrl} alt={doc.name} className="w-full h-full object-cover" />
                    ) : (
                      <Stethoscope className="w-5 h-5" />
                    )}
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-sm font-bold text-slate-900">{doc.name}</p>
                  <p className="text-xs text-slate-600">
                    {doc.specialty} • {doc.licenseNumber}
                  </p>
                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
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
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {docClinics.length === 0 ? (
                      <span className="text-[10px] text-slate-400">Sin clínicas asignadas</span>
                    ) : (
                      docClinics.map((c) => (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-semibold"
                        >
                          <Building2 className="w-2.5 h-2.5" />
                          {c.name}
                        </span>
                      ))
                    )}
                    {docAssistants.length === 0 ? (
                      <span className="text-[10px] text-slate-400">· Sin asistentes</span>
                    ) : (
                      docAssistants.map((a) => (
                        <span
                          key={a.id}
                          className="px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-[10px] font-semibold"
                        >
                          {a.assistantName}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(doc)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                    title="Editar doctor"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDoctorProfile(doc.id)}
                    className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Eliminar doctor"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
