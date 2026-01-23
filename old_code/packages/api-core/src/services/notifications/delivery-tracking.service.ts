/**
 * Delivery Tracking Service
 * 
 * Tracks delivery status for notifications across all channels.
 * Handles retry logic with exponential backoff and bounce handling.
 */

import type { IMonitoringProvider } from '@castiel/monitoring';
import {
  Notification,
  DeliveryRecord,
  DeliveryStatus,
  DeliveryChannel,
} from '../../../types/notification.types.js';
import { NotificationRepository } from '../../../repositories/notification.repository.js';

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

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 300000, // 5 minutes
  backoffMultiplier: 2,
};

/**
 * Delivery Tracking Service
 */
export class DeliveryTrackingService {
  private repository: NotificationRepository;
  private monitoring: IMonitoringProvider;
  private retryConfig: Required<RetryConfig>;

  constructor(
    repository: NotificationRepository,
    monitoring: IMonitoringProvider,
    retryConfig?: RetryConfig
  ) {
    this.repository = repository;
    this.monitoring = monitoring;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Record a delivery attempt
   */
  async recordAttempt(
    notification: Notification,
    attempt: DeliveryAttempt
  ): Promise<Notification> {
    const now = new Date().toISOString();
    const delivery = notification.delivery || { channels: [], lastUpdated: now };

    // Find existing record for this channel
    let record = delivery.channels.find(r => r.channel === attempt.channel);

    if (record) {
      // Update existing record
      record.attempts += 1;
      record.status = attempt.status;

      if (attempt.status === 'sent') {
        record.sentAt = record.sentAt || now;
      } else if (attempt.status === 'delivered') {
        record.deliveredAt = now;
        record.status = 'delivered';
      } else if (attempt.status === 'failed') {
        record.failedAt = now;
        record.error = attempt.error;
        
        // Calculate retry time with exponential backoff
        if (record.attempts < this.retryConfig.maxAttempts) {
          const delay = Math.min(
            this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, record.attempts - 1),
            this.retryConfig.maxDelayMs
          );
          record.retryAfter = new Date(Date.now() + delay).toISOString();
          record.status = 'pending'; // Reset to pending for retry
        } else {
          record.status = 'failed';
        }
      } else if (attempt.status === 'bounced') {
        record.failedAt = now;
        record.status = 'bounced';
        record.error = attempt.error;
        record.metadata = {
          ...record.metadata,
          bounceType: attempt.metadata?.bounceType || 'hard',
          bounceReason: attempt.error,
        };
      } else if (attempt.status === 'unsubscribed') {
        record.failedAt = now;
        record.status = 'unsubscribed';
        record.error = attempt.error;
        record.metadata = {
          ...record.metadata,
          unsubscribeReason: attempt.error,
        };
      }

      // Update metadata
      if (attempt.metadata) {
        record.metadata = {
          ...record.metadata,
          ...attempt.metadata,
        };
      }
    } else {
      // Create new record
      record = {
        channel: attempt.channel,
        status: attempt.status,
        attempts: 1,
        metadata: attempt.metadata || {},
      };

      if (attempt.status === 'sent') {
        record.sentAt = now;
      } else if (attempt.status === 'delivered') {
        record.sentAt = now;
        record.deliveredAt = now;
      } else if (attempt.status === 'failed') {
        record.failedAt = now;
        record.error = attempt.error;
        
        // Calculate retry time
        if (record.attempts < this.retryConfig.maxAttempts) {
          const delay = this.retryConfig.initialDelayMs;
          record.retryAfter = new Date(Date.now() + delay).toISOString();
          record.status = 'pending';
        }
      } else if (attempt.status === 'bounced') {
        record.failedAt = now;
        record.error = attempt.error;
        record.metadata = {
          bounceType: attempt.metadata?.bounceType || 'hard',
          bounceReason: attempt.error,
        };
      } else if (attempt.status === 'unsubscribed') {
        record.failedAt = now;
        record.error = attempt.error;
        record.metadata = {
          unsubscribeReason: attempt.error,
        };
      }

      delivery.channels.push(record);
    }

    // Update notification with delivery tracking
    const updated: Notification = {
      ...notification,
      delivery: {
        ...delivery,
        lastUpdated: now,
      },
    };

    // Track event
    this.monitoring.trackEvent('notification.delivery.recorded', {
      notificationId: notification.id,
      channel: attempt.channel,
      status: attempt.status,
      attempts: record.attempts,
    });

    // Save to repository
    const saved = await this.repository.update(
      notification.id,
      notification.tenantId,
      notification.userId,
      { delivery: updated.delivery }
    );

    if (!saved) {
      throw new Error('Failed to update notification delivery tracking');
    }

    return saved;
  }

  /**
   * Get delivery status for a notification
   */
  getDeliveryStatus(notification: Notification, channel?: DeliveryChannel): DeliveryRecord[] {
    if (!notification.delivery) {
      return [];
    }

    if (channel) {
      return notification.delivery.channels.filter(r => r.channel === channel);
    }

    return notification.delivery.channels;
  }

  /**
   * Check if a delivery should be retried
   */
  shouldRetry(notification: Notification, channel: DeliveryChannel): boolean {
    const records = this.getDeliveryStatus(notification, channel);
    if (records.length === 0) {
      return true; // Never attempted, should try
    }

    const record = records[0]; // Get most recent record for this channel

    if (record.status !== 'pending' && record.status !== 'failed') {
      return false; // Already delivered, bounced, or unsubscribed
    }

    if (record.attempts >= this.retryConfig.maxAttempts) {
      return false; // Max attempts reached
    }

    if (record.retryAfter) {
      const retryTime = new Date(record.retryAfter);
      if (retryTime > new Date()) {
        return false; // Not time to retry yet
      }
    }

    return true;
  }

  /**
   * Get next retry delay for a failed delivery
   */
  getRetryDelay(notification: Notification, channel: DeliveryChannel): number {
    const records = this.getDeliveryStatus(notification, channel);
    if (records.length === 0) {
      return 0; // No delay for first attempt
    }

    const record = records[0];
    const attempts = record.attempts || 1;

    const delay = Math.min(
      this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempts - 1),
      this.retryConfig.maxDelayMs
    );

    return delay;
  }

  /**
   * Mark delivery as bounced
   */
  async markBounced(
    notification: Notification,
    channel: DeliveryChannel,
    bounceType: 'hard' | 'soft',
    reason: string
  ): Promise<Notification> {
    return this.recordAttempt(notification, {
      channel,
      status: 'bounced',
      error: reason,
      metadata: {
        bounceType,
        bounceReason: reason,
      },
    });
  }

  /**
   * Mark delivery as unsubscribed
   */
  async markUnsubscribed(
    notification: Notification,
    channel: DeliveryChannel,
    reason: string
  ): Promise<Notification> {
    return this.recordAttempt(notification, {
      channel,
      status: 'unsubscribed',
      error: reason,
      metadata: {
        unsubscribeReason: reason,
      },
    });
  }
}

