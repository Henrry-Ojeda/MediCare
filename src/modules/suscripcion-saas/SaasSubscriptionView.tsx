import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Clock, CreditCard, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { medicareApi } from '../../api/medicareApi';
import { getAuthToken } from '../../api/client';

interface SubSummary {
  hasSubscription: boolean;
  status: string;
  planCode: string;
  planName: string;
  expiresAt?: string;
  maxDoctors: number;
  maxAssistants: number;
  allowDictationAi: boolean;
  allowFinanceBcv: boolean;
}

interface PlanItem {
  id: number;
  code: string;
  name: string;
  planType: string;
  maxDoctors: number;
  maxAssistants: number;
  allowDictationAi: boolean;
  allowFinanceBcv: boolean;
  priceUsdMonthly: number;
}

interface InvitationItem {
  id: string;
  clinicId: string;
  clinicName: string;
  doctorUserId: string;
  doctorName: string;
  status: string;
  expiresAt: string;
}

export const SaasSubscriptionView: React.FC = () => {
  const { aiMinutesUsed, whatsappMessagesSent } = useClinical();
  const { userRole } = useAuth();
  const { showToast } = useNotifications();

  const [sub, setSub] = useState<SubSummary | null>(null);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!getAuthToken()) return;
    setLoading(true);
    try {
      const [mySub, planList, invList] = await Promise.all([
        medicareApi.getMySubscription().catch(() => null),
        medicareApi.listSubscriptionPlans().catch(() => []),
        medicareApi.listClinicInvitations().catch(() => []),
      ]);
      if (mySub) setSub(mySub);
      if (Array.isArray(planList)) setPlans(planList);
      if (Array.isArray(invList)) setInvitations(invList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleUpgradePersonal = async () => {
    try {
      await medicareApi.upgradeToPersonalPlan();
      showToast('Plan Personal activado correctamente.');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo activar el Plan Personal.');
    }
  };

  const handleDoctorRespond = async (id: string, accept: boolean) => {
    try {
      await medicareApi.respondClinicInvitation(id, accept);
      showToast(accept ? 'Invitación aceptada. Pendiente confirmación final de la clínica.' : 'Invitación rechazada.');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo responder la invitación.');
    }
  };

  const handleClinicConfirm = async (id: string) => {
    try {
      await medicareApi.confirmClinicInvitation(id);
      showToast('Asociación clínica confirmada.');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo confirmar la asociación.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Suscripción SaaS, Planes y Asociaciones</h1>
            <p className="text-xs text-slate-500">
              {sub
                ? `${sub.planName} · Estado: ${sub.status}${sub.expiresAt ? ` · Vence: ${sub.expiresAt}` : ''}`
                : 'Gestión de plan personal, plan clínico y doble confirmación (24h).'}
            </p>
          </div>
        </div>

        {userRole === 'PEDIATRA' && (
          <button
            type="button"
            onClick={handleUpgradePersonal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> Activar / Cambiar a Plan Personal
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Cupo Médicos</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{sub?.maxDoctors ?? 1}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Cupo Asistentes</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{sub?.maxAssistants ?? 0}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Dictado IA (Plan)</p>
          <p className="text-sm font-bold text-slate-900 mt-2">
            {sub?.allowDictationAi ? 'Habilitado por Plan' : 'No incluido'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Uso Mensual</p>
          <p className="text-xs font-bold text-slate-800 mt-2">
            IA: {aiMinutesUsed} min · WhatsApp: {whatsappMessagesSent}
          </p>
        </div>
      </div>

      {invitations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-600" />
            Invitaciones de Asociación a Clínica (Caducidad 24h · Doble Confirmación)
          </h2>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900">
                    {inv.clinicName} ↔ {inv.doctorName}
                  </p>
                  <p className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Estado: <strong>{inv.status}</strong> · Expira:{' '}
                    {inv.expiresAt.split('T')[0]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {inv.status === 'PENDING_DOCTOR' && userRole === 'PEDIATRA' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDoctorRespond(inv.id, true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aceptar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDoctorRespond(inv.id, false)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 font-bold cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Rechazar
                      </button>
                    </>
                  )}
                  {inv.status === 'PENDING_CLINIC_CONFIRM' && userRole === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={() => handleClinicConfirm(inv.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 text-white font-bold cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Confirmación Final
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {plans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {plans.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1.5">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                {p.planType}
              </span>
              <p className="text-sm font-bold text-slate-900">{p.name}</p>
              <p className="text-lg font-extrabold text-sky-700">${p.priceUsdMonthly}/mes</p>
              <p className="text-[11px] text-slate-500">
                Médicos: {p.maxDoctors} · Asistentes: {p.maxAssistants}
              </p>
              <p className="text-[11px] text-slate-500">
                {p.allowDictationAi ? '✓ Dictado IA' : '• Sin Dictado IA'} ·{' '}
                {p.allowFinanceBcv ? '✓ Finanzas/BCV' : '• Solo historial'}
              </p>
            </div>
          ))}
        </div>
      )}

      {loading && <p className="text-xs text-slate-400">Cargando información de suscripción...</p>}
    </div>
  );
};
