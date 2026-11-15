import React, { useState } from 'react';
import { Lock, CheckCircle2 } from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';

export const RecoverPasswordView: React.FC = () => {
  const { setCurrentView } = useClinical();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm space-y-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#F0F9FF] text-[#0284C7] flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Recuperación de Contraseña</h1>
        {!sent ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="space-y-4 text-left"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@clinica.com"
              className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#0284C7] text-white text-xs font-bold cursor-pointer"
            >
              Enviar enlace de restablecimiento
            </button>
          </form>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
            <CheckCircle2 className="w-7 h-7 text-[#059669] mx-auto" />
            <p className="text-xs text-emerald-900">Instrucciones enviadas a {email}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCurrentView('login')}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          ← Volver a Iniciar Sesión
        </button>
      </div>
    </div>
  );
};
