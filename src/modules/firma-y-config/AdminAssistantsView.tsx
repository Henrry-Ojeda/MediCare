import React, { useState } from 'react';
import {
  Calendar,
  Eye,
  EyeOff,
  Mail,
  Pencil,
  Plus,
  Save,
  Search,
  Shield,
  Stethoscope,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';
import { useNotifications } from '../../context/NotificationContext';
import { AssistantAssignment, AssistantPermissions } from '../../types/medical';

export const AdminAssistantsView: React.FC = () => {
  const {
    doctors,
    assistants,
    saveAssistantAssignment,
    toggleAssistantPermission,
    removeAssistantAssignment,
  } = useClinical();
  const { showToast } = useNotifications();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [assignedDoctorIds, setAssignedDoctorIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [doctorFilterId, setDoctorFilterId] = useState('ALL');

  const resetForm = () => {
    setEditingId(null);
    setFirstName('');
    setLastName('');
    setBirthDate('');
    setPhone('');
    setEmail('');
    setUsername('');
    setPassword('');
    setAssignedDoctorIds([]);
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

    const existing = editingId ? assistants.find((a) => a.id === editingId) : undefined;

    const saved = await saveAssistantAssignment({
      id: editingId || undefined,
      assistantName: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: birthDate || undefined,
      phone: phone.trim() || undefined,
      password: password.trim() || undefined,
      assistantUsername: cleanUsername,
      assistantEmail: email.trim(),
      mode: assignedDoctorIds.length > 1 ? 'COMPARTIDA_CLINICA' : 'PERSONAL',
      assignedDoctorIds,
      permissions: existing?.permissions || {
        canSchedule: true,
        canRegisterPatientInfo: true,
        canCollectPayments: false,
        canRescheduleOrCancel: true,
      },
      allowedViews: existing?.allowedViews || [
        'dashboard',
        'agenda',
        'sala-espera',
        'pacientes',
        'paciente-nuevo',
        'paciente-detalle',
        'vacunas-carnet',
        'perfil',
      ],
      active: existing?.active ?? true,
    });
    if (!saved) return;

    resetForm();
  };

  const startEdit = (asst: AssistantAssignment) => {
    const parts = asst.assistantName.trim().split(/\s+/);
    setEditingId(asst.id);
    setFirstName(asst.firstName || parts[0] || '');
    setLastName(asst.lastName || parts.slice(1).join(' ') || '');
    setBirthDate(asst.birthDate || '');
    setPhone(asst.phone || '');
    setEmail(asst.assistantEmail);
    setUsername(asst.assistantUsername);
    setPassword('');
    setAssignedDoctorIds(asst.assignedDoctorIds);
  };

  const toggleDoctorInForm = (docId: string) => {
    setAssignedDoctorIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const toggleDoctorDirect = (asst: AssistantAssignment, docId: string) => {
    const exists = asst.assignedDoctorIds.includes(docId);
    const nextDoctors = exists
      ? asst.assignedDoctorIds.filter((id) => id !== docId)
      : [...asst.assignedDoctorIds, docId];
    saveAssistantAssignment({
      ...asst,
      assignedDoctorIds: nextDoctors,
      mode: nextDoctors.length > 1 ? 'COMPARTIDA_CLINICA' : 'PERSONAL',
    });
  };

  const permissionLabels: { key: keyof AssistantPermissions; label: string }[] = [
    { key: 'canSchedule', label: 'Agendar Citas' },
    { key: 'canRegisterPatientInfo', label: 'Registrar Pacientes' },
    { key: 'canRescheduleOrCancel', label: 'Reprogramar / Cancelar' },
  ];

  const filteredAssistants = assistants.filter((asst) => {
    if (doctorFilterId !== 'ALL' && !asst.assignedDoctorIds.includes(doctorFilterId)) {
      return false;
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const assignedDocNames = doctors
      .filter((d) => asst.assignedDoctorIds.includes(d.id))
      .map((d) => d.name.toLowerCase())
      .join(' ');
    return (
      asst.assistantName.toLowerCase().includes(q) ||
      asst.assistantUsername.toLowerCase().includes(q) ||
      asst.assistantEmail.toLowerCase().includes(q) ||
      assignedDocNames.includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600">
          <UserCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Gestión de Asistentes y Asignación Médico-Asistente (M:N)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Un asistente puede atender varios médicos y un médico puede tener varios asistentes asignados.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-600">
            {editingId ? 'Editar Perfil de Asistente' : 'Nuevo Perfil de Asistente'}
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
              placeholder="Ej. Laura"
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
              placeholder="Ej. Pérez"
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
              placeholder="+58 412-0000000"
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
              placeholder="asistente@clinica.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Usuario</label>
            <input
              type="text"
              placeholder="laura.asistente"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div className="sm:col-span-2">
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
        </div>

        {doctors.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="text-[11px] font-bold text-slate-600">
              Asignar Médicos a este Asistente (selección múltiple):
            </p>
            <div className="flex flex-wrap gap-2">
              {doctors.map((doc) => {
                const active = assignedDoctorIds.includes(doc.id);
                const filteredAssistants = assistants.filter((asst) => {
    if (doctorFilterId !== 'ALL' && !asst.assignedDoctorIds.includes(doctorFilterId)) {
      return false;
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const assignedDocNames = doctors
      .filter((d) => asst.assignedDoctorIds.includes(d.id))
      .map((d) => d.name.toLowerCase())
      .join(' ');
    return (
      asst.assistantName.toLowerCase().includes(q) ||
      asst.assistantUsername.toLowerCase().includes(q) ||
      asst.assistantEmail.toLowerCase().includes(q) ||
      assignedDocNames.includes(q)
    );
  });

  return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => toggleDoctorInForm(doc.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                      active
                        ? 'bg-sky-50 border-sky-300 text-sky-800'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    {doc.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer"
          >
            {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editingId ? 'Guardar Cambios' : 'Crear Perfil de Asistente'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Buscar asistente por nombre, usuario, correo o médico asignado..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-violet-500"
          />
        </div>
        {doctors.length > 0 && (
          <select
            value={doctorFilterId}
            onChange={(e) => setDoctorFilterId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Todos los médicos</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                Médico: {d.name}
              </option>
            ))}
          </select>
        )}
        <span className="text-xs font-bold text-slate-500 shrink-0">
          {filteredAssistants.length} de {assistants.length} asistentes
        </span>
      </div>

      <div className="space-y-4">
        {filteredAssistants.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
            {assistants.length === 0
              ? 'No hay asistentes registrados todavía.'
              : 'No se encontraron asistentes con ese criterio de búsqueda.'}
          </div>
        ) : (
          filteredAssistants.map((asst) => (
            <div key={asst.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{asst.assistantName}</p>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                    <span>@{asst.assistantUsername}</span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {asst.assistantEmail}
                    </span>
                    {asst.birthDate && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {asst.birthDate}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => startEdit(asst)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                    title="Editar asistente"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAssistantAssignment(asst.id)}
                    className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Eliminar asistente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-500">Médicos asignados (clic para asignar/quitar):</p>
                {doctors.length === 0 ? (
                  <p className="text-[11px] text-slate-400">Cree primero perfiles de Doctores para asignarlos aquí.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {doctors.map((doc) => {
                      const assigned = asst.assignedDoctorIds.includes(doc.id);
                      const filteredAssistants = assistants.filter((asst) => {
    if (doctorFilterId !== 'ALL' && !asst.assignedDoctorIds.includes(doctorFilterId)) {
      return false;
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const assignedDocNames = doctors
      .filter((d) => asst.assignedDoctorIds.includes(d.id))
      .map((d) => d.name.toLowerCase())
      .join(' ');
    return (
      asst.assistantName.toLowerCase().includes(q) ||
      asst.assistantUsername.toLowerCase().includes(q) ||
      asst.assistantEmail.toLowerCase().includes(q) ||
      assignedDocNames.includes(q)
    );
  });

  return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => toggleDoctorDirect(asst, doc.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                            assigned
                              ? 'bg-sky-50 border-sky-200 text-sky-800'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}
                        >
                          <Stethoscope className="w-3 h-3" /> {doc.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                {permissionLabels.map((perm) => {
                  const enabled = asst.permissions[perm.key];
                  const filteredAssistants = assistants.filter((asst) => {
    if (doctorFilterId !== 'ALL' && !asst.assignedDoctorIds.includes(doctorFilterId)) {
      return false;
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const assignedDocNames = doctors
      .filter((d) => asst.assignedDoctorIds.includes(d.id))
      .map((d) => d.name.toLowerCase())
      .join(' ');
    return (
      asst.assistantName.toLowerCase().includes(q) ||
      asst.assistantUsername.toLowerCase().includes(q) ||
      asst.assistantEmail.toLowerCase().includes(q) ||
      assignedDocNames.includes(q)
    );
  });

  return (
                    <button
                      key={perm.key}
                      type="button"
                      onClick={() => toggleAssistantPermission(asst.id, perm.key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                        enabled
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <Shield className="w-3 h-3" /> {perm.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
