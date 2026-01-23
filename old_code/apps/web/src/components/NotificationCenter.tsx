import React, { useState, useEffect, useCallback } from 'react';
import { notificationApi } from '@/lib/api/notifications';
import type { Notification as ApiNotification } from '@/types/notification';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';
import {
  Bell,
  X,
  Check,
  Trash2,
  Settings,
  Clock,
  AlertCircle,
  Info,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  projectId?: string;
  actionUrl?: string;
}

interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  webPush: boolean;
  emailFrequency: 'immediate' | 'daily' | 'weekly';
  notificationTypes: {
    projectCreated: boolean;
    projectUpdated: boolean;
    projectShared: boolean;
    versionPublished: boolean;
    analyticsReport: boolean;
    auditAlert: boolean;
  };
}

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    inApp: true,
    webPush: false,
    emailFrequency: 'daily',
    notificationTypes: {
      projectCreated: true,
      projectUpdated: true,
      projectShared: true,
      versionPublished: true,
      analyticsReport: true,
      auditAlert: true,
    },
  });

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const result = await notificationApi.getNotifications();
      // Map API notifications to local Notification type
      const mappedNotifications: Notification[] = (result.notifications || []).map((n: ApiNotification) => ({
        id: n.id,
        type: (n.type === 'information' ? 'info' : n.type === 'alert' ? 'warning' : n.type) as 'info' | 'warning' | 'error' | 'success',
        title: n.name || '',
        message: n.content || '',
        read: n.status === 'read',
        timestamp: n.createdAt || new Date().toISOString(),
        projectId: n.metadata?.relatedId,
        actionUrl: n.link,
      }));
      setNotifications(mappedNotifications);
      setError(null);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to fetch notifications', 3, {
        errorMessage: errorObj.message,
      })
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    try {
      // Note: Preferences endpoint may need to be added to notificationApi
      // For now, using apiClient directly
      const { apiClient } = await import('@/lib/api/client' as any);
      const response = await apiClient.get('/api/v1/notifications/preferences' as any);
      setPreferences(response.data.data || preferences);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to fetch preferences', 3, {
        errorMessage: errorObj.message,
      })
    }
  }, [preferences]);

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();

    // Set up polling for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchPreferences]);

  // Mark as read
  const markAsRead = async (id: string) => {
    try {
      await notificationApi.updateNotification(id, 'read');
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to mark notification as read', 3, {
        errorMessage: errorObj.message,
        notificationId: id,
      })
    }
  };

  // Mark as unread
  const markAsUnread = async (id: string) => {
    try {
      await notificationApi.updateNotification(id, 'unread');
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n))
      );
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to mark notification as unread', 3, {
        errorMessage: errorObj.message,
        notificationId: id,
      })
    }
  };

  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to delete notification', 3, {
        errorMessage: errorObj.message,
        notificationId: id,
      })
    }
  };

  // Clear all notifications
  const clearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications?')) return;

    try {
      const { apiClient } = await import('@/lib/api/client' as any);
      await apiClient.post('/api/v1/notifications/clear-all', {});
      setNotifications([]);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to clear notifications', 3, {
        errorMessage: errorObj.message,
      })
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to mark all as read', 3, {
        errorMessage: errorObj.message,
      })
    }
  };

  // Save preferences
  const savePreferences = async () => {
    try {
      const { apiClient } = await import('@/lib/api/client' as any);
      await apiClient.put('/api/v1/notifications/preferences', preferences);
      setShowPreferences(false);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to save preferences', 3, {
        errorMessage: errorObj.message,
      })
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-l-4 border-red-500';
      case 'warning':
        return 'bg-yellow-50 border-l-4 border-yellow-500';
      case 'success':
        return 'bg-green-50 border-l-4 border-green-500';
      default:
        return 'bg-blue-50 border-l-4 border-blue-500';
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-8 h-8 text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          </div>
          <button
            onClick={() => setShowPreferences(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
          >
            <Settings className="w-5 h-5" />
            Preferences
          </button>
        </div>

        {/* Action Buttons */}
        {notifications.length > 0 && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
            >
              <Check className="w-4 h-4" />
              Mark All as Read
            </button>
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No notifications yet</p>
            <p className="text-gray-500 text-sm">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg flex items-start gap-4 transition ${
                  getBgColor(notification.type)
                } ${!notification.read ? 'shadow-md' : ''}`}
              >
                <div className="flex-shrink-0 pt-0.5">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                  <p className="text-gray-700 mt-1 break-words">{notification.message}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {new Date(notification.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="flex-shrink-0 flex gap-2">
                  {!notification.read ? (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 hover:bg-gray-200 rounded transition"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4 text-gray-600" />
                    </button>
                  ) : (
                    <button
                      onClick={() => markAsUnread(notification.id)}
                      className="p-2 hover:bg-gray-200 rounded transition"
                      title="Mark as unread"
                    >
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 hover:bg-red-100 rounded transition"
                    title="Delete notification"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Notification Preferences</h2>
              <button
                onClick={() => setShowPreferences(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Delivery Channels */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Delivery Channels</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={preferences.inApp}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          inApp: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-gray-700">In-app notifications</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={preferences.email}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          email: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-gray-700">Email notifications</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={preferences.webPush}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          webPush: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-gray-700">Web push notifications</span>
                  </label>
                </div>
              </div>

              {/* Email Frequency */}
              {preferences.email && (
                <div>
                  <label className="block font-semibold text-gray-900 mb-3">
                    Email Frequency
                  </label>
                  <select
                    value={preferences.emailFrequency}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        emailFrequency: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="daily">Daily Digest</option>
                    <option value="weekly">Weekly Digest</option>
                  </select>
                </div>
              )}

              {/* Notification Types */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Notification Types</h3>
                <div className="space-y-3">
                  {Object.entries(preferences.notificationTypes).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            notificationTypes: {
                              ...preferences.notificationTypes,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-gray-700 capitalize">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-2 p-6 border-t">
              <button
                onClick={() => setShowPreferences(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={savePreferences}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
