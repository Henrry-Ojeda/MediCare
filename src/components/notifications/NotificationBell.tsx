import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

interface NotificationBellProps {
  onClick: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onClick }) => {
  const { unreadCount } = useNotifications();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir centro de notificaciones"
      className="relative p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 transition-colors cursor-pointer"
    >
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};
