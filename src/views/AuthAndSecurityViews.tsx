import React, { useState } from 'react';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  Stethoscope,
  Upload,
  DollarSign,
  User,
  FileSignature,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { useMedical, AuthUser } from '../context/MedicalContext';
import { medicareApi } from '../api/medicareApi';
import { ASSETS } from '../data/mockClinicalData';
import { Specialty } from '../types/medical';

/* ============================================================================
   VISTA 1: LOGIN MULTI-TENANT (/login)
============================================================================ */
export const LoginView: React.FC = () => {
  const { setCurrentView, setIsAuthenticated, setCurrentUser, showToast } = useMedical();
  const [identifier, setIdentifier] = useState('valeria.mendez@medcoresalud.com');
  const [password, setPassword] = useState('MedCore2026*');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (cleanId.length < 3 || password.length < 4) {
      setErrorBanner('Credenciales inválidas. Ingrese su usuario (ej. superadmin, admin) o correo institucional.');
      return;
    }

    setErrorBanner(null);
    setLoading(true);
    try {
      const res = await medicareApi.login(cleanId, password);
      const isSuper = Boolean(res.esSuperAdmin ?? res.user.esSuperAdmin ?? res.user.roleCode === 'SUPERADMIN');
      setCurrentUser({
        ...res.user,
        esSuperAdmin: isSuper,
      });
      setIsAuthenticated(true);
      setCurrentView(
        res.user.roleCode === 'ASISTENTE'
          ? 'agenda'
          : res.user.roleCode === 'ADMIN'
            ? 'reportes'
            : 'consulta-activa'
      );
      showToast(`Bienvenido/a, ${res.user.name} (${res.user.roleCode})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const isNetworkError =
        err instanceof TypeError || /failed to fetch|networkerror|load failed|fetch/i.test(msg);

      if (isNetworkError) {
        const lower = cleanId.toLowerCase();
        let demoUser: AuthUser | null = null;
        if (lower === 'superadmin') {
          demoUser = {
            id: 'demo-superadmin',
            username: 'superadmin',
            name: 'Super Administrador',
            email: 'superadmin@medicare.local',
            roleCode: 'SUPERADMIN',
            roleName: 'Super Administrador Global',
            esSuperAdmin: true,
          };
        } else if (lower === 'admin') {
          demoUser = {
            id: 'demo-admin',
            username: 'admin',
            name: 'Administrador Clínica',
            email: 'admin@medicare.local',
            roleCode: 'ADMIN',
            roleName: 'Administrador',
            esSuperAdmin: false,
          };
        } else if (lower === 'asistente' || lower === 'laura.asistente' || lower === 'mariana.clinica') {
          const isShared = lower === 'mariana.clinica';
          demoUser = {
            id: isShared ? 'asist-2' : 'asist-1',
            username: isShared ? 'mariana.clinica' : 'laura.asistente',
            name: isShared ? 'Mariana Gómez (Coordinación Clínica)' : 'Laura Pérez',
            email: isShared ? 'mariana.gomez@medcoresalud.com' : 'laura.perez@medcoresalud.com',
            roleCode: 'ASISTENTE',
            roleName: isShared ? 'Asistente Compartida (3 Médicos)' : 'Asistente Personal · Dra. Valeria Méndez',
            esSuperAdmin: false,
          };
        } else if (lower === 'valeria.mendez@medcoresalud.com') {
          demoUser = {
            id: 'demo-medico-1',
            username: 'valeria.mendez',
            name: 'Dra. Valeria Méndez',
            email: 'valeria.mendez@medcoresalud.com',
            roleCode: 'MEDICO',
            roleName: 'Médico Especialista · MPPS 68412',
            esSuperAdmin: false,
          };
        }

        if (demoUser) {
          setCurrentUser(demoUser);
          setIsAuthenticated(true);
          setCurrentView(
            demoUser.roleCode === 'ASISTENTE'
              ? 'agenda'
              : demoUser.roleCode === 'ADMIN'
                ? 'reportes'
                : 'consulta-activa'
          );
          showToast(`Modo demo local (API offline): ${demoUser.name}`);
          return;
        }
        setErrorBanner('No se pudo conectar con MediCare.API (http://localhost:5189). Use superadmin, admin o el usuario demo.');
      } else {
        setErrorBanner(msg || 'Credenciales inválidas. Verifique su usuario y contraseña.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 items-stretch bg-white">
      {/* Columna Izquierda (50%): Fotografía Médica + Seguridad + Testimonio */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-slate-900 text-white overflow-hidden">
        <img
          src={ASSETS.loginHero}
          alt="Consultorio Médico Moderno MedCore AI"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/50 to-slate-900/40" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0EA5E9] flex items-center justify-center font-bold text-lg">
              M
            </div>
            <span className="text-lg font-bold tracking-tight">MedCore AI · Cloud EMR</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-sky-200">
            <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
            <span>Cifrado médico de punto a punto (HIPAA / MPPS)</span>
          </div>
        </div>

        <div className="relative z-10 max-w-xl space-y-6">
          <h1 className="text-3xl font-bold tracking-tight leading-tight text-balance">
            Menos teclado en consulta. Más mirada humana hacia el paciente.
          </h1>
          <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-3">
            <p className="text-sm text-slate-100 leading-relaxed">
              “Pasé de tardar 14 minutos llenando historias y calculando dosis pediátricas a despachar el récipe firmado y la guía de padres por WhatsApp en menos de 2 minutos.”
            </p>
            <div className="flex items-center gap-3">
              <img
                src={ASSETS.doctorAvatar}
                alt="Dra. Valeria Méndez"
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover border border-white/30"
              />
              <div className="text-xs">
                <div className="font-bold text-white">Dra. Valeria Méndez, MD</div>
                <div className="text-sky-200">
                  Jefa de Pediatría y Puericultura · Centro Clínico MedCore Salud
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Columna Derecha (50%): Formulario de Acceso Multi-Tenant */}
      <div className="flex items-center justify-center p-8 sm:p-14 bg-[#F8FAFC]">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm space-y-6">
          <div className="space-y-1.5">
            <div className="text-xs font-mono text-[#0284C7] font-semibold">
              SUBDOMINIO ACTIVO: DRAVALERIA.MEDCORE.APP
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Acceso Institucional</h2>
            <p className="text-xs text-slate-500">
              Ingrese sus credenciales médicas o explore el flujo de configuración inicial.
            </p>
          </div>

          {errorBanner && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorBanner}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Usuario o Correo Institucional
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="superadmin, admin o correo@clinica.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-[#0284C7] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Contraseña</label>
                <button
                  type="button"
                  onClick={() => setCurrentView('recuperar-password')}
                  className="text-xs font-semibold text-[#0284C7] hover:underline cursor-pointer"
                >
                  ¿Olvidó su contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-[#0284C7] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-[#0284C7] rounded"
                />
                <span>Mantener sesión iniciada en este consultorio</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verificando firma criptográfica...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Consultorio Digital</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-200/80 flex flex-col gap-2 text-xs text-slate-500">
            <div className="flex items-center justify-between">
              <span>¿Nuevo consultorio o clínica?</span>
              <button
                onClick={() => setCurrentView('onboarding')}
                className="font-bold text-[#059669] hover:underline cursor-pointer"
              >
                Configurar Onboarding (Vista 4) →
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span>Probar simulación de error de acceso:</span>
              <button
                onClick={() =>
                  setErrorBanner(
                    'Intento de acceso fallido: La clave ingresada no coincide con el registro MPPS.'
                  )
                }
                className="text-rose-600 hover:underline font-medium cursor-pointer"
              >
                Disparar Alerta Flotante
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   VISTA 2: RECUPERACIÓN DE CONTRASEÑA (/recuperar-password)
============================================================================ */
export const RecoverPasswordView: React.FC = () => {
  const { setCurrentView } = useMedical();
  const [email, setEmail] = useState('valeria.mendez@medcoresalud.com');
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm space-y-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#F0F9FF] text-[#0284C7] flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <div className="text-[11px] font-mono text-slate-400">VISTA 02 · /RECUPERAR-PASSWORD</div>
          <h1 className="text-xl font-bold text-slate-900">Recuperación de Credenciales Médicas</h1>
          <p className="text-xs text-slate-500">
            Enviaremos un enlace temporal cifrado a su correo electrónico colegiado.
          </p>
        </div>

        {!sent ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="space-y-4 text-left"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Correo Institucional Registrado
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Enviar enlace de restablecimiento
            </button>
          </form>
        ) : (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
            <CheckCircle2 className="w-8 h-8 text-[#059669] mx-auto" />
            <h3 className="text-sm font-bold text-emerald-950">¡Correo de recuperación enviado!</h3>
            <p className="text-xs text-emerald-800">
              Hemos despachado las instrucciones a <span className="font-mono font-bold">{email}</span>.
            </p>
            <button
              onClick={() => setCurrentView('reset-password')}
              className="w-full py-2.5 rounded-xl bg-[#059669] text-white text-xs font-bold cursor-pointer"
            >
              Simular Clic en Correo (Ir a Vista 3: Restablecer Contraseña) →
            </button>
          </div>
        )}

        <button
          onClick={() => setCurrentView('login')}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          ← Volver a Inicio de Sesión (Vista 1)
        </button>
      </div>
    </div>
  );
};

/* ============================================================================
   VISTA 3: RESTABLECER CONTRASEÑA (/reset-password)
============================================================================ */
export const ResetPasswordView: React.FC = () => {
  const { setCurrentView, showToast } = useMedical();
  const [newPass, setNewPass] = useState('ClinicaSegura2026*');
  const [confirmPass, setConfirmPass] = useState('ClinicaSegura2026*');

  const checks = {
    length: newPass.length >= 8,
    upper: /[A-Z]/.test(newPass),
    number: /[0-9]/.test(newPass),
    special: /[^A-Za-z0-9]/.test(newPass),
  };
  const score = Object.values(checks).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm space-y-6">
        <div className="space-y-1">
          <div className="text-[11px] font-mono text-slate-400">VISTA 03 · /RESET-PASSWORD</div>
          <h1 className="text-xl font-bold text-slate-900">Restablecer Nueva Contraseña</h1>
          <p className="text-xs text-slate-500">
            Configure una clave de alta seguridad para firmar récipes digitales.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nueva Contraseña
            </label>
            <input
              type="text"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          {/* Reactive Password Strength Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-semibold">
              <span className="text-slate-600">Fortaleza de la clave</span>
              <span className={score === 4 ? 'text-[#059669]' : 'text-amber-600'}>
                {score * 25}% ({score === 4 ? 'Óptima Clínica' : 'En progreso'})
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  score <= 2 ? 'bg-rose-500' : score === 3 ? 'bg-amber-500' : 'bg-[#10B981]'
                }`}
                style={{ width: `${score * 25}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 pt-1">
              <span className={checks.length ? 'text-emerald-700 font-semibold' : ''}>
                ✓ Mínimo 8 caracteres
              </span>
              <span className={checks.upper ? 'text-emerald-700 font-semibold' : ''}>
                ✓ Letra mayúscula
              </span>
              <span className={checks.number ? 'text-emerald-700 font-semibold' : ''}>
                ✓ Número incluido
              </span>
              <span className={checks.special ? 'text-emerald-700 font-semibold' : ''}>
                ✓ Carácter especial (*#@)
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirmar Contraseña
            </label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <button
            onClick={() => {
              showToast('Contraseña restablecida con éxito');
              setCurrentView('login');
            }}
            disabled={score < 3 || newPass !== confirmPass}
            className="w-full py-3 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
          >
            Guardar Contraseña y Acceder
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   VISTA 4: ONBOARDING Y SETUP INICIAL DEL CONSULTORIO (/onboarding)
============================================================================ */
export const OnboardingView: React.FC = () => {
  const { tenantConfig, updateTenantConfig, setIsAuthenticated, setCurrentView, showToast } =
    useMedical();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [mppsNumber, setMppsNumber] = useState('68.412');
  const [colegioNumber, setColegioNumber] = useState('44.910');
  const [transparentCrop, setTransparentCrop] = useState(true);

  const steps = [
    { num: 1, title: 'Identidad y Subdominio', icon: Building2 },
    { num: 2, title: 'Especialidades y Médicos', icon: Stethoscope },
    { num: 3, title: 'Membrete y Firmas', icon: FileSignature },
    { num: 4, title: 'Monedas y Tasa BCV', icon: DollarSign },
  ] as const;

  const allSpecialties: Specialty[] = [
    'Pediatría',
    'Ginecología',
    'Medicina Interna / Cardiología',
    'Traumatología',
    'Dermatología',
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-6 flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-[#0284C7] font-semibold">
              VISTA 04 · ONBOARDING Y CONFIGURACIÓN INICIAL (/ONBOARDING)
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Configuración Guiada de su Consultorio Digital
            </h1>
          </div>
          <button
            onClick={() => setCurrentView('login')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            Volver a Login
          </button>
        </div>

        {/* Horizontal 4-Step Stepper */}
        <div className="grid grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          {steps.map((s) => {
            const Icon = s.icon;
            const active = step === s.num;
            const done = step > s.num;
            return (
              <button
                key={s.num}
                onClick={() => setStep(s.num)}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-[#F0F9FF] text-[#0284C7] border border-sky-200'
                    : done
                    ? 'bg-emerald-50/60 text-emerald-700'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    active
                      ? 'bg-[#0284C7] text-white'
                      : done
                      ? 'bg-[#10B981] text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {done ? '✓' : s.num}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase">Paso {s.num}</div>
                  <div className="text-xs font-bold truncate">{s.title}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Step Card Content */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                1. Identidad Institucional del Consultorio o Clínica
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre de la Clínica / Consultorio
                  </label>
                  <input
                    type="text"
                    value={tenantConfig.businessName}
                    onChange={(e) => updateTenantConfig({ businessName: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subdominio Deseado
                  </label>
                  <input
                    type="text"
                    value={tenantConfig.subdomain}
                    onChange={(e) => updateTenantConfig({ subdomain: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-[#0284C7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RIF / Cédula Jurídica
                  </label>
                  <input
                    type="text"
                    value={tenantConfig.rif}
                    onChange={(e) => updateTenantConfig({ rif: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono / WhatsApp de Recepción
                  </label>
                  <input
                    type="text"
                    value={tenantConfig.phone}
                    onChange={(e) => updateTenantConfig({ phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                2. Especialidades Médicas Activas y Colegiatura
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {allSpecialties.map((spec) => {
                  const selected = tenantConfig.activeSpecialties.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => {
                        const next = selected
                          ? tenantConfig.activeSpecialties.filter((s) => s !== spec)
                          : [...tenantConfig.activeSpecialties, spec];
                        updateTenantConfig({ activeSpecialties: next });
                      }}
                      className={`p-3.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between cursor-pointer ${
                        selected
                          ? 'bg-[#F0F9FF] border-[#0284C7] text-[#0284C7]'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{spec}</span>
                      <span>{selected ? '✓ Activa' : '+ Activar'}</span>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Matrícula Ministerio de Salud (MPPS)
                  </label>
                  <input
                    type="text"
                    value={mppsNumber}
                    onChange={(e) => setMppsNumber(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número de Colegio de Médicos (CM)
                  </label>
                  <input
                    type="text"
                    value={colegioNumber}
                    onChange={(e) => setColegioNumber(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                3. Membrete Institucional, Firma Escaneada y Sello Húmedo
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { title: 'Logotipo de la Clínica', sub: 'PNG / SVG transparente' },
                  { title: 'Firma Médica Escaneada', sub: 'Trazo azul o negro nítido' },
                  { title: 'Sello Húmedo Colegiado', sub: 'Recorte circular automático' },
                ].map((box) => (
                  <div
                    key={box.title}
                    onClick={() => showToast(`${box.title} sincronizado con recorte transparente`)}
                    className="p-5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#0284C7] bg-slate-50/70 text-center space-y-2 cursor-pointer transition-colors"
                  >
                    <Upload className="w-6 h-6 text-[#0284C7] mx-auto" />
                    <div className="text-xs font-bold text-slate-900">{box.title}</div>
                    <div className="text-[11px] text-slate-500">{box.sub}</div>
                  </div>
                ))}
              </div>
              <label className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs font-semibold text-emerald-950 cursor-pointer">
                <span>Activar recorte automático de fondo transparente para récipes PDF</span>
                <input
                  type="checkbox"
                  checked={transparentCrop}
                  onChange={(e) => setTransparentCrop(e.target.checked)}
                  className="w-4 h-4 accent-[#059669]"
                />
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                4. Monedas de Facturación y Sincronización con Tasa BCV
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {(['USD', 'VES'] as const).map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => updateTenantConfig({ billingCurrency: curr })}
                    className={`p-4 rounded-xl border text-left cursor-pointer ${
                      tenantConfig.billingCurrency === curr
                        ? 'border-[#0284C7] bg-[#F0F9FF]'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="text-sm font-bold text-slate-900">
                      Moneda Base: {curr === 'USD' ? 'Dólares (USD $)' : 'Bolívares (VES Bs.)'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Cálculo bimoneda simultáneo en Cuaderno de Caja
                    </div>
                  </button>
                ))}
              </div>

              <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Sincronización Automática con Tasa Oficial BCV
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Tasa vigente hoy: Bs. {tenantConfig.bcvRate.toFixed(2)} / USD
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={tenantConfig.autoSyncBcv}
                  onChange={(e) => updateTenantConfig({ autoSyncBcv: e.target.checked })}
                  className="w-4 h-4 accent-[#0284C7]"
                />
              </label>
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              disabled={step === 1}
              onClick={() => setStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3 | 4)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 disabled:opacity-40 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              ← Paso Anterior
            </button>

            {step < 4 ? (
              <button
                onClick={() => setStep((prev) => Math.min(4, prev + 1) as 1 | 2 | 3 | 4)}
                className="px-5 py-2.5 rounded-xl bg-[#0284C7] text-white text-xs font-bold cursor-pointer"
              >
                Siguiente Paso →
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsAuthenticated(true);
                  setCurrentView('consulta-activa');
                  showToast('Onboarding completado · Consultorio Digital activado');
                }}
                className="px-6 py-2.5 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                Finalizar Setup y Entrar al Consultorio →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   VISTA 5: PERFIL DEL MÉDICO Y AJUSTES DE CUENTA (/perfil)
============================================================================ */
export const DoctorProfileView: React.FC = () => {
  const { showToast } = useMedical();
  const [tab, setTab] = useState<'personales' | 'credenciales'>('personales');
  const [doctorName, setDoctorName] = useState('Dra. Valeria Méndez');
  const [bio, setBio] = useState(
    'Médico Cirujano (UCV) · Especialista en Pediatría y Puericultura. Miembro titular de la SVPP.'
  );
  const [email, setEmail] = useState('valeria.mendez@medcoresalud.com');
  const [emergencyPhone, setEmergencyPhone] = useState('+58 414-2890011');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={ASSETS.doctorAvatar}
            alt={doctorName}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
          />
          <div>
            <h1 className="text-lg font-bold text-slate-900">{doctorName}</h1>
            <p className="text-xs text-slate-600">
              Especialista en Pediatría y Puericultura · MPPS 68.412 · CM 44.910
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setTab('personales')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === 'personales' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Datos Personales
          </button>
          <button
            onClick={() => setTab('credenciales')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === 'credenciales' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Credenciales Médicas y 2FA
          </button>
        </div>
      </div>

      {tab === 'personales' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-[#0284C7]" />
            <span>Información Personal y Contacto de Guardia</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre Completo y Título
              </label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo Institucional
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teléfono de Emergencias
              </label>
              <input
                type="text"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reseña / Bio Profesional Corta
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div className="pt-3 flex justify-end">
            <button
              onClick={() => showToast('Datos personales del médico actualizados')}
              className="px-5 py-2.5 rounded-xl bg-[#0284C7] text-white text-xs font-bold cursor-pointer"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900">
            Visor Seguro de Firma Digitalizada, Sello Colegiado y 2FA
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-2">
              <div className="text-[11px] font-mono text-slate-400">FIRMA DIGITALIZADA CIFRADA</div>
              <div className="italic font-serif text-2xl text-sky-900 py-3">Dra. Valeria Méndez</div>
              <div className="text-xs text-slate-500">Certificado SHA-256 Activo</div>
            </div>
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-2">
              <div className="text-[11px] font-mono text-slate-400">SELLO HÚMEDO DIGITAL</div>
              <div className="py-2 font-mono text-xs font-bold text-sky-900">
                DRA. VALERIA MÉNDEZ · PEDIATRÍA · MPPS 68.412 / CM 44.910
              </div>
              <div className="text-xs text-slate-500">Fondo Transparente Verificado</div>
            </div>
          </div>

          <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <div>
              <div className="text-xs font-bold text-slate-900">
                Autenticación en Dos Pasos (2FA) para Firma de Récipes y Auditoría
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Solicitar código TOTP al iniciar sesión desde nuevos dispositivos.
              </div>
            </div>
            <input
              type="checkbox"
              checked={twoFactorEnabled}
              onChange={(e) => {
                setTwoFactorEnabled(e.target.checked);
                showToast(
                  e.target.checked ? 'Seguridad 2FA habilitada' : 'Seguridad 2FA desactivada'
                );
              }}
              className="w-4 h-4 accent-[#059669]"
            />
          </label>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   VISTA 6: REGISTRO DE AUDITORÍA Y SEGURIDAD DEL TENANT (/seguridad/auditoria)
============================================================================ */
export const AuditLogView: React.FC = () => {
  const { auditLogs } = useMedical();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('Todas');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(auditLogs[0]?.id || null);

  const filteredLogs = auditLogs.filter((log) => {
    const matchesAction = actionFilter === 'Todas' || log.action === actionFilter;
    const matchesQuery =
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAction && matchesQuery;
  });

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900">
            Registro Inmutable de Auditoría y Trazabilidad Clínica
          </h1>
          <p className="text-xs text-slate-500">
            Cada creación o modificación médica almacena su diferencial JSON estructurado y dirección IP.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar médico o paciente..."
              className="pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
          >
            <option value="Todas">Todas las acciones</option>
            <option value="Creación de Consulta">Creación de Consulta</option>
            <option value="Modificación de Diagnóstico">Modificación de Diagnóstico</option>
            <option value="Consulta de Carnet de Vacunas">Consulta de Carnet de Vacunas</option>
            <option value="Descarga de PDF">Descarga de PDF</option>
            <option value="Aplicación de Dosis">Aplicación de Dosis</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="py-3 px-4 text-left">Fecha / Hora Exacta</th>
              <th className="py-3 px-4 text-left">Usuario</th>
              <th className="py-3 px-4 text-left">Rol</th>
              <th className="py-3 px-4 text-left">Acción Ejecutada</th>
              <th className="py-3 px-4 text-left">Paciente Afectado</th>
              <th className="py-3 px-4 text-left">Dirección IP</th>
              <th className="py-3 px-4 text-right">Diff JSON</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70">
            {filteredLogs.map((log) => {
              const isExpanded = expandedRowId === log.id;
              return (
                <React.Fragment key={log.id}>
                  <tr
                    onClick={() => setExpandedRowId(isExpanded ? null : log.id)}
                    className="hover:bg-slate-50/90 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{log.user}</td>
                    <td className="py-3 px-4 text-slate-600">{log.role}</td>
                    <td className="py-3 px-4 font-semibold text-[#0284C7]">{log.action}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{log.patientName}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{log.ipAddress}</td>
                    <td className="py-3 px-4 text-right">
                      <button className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 font-mono">
                        <span>Ver Diff</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-slate-900 text-slate-100">
                      <td colSpan={7} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
                          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50">
                            <div className="text-rose-300 font-bold mb-1">
                              - VALOR ANTERIOR (PREVIOUS STATE)
                            </div>
                            <pre className="overflow-x-auto text-rose-100">
                              {JSON.stringify(log.previousValue, null, 2)}
                            </pre>
                          </div>
                          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50">
                            <div className="text-emerald-300 font-bold mb-1">
                              + NUEVO VALOR (COMMITTED STATE)
                            </div>
                            <pre className="overflow-x-auto text-emerald-100">
                              {JSON.stringify(log.newValue, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
