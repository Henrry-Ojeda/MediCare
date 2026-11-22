import React, { useState } from 'react';
import { Building2, Calendar, Clock, Plus, Save, Shield, Trash2, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useClinical } from '../../context/ClinicalContext';
import { useNotifications } from '../../context/NotificationContext';
import { ASSISTANT_GRANTABLE_VIEWS, AssistantAssignment, AssistantPermissions } from '../../types/medical';
import {
  CalendarSlotInterval,
  loadAgendaPrefs,
  saveAgendaPrefs,
  WORKING_DAY_OPTIONS,
} from '../../utils/agendaPrefs';

export const ClinicSettingsView: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    tenantConfig,
    updateTenantConfig,
    assistants,
    doctors,
    saveAssistantAssignment,
    toggleAssistantPermission,
    removeAssistantAssignment,
  } = useClinical();
  const { showToast } = useNotifications();

  const initialAgenda = loadAgendaPrefs(currentUser?.id);
  const [slotInterval, setSlotInterval] = useState<CalendarSlotInterval>(initialAgenda.slotInterval);
  const [workingDays, setWorkingDays] = useState<number[]>(initialAgenda.workingDays);
  const [form, setForm] = useState(tenantConfig);
  const [newAssistantName, setNewAssistantName] = useState('');
  const [newAssistantEmail, setNewAssistantEmail] = useState('');

  const handleUpdateAgenda = (nextInterval: CalendarSlotInterval, nextDays: number[]) => {
    setSlotInterval(nextInterval);
    setWorkingDays(nextDays);
    saveAgendaPrefs(currentUser?.id, { slotInterval: nextInterval, workingDays: nextDays });
    showToast('Configuración de agenda guardada.');
  };

  const toggleWorkingDay = (day: number) => {
    const exists = workingDays.includes(day);
    if (exists && workingDays.length === 1) return;
    const nextDays = exists ? workingDays.filter((d) => d !== day) : [...workingDays, day];
    handleUpdateAgenda(slotInterval, nextDays);
  };

  const handleSaveTenant = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantConfig(form);
    showToast('Configuración de la clínica actualizada.');
  };

  const handleAddAssistant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssistantName.trim() || !newAssistantEmail.trim()) return;
    const username = newAssistantEmail.split('@')[0] || newAssistantName.toLowerCase().replace(/\s+/g, '.');
    const newItem: AssistantAssignment = {
      id: `asst-${Date.now()}`,
      assistantName: newAssistantName.trim(),
      assistantUsername: username,
      assistantEmail: newAssistantEmail.trim(),
      mode: 'PERSONAL',
      assignedDoctorIds: doctors.map((d) => d.id),
      permissions: {
        canSchedule: true,
        canRegisterPatientInfo: true,
        canCollectPayments: false,
        canRescheduleOrCancel: true,
      },
      allowedViews: ['agenda', 'sala-espera', 'pacientes', 'paciente-nuevo', 'paciente-detalle', 'vacunas-carnet'],
      active: true,
    };
    saveAssistantAssignment(newItem);
    setNewAssistantName('');
    setNewAssistantEmail('');
    showToast(`Asistente ${newItem.assistantName} agregado al equipo.`);
  };

  const toggleViewForAssistant = (assistant: AssistantAssignment, viewId: (typeof ASSISTANT_GRANTABLE_VIEWS)[number]['id']) => {
    const exists = assistant.allowedViews.includes(viewId);
    const updatedViews = exists
      ? assistant.allowedViews.filter((v) => v !== viewId)
      : [...assistant.allowedViews, viewId];
    saveAssistantAssignment({ ...assistant, allowedViews: updatedViews });
  };

  const permissionLabels: { key: keyof AssistantPermissions; label: string }[] = [
    { key: 'canSchedule', label: 'Agendar Citas' },
    { key: 'canRegisterPatientInfo', label: 'Registrar Pacientes' },
    { key: 'canRescheduleOrCancel', label: 'Reprogramar / Cancelar' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Configuración de Agenda y Clínica</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bloques de citas, días laborables, datos del consultorio pediátrico y equipo.
          </p>
        </div>
      </div>

      {/* Configuración de Agenda */}
      <div className="bg-white rounded-2xl border border-sky-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-[#0284C7]">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Configuración de Agenda</h2>
            <p className="text-[11px] text-slate-500">
              Define la duración por bloque de consulta y los días que atiende el doctor.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="space-y-1.5">
            <span className="block text-[11px] font-bold text-slate-500 uppercase">
              Duración por bloque
            </span>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1">
              {([15, 30, 45, 60] as CalendarSlotInterval[]).map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleUpdateAgenda(mins, workingDays)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    slotInterval === mins
                      ? 'bg-[#0284C7] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mins === 60 ? '1 hora' : `${mins} min`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-[11px] font-bold text-slate-500 uppercase">
              Días que trabaja el doctor
            </span>
            <div className="flex flex-wrap gap-1.5">
              {WORKING_DAY_OPTIONS.map((opt) => {
                const active = workingDays.includes(opt.day);
                return (
                  <button
                    key={opt.day}
                    type="button"
                    onClick={() => toggleWorkingDay(opt.day)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                      active
                        ? 'bg-sky-50 border-sky-300 text-sky-900'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveTenant} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre del Consultorio / Clínica</label>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">RIF / Registro Fiscal</label>
            <input
              type="text"
              value={form.rif}
              onChange={(e) => setForm({ ...form, rif: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono / WhatsApp</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Correo de Contacto</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Dirección Física</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Horario Lunes a Viernes
            </label>
            <input
              type="text"
              value={form.scheduleWeekdays}
              onChange={(e) => setForm({ ...form, scheduleWeekdays: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Horario Sábados
            </label>
            <input
              type="text"
              value={form.scheduleSaturdays}
              onChange={(e) => setForm({ ...form, scheduleSaturdays: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold"
        >
          <Save className="w-4 h-4" /> Guardar Datos del Consultorio
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600" /> Gestión de Asistentes
            </h2>
            <p className="text-xs text-slate-500">Define qué acciones y vistas puede operar cada asistente.</p>
          </div>
        </div>

        <form onSubmit={handleAddAssistant} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <input
            type="text"
            placeholder="Nombre del asistente"
            value={newAssistantName}
            onChange={(e) => setNewAssistantName(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
          />
          <input
            type="email"
            placeholder="correo@clinica.com"
            value={newAssistantEmail}
            onChange={(e) => setNewAssistantEmail(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Agregar Asistente
          </button>
        </form>

        <div className="space-y-4">
          {assistants.map((asst) => (
            <div key={asst.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{asst.assistantName}</p>
                  <p className="text-xs text-slate-500">
                    @{asst.assistantUsername} • {asst.assistantEmail}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAssistantAssignment(asst.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {permissionLabels.map((perm) => {
                  const enabled = asst.permissions[perm.key];
                  return (
                    <button
                      key={perm.key}
                      type="button"
                      onClick={() => toggleAssistantPermission(asst.id, perm.key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
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

              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-500 mb-2">Vistas habilitadas:</p>
                <div className="flex flex-wrap gap-1.5">
                  {ASSISTANT_GRANTABLE_VIEWS.filter((v) => v.id !== 'caja' && v.id !== 'caja-recibos').map((view) => {
                    const active = asst.allowedViews.includes(view.id);
                    return (
                      <button
                        key={view.id}
                        type="button"
                        onClick={() => toggleViewForAssistant(asst, view.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                          active
                            ? 'bg-sky-50 border-sky-200 text-sky-700'
                            : 'bg-white border-slate-200 text-slate-400'
                        }`}
                      >
                        {view.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
