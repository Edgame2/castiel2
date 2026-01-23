/**
 * Webhook Notification Service
 * 
 * Handles sending notification webhooks to external endpoints.
 * Integrates with DeliveryTrackingService for delivery tracking and retry logic.
 */

import { Notification, NotificationType } from '../../types/notification.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { DeliveryTrackingService } from './delivery-tracking.service.js';
import crypto from 'crypto';

export interface WebhookNotificationConfig {
  enabled: boolean;
  sendForTypes?: NotificationType[]; // Only send webhooks for these types (default: all)
  skipForLowPriority?: boolean; // Skip webhook for low priority notifications
  defaultTimeout?: number; // Default timeout in milliseconds (default: 5000)
  maxRetries?: number; // Max retry attempts (default: 3)
}

export interface WebhookConfig {
  url: string;
  secret?: string; // For HMAC signature
  headers?: Record<string, string>;
  timeout?: number; // Request timeout in milliseconds
}

/**
 * Webhook Notification Service
 * Sends webhook notifications when in-app notifications are created
 */
export class WebhookNotificationService {
  private config: WebhookNotificationConfig;
  private monitoring: IMonitoringProvider;
  private deliveryTracking?: DeliveryTrackingService;

  constructor(
    config: WebhookNotificationConfig,
    monitoring: IMonitoringProvider,
    deliveryTracking?: DeliveryTrackingService
  ) {
    this.config = {
      enabled: config.enabled,
      sendForTypes: config.sendForTypes || ['success', 'error', 'warning', 'information', 'alert'],
      skipForLowPriority: config.skipForLowPriority ?? false,
      defaultTimeout: config.defaultTimeout || 5000,
      maxRetries: config.maxRetries || 3,
    };
    this.monitoring = monitoring;
    this.deliveryTracking = deliveryTracking;
  }

  /**
   * Check if webhook should be sent for this notification
   */
  private shouldSendWebhook(notification: Notification, webhookConfig: WebhookConfig): boolean {
    if (!this.config.enabled) {
      return false;
    }

    if (!webhookConfig.url) {
      return false;
    }

    // Check notification type
    if (this.config.sendForTypes && !this.config.sendForTypes.includes(notification.type)) {
      return false;
    }

    // Skip low priority if configured
    if (this.config.skipForLowPriority && notification.priority === 'low') {
      return false;
    }

    return true;
  }

  /**
   * Send webhook notification
   * This is called when a notification is created
   */
  async sendWebhookNotification(
    notification: Notification,
    webhookConfig: WebhookConfig
  ): Promise<{ success: boolean; error?: string; statusCode?: number }> {
    if (!this.shouldSendWebhook(notification, webhookConfig)) {
      // Record skipped attempt
      if (this.deliveryTracking) {
        try {
          await this.deliveryTracking.recordAttempt(notification, {
            channel: 'webhook',
            status: 'pending',
            error: 'Webhook notification skipped by configuration',
          });
        } catch (error) {
          // Don't fail if tracking fails
          this.monitoring.trackException(error as Error, {
            operation: 'webhook_notification.tracking',
            notificationId: notification.id,
          });
        }
      }
      return { success: false, error: 'Webhook notification skipped' };
    }

    // Check if we should retry
    if (this.deliveryTracking && !this.deliveryTracking.shouldRetry(notification, 'webhook')) {
      return { success: false, error: 'Webhook notification not ready for retry or max attempts reached' };
    }

    try {
      const payload = this.buildWebhookPayload(notification);
      const headers = this.buildWebhookHeaders(notification, webhookConfig, payload);

      // Record attempt as sent
      if (this.deliveryTracking) {
        try {
          await this.deliveryTracking.recordAttempt(notification, {
            channel: 'webhook',
            status: 'sent',
            metadata: {
              url: webhookConfig.url,
            },
          });
        } catch (error) {
          // Don't fail if tracking fails
          this.monitoring.trackException(error as Error, {
            operation: 'webhook_notification.tracking',
            notificationId: notification.id,
          });
        }
      }

      const timeout = webhookConfig.timeout || this.config.defaultTimeout || 5000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(webhookConfig.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          // Record successful delivery
          if (this.deliveryTracking) {
            try {
              const responseBody = await response.text();
              await this.deliveryTracking.recordAttempt(notification, {
                channel: 'webhook',
                status: 'delivered',
                metadata: {
                  url: webhookConfig.url,
                  statusCode: response.status,
                  responseBody: responseBody.substring(0, 500), // Limit response body size
                },
              });
            } catch (error) {
              // Don't fail if tracking fails
              this.monitoring.trackException(error as Error, {
                operation: 'webhook_notification.tracking',
                notificationId: notification.id,
              });
            }
          }

          this.monitoring.trackEvent('webhook_notification.sent', {
            notificationId: notification.id,
            notificationType: notification.type,
            statusCode: response.status,
          });

          return { success: true, statusCode: response.status };
        } else {
          // Record failed delivery
          const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          if (this.deliveryTracking) {
            try {
              await this.deliveryTracking.recordAttempt(notification, {
                channel: 'webhook',
                status: 'failed',
                error: errorMessage,
                metadata: {
                  url: webhookConfig.url,
                  statusCode: response.status,
                },
              });
            } catch (error) {
              // Don't fail if tracking fails
              this.monitoring.trackException(error as Error, {
                operation: 'webhook_notification.tracking',
                notificationId: notification.id,
              });
            }
          }

          this.monitoring.trackEvent('webhook_notification.failed', {
            notificationId: notification.id,
            statusCode: response.status,
            error: errorMessage,
          });

          return { success: false, error: errorMessage, statusCode: response.status };
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          const errorMessage = `Request timeout after ${timeout}ms`;
          if (this.deliveryTracking) {
            try {
              await this.deliveryTracking.recordAttempt(notification, {
                channel: 'webhook',
                status: 'failed',
                error: errorMessage,
                metadata: {
                  url: webhookConfig.url,
                },
              });
            } catch (error) {
              // Don't fail if tracking fails
              this.monitoring.trackException(error as Error, {
                operation: 'webhook_notification.tracking',
                notificationId: notification.id,
              });
            }
          }
          return { success: false, error: errorMessage };
        }

        throw fetchError;
      }
    } catch (error) {
      // Record failed delivery
      const errorMessage = (error as Error).message;
      if (this.deliveryTracking) {
        try {
          await this.deliveryTracking.recordAttempt(notification, {
            channel: 'webhook',
            status: 'failed',
            error: errorMessage,
            metadata: {
              url: webhookConfig.url,
            },
          });
        } catch (trackingError) {
          // Don't fail if tracking fails
          this.monitoring.trackException(trackingError as Error, {
            operation: 'webhook_notification.tracking',
            notificationId: notification.id,
          });
        }
      }

      this.monitoring.trackException(error as Error, {
        operation: 'webhook_notification.send',
        notificationId: notification.id,
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Build webhook payload from notification
   */
  private buildWebhookPayload(notification: Notification): Record<string, any> {
    return {
      id: notification.id,
      type: notification.type,
      priority: notification.priority,
      name: notification.name,
      content: notification.content,
      link: notification.link,
      status: notification.status,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
      metadata: notification.metadata,
      createdBy: notification.createdBy,
    };
  }

  /**
   * Build webhook headers including HMAC signature if secret is provided
   */
  private buildWebhookHeaders(
    notification: Notification,
    webhookConfig: WebhookConfig,
    payload: Record<string, any>
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Castiel-Notification-Webhook/1.0',
      'X-Notification-Id': notification.id,
      'X-Notification-Type': notification.type,
      ...webhookConfig.headers,
    };

    // Add HMAC signature if secret is provided
    if (webhookConfig.secret) {
      const payloadString = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', webhookConfig.secret)
        .update(payloadString)
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    return headers;
  }
}










