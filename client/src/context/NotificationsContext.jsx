import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { notificationApi } from '../api/notifications';
import { useAuth } from './AuthContext';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshNotifications = useCallback(async () => {
    if (!user?._id) {
      setNotifications([]);
      setUnreadCount(0);
      return [];
    }
    setLoading(true);
    try {
      const response = await notificationApi.list({ page: 1, limit: 6 });
      setNotifications(response.data.data || []);
      setUnreadCount(response.data.meta?.unreadCount || 0);
      return response.data.data || [];
    } finally { setLoading(false); }
  }, [user?._id]);

  useEffect(() => {
    refreshNotifications().catch(() => { setNotifications([]); setUnreadCount(0); });
    if (!user?._id) return undefined;
    const intervalId = window.setInterval(() => { refreshNotifications().catch(() => {}); }, 60000);
    return () => window.clearInterval(intervalId);
  }, [refreshNotifications, user?._id]);

  const markRead = useCallback(async (id) => {
    const target = notifications.find((item) => item._id === id);
    if (!target || target.isRead) return target;
    const response = await notificationApi.markRead(id);
    setNotifications((current) => current.map((item) => item._id === id ? response.data.data : item));
    setUnreadCount((current) => Math.max(0, current - 1));
    return response.data.data;
  }, [notifications]);

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    await notificationApi.markAllRead();
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() })));
    setUnreadCount(0);
  }, [unreadCount]);

  const value = useMemo(() => ({ notifications, unreadCount, loading, refreshNotifications, markRead, markAllRead }), [loading, markAllRead, markRead, notifications, refreshNotifications, unreadCount]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used inside NotificationsProvider.');
  return context;
}
