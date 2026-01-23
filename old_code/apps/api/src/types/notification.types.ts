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
  id: string; // UUID
  tenantId: string; // Tenant identifier
  userId: string; // Target user ID
  notificationId: string; // Same as id (for HPK)

  // Core fields
  name: string; // Notification name/title
  content: string; // Notification content/message
  link?: string; // Optional URL/link
  status: NotificationStatus; // Read status

  // Type and metadata
  type: NotificationType;
  priority?: NotificationPriority; // Optional priority

  // Source information
  createdBy: {
    type: NotificationCreatorType;
    userId?: string; // Admin user ID if created by admin
    name?: string; // Admin name for display
  };

  // Targeting (for admin-created notifications)
  targetType?: NotificationTargetType;
  targetUserIds?: string[]; // Specific user IDs (if targetType = 'user')

  // Timestamps
  createdAt: string; // ISO 8601
  readAt?: string; // When marked as read
  expiresAt?: string; // TTL expiration (90 days from createdAt)

  // Metadata
  metadata?: {
    source?: string; // Source system/feature (e.g., 'document_upload', 'integration_sync')
    relatedId?: string; // Related resource ID
    [key: string]: any; // Additional metadata
  };

  // Delivery tracking (optional for backward compatibility)
  delivery?: {
    channels: DeliveryRecord[];
    lastUpdated: string; // ISO 8601
  };
}

/**
 * Delivery record for a specific channel
 */
export interface DeliveryRecord {
  channel: DeliveryChannel;
  status: DeliveryStatus;
  attempts: number; // Number of delivery attempts
  sentAt?: string; // ISO 8601 - when first sent
  deliveredAt?: string; // ISO 8601 - when delivered (if applicable)
  failedAt?: string; // ISO 8601 - when failed
  error?: string; // Error message if failed
  retryAfter?: string; // ISO 8601 - when to retry (for failed deliveries)
  metadata?: {
    // Channel-specific metadata
    messageId?: string; // Email message ID, webhook request ID, etc.
    bounceType?: 'hard' | 'soft'; // For email bounces
    bounceReason?: string; // Bounce reason
    unsubscribeReason?: string; // Unsubscribe reason
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
  targetUserIds?: string[]; // Required if targetType = 'user'
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
  // Channel-specific settings
  [key: string]: any;
}

/**
 * Email channel preferences
 */
export interface EmailChannelPreferences extends ChannelPreferences {
  enabled: boolean;
  digestEnabled?: boolean;
  digestSchedule?: 'daily' | 'weekly';
  digestTime?: string; // HH:mm format
}

/**
 * Notification type preferences
 */
export interface TypePreferences {
  enabled: boolean;
  channels?: string[]; // Which channels to use for this type
  priority?: NotificationPriority;
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  userId: string;
  tenantId: string;
  
  // Global settings
  globalSettings: {
    enabled: boolean; // Master switch
    quietHoursEnabled?: boolean;
    quietHoursStart?: string; // HH:mm
    quietHoursEnd?: string; // HH:mm
    timezone?: string; // IANA timezone
  };
  
  // Channel preferences
  channels: {
    'in-app': ChannelPreferences;
    'email': EmailChannelPreferences;
    'webhook'?: ChannelPreferences & { url?: string; secret?: string; headers?: Record<string, string> };
    'push'?: ChannelPreferences & { devices?: Array<{ token: string; platform: string }> };
    'slack'?: ChannelPreferences & { webhookUrl?: string; channel?: string };
    'teams'?: ChannelPreferences & { webhookUrl?: string; channel?: string };
  };
  
  // Type-specific preferences
  typePreferences?: {
    [key in NotificationType]?: TypePreferences;
  };
  
  // Metadata
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
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
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
  id: string; // UUID
  tenantId: string;
  userId: string;
  channel: DeliveryChannel; // 'email' | 'slack' | 'teams'
  schedule: DigestSchedule;
  periodStart: string; // ISO 8601 - start of digest period
  periodEnd: string; // ISO 8601 - end of digest period (when digest should be sent)
  notificationIds: string[]; // IDs of notifications included in this digest
  status: 'pending' | 'compiled' | 'sent' | 'failed';
  compiledAt?: string; // ISO 8601 - when digest was compiled
  sentAt?: string; // ISO 8601 - when digest was sent
  error?: string; // Error message if failed
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
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
