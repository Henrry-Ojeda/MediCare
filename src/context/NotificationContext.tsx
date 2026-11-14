import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AppNotification,
  AssistantCallAlert,
  NotificationCategory,
  NotificationPriority,
} from '../types/notification.types';
import { UserRole } from '../types/auth.types';
import { useAuth } from './AuthContext';
import { playClinicalChime, triggerBrowserNotification } from '../utils/soundAndVibrate';
import { getCurrentTimeLabel } from '../utils/formatters';

const NOTIFICATIONS_STORAGE_KEY = 'medicare_notifications_v1';
const ASSISTANT_CALL_STORAGE_KEY = 'medicare_assistant_call_v1';
const CHANNEL_NAME = 'medicare_realtime_events';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  activeAssistantCall: AssistantCallAlert | null;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  pushNotification: (payload: {
    title: string;
    message: string;
    category: NotificationCategory;
    priority?: NotificationPriority;
    targetRoles: UserRole[];
    patientId?: string;
    appointmentId?: string;
  }) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  callAssistantFromConsultorio: (reason: string, patientName?: string) => void;
  acknowledgeAssistantCall: () => void;
  dismissAssistantCall: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-init-1',
    title: 'Paciente con Triaje Listo',
    message: 'Mateo Rojas (38.4 °C · 15.4 kg) completó triaje y espera en consultorio.',
    category: 'triage_ready',
    priority: 'high',
    targetRoles: ['PEDIATRA', 'ADMIN'],
    createdAt: '09:15 AM',
    read: false,
    patientId: 'pat-1',
  },
  {
    id: 'notif-init-2',
    title: 'Recordatorio de Vacunación',
    message: 'Camila Valentina tiene pendiente refuerzo de Hexavalente (18 meses).',
    category: 'vaccine_alert',
    priority: 'normal',
    targetRoles: ['PEDIATRA', 'ASISTENTE'],
    createdAt: '09:00 AM',
    read: false,
    patientId: 'pat-2',
  },
];

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userRole, currentUser } = useAuth();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [allNotifications, setAllNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [activeAssistantCall, setActiveAssistantCall] = useState<AssistantCallAlert | null>(() => {
    try {
      const saved = localStorage.getItem(ASSISTANT_CALL_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as AssistantCallAlert) : null;
    } catch {
      return null;
    }
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3600);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(allNotifications));
    } catch {
      // ignore
    }
  }, [allNotifications]);

  useEffect(() => {
    try {
      if (activeAssistantCall) {
        localStorage.setItem(ASSISTANT_CALL_STORAGE_KEY, JSON.stringify(activeAssistantCall));
      } else {
        localStorage.removeItem(ASSISTANT_CALL_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [activeAssistantCall]);

  // Sincronización en tiempo real entre pestañas/ventanas (ej. Pediatra en una y Asistente en otra)
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      const { type, payload } = event.data || {};
      if (type === 'NEW_NOTIFICATION' && payload) {
        setAllNotifications((prev) => [payload, ...prev.filter((n) => n.id !== payload.id)]);
        if (payload.targetRoles?.includes(userRole)) {
          playClinicalChime(payload.priority === 'urgent' ? 'assistant_urgent' : 'notification');
          triggerBrowserNotification(payload.title, payload.message);
        }
      } else if (type === 'ASSISTANT_CALL_UPDATED') {
        setActiveAssistantCall(payload || null);
        if (payload?.status === 'PENDIENTE' && userRole === 'ASISTENTE') {
          playClinicalChime('assistant_urgent');
          triggerBrowserNotification('Llamado desde Consultorio', payload.reason);
        }
      }
    };
    return () => channel.close();
  }, [userRole]);

  const broadcastEvent = (type: string, payload: unknown) => {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage({ type, payload });
        channel.close();
      }
    } catch {
      // ignore
    }
  };

  const pushNotification: NotificationContextValue['pushNotification'] = useCallback(
    ({ title, message, category, priority = 'normal', targetRoles, patientId, appointmentId }) => {
      const created: AppNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        message,
        category,
        priority,
        targetRoles,
        createdAt: getCurrentTimeLabel(),
        read: false,
        patientId,
        appointmentId,
      };
      setAllNotifications((prev) => [created, ...prev.slice(0, 49)]);
      broadcastEvent('NEW_NOTIFICATION', created);
      if (targetRoles.includes(userRole)) {
        playClinicalChime(priority === 'urgent' ? 'assistant_urgent' : 'notification');
      }
    },
    [userRole]
  );

  const markAsRead = (id: string) => {
    setAllNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setAllNotifications((prev) =>
      prev.map((n) => (n.targetRoles.includes(userRole) ? { ...n, read: true } : n))
    );
  };

  const callAssistantFromConsultorio = (reason: string, patientName?: string) => {
    const alert: AssistantCallAlert = {
      id: `call-${Date.now()}`,
      requestedByDoctor: currentUser?.name || 'Dra. Valeria Méndez',
      consultorioLabel: 'Consultorio Pediátrico 1',
      reason,
      patientName,
      createdAt: getCurrentTimeLabel(),
      status: 'PENDIENTE',
    };
    setActiveAssistantCall(alert);
    broadcastEvent('ASSISTANT_CALL_UPDATED', alert);
    pushNotification({
      title: 'Llamado desde Consultorio',
      message: `${alert.requestedByDoctor}: ${reason}${patientName ? ` (${patientName})` : ''}`,
      category: 'assistant_call',
      priority: 'urgent',
      targetRoles: ['ASISTENTE', 'ADMIN'],
    });
    playClinicalChime('assistant_urgent');
    showToast('Llamado enviado a la Asistente en tiempo real');
  };

  const acknowledgeAssistantCall = () => {
    if (!activeAssistantCall) return;
    const updated: AssistantCallAlert = {
      ...activeAssistantCall,
      status: 'EN_CAMINO',
      acknowledgedBy: currentUser?.name || 'Asistente',
      acknowledgedAt: getCurrentTimeLabel(),
    };
    setActiveAssistantCall(updated);
    broadcastEvent('ASSISTANT_CALL_UPDATED', updated);
    pushNotification({
      title: 'Asistente en Camino',
      message: `${updated.acknowledgedBy} confirmó el llamado y se dirige al consultorio.`,
      category: 'assistant_call',
      priority: 'normal',
      targetRoles: ['PEDIATRA'],
    });
    showToast('Confirmación enviada al Pediatra');
  };

  const dismissAssistantCall = () => {
    setActiveAssistantCall(null);
    broadcastEvent('ASSISTANT_CALL_UPDATED', null);
  };

  const notifications = allNotifications.filter((n) => n.targetRoles.includes(userRole));
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeAssistantCall,
        toastMessage,
        showToast,
        pushNotification,
        markAsRead,
        markAllAsRead,
        callAssistantFromConsultorio,
        acknowledgeAssistantCall,
        dismissAssistantCall,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications debe utilizarse dentro de <NotificationProvider>');
  }
  return ctx;
}
