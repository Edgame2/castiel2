import { useEffect, useState, useCallback } from 'react';
import { useRealtime } from '@/components/providers/realtime-provider';
import { notificationApi } from '@/lib/api/notifications';
import type { Notification, NotificationType, NotificationStatus } from '@/types/notification';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface UseNotificationsOptions {
  autoFetch?: boolean;
  filters?: {
    status?: NotificationStatus;
    type?: NotificationType;
  };
}

/**
 * Hook for managing notifications
 * Fetches notifications from API and subscribes to real-time updates
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { autoFetch = true, filters } = options;
  const { subscribe, unsubscribe, isConnected } = useRealtime();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await notificationApi.getNotifications({
        status: filters?.status,
        type: filters?.type,
        limit: 100,
        offset: 0,
      });
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      trackException(errorObj, 3);
      trackTrace('Failed to fetch notifications', 3, {
        errorMessage: errorObj.message,
      });
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.type]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await notificationApi.getUnreadCount();
      setUnreadCount(result.count);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      trackException(errorObj, 3);
      trackTrace('Failed to fetch unread count', 3, {
        errorMessage: errorObj.message,
      });
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationApi.updateNotification(id, 'read');
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, status: 'read' as const, readAt: new Date().toISOString() } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      trackException(errorObj, 3);
      trackTrace('Failed to mark notification as read', 3, {
        errorMessage: errorObj.message,
        notificationId: id,
      });
      throw err;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, status: 'read' as const, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      trackException(errorObj, 3);
      trackTrace('Failed to mark all as read', 3, {
        errorMessage: errorObj.message,
      });
      throw err;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationApi.deleteNotification(id);
      const deleted = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
      if (deleted?.status === 'unread') {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      trackException(errorObj, 3);
      trackTrace('Failed to delete notification', 3, {
        errorMessage: errorObj.message,
        notificationId: id,
      });
      throw err;
    }
  }, [notifications]);

  // Handle real-time notification event
  const handleNotificationEvent = useCallback((event: any) => {
    if (event.type === 'notification' && event.notification) {
      const notification: Notification = {
        ...event.notification,
        status: 'unread',
        createdAt: event.notification.createdAt || new Date().toISOString(),
      };
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    } else if (event.type === 'unread_count') {
      setUnreadCount(event.count || 0);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchNotifications();
    }
  }, [autoFetch, fetchNotifications]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    subscribe('notification', handleNotificationEvent);

    return () => {
      unsubscribe('notification', handleNotificationEvent);
    };
  }, [isConnected, subscribe, unsubscribe, handleNotificationEvent]);

  // Periodically refresh unread count
  useEffect(() => {
    if (!autoFetch) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [autoFetch, fetchUnreadCount]);

  return {
    // Data
    notifications,
    unreadCount,
    loading,
    error,

    // Actions
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
    fetchUnreadCount,

    // Helpers
    getUnread: () => notifications.filter((n) => n.status === 'unread'),
    getByType: (type: NotificationType) => notifications.filter((n) => n.type === type),
  };
}
