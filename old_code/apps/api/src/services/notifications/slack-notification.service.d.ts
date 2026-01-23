/**
 * Slack Notification Service
 *
 * Handles sending notification messages to Slack channels using incoming webhooks.
 * Supports Slack Block Kit formatting for rich messages.
 * Integrates with DeliveryTrackingService for delivery tracking and retry logic.
 */
import { Notification, NotificationType } from '../../types/notification.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { DeliveryTrackingService } from './delivery-tracking.service.js';
export interface SlackNotificationConfig {
    enabled: boolean;
    sendForTypes?: NotificationType[];
    skipForLowPriority?: boolean;
    defaultTimeout?: number;
    maxRetries?: number;
}
export interface SlackConfig {
    webhookUrl: string;
    channel?: string;
    username?: string;
    iconEmoji?: string;
    iconUrl?: string;
}
/**
 * Slack Notification Service
 * Sends Slack notifications when in-app notifications are created
 */
export declare class SlackNotificationService {
    private config;
    private monitoring;
    private deliveryTracking?;
    constructor(config: SlackNotificationConfig, monitoring: IMonitoringProvider, deliveryTracking?: DeliveryTrackingService);
    /**
     * Check if Slack message should be sent for this notification
     */
    private shouldSendSlack;
    /**
     * Send Slack notification
     * This is called when a notification is created
     */
    sendSlackNotification(notification: Notification, slackConfig: SlackConfig): Promise<{
        success: boolean;
        error?: string;
        statusCode?: number;
        messageTs?: string;
    }>;
    /**
     * Build Slack message payload with Block Kit formatting
     */
    private buildSlackPayload;
    /**
     * Get emoji for notification type
     */
    private getTypeEmoji;
    /**
     * Get button style for notification type
     */
    private getButtonStyle;
}
//# sourceMappingURL=slack-notification.service.d.ts.map