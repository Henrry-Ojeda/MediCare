import React, { useState } from 'react';
import { useClinical } from '../../context/ClinicalContext';
import { useNotifications } from '../../context/NotificationContext';

export const ResetPasswordView: React.FC = () => {
  const { setCurrentView } = useClinical();
  const { showToast } = useNotifications();
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newPass.length < 8 || newPass !== confirmPass) return;
          showToast('Contraseña restablecida con éxito');
          setCurrentView('login');
        }}
        className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm space-y-5"
      >
        <h1 className="text-xl font-bold text-slate-900">Restablecer Contraseña</h1>
        <input
          id="reset-new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="Nueva contraseña (mín. 8 caracteres)"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
        />
        <input
          id="reset-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="Confirmar contraseña"
          value={confirmPass}
          onChange={(e) => setConfirmPass(e.target.value)}
          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
        />
        <button
          type="submit"
          disabled={newPass.length < 8 || newPass !== confirmPass}
          className="w-full py-3 rounded-xl bg-[#0284C7] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
        >
          Guardar Contraseña
        </button>
      </form>
    </div>
  );
};
