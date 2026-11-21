import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Activity,
  Users,
  Syringe,
  Stethoscope,
  Clock,
  ArrowRight,
  Building2,
  DollarSign,
  History,
  Lock,
  Save,
  ShieldCheck,
  UserPlus,
  FileText,
} from 'lucide-react';
import { KpiCard, Card, StatusBadge } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useClinical } from '../../context/ClinicalContext';
import { getTodayIsoDate } from '../../utils/formatters';

export const DashboardView: React.FC = () => {
  const { currentUser, userRole } = useAuth();
  const {
    appointments,
    patients,
    doctors,
    assistants,
    tenantConfig,
    bcvHistory,
    currentDoctorHasAssistant,
    updateBcvRate,
    setCurrentView,
    openTriageModal,
    navigateToActiveConsultation,
    navigateToPatient360,
  } = useClinical();
  const [bcvInput, setBcvInput] = useState(String(tenantConfig.bcvRate));

  useEffect(() => {
    setBcvInput(String(tenantConfig.bcvRate));
  }, [tenantConfig.bcvRate]);

  const handleSaveBcv = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(bcvInput);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    updateBcvRate(parsed);
  };

  const bcvPanel = (
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Tasa BCV e Historial</h3>
            <p className="text-[11px] text-slate-500">
              Actualiza la tasa oficial BCV (Bs. / USD) y consulta el historial de cambios.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveBcv} className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={bcvInput}
            onChange={(e) => setBcvInput(e.target.value)}
            className="w-28 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> Actualizar BCV
          </button>
        </form>
      </div>

      <div className="border-t border-slate-100 pt-3">
        <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 mb-2">
          <History className="w-3.5 h-3.5 text-slate-400" /> Historial de Modificaciones BCV
        </p>
        {bcvHistory.length === 0 ? (
          <p className="text-xs text-slate-400">No hay modificaciones registradas todavía.</p>
        ) : (
          <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
            {bcvHistory.map((item) => (
              <div
                key={item.id}
                className="py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-700">
                    Bs. {Number(item.tasa).toFixed(2)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                    {item.origen}
                  </span>
                  {item.updatedByName && (
                    <span className="text-slate-600">
                      por <strong>{item.updatedByName}</strong>
                      {item.updatedByRole ? ` (${item.updatedByRole})` : ''}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">
                  {new Date(item.recordedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );

  if (userRole === 'ADMIN') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Hola, {currentUser?.name || 'Administrador'}
            </h2>
            <p className="text-xs text-slate-500">
              Panel Administrativo · Gestión de Doctores, Asistentes, Permisos y Configuración
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCurrentView('admin-doctores')}
              className="px-3.5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Stethoscope className="w-4 h-4" />
              <span>Doctores</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('admin-asistentes')}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-4 h-4 text-violet-600" />
              <span>Asistentes</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('admin-clinicas')}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Clínicas</span>
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-xs text-amber-900">
          <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Alcance del Perfil Administrador</p>
            <p className="text-amber-800 mt-0.5">
              El Administrador gestiona perfiles de Doctores, Asistentes y sus permisos, pero no puede crear pacientes ni acceder o modificar el módulo clínico de Pediatría.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            title="Doctores Activos"
            value={doctors.length}
            subtitle="Pediatría"
            icon={<Stethoscope className="w-4 h-4" />}
            accentClass="bg-sky-50 text-[#0284C7]"
          />
          <KpiCard
            title="Asistentes Activos"
            value={assistants.length}
            subtitle="Asignación M:N"
            icon={<Users className="w-4 h-4" />}
            accentClass="bg-violet-50 text-violet-600"
          />
          <KpiCard
            title="Tasa BCV"
            value={`Bs. ${tenantConfig.bcvRate.toFixed(2)}`}
            subtitle="Referencia clínica"
            icon={<Activity className="w-4 h-4" />}
            accentClass="bg-emerald-50 text-emerald-600"
          />
          <KpiCard
            title="Módulo Pediatría"
            value="Bloqueado"
            subtitle="Solo lectura clínica médica"
            icon={<ShieldCheck className="w-4 h-4" />}
            accentClass="bg-amber-50 text-amber-700"
          />
        </div>

        {bcvPanel}
      </div>
    );
  }

  const doctorAppointments =
    userRole === 'PEDIATRA'
      ? appointments.filter(
          (a) =>
            Boolean(a.doctorId) &&
            (a.doctorId === currentUser?.id ||
              (a.doctorName &&
                currentUser?.name &&
                a.doctorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()))
        )
      : appointments;

  const todayIso = getTodayIsoDate();
  const todayDoctorAppointments = doctorAppointments.filter((a) => a.date === todayIso);

  const waitingPatients = todayDoctorAppointments.filter(
    (a) => a.stage === 'en_sala' || a.stage === 'en_triaje' || a.stage === 'en_consulta'
  );
  const completedToday = todayDoctorAppointments.filter((a) => a.stage === 'completado').length;
  const pendingVaccinesCount = patients.reduce(
    (acc, p) => acc + p.vaccines.filter((v) => v.status === 'pendiente').length,
    0
  );
  const isSoloDoctor = userRole === 'PEDIATRA' && !currentDoctorHasAssistant;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Hola, {currentUser?.name || 'Equipo Médico'}
          </h2>
          <p className="text-xs text-slate-500">
            Resumen operativo de Pediatría · {todayDoctorAppointments.length} citas programadas para hoy
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setCurrentView('paciente-nuevo')}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#0284C7]" />
            <span>Nuevo Paciente</span>
          </button>
          {userRole === 'PEDIATRA' && !currentDoctorHasAssistant ? (
            <button
              type="button"
              onClick={() => setCurrentView('pacientes')}
              className="px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Stethoscope className="w-4 h-4" />
              <span>Buscar Paciente</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentView('sala-espera')}
              className="px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              <span>Abrir Sala de Espera</span>
            </button>
          )}
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          title="Citas de Hoy"
          value={todayDoctorAppointments.length}
          subtitle={`${completedToday} atendidas`}
          icon={<Calendar className="w-4 h-4" />}
          accentClass="bg-sky-50 text-[#0284C7]"
        />
        {isSoloDoctor ? (
          <KpiCard
            title="Consultas Atendidas"
            value={completedToday}
            subtitle="Completadas hoy"
            icon={<Stethoscope className="w-4 h-4" />}
            accentClass="bg-violet-50 text-[#7C3AED]"
          />
        ) : (
          <KpiCard
            title="En Sala / Triaje"
            value={waitingPatients.length}
            subtitle="Pacientes activos"
            icon={<Activity className="w-4 h-4" />}
            accentClass="bg-amber-50 text-amber-600"
          />
        )}
        <KpiCard
          title="Pacientes Registrados"
          value={patients.length}
          subtitle="Historias pediátricas"
          icon={<Users className="w-4 h-4" />}
          accentClass="bg-slate-100 text-slate-900"
        />
        <KpiCard
          title="Vacunas Pendientes"
          value={pendingVaccinesCount}
          subtitle="Esquema OMS/SVPP"
          icon={<Syringe className="w-4 h-4" />}
          accentClass="bg-emerald-50 text-[#059669]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Citas de Hoy (Doctor solo) o Sala de Espera */}
        {isSoloDoctor ? (
          <Card className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Citas de Hoy ({todayIso})</h3>
                <p className="text-xs text-slate-500">
                  Pacientes agendados para hoy. Si ya vino antes, búscalo en Pacientes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('agenda')}
                className="text-xs font-semibold text-[#0284C7] hover:underline cursor-pointer"
              >
                Ver Agenda e Histórico →
              </button>
            </div>

            {todayDoctorAppointments.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-xs text-slate-500">No tienes citas programadas para hoy.</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentView('agenda')}
                    className="px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold cursor-pointer"
                  >
                    Ir a Agenda
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('pacientes')}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Buscar en Pacientes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayDoctorAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#0284C7]">{apt.time}</span>
                        <StatusBadge
                          label={apt.stage === 'completado' ? 'Atendida' : 'Programada'}
                          variant={apt.stage === 'completado' ? 'success' : 'warning'}
                        />
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-1">{apt.patientName}</div>
                      <div className="text-xs text-slate-500">
                        {apt.patientAgeLabel} · Rep: {apt.guardianName}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigateToPatient360(apt.patientId)}
                        className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#0284C7]" />
                        <span>Historial</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateToActiveConsultation(apt.patientId)}
                        className="px-3 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>Atender</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
        <Card className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sala de Espera en Vivo</h3>
              <p className="text-xs text-slate-500">
                Acceso directo para Triaje (Asistente) o Consulta (Pediatra)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView('agenda')}
              className="text-xs font-semibold text-[#0284C7] hover:underline cursor-pointer"
            >
              Ver Agenda →
            </button>
          </div>

          {waitingPatients.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No hay pacientes esperando en sala en este momento.
            </div>
          ) : (
            <div className="space-y-2.5">
              {waitingPatients.map((apt) => (
                <div
                  key={apt.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#0284C7]">{apt.time}</span>
                      <StatusBadge
                        label={
                          apt.stage === 'en_consulta'
                            ? 'En Consultorio'
                            : apt.stage === 'en_triaje'
                              ? 'En Triaje'
                              : 'En Sala'
                        }
                        variant={apt.stage === 'en_consulta' ? 'success' : 'warning'}
                      />
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1">{apt.patientName}</div>
                    <div className="text-xs text-slate-500">
                      {apt.patientAgeLabel} · Rep: {apt.guardianName}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {apt.triageVitals ? (
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-700">
                        {apt.triageVitals.weightKg}kg · {apt.triageVitals.temperatureC}°C
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openTriageModal(apt)}
                        className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold cursor-pointer"
                      >
                        Tomar Triaje
                      </button>
                    )}

                    {userRole === 'PEDIATRA' && (
                      <button
                        type="button"
                        onClick={() => navigateToActiveConsultation(apt.patientId)}
                        className="px-3 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>Atender</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        )}

        {/* Próximas citas / Pacientes recientes */}
        <Card className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Pacientes Recientes</h3>
            <button
              type="button"
              onClick={() => setCurrentView('pacientes')}
              className="text-xs font-semibold text-[#0284C7] hover:underline cursor-pointer"
            >
              Directorio →
            </button>
          </div>

          <div className="space-y-2.5">
            {patients.slice(0, 4).map((pat) => (
              <button
                key={pat.id}
                type="button"
                onClick={() => navigateToPatient360(pat.id)}
                className="w-full text-left p-3 rounded-xl border border-slate-200/80 hover:border-[#0284C7] hover:bg-sky-50/40 flex items-center justify-between gap-3 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#F0F9FF] text-[#0284C7] font-bold text-xs flex items-center justify-center shrink-0">
                    {pat.firstName[0]}
                    {pat.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {pat.firstName} {pat.lastName}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{pat.historyNumber}</span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        </Card>
      </div>

      {userRole === 'ASISTENTE' && bcvPanel}
    </div>
  );
};
