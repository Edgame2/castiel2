/**
 * Notifications API Client
 * API client for notification operations
 */

import apiClient from './client';
import type { Notification, NotificationListResult, NotificationStats } from '@/types/notification';

/**
 * Notification API endpoints
 */
export const notificationApi = {
  /**
   * Get user's notifications with pagination and filtering
   */
  getNotifications: async (params?: {
    status?: 'unread' | 'read';
    type?: 'success' | 'error' | 'warning' | 'information' | 'alert';
    limit?: number;
    offset?: number;
  }): Promise<NotificationListResult> => {
    const response = await apiClient.get<NotificationListResult>('/api/v1/notifications', { params });
    return response.data;
  },

  /**
   * Get a specific notification by ID
   */
  getNotification: async (id: string): Promise<Notification> => {
    const response = await apiClient.get<Notification>(`/api/v1/notifications/${id}`);
    return response.data;
  },

  /**
   * Update notification status
   */
  updateNotification: async (id: string, status: 'read' | 'unread'): Promise<Notification> => {
    const response = await apiClient.patch<Notification>(`/api/v1/notifications/${id}`, { status });
    return response.data;
  },

  /**
   * Delete a notification
   */
  deleteNotification: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/notifications/${id}`);
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<{ count: number }> => {
    const response = await apiClient.post<{ count: number }>('/api/v1/notifications/mark-all-read');
    return response.data;
  },

  /**
   * Get unread count
   */
  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get<{ count: number }>('/api/v1/notifications/unread-count');
    return response.data;
  },

  /**
   * Create admin notification (admin only)
   */
  createAdminNotification: async (data: {
    name: string;
    content: string;
    type: 'success' | 'error' | 'warning' | 'information' | 'alert';
    link?: string;
    priority?: 'low' | 'medium' | 'high';
    targetType: 'user' | 'all_tenant' | 'all_system';
    targetUserIds?: string[];
    metadata?: Record<string, any>;
  }): Promise<{ notifications: Notification[]; count: number }> => {
    const response = await apiClient.post<{ notifications: Notification[]; count: number }>(
      '/api/v1/admin/notifications',
      data
    );
    return response.data;
  },

  /**
   * Get notification statistics (admin only)
   */
  getStats: async (): Promise<NotificationStats> => {
    const response = await apiClient.get<NotificationStats>('/api/v1/admin/notifications/stats');
    return response.data;
  },
};







