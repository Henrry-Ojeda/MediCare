import React from 'react';
import {
  Calendar,
  Activity,
  Users,
  Syringe,
  Stethoscope,
  Clock,
  ArrowRight,
  BellRing,
  UserPlus,
} from 'lucide-react';
import { KpiCard, Card, StatusBadge } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useClinical } from '../../context/ClinicalContext';
import { useNotifications } from '../../context/NotificationContext';

export const DashboardView: React.FC = () => {
  const { currentUser, userRole } = useAuth();
  const {
    appointments,
    patients,
    setCurrentView,
    openTriageModal,
    navigateToActiveConsultation,
    navigateToPatient360,
  } = useClinical();
  const { callAssistantFromConsultorio } = useNotifications();

  const waitingPatients = appointments.filter(
    (a) => a.stage === 'en_sala' || a.stage === 'en_triaje' || a.stage === 'en_consulta'
  );
  const completedToday = appointments.filter((a) => a.stage === 'completado').length;
  const pendingVaccinesCount = patients.reduce(
    (acc, p) => acc + p.vaccines.filter((v) => v.status === 'pendiente').length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Hola, {currentUser?.name || 'Equipo Médico'}
          </h2>
          <p className="text-xs text-slate-500">
            Resumen operativo de Pediatría · {appointments.length} citas registradas hoy
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {userRole === 'PEDIATRA' && (
            <button
              type="button"
              onClick={() => callAssistantFromConsultorio('Acudir al consultorio')}
              className="px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <BellRing className="w-4 h-4 text-amber-600" />
              <span>Llamar Asistente</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setCurrentView('paciente-nuevo')}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#0284C7]" />
            <span>Nuevo Paciente</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('sala-espera')}
            className="px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Activity className="w-4 h-4" />
            <span>Abrir Sala de Espera</span>
          </button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          title="Citas de Hoy"
          value={appointments.length}
          subtitle={`${completedToday} atendidas`}
          icon={<Calendar className="w-4 h-4" />}
          accentClass="bg-sky-50 text-[#0284C7]"
        />
        <KpiCard
          title="En Sala / Triaje"
          value={waitingPatients.length}
          subtitle="Pacientes activos"
          icon={<Activity className="w-4 h-4" />}
          accentClass="bg-amber-50 text-amber-600"
        />
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
        {/* Cola en vivo de Sala de Espera */}
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
    </div>
  );
};
