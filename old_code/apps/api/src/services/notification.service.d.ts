/**
 * Notification Service
 * Business logic for notification management
 */
import { NotificationRepository } from '../repositories/notification.repository.js';
import { NotificationPreferenceRepository } from '../repositories/notification-preference.repository.js';
import { NotificationDigestRepository } from '../repositories/notification-digest.repository.js';
import { UserService } from './auth/user.service.js';
import { TenantService } from './auth/tenant.service.js';
import { Notification, CreateSystemNotificationInput, CreateAdminNotificationInput, NotificationListOptions, NotificationListResult, NotificationStatus, NotificationStats, NotificationPreferences, UpdateNotificationPreferencesInput, DeliveryTrackingOptions, DeliveryTrackingResult, DeliveryChannel, DeliveryRecord } from '../types/notification.types.js';
import type { AuthUser } from '../types/auth.types.js';
import { EmailNotificationService } from './notifications/email-notification.service.js';
import { WebhookNotificationService } from './notifications/webhook-notification.service.js';
import { SlackNotificationService } from './notifications/slack-notification.service.js';
import { TeamsNotificationService } from './notifications/teams-notification.service.js';
import { PushNotificationService } from './notifications/push-notification.service.js';
import { DeliveryTrackingService } from './notifications/delivery-tracking.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Notification Service
 */
export declare class NotificationService {
    private repository;
    private preferenceRepository?;
    private digestRepository?;
    private deliveryTrackingService?;
    private userService;
    private tenantService;
    private emailNotificationService?;
    private webhookNotificationService?;
    private slackNotificationService?;
    private teamsNotificationService?;
    private pushNotificationService?;
    private monitoring?;
    constructor(repository: NotificationRepository, userService: UserService, tenantService: TenantService, emailNotificationService?: EmailNotificationService, preferenceRepository?: NotificationPreferenceRepository, deliveryTrackingService?: DeliveryTrackingService, webhookNotificationService?: WebhookNotificationService, slackNotificationService?: SlackNotificationService, teamsNotificationService?: TeamsNotificationService, digestRepository?: NotificationDigestRepository, pushNotificationService?: PushNotificationService, monitoring?: IMonitoringProvider);
    /**
     * Create a system notification (for use by other services)
     */
    createSystemNotification(input: CreateSystemNotificationInput): Promise<Notification>;
    /**
     * Create admin notification(s) (for super admin or tenant admin)
     */
    createAdminNotification(input: CreateAdminNotificationInput, creator: AuthUser): Promise<{
        notifications: Notification[];
        count: number;
    }>;
    /**
     * Get user's notifications
     */
    getUserNotifications(tenantId: string, userId: string, options?: NotificationListOptions): Promise<NotificationListResult>;
    /**
     * Get a specific notification
     */
    getNotification(id: string, tenantId: string, userId: string): Promise<Notification | null>;
    /**
     * Update notification status
     */
    updateNotificationStatus(id: string, tenantId: string, userId: string, status: NotificationStatus): Promise<Notification | null>;
    /**
     * Delete notification
     */
    deleteNotification(id: string, tenantId: string, userId: string): Promise<boolean>;
    /**
     * Mark all notifications as read for a user
     */
    markAllAsRead(tenantId: string, userId: string): Promise<number>;
    /**
     * Get unread count for a user
     */
    getUnreadCount(tenantId: string, userId: string): Promise<number>;
    /**
     * Get notification statistics (for admin)
     */
    getStats(tenantId: string): Promise<NotificationStats>;
    /**
     * Get user's notification preferences
     */
    getPreferences(tenantId: string, userId: string): Promise<NotificationPreferences>;
    /**
     * Update user's notification preferences
     */
    updatePreferences(tenantId: string, userId: string, input: UpdateNotificationPreferencesInput): Promise<NotificationPreferences>;
    /**
     * Check if email should be sent based on user preferences
     */
    private shouldSendEmail;
    /**
     * Check if webhook should be sent based on user preferences
     */
    private shouldSendWebhook;
    /**
     * Get webhook configuration from user preferences
     */
    private getWebhookConfig;
    /**
     * Check if Slack should be sent based on user preferences
     */
    private shouldSendSlack;
    /**
     * Get Slack configuration from user preferences
     */
    private getSlackConfig;
    /**
     * Check if Teams should be sent based on user preferences
     */
    private shouldSendTeams;
    /**
     * Get Teams configuration from user preferences
     */
    private getTeamsConfig;
    /**
     * Check if push should be sent based on user preferences
     */
    private shouldSendPush;
    /**
     * Get push configuration from user preferences
     */
    private getPushConfig;
    /**
     * Get default notification preferences
     */
    private getDefaultPreferences;
    /**
     * Get delivery status for a specific notification
     */
    getNotificationDeliveryStatus(notificationId: string, tenantId: string, userId: string, channel?: DeliveryChannel): Promise<DeliveryRecord[]>;
    /**
     * Get delivery tracking for user's notifications
     */
    getDeliveryTracking(tenantId: string, userId: string, options?: DeliveryTrackingOptions): Promise<DeliveryTrackingResult>;
    /**
     * Check if digest mode should be used for a channel
     */
    private shouldUseDigest;
    /**
     * Queue a notification for digest delivery
     */
    private queueNotificationForDigest;
    /**
     * Calculate the digest period end time based on schedule and digest time
     */
    private calculateDigestPeriodEnd;
}
//# sourceMappingURL=notification.service.d.ts.map