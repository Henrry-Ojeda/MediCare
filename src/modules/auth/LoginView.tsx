import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useClinical } from '../../context/ClinicalContext';
import { useNotifications } from '../../context/NotificationContext';
import { medicareApi } from '../../api/medicareApi';
import { ASSETS } from '../../data/mockClinicalData';
import { AuthUser, UserRole } from '../../types/auth.types';

export const LoginView: React.FC = () => {
  const { setCurrentUser, setIsAuthenticated } = useAuth();
  const { setCurrentView } = useClinical();
  const { showToast } = useNotifications();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const completeLogin = (user: AuthUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCurrentView('dashboard');
    showToast(`Bienvenido/a, ${user.name}`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (cleanId.length < 3 || password.length < 4) {
      setErrorBanner('Ingrese un usuario o correo válido y su contraseña.');
      return;
    }

    setErrorBanner(null);
    setLoading(true);
    try {
      const res = await medicareApi.login(cleanId, password);
      const role: UserRole =
        res.user.roleCode === 'ASISTENTE'
          ? 'ASISTENTE'
          : res.user.roleCode === 'ADMIN' || res.user.roleCode === 'SUPERADMIN'
            ? 'ADMIN'
            : 'PEDIATRA';
      completeLogin({ ...res.user, role });
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Credenciales inválidas o error de conexión con el servidor.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 items-stretch bg-white">
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-slate-900 text-white overflow-hidden">
        <img
          src={ASSETS.loginHero}
          alt="Consultorio Pediátrico MediCare"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/50 to-slate-900/40" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0EA5E9] flex items-center justify-center font-bold text-lg">
              M
            </div>
            <span className="text-lg font-bold tracking-tight">MediCare · Pediatría</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-sky-200">
            <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
            <span>Acceso seguro multi-dispositivo</span>
          </div>
        </div>

        <div className="relative z-10 max-w-xl space-y-4">
          <h1 className="text-3xl font-bold tracking-tight leading-tight">
            Más tiempo con tus pacientes pediátricos, menos teclado.
          </h1>
          <p className="text-sm text-slate-200 leading-relaxed">
            Agenda, Sala de Espera y Triaje en vivo, Curvas OMS, Carnet de Vacunación, Dictado
            Clínico por voz y Récipe firmado enviado directo al WhatsApp de los padres.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-5 sm:p-10 bg-[#F8FAFC]">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 lg:hidden mb-2">
              <div className="w-8 h-8 rounded-xl bg-[#0284C7] flex items-center justify-center text-white font-bold text-sm">
                M
              </div>
              <span className="font-bold text-base text-slate-900">MediCare Pediatría</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Iniciar Sesión</h2>
            <p className="text-xs text-slate-500">
              Disponible en Laptop, Tablet y Teléfono Móvil.
            </p>
          </div>

          {errorBanner && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorBanner}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Usuario o Correo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-[#0284C7] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Contraseña
              </label>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>Entrar al Consultorio</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
