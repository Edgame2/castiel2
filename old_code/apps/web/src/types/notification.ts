/**
 * Notification Types
 * Frontend type definitions for notifications
 */

export type NotificationType = 'success' | 'error' | 'warning' | 'information' | 'alert';
export type NotificationStatus = 'unread' | 'read';
export type NotificationPriority = 'low' | 'medium' | 'high';
export type NotificationTargetType = 'user' | 'all_tenant' | 'all_system';
export type NotificationCreatorType = 'system' | 'super_admin' | 'tenant_admin';

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  notificationId: string;
  name: string;
  content: string;
  link?: string;
  status: NotificationStatus;
  type: NotificationType;
  priority?: NotificationPriority;
  createdBy: {
    type: NotificationCreatorType;
    userId?: string;
    name?: string;
  };
  targetType?: NotificationTargetType;
  targetUserIds?: string[];
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
  metadata?: {
    source?: string;
    relatedId?: string;
    [key: string]: any;
  };
}

export interface NotificationListResult {
  notifications: Notification[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  unreadCount: number;
}

export interface NotificationStats {
  totalSent: number;
  byType: Record<NotificationType, number>;
  byStatus: {
    unread: number;
    read: number;
  };
  avgDeliveryTime: number;
}







