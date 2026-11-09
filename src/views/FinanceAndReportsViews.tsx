import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Plus,
  RefreshCw,
  Receipt,
  Search,
  Printer,
  Download,
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Layers,
  X,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMedical } from '../context/MedicalContext';
import { PaymentRecord } from '../types/medical';

/* ============================================================================
   VISTA 18: CUADERNO DE CAJA Y COBROS DEL DÍA (/caja)
============================================================================ */
export const CashbookView: React.FC = () => {
  const { payments, patients, tenantConfig, updateBcvRate, addPaymentRecord } = useMedical();

  const [showNewModal, setShowNewModal] = useState(false);
  const [rateInput, setRateInput] = useState(String(tenantConfig.bcvRate));

  // New Payment Form
  const [patientId, setPatientId] = useState(patients[0]?.id || 'pat-1');
  const [concept, setConcept] = useState<PaymentRecord['concept']>('Consulta Especializada');
  const [amountUsd, setAmountUsd] = useState<number>(60);
  const [method, setMethod] = useState<PaymentRecord['method']>('Pago Móvil');
  const [reference, setReference] = useState<string>('PM-010599281');
  const [insuranceCompany, setInsuranceCompany] =
    useState<PaymentRecord['insuranceCompany']>('Mercantil Seguros');

  const totals = useMemo(() => {
    const usd = payments.reduce((acc, p) => acc + p.amountUsd, 0);
    const ves = payments.reduce((acc, p) => acc + p.amountVes, 0);
    return { usd, ves };
  }, [payments]);

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find((p) => p.id === patientId) || patients[0];
    addPaymentRecord({
      patientId: pat.id,
      patientName: `${pat.firstName} ${pat.lastName}`,
      guardianName: pat.guardianName,
      guardianIdDocument: pat.guardianIdDocument,
      doctorName:
        pat.primarySpecialty === 'Ginecología' ? 'Dr. Alejandro Pérez' : 'Dra. Valeria Méndez',
      specialty: pat.primarySpecialty,
      concept,
      cie10Code: 'J03.9',
      cie10Name: 'Consulta Médica Especializada',
      amountUsd,
      bcvRate: tenantConfig.bcvRate,
      amountVes: Number((amountUsd * tenantConfig.bcvRate).toFixed(2)),
      method,
      reference,
      insuranceCompany,
    });
    setShowNewModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Financial Header: BCV Live Rate, Total VES & Total USD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">
              Tasa Oficial BCV del Día
            </span>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#0284C7] mt-1">
              Bs. {tenantConfig.bcvRate.toFixed(2)} / USD
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="0.05"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              className="w-20 px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
            />
            <button
              onClick={() => updateBcvRate(Number(rateInput) || 46.85)}
              title="Actualizar Tasa BCV"
              className="p-2 rounded-lg bg-sky-50 text-[#0284C7] hover:bg-sky-100 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">
            Total Recaudado en Divisas (Efectivo / Zelle)
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#059669] mt-1">
            $ {totals.usd.toFixed(2)} USD
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">
              Total Equivalente en Bolívares (VES)
            </span>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              Bs. {totals.ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar Pago</span>
          </button>
        </div>
      </div>

      {/* Daily Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#0284C7]" />
            <h2 className="text-sm font-bold text-slate-900">
              Lista de Cobros del Día (09 Noviembre 2026)
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {payments.length} transacciones registradas
          </span>
        </div>

        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="py-3 px-4 text-left">Recibo / Hora</th>
              <th className="py-3 px-4 text-left">Paciente</th>
              <th className="py-3 px-4 text-left">Médico Tratante</th>
              <th className="py-3 px-4 text-left">Concepto</th>
              <th className="py-3 px-4 text-right">Monto USD</th>
              <th className="py-3 px-4 text-right">Equivalente Bs.</th>
              <th className="py-3 px-4 text-left">Método / Referencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-mono font-bold text-slate-800">
                  {p.receiptNumber} · <span className="text-slate-400 font-normal">{p.time}</span>
                </td>
                <td className="py-3 px-4 font-semibold text-slate-900">{p.patientName}</td>
                <td className="py-3 px-4 text-slate-600">{p.doctorName}</td>
                <td className="py-3 px-4 font-medium text-[#0284C7]">{p.concept}</td>
                <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-[#059669]">
                  $ {p.amountUsd.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                  Bs. {p.amountVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-4 font-mono text-slate-600">
                  <strong>{p.method}</strong> · {p.reference}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: + Registrar Pago de Consulta */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Registrar Pago de Consulta</h3>
                <button
                  onClick={() => setShowNewModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreatePayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Paciente</label>
                  <select
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Concepto Médico
                    </label>
                    <select
                      value={concept}
                      onChange={(e) => setConcept(e.target.value as PaymentRecord['concept'])}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="Consulta Especializada">Consulta Especializada</option>
                      <option value="Control de Niño Sano">Control de Niño Sano</option>
                      <option value="Esquema de Vacunación">Esquema de Vacunación</option>
                      <option value="Certificado Médico">Certificado Médico</option>
                      <option value="Ecografía Diagnóstica">Ecografía Diagnóstica</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Monto en Divisas (USD)
                    </label>
                    <input
                      type="number"
                      value={amountUsd}
                      onChange={(e) => setAmountUsd(Number(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs flex items-center justify-between">
                  <span className="text-sky-900 font-medium">
                    Conversión automática BCV ({tenantConfig.bcvRate.toFixed(2)}):
                  </span>
                  <span className="font-mono font-bold text-[#0284C7]">
                    Bs. {(amountUsd * tenantConfig.bcvRate).toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Método de Pago
                    </label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as PaymentRecord['method'])}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="Pago Móvil">Pago Móvil</option>
                      <option value="Punto de Venta">Punto de Venta</option>
                      <option value="Efectivo USD">Efectivo USD</option>
                      <option value="Zelle">Zelle</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Referencia Bancaria
                    </label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Póliza para Reembolso (Opcional)
                  </label>
                  <select
                    value={insuranceCompany}
                    onChange={(e) =>
                      setInsuranceCompany(e.target.value as PaymentRecord['insuranceCompany'])
                    }
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Mercantil Seguros">Mercantil Seguros</option>
                    <option value="Seguros Caracas">Seguros Caracas</option>
                    <option value="Seguros Pirámide">Seguros Pirámide</option>
                    <option value="Mapfre">Mapfre</option>
                    <option value="Particular (Sin Seguro)">Particular (Sin Seguro)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#059669] text-white text-xs font-bold cursor-pointer"
                  >
                    Registrar Cobro y Generar Recibo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ============================================================================
   VISTA 19: EMISIÓN Y CONTROL DE RECIBOS MÉDICOS (/caja/recibos)
============================================================================ */
export const MedicalReceiptsView: React.FC = () => {
  const { payments, templateConfig, showToast } = useMedical();
  const [query, setQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord>(payments[0]);

  const filtered = payments.filter(
    (p) =>
      p.receiptNumber.toLowerCase().includes(query.toLowerCase()) ||
      p.patientName.toLowerCase().includes(query.toLowerCase()) ||
      (p.insuranceCompany || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 5 cols: Search & Receipts History */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div>
          <h1 className="text-base font-bold text-slate-900">
            Histórico de Recibos para Reembolso de Seguros
          </h1>
          <p className="text-xs text-slate-500">
            Selecciona un recibo para generar con 1 clic el comprobante membretado.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por N° REC-2026, paciente o aseguradora..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>

        <div className="space-y-2.5">
          {filtered.map((item) => {
            const active = selectedReceipt?.id === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedReceipt(item)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  active
                    ? 'border-[#0284C7] bg-[#F0F9FF]/70 shadow-2xs'
                    : 'border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-[#0284C7]">{item.receiptNumber}</span>
                  <span className="font-bold text-[#059669]">$ {item.amountUsd.toFixed(2)} USD</span>
                </div>
                <div className="text-xs font-bold text-slate-900 mt-1">{item.patientName}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                  <span>Póliza: {item.insuranceCompany}</span>
                  <span>{item.date}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right 7 cols: Membretado Insurance Reimbursement Certificate */}
      {selectedReceipt && (
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs space-y-6">
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="text-[11px] font-mono text-[#0284C7] font-semibold">
                COMPROBANTE OFICIAL PARA REEMBOLSO DE SEGUROS PRIVADOS
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">{templateConfig.clinicName}</h2>
              <p className="text-xs text-slate-500">
                RIF: {templateConfig.rif} · {templateConfig.address}
              </p>
            </div>
            <div className="text-right font-mono">
              <div className="text-sm font-bold text-slate-900">{selectedReceipt.receiptNumber}</div>
              <div className="text-xs text-slate-500">{selectedReceipt.date}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Titular / Representante Legal</span>
              <span className="font-bold text-slate-900">
                {selectedReceipt.guardianName} ({selectedReceipt.guardianIdDocument})
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Compañía Aseguradora</span>
              <span className="font-bold text-[#0284C7]">{selectedReceipt.insuranceCompany}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Paciente Atendido</span>
              <span className="font-bold text-slate-900">{selectedReceipt.patientName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Diagnóstico CIE-10 Declarado</span>
              <span className="font-mono font-semibold text-slate-800">
                {selectedReceipt.cie10Code} — {selectedReceipt.cie10Name}
              </span>
            </div>
          </div>

          <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2.5 px-4 text-left">Concepto de Honorarios Médicos</th>
                <th className="py-2.5 px-4 text-right">Monto USD</th>
                <th className="py-2.5 px-4 text-right">Tasa BCV</th>
                <th className="py-2.5 px-4 text-right">Total Bs. (VES)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900">
                  {selectedReceipt.concept} ({selectedReceipt.specialty})
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-[#059669]">
                  $ {selectedReceipt.amountUsd.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-600">
                  Bs. {selectedReceipt.bcvRate.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                  Bs. {selectedReceipt.amountVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-[#059669]" />
              <span>Sello Húmedo Digital y Firma Colegiada incluidos para Siniestros</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  showToast(`Comprobante ${selectedReceipt.receiptNumber} enviado al representante`);
                }}
                className="px-4 py-2 rounded-xl bg-[#059669] text-white text-xs font-bold cursor-pointer"
              >
                Enviar a WhatsApp para Seguro
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-[#0284C7] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Comprobante</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   VISTA 20: DASHBOARD ESTADÍSTICO DEL CONSULTORIO (/reportes)
============================================================================ */
export const AnalyticsDashboardView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Consultas del Mes',
            value: '184',
            delta: '+18.4% vs mes anterior',
            icon: BarChart3,
            color: 'text-[#0284C7]',
          },
          {
            label: 'Pacientes Nuevos vs Recurrentes',
            value: '62 / 122',
            delta: '33.7% captación primera vez',
            icon: Users,
            color: 'text-[#059669]',
          },
          {
            label: 'Promedio Tiempo por Consulta',
            value: '02m 48s',
            delta: '-68% tiempo de tipeo con IA',
            icon: Clock,
            color: 'text-[#7C3AED]',
          },
          {
            label: 'Ingresos Totales del Mes',
            value: '$ 11,420 USD',
            delta: 'Eq. Bs. 535.027,00 BCV',
            icon: TrendingUp,
            color: 'text-slate-900',
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>{kpi.label}</span>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div className={`text-2xl font-bold font-mono tabular-nums ${kpi.color}`}>
                {kpi.value}
              </div>
              <div className="text-[11px] font-medium text-emerald-700">{kpi.delta}</div>
            </div>
          );
        })}
      </div>

      {/* Interactive Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bar Chart: Consultas por día de la semana */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Consultas Atendidas por Día de la Semana y Horas Pico
            </h2>
            <p className="text-xs text-slate-500">
              Mayor afluencia registrada martes y jueves entre 09:00 AM y 11:30 AM.
            </p>
          </div>

          <div className="h-56 flex items-end justify-between gap-4 pt-6 px-4 border-b border-slate-200">
            {[
              { day: 'Lun', count: 34, pct: 78 },
              { day: 'Mar', count: 42, pct: 95 },
              { day: 'Mié', count: 31, pct: 70 },
              { day: 'Jue', count: 39, pct: 88 },
              { day: 'Vie', count: 26, pct: 60 },
              { day: 'Sáb', count: 12, pct: 32 },
            ].map((bar) => (
              <div key={bar.day} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-700">{bar.count}</span>
                <div
                  style={{ height: `${bar.pct * 1.6}px` }}
                  className="w-full max-w-[44px] rounded-t-xl bg-[#0284C7] hover:bg-[#0369A1] transition-all"
                />
                <span className="text-xs font-semibold text-slate-600 pb-2">{bar.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut / Distribution: Top 5 Patologías Pediátricas */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Top 5 Patologías Diagnosticadas en el Mes
            </h2>
            <p className="text-xs text-slate-500">Distribución porcentual según código CIE-10.</p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { code: 'J03.9', name: 'Faringoamigdalitis aguda', pct: 32, color: 'bg-[#0284C7]' },
              { code: 'J00', name: 'Rinofaringitis aguda', pct: 26, color: 'bg-[#10B981]' },
              { code: 'Z00.1', name: 'Control de niño sano', pct: 18, color: 'bg-[#8B5CF6]' },
              { code: 'J21.9', name: 'Bronquiolitis aguda', pct: 14, color: 'bg-amber-500' },
              { code: 'A09', name: 'Gastroenteritis infecciosa', pct: 10, color: 'bg-rose-500' },
            ].map((item) => (
              <div key={item.code} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">
                    <strong className="font-mono text-slate-500">{item.code}</strong> · {item.name}
                  </span>
                  <span className="font-mono font-bold text-slate-900">{item.pct}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   VISTA 21: REPORTE EPIDEMIOLÓGICO Y REGISTRO SANITARIO (/reportes/epidemiologia)
============================================================================ */
export const EpidemiologyReportView: React.FC = () => {
  const { showToast } = useMedical();
  const [ageGroupFilter, setAgeGroupFilter] = useState('Todos');
  const [sexFilter, setSexFilter] = useState('Todos');

  const rows = [
    {
      cie10: 'J03.9',
      pathology: 'Amigdalitis aguda estreptocócica',
      ageGroup: '1 a 4 años',
      sex: 'Masculino',
      casesCount: 28,
      notifiable: 'EPI-12 Semanal',
    },
    {
      cie10: 'J00',
      pathology: 'Rinofaringitis aguda viral',
      ageGroup: 'Menor de 1 año',
      sex: 'Femenino',
      casesCount: 24,
      notifiable: 'EPI-12 Semanal',
    },
    {
      cie10: 'J21.9',
      pathology: 'Bronquiolitis aguda VSR',
      ageGroup: 'Menor de 1 año',
      sex: 'Masculino',
      casesCount: 15,
      notifiable: 'Vigilancia Respiratoria',
    },
    {
      cie10: 'A09',
      pathology: 'Gastroenteritis y colitis infecciosa',
      ageGroup: '1 a 4 años',
      sex: 'Femenino',
      casesCount: 11,
      notifiable: 'EPI-12 Semanal',
    },
    {
      cie10: 'Z34.0',
      pathology: 'Supervisión de primer embarazo normal',
      ageGroup: 'Adulto (20-39 años)',
      sex: 'Femenino',
      casesCount: 19,
      notifiable: 'Salud Reproductiva MPPS',
    },
  ];

  const filtered = rows.filter((r) => {
    const matchAge = ageGroupFilter === 'Todos' || r.ageGroup === ageGroupFilter;
    const matchSex = sexFilter === 'Todos' || r.sex === sexFilter;
    return matchAge && matchSex;
  });

  const handleExportExcel = () => {
    const header = 'Codigo_CIE10,Patologia,Grupo_Edad,Sexo,Casos_Mes,Reporte_MPPS\n';
    const csv =
      header +
      filtered
        .map(
          (r) =>
            `${r.cie10},"${r.pathology}","${r.ageGroup}",${r.sex},${r.casesCount},"${r.notifiable}"`
        )
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Reporte_Epidemiologico_EPI12_MPPS_Nov2026.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Archivo oficial EPI-12 Excel/CSV descargado exitosamente');
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900">
            Reporte Epidemiológico y Morbilidad Ambulatoria (Formato Ministerio de Salud)
          </h1>
          <p className="text-xs text-slate-500">
            Consolidado estructurado por código CIE-10, grupo etario y sexo listo para exportación oficial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={ageGroupFilter}
            onChange={(e) => setAgeGroupFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
          >
            <option value="Todos">Todos los grupos de edad</option>
            <option value="Menor de 1 año">Menor de 1 año</option>
            <option value="1 a 4 años">1 a 4 años</option>
            <option value="Adulto (20-39 años)">Adulto (20-39 años)</option>
          </select>

          <select
            value={sexFilter}
            onChange={(e) => setSexFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
          >
            <option value="Todos">Ambos sexos</option>
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
          </select>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Excel Oficial MPPS</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="py-3 px-4 text-left">Código CIE-10</th>
              <th className="py-3 px-4 text-left">Diagnóstico / Morbilidad Oficial</th>
              <th className="py-3 px-4 text-left">Grupo de Edad</th>
              <th className="py-3 px-4 text-left">Sexo</th>
              <th className="py-3 px-4 text-right">Casos Registrados</th>
              <th className="py-3 px-4 text-left">Clasificación Sanitaria</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70">
            {filtered.map((r, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-mono font-bold text-[#0284C7]">{r.cie10}</td>
                <td className="py-3 px-4 font-bold text-slate-900">{r.pathology}</td>
                <td className="py-3 px-4 text-slate-600">{r.ageGroup}</td>
                <td className="py-3 px-4 text-slate-600">{r.sex}</td>
                <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-900">
                  {r.casesCount}
                </td>
                <td className="py-3 px-4 font-mono text-[#059669]">{r.notifiable}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
