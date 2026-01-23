/**
 * Teams Notification Service
 *
 * Handles sending notification messages to Microsoft Teams channels using incoming webhooks.
 * Supports Microsoft Adaptive Cards (MessageCard format) for rich messages.
 * Integrates with DeliveryTrackingService for delivery tracking and retry logic.
 */
import { Notification, NotificationType } from '../../types/notification.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { DeliveryTrackingService } from './delivery-tracking.service.js';
export interface TeamsNotificationConfig {
    enabled: boolean;
    sendForTypes?: NotificationType[];
    skipForLowPriority?: boolean;
    defaultTimeout?: number;
    maxRetries?: number;
}
export interface TeamsConfig {
    webhookUrl: string;
    channel?: string;
}
/**
 * Teams Notification Service
 * Sends Teams notifications when in-app notifications are created
 */
export declare class TeamsNotificationService {
    private config;
    private monitoring;
    private deliveryTracking?;
    constructor(config: TeamsNotificationConfig, monitoring: IMonitoringProvider, deliveryTracking?: DeliveryTrackingService);
    /**
     * Check if Teams message should be sent for this notification
     */
    private shouldSendTeams;
    /**
     * Send Teams notification
     * This is called when a notification is created
     */
    sendTeamsNotification(notification: Notification, teamsConfig: TeamsConfig): Promise<{
        success: boolean;
        error?: string;
        statusCode?: number;
        messageId?: string;
    }>;
    /**
     * Build Teams message payload with Adaptive Cards (MessageCard format)
     */
    private buildTeamsPayload;
    /**
     * Build facts array for Teams card
     */
    private buildFacts;
    /**
     * Get theme color for notification type
     */
    private getThemeColor;
    /**
     * Get type label for Teams card
     */
    private getTypeLabel;
}
//# sourceMappingURL=teams-notification.service.d.ts.map