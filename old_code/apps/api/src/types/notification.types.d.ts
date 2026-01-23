/**
 * Notification Types
 * Type definitions for the notification system
 */
/**
 * Notification types
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'information' | 'alert';
/**
 * Notification priority
 */
export type NotificationPriority = 'low' | 'medium' | 'high';
/**
 * Notification status
 */
export type NotificationStatus = 'unread' | 'read';
/**
 * Delivery status for notification channels
 */
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'unsubscribed';
/**
 * Notification delivery channel
 */
export type DeliveryChannel = 'in-app' | 'email' | 'webhook' | 'push' | 'slack' | 'teams';
/**
 * Notification target type for admin-created notifications
 */
export type NotificationTargetType = 'user' | 'all_tenant' | 'all_system';
/**
 * Creator type
 */
export type NotificationCreatorType = 'system' | 'super_admin' | 'tenant_admin';
/**
 * Notification document (stored in Cosmos DB)
 */
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
    delivery?: {
        channels: DeliveryRecord[];
        lastUpdated: string;
    };
}
/**
 * Delivery record for a specific channel
 */
export interface DeliveryRecord {
    channel: DeliveryChannel;
    status: DeliveryStatus;
    attempts: number;
    sentAt?: string;
    deliveredAt?: string;
    failedAt?: string;
    error?: string;
    retryAfter?: string;
    metadata?: {
        messageId?: string;
        bounceType?: 'hard' | 'soft';
        bounceReason?: string;
        unsubscribeReason?: string;
        [key: string]: any;
    };
}
/**
 * Create notification input (for system notifications)
 */
export interface CreateSystemNotificationInput {
    tenantId: string;
    userId: string;
    type: NotificationType;
    name: string;
    content: string;
    link?: string;
    priority?: NotificationPriority;
    metadata?: Record<string, any>;
}
/**
 * Create admin notification input
 */
export interface CreateAdminNotificationInput {
    name: string;
    content: string;
    type: NotificationType;
    link?: string;
    priority?: NotificationPriority;
    targetType: NotificationTargetType;
    targetUserIds?: string[];
    metadata?: Record<string, any>;
}
/**
 * Notification list options
 */
export interface NotificationListOptions {
    status?: NotificationStatus;
    type?: NotificationType;
    limit?: number;
    offset?: number;
}
/**
 * Notification list result
 */
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
/**
 * Update notification status input
 */
export interface UpdateNotificationStatusInput {
    status: NotificationStatus;
}
/**
 * Notification statistics (for admin)
 */
export interface NotificationStats {
    totalSent: number;
    byType: Record<NotificationType, number>;
    byStatus: {
        unread: number;
        read: number;
    };
    avgDeliveryTime: number;
}
/**
 * Notification channel preferences
 */
export interface ChannelPreferences {
    enabled: boolean;
    [key: string]: any;
}
/**
 * Email channel preferences
 */
export interface EmailChannelPreferences extends ChannelPreferences {
    enabled: boolean;
    digestEnabled?: boolean;
    digestSchedule?: 'daily' | 'weekly';
    digestTime?: string;
}
/**
 * Notification type preferences
 */
export interface TypePreferences {
    enabled: boolean;
    channels?: string[];
    priority?: NotificationPriority;
}
/**
 * User notification preferences
 */
export interface NotificationPreferences {
    userId: string;
    tenantId: string;
    globalSettings: {
        enabled: boolean;
        quietHoursEnabled?: boolean;
        quietHoursStart?: string;
        quietHoursEnd?: string;
        timezone?: string;
    };
    channels: {
        'in-app': ChannelPreferences;
        'email': EmailChannelPreferences;
        'webhook'?: ChannelPreferences & {
            url?: string;
            secret?: string;
            headers?: Record<string, string>;
        };
        'push'?: ChannelPreferences & {
            devices?: Array<{
                token: string;
                platform: string;
            }>;
        };
        'slack'?: ChannelPreferences & {
            webhookUrl?: string;
            channel?: string;
        };
        'teams'?: ChannelPreferences & {
            webhookUrl?: string;
            channel?: string;
        };
    };
    typePreferences?: {
        [key in NotificationType]?: TypePreferences;
    };
    updatedAt: string;
    createdAt: string;
}
/**
 * Update notification preferences input
 */
export interface UpdateNotificationPreferencesInput {
    globalSettings?: Partial<NotificationPreferences['globalSettings']>;
    channels?: Partial<NotificationPreferences['channels']>;
    typePreferences?: Partial<NotificationPreferences['typePreferences']>;
}
/**
 * Delivery tracking query options
 */
export interface DeliveryTrackingOptions {
    channel?: DeliveryChannel;
    status?: DeliveryStatus;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}
/**
 * Delivery tracking result
 */
export interface DeliveryTrackingResult {
    records: DeliveryRecord[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
    summary: {
        pending: number;
        sent: number;
        delivered: number;
        failed: number;
        bounced: number;
    };
}
/**
 * Digest mode types
 */
export type DigestSchedule = 'daily' | 'weekly';
/**
 * Notification digest document (stored in Cosmos DB)
 * Represents a batch of notifications queued for digest delivery
 */
export interface NotificationDigest {
    id: string;
    tenantId: string;
    userId: string;
    channel: DeliveryChannel;
    schedule: DigestSchedule;
    periodStart: string;
    periodEnd: string;
    notificationIds: string[];
    status: 'pending' | 'compiled' | 'sent' | 'failed';
    compiledAt?: string;
    sentAt?: string;
    error?: string;
    createdAt: string;
    updatedAt: string;
}
/**
 * Digest compilation result
 */
export interface DigestCompilationResult {
    digest: NotificationDigest;
    notifications: Notification[];
    summary: {
        total: number;
        byType: Record<NotificationType, number>;
        byPriority: Record<NotificationPriority | 'none', number>;
    };
}
//# sourceMappingURL=notification.types.d.ts.map