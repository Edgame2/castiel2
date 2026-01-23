/**
 * Delivery Tracking Service
 *
 * Tracks delivery status for notifications across all channels.
 * Handles retry logic with exponential backoff and bounce handling.
 */
import type { IMonitoringProvider } from '@castiel/monitoring';
import { Notification, DeliveryRecord, DeliveryStatus, DeliveryChannel } from '../../types/notification.types.js';
import { NotificationRepository } from '../../repositories/notification.repository.js';
export interface DeliveryAttempt {
    channel: DeliveryChannel;
    status: DeliveryStatus;
    error?: string;
    metadata?: Record<string, any>;
}
export interface RetryConfig {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
}
/**
 * Delivery Tracking Service
 */
export declare class DeliveryTrackingService {
    private repository;
    private monitoring;
    private retryConfig;
    constructor(repository: NotificationRepository, monitoring: IMonitoringProvider, retryConfig?: RetryConfig);
    /**
     * Record a delivery attempt
     */
    recordAttempt(notification: Notification, attempt: DeliveryAttempt): Promise<Notification>;
    /**
     * Get delivery status for a notification
     */
    getDeliveryStatus(notification: Notification, channel?: DeliveryChannel): DeliveryRecord[];
    /**
     * Check if a delivery should be retried
     */
    shouldRetry(notification: Notification, channel: DeliveryChannel): boolean;
    /**
     * Get next retry delay for a failed delivery
     */
    getRetryDelay(notification: Notification, channel: DeliveryChannel): number;
    /**
     * Mark delivery as bounced
     */
    markBounced(notification: Notification, channel: DeliveryChannel, bounceType: 'hard' | 'soft', reason: string): Promise<Notification>;
    /**
     * Mark delivery as unsubscribed
     */
    markUnsubscribed(notification: Notification, channel: DeliveryChannel, reason: string): Promise<Notification>;
}
//# sourceMappingURL=delivery-tracking.service.d.ts.map