import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
import { medicareApi } from '../api/medicareApi';
import { getAuthToken } from '../api/client';

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
    targetUserId?: string;
  }) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  callAssistantFromConsultorio: (reason: string, patientName?: string) => void;
  acknowledgeAssistantCall: () => void;
  dismissAssistantCall: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userRole, currentUser, isAuthenticated } = useAuth();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const lastAlertedCallIdRef = useRef<string | null>(null);
  const seenNotifIdsRef = useRef<Set<string>>(new Set());
  const initialSyncDoneRef = useRef(false);

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

  // Solicitar permiso de notificaciones push (escritorio / móvil) al iniciar sesión
  useEffect(() => {
    if (!isAuthenticated) return;
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [isAuthenticated]);

  // Sincronización en tiempo real vía API (.NET + SQL Server) cada 2.5s entre dispositivos y navegadores
  useEffect(() => {
    if (!isAuthenticated || !getAuthToken()) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await medicareApi.getNotifications();
        if (cancelled) return;

        const mappedNotifs: AppNotification[] = (res.notifications || []).map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          category: n.category as NotificationCategory,
          priority: n.priority,
          targetRoles: n.targetRoles as UserRole[],
          createdAt: n.createdAt,
          read: n.read,
          patientId: n.patientId,
          appointmentId: n.appointmentId,
          targetUserId: n.targetUserId,
        }));

        if (initialSyncDoneRef.current) {
          for (const n of mappedNotifs) {
            const matchesDoctor =
              userRole !== 'PEDIATRA' || !n.targetUserId || n.targetUserId === currentUser?.id;
            if (
              !seenNotifIdsRef.current.has(n.id) &&
              !n.read &&
              n.targetRoles.includes(userRole) &&
              matchesDoctor
            ) {
              playClinicalChime(n.priority === 'urgent' ? 'assistant_urgent' : 'notification');
              triggerBrowserNotification(n.title, n.message);
            }
          }
        }
        mappedNotifs.forEach((n) => seenNotifIdsRef.current.add(n.id));
        initialSyncDoneRef.current = true;
        setAllNotifications(mappedNotifs);

        const remoteCall = res.activeAssistantCall;
        setActiveAssistantCall(remoteCall);

        if (
          remoteCall &&
          remoteCall.status === 'PENDIENTE' &&
          userRole === 'ASISTENTE' &&
          lastAlertedCallIdRef.current !== remoteCall.id
        ) {
          lastAlertedCallIdRef.current = remoteCall.id;
          playClinicalChime('assistant_urgent');
          triggerBrowserNotification(
            `Llamado desde ${remoteCall.consultorioLabel}`,
            `${remoteCall.requestedByDoctor}: ${remoteCall.reason}`
          );
        }
        if (!remoteCall) {
          lastAlertedCallIdRef.current = null;
        }
      } catch {
        // ignore transient network errors
      }
    };

    poll();
    const interval = window.setInterval(poll, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isAuthenticated, userRole]);

  // Repetición de timbre cada 8s mientras el llamado siga PENDIENTE en la vista de Asistente
  useEffect(() => {
    if (userRole !== 'ASISTENTE' || activeAssistantCall?.status !== 'PENDIENTE') return;
    const timer = window.setInterval(() => {
      playClinicalChime('assistant_urgent');
    }, 8000);
    return () => window.clearInterval(timer);
  }, [userRole, activeAssistantCall?.status]);

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
    ({ title, message, category, priority = 'normal', targetRoles, patientId, appointmentId, targetUserId }) => {
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
        targetUserId,
      };
      seenNotifIdsRef.current.add(created.id);
      setAllNotifications((prev) => [created, ...prev.slice(0, 49)]);
      broadcastEvent('NEW_NOTIFICATION', created);
      if (getAuthToken()) {
        medicareApi
          .createNotification({
            title,
            message,
            category,
            priority,
            targetRoles,
            patientId,
            appointmentId,
            targetUserId,
          })
          .catch(() => {});
      }
      const matchesDoctor =
        userRole !== 'PEDIATRA' || !targetUserId || targetUserId === currentUser?.id;
      if (targetRoles.includes(userRole) && matchesDoctor) {
        playClinicalChime(priority === 'urgent' ? 'assistant_urgent' : 'notification');
      }
    },
    [userRole, currentUser?.id]
  );

  const markAsRead = (id: string) => {
    setAllNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (getAuthToken()) {
      medicareApi.markNotificationRead(id).catch(() => {});
    }
  };

  const markAllAsRead = () => {
    setAllNotifications((prev) =>
      prev.map((n) => (n.targetRoles.includes(userRole) ? { ...n, read: true } : n))
    );
    if (getAuthToken()) {
      medicareApi.markAllNotificationsRead().catch(() => {});
    }
  };

  const callAssistantFromConsultorio = (reason: string, patientName?: string) => {
    const alert: AssistantCallAlert = {
      id: `call-${Date.now()}`,
      requestedByDoctor: currentUser?.name || 'Médico',
      consultorioLabel: 'Consultorio Pediátrico 1',
      reason,
      patientName,
      createdAt: getCurrentTimeLabel(),
      status: 'PENDIENTE',
    };
    setActiveAssistantCall(alert);
    broadcastEvent('ASSISTANT_CALL_UPDATED', alert);
    if (getAuthToken()) {
      medicareApi
        .callAssistant({
          reason,
          patientName,
          consultorioLabel: alert.consultorioLabel,
        })
        .catch(() => {});
    } else {
      pushNotification({
        title: 'Llamado desde Consultorio',
        message: `${alert.requestedByDoctor}: ${reason}${patientName ? ` (${patientName})` : ''}`,
        category: 'assistant_call',
        priority: 'urgent',
        targetRoles: ['ASISTENTE', 'ADMIN'],
      });
    }
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
    if (getAuthToken()) {
      medicareApi.acknowledgeAssistantCall().catch(() => {});
    }
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
    if (getAuthToken()) {
      medicareApi.dismissAssistantCall().catch(() => {});
    }
  };

  const notifications = allNotifications.filter(
    (n) =>
      n.targetRoles.includes(userRole) &&
      (userRole !== 'PEDIATRA' || !n.targetUserId || n.targetUserId === currentUser?.id)
  );
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
