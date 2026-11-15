import React from 'react';
import { X, CheckCheck, BellRing, AlertTriangle, Syringe, FileText, UserCheck } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useClinical } from '../../context/ClinicalContext';
import { useAuth } from '../../context/AuthContext';
import { NotificationCategory } from '../../types/notification.types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_ICON: Record<NotificationCategory, React.ComponentType<{ className?: string }>> = {
  assistant_call: BellRing,
  triage_ready: AlertTriangle,
  patient_arrived: UserCheck,
  recipe_ready: FileText,
  vaccine_alert: Syringe,
  system: BellRing,
};

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { navigateToPatient360, navigateToActiveConsultation } = useClinical();
  const { userRole } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Centro de Notificaciones</h2>
            <p className="text-[11px] text-slate-500">
              {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[#0284C7] hover:bg-sky-50 flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Marcar leídas</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label="Cerrar notificaciones"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No hay notificaciones registradas para tu rol.
            </div>
          ) : (
            notifications.map((notif) => {
              const Icon = CATEGORY_ICON[notif.category] || BellRing;
              const isUrgent = notif.priority === 'urgent' || notif.priority === 'high';
              return (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => {
                    markAsRead(notif.id);
                    if (notif.patientId) {
                      if (
                        userRole === 'PEDIATRA' &&
                        (notif.category === 'triage_ready' || notif.category === 'patient_arrived')
                      ) {
                        navigateToActiveConsultation(notif.patientId);
                      } else {
                        navigateToPatient360(notif.patientId);
                      }
                      onClose();
                    }
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    !notif.read
                      ? isUrgent
                        ? 'bg-rose-50/70 border-rose-200'
                        : 'bg-sky-50/60 border-sky-200'
                      : 'bg-white border-slate-200/80 opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isUrgent
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-sky-100 text-[#0284C7]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {notif.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {notif.createdAt}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
