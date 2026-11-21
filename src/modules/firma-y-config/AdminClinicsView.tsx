import React, { useMemo, useState } from 'react';
import {
  Building2,
  Check,
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
  Users,
  X,
} from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';
import { ClinicAssignmentRecord, ClinicProfile } from '../../types/medical';

type ClinicPlanMode = 'personal' | 'con_asistente' | 'clinica';

export const AdminClinicsView: React.FC = () => {
  const { clinics, doctors, assistants, saveClinic, removeClinic } = useClinical();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [planMode, setPlanMode] = useState<ClinicPlanMode>('clinica');
  const [name, setName] = useState('');
  const [rif, setRif] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Plan Personal / Con Asistente (1 médico)
  const [singleDoctorId, setSingleDoctorId] = useState('');
  const [singleAssistantId, setSingleAssistantId] = useState('');

  // Plan Clínica (N médicos + asistentes de clínica y/o personales)
  const [clinicDoctorIds, setClinicDoctorIds] = useState<string[]>([]);
  const [clinicSharedAssistantIds, setClinicSharedAssistantIds] = useState<string[]>([]);
  const [personalAssistantByDoctor, setPersonalAssistantByDoctor] = useState<Record<string, string>>({});

  const [searchQuery, setSearchQuery] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setPlanMode('clinica');
    setName('');
    setRif('');
    setPhone('');
    setEmail('');
    setAddress('');
    setSingleDoctorId('');
    setSingleAssistantId('');
    setClinicDoctorIds([]);
    setClinicSharedAssistantIds([]);
    setPersonalAssistantByDoctor({});
  };

  const toggleClinicDoctor = (doctorId: string) => {
    setClinicDoctorIds((prev) =>
      prev.includes(doctorId) ? prev.filter((id) => id !== doctorId) : [...prev, doctorId]
    );
  };

  const toggleClinicSharedAssistant = (assistantId: string) => {
    setClinicSharedAssistantIds((prev) =>
      prev.includes(assistantId) ? prev.filter((id) => id !== assistantId) : [...prev, assistantId]
    );
  };

  const builtAssignments = useMemo<ClinicAssignmentRecord[]>(() => {
    const list: ClinicAssignmentRecord[] = [];
    const addPair = (doctorId: string, assistantId: string | null) => {
      const doc = doctors.find((d) => d.id === doctorId);
      const asst = assistantId ? assistants.find((a) => a.id === assistantId) : undefined;
      if (!doc) return;
      const exists = list.some(
        (item) => item.doctorId === doctorId && (item.assistantId || null) === (assistantId || null)
      );
      if (exists) return;
      list.push({
        id: `tmp-${doctorId}-${assistantId || 'none'}`,
        doctorId,
        doctorName: doc.name,
        assistantId: assistantId || null,
        assistantName: asst?.assistantName || null,
      });
    };

    if (planMode === 'personal') {
      if (singleDoctorId) addPair(singleDoctorId, null);
      return list;
    }

    if (planMode === 'con_asistente') {
      if (singleDoctorId) addPair(singleDoctorId, singleAssistantId || null);
      return list;
    }

    // Plan Clínica: N doctores, con asistentes de la clínica y/o asistentes personales por doctor
    clinicDoctorIds.forEach((docId) => {
      const personalAsstId = personalAssistantByDoctor[docId] || '';
      const hasAnyAssistant = clinicSharedAssistantIds.length > 0 || Boolean(personalAsstId);
      if (!hasAnyAssistant) {
        addPair(docId, null);
      } else {
        clinicSharedAssistantIds.forEach((asstId) => addPair(docId, asstId));
        if (personalAsstId) addPair(docId, personalAsstId);
      }
    });

    return list;
  }, [
    planMode,
    singleDoctorId,
    singleAssistantId,
    clinicDoctorIds,
    clinicSharedAssistantIds,
    personalAssistantByDoctor,
    doctors,
    assistants,
  ]);

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
      assignments: builtAssignments,
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

    const raw = clinic.assignments || [];
    const uniqueDoctors = Array.from(new Set(raw.map((a) => a.doctorId)));
    const uniqueAssistants = Array.from(
      new Set(raw.map((a) => a.assistantId).filter((id): id is string => Boolean(id)))
    );

    if (uniqueDoctors.length <= 1 && uniqueAssistants.length === 0) {
      setPlanMode('personal');
      setSingleDoctorId(uniqueDoctors[0] || '');
      setSingleAssistantId('');
      setClinicDoctorIds(uniqueDoctors);
      setClinicSharedAssistantIds([]);
      setPersonalAssistantByDoctor({});
      return;
    }

    if (uniqueDoctors.length === 1 && uniqueAssistants.length === 1) {
      setPlanMode('con_asistente');
      setSingleDoctorId(uniqueDoctors[0]);
      setSingleAssistantId(uniqueAssistants[0]);
      setClinicDoctorIds(uniqueDoctors);
      setClinicSharedAssistantIds([]);
      setPersonalAssistantByDoctor({ [uniqueDoctors[0]]: uniqueAssistants[0] });
      return;
    }

    setPlanMode('clinica');
    setClinicDoctorIds(uniqueDoctors);

    // Un asistente que está asociado a todos los médicos de la clínica se trata como Asistente de Clínica
    const sharedIds = uniqueAssistants.filter((asstId) =>
      uniqueDoctors.every((docId) =>
        raw.some((a) => a.doctorId === docId && a.assistantId === asstId)
      )
    );
    const personalMap: Record<string, string> = {};
    raw.forEach((a) => {
      if (a.assistantId && !sharedIds.includes(a.assistantId) && !personalMap[a.doctorId]) {
        personalMap[a.doctorId] = a.assistantId;
      }
    });

    setClinicSharedAssistantIds(sharedIds);
    setPersonalAssistantByDoctor(personalMap);
    setSingleDoctorId(uniqueDoctors[0] || '');
    setSingleAssistantId('');
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

  const getClinicSummary = (clinic: ClinicProfile) => {
    const list = clinic.assignments || [];
    const docIds = Array.from(new Set(list.map((a) => a.doctorId)));
    const asstIds = Array.from(
      new Set(list.map((a) => a.assistantId).filter((id): id is string => Boolean(id)))
    );
    const sharedAssistantIds =
      docIds.length > 1
        ? asstIds.filter((asstId) =>
            docIds.every((docId) => list.some((a) => a.doctorId === docId && a.assistantId === asstId))
          )
        : [];
    const planLabel =
      docIds.length > 1
        ? `Plan Clínica · ${docIds.length} médicos`
        : asstIds.length > 0
        ? 'Plan Con Asistente'
        : 'Plan Personal (Solo Doctor)';

    return { docIds, asstIds, sharedAssistantIds, planLabel };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-[#0284C7]">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Clínicas, Médicos y Asistentes</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configura cada clínica según el plan: Solo Doctor, Médico con Asistente Personal, o Clínica con N médicos y asistentes compartidos/personales. Un médico puede atender en varias clínicas del sistema.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5"
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

        {/* Paso 1: Plan / Modalidad */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
            1. Modalidad / Plan de la Clínica
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                id: 'personal' as const,
                title: 'Plan Personal',
                desc: '1 Médico solo (sin asistente)',
                icon: Stethoscope,
              },
              {
                id: 'con_asistente' as const,
                title: 'Plan Con Asistente',
                desc: '1 Médico + su Asistente Personal',
                icon: UserCheck,
              },
              {
                id: 'clinica' as const,
                title: 'Plan Clínica',
                desc: 'N Médicos + Asistente de Clínica y/o Personal',
                icon: Users,
              },
            ].map((opt) => {
              const Icon = opt.icon;
              const active = planMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPlanMode(opt.id)}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                    active
                      ? 'bg-sky-50 border-[#0284C7] ring-1 ring-[#0284C7]'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      active ? 'bg-[#0284C7] text-white' : 'bg-white text-slate-500 border border-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{opt.title}</div>
                    <div className="text-[11px] text-slate-500 leading-snug">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Paso 2: Datos de la clínica */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Nombre de la Clínica *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Clínica Santa María"
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

        {/* Paso 3: Estructura Doctor - Asistente - Clínica */}
        <div className="pt-3 border-t border-slate-100 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              2. Estructura Médicos y Asistentes en esta Clínica
            </p>
            <span className="text-[11px] text-slate-500">
              {builtAssignments.length} asignación(es) listas para guardar
            </span>
          </div>

          {planMode === 'personal' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Médico (Solo Doctor)
                </label>
                <select
                  value={singleDoctorId}
                  onChange={(e) => setSingleDoctorId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="">Seleccionar Médico...</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <p className="text-[11px] text-slate-500 pb-2">
                  En Plan Personal el médico atiende sin asistente y sin sala de espera digital.
                </p>
              </div>
            </div>
          )}

          {planMode === 'con_asistente' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Médico
                </label>
                <select
                  value={singleDoctorId}
                  onChange={(e) => setSingleDoctorId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="">Seleccionar Médico...</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Asistente Personal del Doctor
                </label>
                <select
                  value={singleAssistantId}
                  onChange={(e) => setSingleAssistantId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="">Seleccionar Asistente Personal...</option>
                  {assistants.map((asst) => (
                    <option key={asst.id} value={asst.id}>
                      {asst.assistantName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {planMode === 'clinica' && (
            <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
              {/* N Doctores */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  Médicos de la Clínica (puedes agregar N doctores; un médico puede estar en varias clínicas del sistema):
                </label>
                {doctors.length === 0 ? (
                  <p className="text-xs text-slate-400">No hay médicos registrados aún.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {doctors.map((doc) => {
                      const selected = clinicDoctorIds.includes(doc.id);
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => toggleClinicDoctor(doc.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                            selected
                              ? 'bg-[#0284C7] border-[#0284C7] text-white shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {selected ? <Check className="w-3.5 h-3.5" /> : <Stethoscope className="w-3.5 h-3.5" />}
                          <span>{doc.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Asistentes de la Clínica (compartidos) */}
              <div className="space-y-2 pt-2 border-t border-slate-200/70">
                <label className="block text-[11px] font-bold text-slate-700">
                  Asistente(s) de la Clínica (compartidos para todos los médicos de esta clínica):
                </label>
                {assistants.length === 0 ? (
                  <p className="text-xs text-slate-400">No hay asistentes registrados aún.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {assistants.map((asst) => {
                      const selected = clinicSharedAssistantIds.includes(asst.id);
                      return (
                        <button
                          key={asst.id}
                          type="button"
                          onClick={() => toggleClinicSharedAssistant(asst.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                            selected
                              ? 'bg-violet-600 border-violet-600 text-white shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {selected ? <Check className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          <span>{asst.assistantName} (Clínica)</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Asistente Personal opcional por cada Doctor */}
              {clinicDoctorIds.length > 0 && assistants.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200/70">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Asistente Personal adicional por Médico (opcional):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {clinicDoctorIds.map((docId) => {
                      const doc = doctors.find((d) => d.id === docId);
                      if (!doc) return null;
                      return (
                        <div
                          key={docId}
                          className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200"
                        >
                          <span className="text-xs font-bold text-slate-800 truncate">{doc.name}</span>
                          <select
                            value={personalAssistantByDoctor[docId] || ''}
                            onChange={(e) =>
                              setPersonalAssistantByDoctor((prev) => ({
                                ...prev,
                                [docId]: e.target.value,
                              }))
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700 max-w-[190px]"
                          >
                            <option value="">Sin asistente personal</option>
                            {assistants.map((asst) => (
                              <option key={asst.id} value={asst.id}>
                                {asst.assistantName} (Personal)
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
          filteredClinics.map((clinic) => {
            const summary = getClinicSummary(clinic);
            return (
              <div
                key={clinic.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-start justify-between gap-3"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{clinic.name}</p>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700">
                      {summary.planLabel}
                    </span>
                  </div>
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

                  {summary.sharedAssistantIds.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {summary.sharedAssistantIds.map((asstId) => {
                        const asst = assistants.find((a) => a.id === asstId);
                        return (
                          <span
                            key={asstId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-violet-800 text-[10px] font-bold"
                          >
                            <UserCheck className="w-3 h-3" />
                            Asistente Clínica: {asst?.assistantName || 'Asistente'}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-0.5">
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
                          {a.assistantName
                            ? ` ↔ ${a.assistantName}${
                                a.assistantId && summary.sharedAssistantIds.includes(a.assistantId)
                                  ? ' (Clínica)'
                                  : ' (Personal)'
                              }`
                            : ' (Solo)'}
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
            );
          })
        )}
      </div>
    </div>
  );
};
