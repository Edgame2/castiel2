/**
 * Webhook Notification Service
 *
 * Handles sending notification webhooks to external endpoints.
 * Integrates with DeliveryTrackingService for delivery tracking and retry logic.
 */
import { Notification, NotificationType } from '../../types/notification.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { DeliveryTrackingService } from './delivery-tracking.service.js';
export interface WebhookNotificationConfig {
    enabled: boolean;
    sendForTypes?: NotificationType[];
    skipForLowPriority?: boolean;
    defaultTimeout?: number;
    maxRetries?: number;
}
export interface WebhookConfig {
    url: string;
    secret?: string;
    headers?: Record<string, string>;
    timeout?: number;
}
/**
 * Webhook Notification Service
 * Sends webhook notifications when in-app notifications are created
 */
export declare class WebhookNotificationService {
    private config;
    private monitoring;
    private deliveryTracking?;
    constructor(config: WebhookNotificationConfig, monitoring: IMonitoringProvider, deliveryTracking?: DeliveryTrackingService);
    /**
     * Check if webhook should be sent for this notification
     */
    private shouldSendWebhook;
    /**
     * Send webhook notification
     * This is called when a notification is created
     */
    sendWebhookNotification(notification: Notification, webhookConfig: WebhookConfig): Promise<{
        success: boolean;
        error?: string;
        statusCode?: number;
    }>;
    /**
     * Build webhook payload from notification
     */
    private buildWebhookPayload;
    /**
     * Build webhook headers including HMAC signature if secret is provided
     */
    private buildWebhookHeaders;
}
//# sourceMappingURL=webhook-notification.service.d.ts.map