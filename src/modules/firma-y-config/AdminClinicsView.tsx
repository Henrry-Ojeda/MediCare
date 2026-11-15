import React, { useState } from 'react';
import {
  Building2,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  Search,
  Stethoscope,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';
import { ClinicAssignmentRecord, ClinicProfile } from '../../types/medical';

export const AdminClinicsView: React.FC = () => {
  const { clinics, doctors, assistants, saveClinic, removeClinic } = useClinical();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [rif, setRif] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [assignments, setAssignments] = useState<ClinicAssignmentRecord[]>([]);

  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedAssistantId, setSelectedAssistantId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setRif('');
    setPhone('');
    setEmail('');
    setAddress('');
    setAssignments([]);
    setSelectedDoctorId('');
    setSelectedAssistantId('');
  };

  const handleAddAssociation = () => {
    if (!selectedDoctorId) return;
    const doc = doctors.find((d) => d.id === selectedDoctorId);
    const asst = selectedAssistantId
      ? assistants.find((a) => a.id === selectedAssistantId)
      : undefined;

    const alreadyExists = assignments.some(
      (a) =>
        a.doctorId === selectedDoctorId &&
        (a.assistantId || '') === (selectedAssistantId || '')
    );
    if (alreadyExists) return;

    setAssignments((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        doctorId: selectedDoctorId,
        doctorName: doc?.name || 'Médico',
        assistantId: selectedAssistantId || null,
        assistantName: asst?.assistantName || null,
      },
    ]);
    setSelectedAssistantId('');
  };

  const handleRemoveAssociation = (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const saved = await saveClinic({
      id: editingId || undefined,
      name: name.trim(),
      rif: rif.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      active: true,
      assignments,
    });
    if (!saved) return;

    resetForm();
  };

  const startEdit = (clinic: ClinicProfile) => {
    setEditingId(clinic.id);
    setName(clinic.name);
    setRif(clinic.rif || '');
    setPhone(clinic.phone || '');
    setEmail(clinic.email || '');
    setAddress(clinic.address || '');
    setAssignments(clinic.assignments || []);
  };

  const filteredClinics = clinics.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const assocText = (c.assignments || [])
      .map((a) => `${a.doctorName || ''} ${a.assistantName || ''}`.toLowerCase())
      .join(' ');
    return (
      c.name.toLowerCase().includes(q) ||
      (c.rif || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      assocText.includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-[#0284C7]">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Gestión de Clínicas</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Crea, edita o elimina clínicas y asocia cada Clínica con su Médico y Asistente.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-[11px] font-bold text-[#0284C7] self-start sm:self-auto">
          <Link2 className="w-3.5 h-3.5" /> Clínica – Médico – Asistente
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-600">
            {editingId ? 'Editar Clínica' : 'Nueva Clínica'}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Nombre de la Clínica *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Clínica Pediátrica Norte"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">RIF</label>
            <input
              type="text"
              placeholder="Ej. J-40123456-0"
              value={rif}
              onChange={(e) => setRif(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Teléfono</label>
            <input
              type="tel"
              placeholder="+58 212-0000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Correo</label>
            <input
              type="email"
              placeholder="contacto@clinica.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Dirección</label>
            <input
              type="text"
              placeholder="Av. Principal, Torre Médica, Piso 3"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 space-y-3">
          <p className="text-[11px] font-bold text-slate-700">
            Asociar Clínica – Médico – Asistente:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
            >
              <option value="">Seleccionar Médico...</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>

            <select
              value={selectedAssistantId}
              onChange={(e) => setSelectedAssistantId(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
            >
              <option value="">Sin asistente (Solo médico)</option>
              {assistants.map((asst) => (
                <option key={asst.id} value={asst.id}>
                  {asst.assistantName}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={!selectedDoctorId}
              onClick={handleAddAssociation}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 disabled:opacity-40 border border-violet-200 text-violet-800 text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Asociar Médico–Asistente
            </button>
          </div>

          {assignments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {assignments.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-[#0284C7]" />
                  <span>{item.doctorName}</span>
                  {item.assistantName && (
                    <>
                      <span className="text-slate-400">↔</span>
                      <UserCheck className="w-3.5 h-3.5 text-violet-600" />
                      <span className="text-violet-800">{item.assistantName}</span>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveAssociation(item.id)}
                    className="ml-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Quitar asociación"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold cursor-pointer"
          >
            {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editingId ? 'Guardar Cambios' : 'Crear Clínica'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Buscar clínica por nombre, RIF, médico o asistente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#0284C7]"
          />
        </div>
        <span className="text-xs font-bold text-slate-500 shrink-0">
          {filteredClinics.length} de {clinics.length} clínicas
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredClinics.length === 0 ? (
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
            {clinics.length === 0
              ? 'No hay clínicas registradas todavía.'
              : 'No se encontraron clínicas con ese criterio de búsqueda.'}
          </div>
        ) : (
          filteredClinics.map((clinic) => (
            <div
              key={clinic.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-start justify-between gap-3"
            >
              <div className="space-y-1.5 min-w-0">
                <p className="text-sm font-bold text-slate-900">{clinic.name}</p>
                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {clinic.rif && <span>RIF: {clinic.rif}</span>}
                  {clinic.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {clinic.phone}
                    </span>
                  )}
                  {clinic.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {clinic.email}
                    </span>
                  )}
                  {clinic.address && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {clinic.address}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {!clinic.assignments || clinic.assignments.length === 0 ? (
                    <span className="text-[10px] text-slate-400">
                      Sin médicos/asistentes asociados
                    </span>
                  ) : (
                    clinic.assignments.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-[10px] font-semibold"
                      >
                        {a.doctorName || 'Médico'}
                        {a.assistantName ? ` ↔ ${a.assistantName}` : ''}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(clinic)}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                  title="Editar clínica"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeClinic(clinic.id)}
                  className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                  title="Eliminar clínica"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
