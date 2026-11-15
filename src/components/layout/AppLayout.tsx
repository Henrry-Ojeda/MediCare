import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useClinical } from '../../context/ClinicalContext';
import { useNotifications } from '../../context/NotificationContext';
import { canRoleAccessView, ROLE_PERMISSIONS } from '../../config/permissions.config';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { AssistantCallBanner } from '../notifications/AssistantCallBanner';
import { NotificationDrawer } from '../notifications/NotificationDrawer';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userRole } = useAuth();
  const { currentView, setCurrentView } = useClinical();
  const { toastMessage } = useNotifications();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);

  const isPublicAuthView =
    currentView === 'login' ||
    currentView === 'recuperar-password' ||
    currentView === 'reset-password' ||
    currentView === 'onboarding';

  if (isPublicAuthView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#CCFBF1]/70 text-[#0F172A] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] relative">
        {children}
        <ToastBanner message={toastMessage} />
      </div>
    );
  }

  const hasAccess = canRoleAccessView(userRole, currentView);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E0F2FE]/70 via-[#F0F9FF] to-[#CCFBF1]/50 text-[#0F172A] flex">
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenNotifications={() => setNotifDrawerOpen(true)}
        />

        <AssistantCallBanner />

        <main className="flex-1 p-4 sm:p-6 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-6 overflow-y-auto">
          {hasAccess ? (
            children
          ) : (
            <div className="max-w-md mx-auto mt-10 bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Acceso Restringido</h2>
              <p className="text-xs text-slate-600">
                Esta sección no está habilitada para el rol <strong>{userRole}</strong> o se
                encuentra reservada para el próximo Sprint.
              </p>
              <button
                type="button"
                onClick={() => setCurrentView(ROLE_PERMISSIONS[userRole].defaultView)}
                className="px-4 py-2 rounded-xl bg-[#0284C7] text-white text-xs font-bold cursor-pointer"
              >
                Ir al Dashboard
              </button>
            </div>
          )}
        </main>
      </div>

      <MobileBottomNav />

      <NotificationDrawer isOpen={notifDrawerOpen} onClose={() => setNotifDrawerOpen(false)} />
      <ToastBanner message={toastMessage} />
    </div>
  );
};

const ToastBanner: React.FC<{ message: string | null }> = ({ message }) => (
  <AnimatePresence>
    {message && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-16 md:bottom-5 right-4 sm:right-5 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-md text-xs font-medium no-print"
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{message}</span>
      </motion.div>
    )}
  </AnimatePresence>
);
