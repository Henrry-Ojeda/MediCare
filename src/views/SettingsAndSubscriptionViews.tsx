import React, { useState } from 'react';
import {
  Building2,
  QrCode,
  Sparkles,
  CheckCircle2,
  CreditCard,
  Upload,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { useMedical } from '../context/MedicalContext';
import { Specialty } from '../types/medical';

/* ============================================================================
   VISTA 22: AJUSTES DE LA CLÍNICA / CONFIGURACIÓN DEL TENANT (/configuracion)
============================================================================ */
export const ClinicSettingsView: React.FC = () => {
  const { tenantConfig, updateTenantConfig, showToast } = useMedical();

  const specialtiesList: Specialty[] = [
    'Pediatría',
    'Ginecología',
    'Medicina Interna / Cardiología',
    'Traumatología',
    'Dermatología',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0F9FF] text-[#0284C7] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                Configuración Institucional del Centro Médico (Tenant)
              </h1>
              <p className="text-xs text-slate-500">
                Razón social, RIF, especialidades habilitadas, horarios y ubicación física.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-[#0284C7] font-semibold">
            {tenantConfig.subdomain}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Razón Social</label>
            <input
              type="text"
              value={tenantConfig.businessName}
              onChange={(e) => updateTenantConfig({ businessName: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">RIF Fiscal</label>
            <input
              type="text"
              value={tenantConfig.rif}
              onChange={(e) => updateTenantConfig({ rif: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Horario Lunes a Viernes
            </label>
            <input
              type="text"
              value={tenantConfig.scheduleWeekdays}
              onChange={(e) => updateTenantConfig({ scheduleWeekdays: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Horario Sábados / Guardias
            </label>
            <input
              type="text"
              value={tenantConfig.scheduleSaturdays}
              onChange={(e) => updateTenantConfig({ scheduleSaturdays: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dirección Física del Consultorio (Pie de Página de Récipes y Recibos)
            </label>
            <input
              type="text"
              value={tenantConfig.address}
              onChange={(e) => updateTenantConfig({ address: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <label className="block text-xs font-semibold text-slate-700">
            Especialidades Activas en el Centro
          </label>
          <div className="flex flex-wrap gap-2">
            {specialtiesList.map((spec) => {
              const active = tenantConfig.activeSpecialties.includes(spec);
              return (
                <button
                  key={spec}
                  type="button"
                  onClick={() => {
                    const next = active
                      ? tenantConfig.activeSpecialties.filter((s) => s !== spec)
                      : [...tenantConfig.activeSpecialties, spec];
                    updateTenantConfig({ activeSpecialties: next });
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    active
                      ? 'bg-[#F0F9FF] border-[#0284C7] text-[#0284C7]'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  {active ? '✓ ' : '+ '}
                  {spec}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={() => showToast('Configuración institucional del Tenant guardada')}
            className="px-6 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold cursor-pointer"
          >
            Guardar Configuración Institucional
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   VISTA 23: DISEÑADOR DE PLANTILLAS DE RÉCIPE E INFORMES (/configuracion/plantillas)
============================================================================ */
export const RecipeTemplateDesignerView: React.FC = () => {
  const { templateConfig, updateTemplateConfig, showToast } = useMedical();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 5 cols: WYSIWYG Controls */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        <div>
          <h1 className="text-base font-bold text-slate-900">
            Diseñador Visual WYSIWYG de Récipes e Informes
          </h1>
          <p className="text-xs text-slate-500">
            Personalice el membrete, alineación del logotipo y color corporativo en tiempo real.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Posicionamiento del Logotipo e Identidad
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'left', label: 'Izquierda', icon: AlignLeft },
                { id: 'center', label: 'Centro', icon: AlignCenter },
                { id: 'right', label: 'Derecha', icon: AlignRight },
              ].map((pos) => {
                const Icon = pos.icon;
                const active = templateConfig.logoPosition === pos.id;
                return (
                  <button
                    key={pos.id}
                    onClick={() =>
                      updateTemplateConfig({ logoPosition: pos.id as 'left' | 'center' | 'right' })
                    }
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                      active
                        ? 'border-[#0284C7] bg-[#F0F9FF] text-[#0284C7]'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{pos.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Color Corporativo de Bordes y Encabezado
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { hex: '#0284C7', label: 'Azul Clínico' },
                  { hex: '#059669', label: 'Esmeralda' },
                  { hex: '#7C3AED', label: 'Violeta IA' },
                  { hex: '#0F172A', label: 'Slate Sobrio' },
                ] as const
              ).map((c) => (
                <button
                  key={c.hex}
                  onClick={() => updateTemplateConfig({ borderColor: c.hex })}
                  className={`p-2.5 rounded-xl border text-center text-[11px] font-semibold cursor-pointer ${
                    templateConfig.borderColor === c.hex
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full block mx-auto mb-1"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Título Principal del Membrete
            </label>
            <input
              type="text"
              value={templateConfig.clinicName}
              onChange={(e) => updateTemplateConfig({ clinicName: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subtítulo de Especialidades
            </label>
            <input
              type="text"
              value={templateConfig.clinicSubtitle}
              onChange={(e) => updateTemplateConfig({ clinicSubtitle: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer">
              <span>Incluir Código QR Criptográfico de Verificación</span>
              <input
                type="checkbox"
                checked={templateConfig.showQrCode}
                onChange={(e) => updateTemplateConfig({ showQrCode: e.target.checked })}
                className="w-4 h-4 accent-[#0284C7]"
              />
            </label>
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer">
              <span>Mostrar Firma Digitalizada de la Médico</span>
              <input
                type="checkbox"
                checked={templateConfig.showDigitalSignature}
                onChange={(e) => updateTemplateConfig({ showDigitalSignature: e.target.checked })}
                className="w-4 h-4 accent-[#0284C7]"
              />
            </label>
          </div>

          <button
            onClick={() => showToast('Plantilla oficial de récipe actualizada')}
            className="w-full py-2.5 rounded-xl bg-[#0284C7] text-white text-xs font-bold cursor-pointer"
          >
            Guardar Plantilla Predeterminada
          </button>
        </div>
      </div>

      {/* Right 7 cols: Live Real-Time Sheet Preview */}
      <div className="lg:col-span-7 bg-slate-200/70 rounded-2xl p-8 flex justify-center">
        <div
          className="bg-white w-full max-w-xl rounded-xl border border-slate-200 shadow-md p-8 space-y-6"
          style={{ borderTop: `6px solid ${templateConfig.borderColor}` }}
        >
          <div
            className={`border-b border-slate-200 pb-4 flex flex-col ${
              templateConfig.logoPosition === 'center'
                ? 'items-center text-center'
                : templateConfig.logoPosition === 'right'
                ? 'items-end text-right'
                : 'items-start text-left'
            }`}
          >
            <div
              className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center mb-2"
              style={{ backgroundColor: templateConfig.borderColor }}
            >
              M
            </div>
            <h2 className="text-base font-bold text-slate-900">{templateConfig.clinicName}</h2>
            <p className="text-xs text-slate-600">{templateConfig.clinicSubtitle}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              RIF: {templateConfig.rif} · {templateConfig.address}
            </p>
          </div>

          <div className="py-8 space-y-3 text-xs text-slate-700">
            <div className="font-mono font-bold text-slate-400">
              VISTA PREVIA DE CUERPO DE PRESCRIPCIÓN
            </div>
            <p className="font-bold text-slate-900">
              1. Amoxicilina + Ácido Clavulánico (Suspensión 400 mg / 5 ml)
            </p>
            <p className="font-mono text-[#0284C7]">
              Administrar 4.5 ml vía oral cada 12 horas durante 7 días continuos.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-200 flex items-end justify-between">
            {templateConfig.showQrCode ? (
              <div className="flex items-center gap-2.5">
                <QrCode className="w-10 h-10 text-slate-700" />
                <span className="text-[10px] text-slate-400 max-w-[200px]">
                  {templateConfig.footerNote}
                </span>
              </div>
            ) : (
              <div />
            )}

            {templateConfig.showDigitalSignature && (
              <div className="text-right">
                <div className="italic font-serif text-lg text-sky-900">Dra. Valeria Méndez</div>
                <div className="text-[11px] font-bold text-slate-800 border-t border-slate-300 pt-1">
                  Dra. Valeria Méndez · MPPS 68.412
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   VISTA 24: MI SUSCRIPCIÓN SAAS Y CONSUMO DEL PLAN (/configuracion/suscripcion)
============================================================================ */
export const SaasSubscriptionView: React.FC = () => {
  const { aiMinutesUsed, whatsappMessagesSent, showToast } = useMedical();
  const [activeTier, setActiveTier] = useState<'Basico' | 'Pro' | 'Elite'>('Elite');
  const [paymentReported, setPaymentReported] = useState(false);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Active Plan Banner */}
      <div className="bg-white rounded-2xl border border-violet-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-[#7C3AED]">
              SUSCRIPCIÓN ACTIVA · CICLO NOVIEMBRE 2026
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Plan Élite Copiloto IA (Multi-Especialidad)
            </h1>
            <p className="text-xs text-slate-500">
              Próxima fecha de corte: <strong className="font-mono">09/12/2026</strong> · Importe mensual:{' '}
              <strong className="font-mono text-slate-900">$ 79.00 USD / mes</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setPaymentReported(true);
              showToast('Comprobante de Pago Móvil / Transferencia reportado a facturación SaaS');
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[#0284C7]" />
            <span>Reportar Pago Móvil / Transferencia</span>
          </button>
        </div>
      </div>

      {paymentReported && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          <span>
            ¡Comprobante recibido! Su ciclo de facturación SaaS ha sido pre-validado sin interrupciones de servicio.
          </span>
        </div>
      )}

      {/* Monthly Consumption Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">Minutos de Transcripción IA</span>
            <span className="font-mono font-bold text-[#7C3AED]">{aiMinutesUsed} / 500 min</span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#8B5CF6] transition-all duration-300"
              style={{ width: `${Math.min(100, (aiMinutesUsed / 500) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Se incrementa en vivo al procesar consultas con Gemini 3.8 Flash.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">Mensajes de WhatsApp Despachados</span>
            <span className="font-mono font-bold text-[#059669]">
              {whatsappMessagesSent} / 500 envíos
            </span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#10B981] transition-all duration-300"
              style={{ width: `${Math.min(100, (whatsappMessagesSent / 500) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Envíos automatizados de récipes PDF y recordatorios de vacunas.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">Consultas Registradas en el Ciclo</span>
            <span className="font-mono font-bold text-[#0284C7]">184 / Ilimitadas</span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#0EA5E9]" style={{ width: '42%' }} />
          </div>
          <p className="text-[11px] text-slate-500">
            Almacenamiento de historias clínicas y curvas OMS sin límite.
          </p>
        </div>
      </div>

      {/* Plan Comparison Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            id: 'Basico',
            name: 'Plan Básico Consultorio',
            audience: 'Para médicos individuales iniciando digitalización',
            price: '$ 29 USD / mes',
            limits: 'Hasta 150 consultas/mes · Sin Copiloto de Voz IA · 100 envíos WhatsApp',
          },
          {
            id: 'Pro',
            name: 'Plan Pro Multi-Médico',
            audience: 'Para unidades pediátricas y ginecológicas con enfermera',
            price: '$ 49 USD / mes',
            limits: 'Consultas ilimitadas · Sala de Espera Kanban + Triaje · 250 min IA',
          },
          {
            id: 'Elite',
            name: 'Plan Élite Copiloto IA',
            audience: 'Para clínicas ambulatorias de alta productividad',
            price: '$ 79 USD / mes',
            limits: '500 min Copiloto IA Gemini · 500 WhatsApp PDF · Auditoría JSON completa',
          },
        ].map((tier) => {
          const isCurrent = activeTier === tier.id;
          return (
            <div
              key={tier.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 ${
                isCurrent
                  ? 'bg-white border-[#7C3AED] shadow-sm'
                  : 'bg-white border-slate-200/80'
              }`}
            >
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400">{tier.audience}</div>
                <h3 className="text-base font-bold text-slate-900">{tier.name}</h3>
                <div className="text-xl font-bold font-mono text-slate-900">{tier.price}</div>
                <p className="text-xs text-slate-600 pt-2">{tier.limits}</p>
              </div>

              <button
                onClick={() => {
                  setActiveTier(tier.id as 'Basico' | 'Pro' | 'Elite');
                  showToast(`Suscripción actualizada a ${tier.name}`);
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                  isCurrent
                    ? 'bg-[#7C3AED] text-white'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isCurrent ? 'Plan Activo Actualmente' : 'Cambiar a este Plan'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
