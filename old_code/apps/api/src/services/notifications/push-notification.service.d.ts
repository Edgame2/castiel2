/**
 * Push Notification Service
 *
 * Handles sending web push notifications to user devices.
 * Supports Web Push API with VAPID authentication.
 * Integrates with DeliveryTrackingService for delivery tracking and retry logic.
 */
import { Notification, NotificationType } from '../../types/notification.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { DeliveryTrackingService } from './delivery-tracking.service.js';
export interface PushNotificationConfig {
    enabled: boolean;
    sendForTypes?: NotificationType[];
    skipForLowPriority?: boolean;
    vapidPublicKey?: string;
    vapidPrivateKey?: string;
    vapidSubject?: string;
}
export interface PushDevice {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    platform?: string;
}
export interface PushConfig {
    devices: PushDevice[];
}
/**
 * Push Notification Service
 * Sends push notifications when in-app notifications are created
 */
export declare class PushNotificationService {
    private config;
    private monitoring;
    private deliveryTracking?;
    private webPush?;
    constructor(config: PushNotificationConfig, monitoring: IMonitoringProvider, deliveryTracking?: DeliveryTrackingService);
    /**
     * Initialize web-push library (lazy load)
     */
    private getWebPush;
    /**
     * Check if push should be sent for this notification
     */
    private shouldSendPush;
    /**
     * Send push notification to user's devices
     */
    sendPushNotification(notification: Notification, pushConfig: PushConfig): Promise<{
        success: boolean;
        error?: string;
        sentCount?: number;
        failedCount?: number;
    }>;
    /**
     * Build push notification payload
     */
    private buildPushPayload;
    /**
     * Get VAPID public key (for frontend subscription)
     */
    getVapidPublicKey(): string | undefined;
}
//# sourceMappingURL=push-notification.service.d.ts.map