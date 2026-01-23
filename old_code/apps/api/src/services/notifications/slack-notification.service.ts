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
  sendForTypes?: NotificationType[]; // Only send Slack messages for these types (default: all)
  skipForLowPriority?: boolean; // Skip Slack message for low priority notifications
  defaultTimeout?: number; // Default timeout in milliseconds (default: 10000)
  maxRetries?: number; // Max retry attempts (default: 3)
}

export interface SlackConfig {
  webhookUrl: string;
  channel?: string; // Optional channel override
  username?: string; // Optional bot username
  iconEmoji?: string; // Optional bot icon emoji (e.g., ':bell:')
  iconUrl?: string; // Optional bot icon URL
}

/**
 * Slack Block Kit block types
 */
interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
    emoji?: boolean;
  }>;
  accessory?: any;
  elements?: any[];
  [key: string]: any;
}

/**
 * Slack message payload
 */
interface SlackMessagePayload {
  text?: string; // Fallback text
  blocks?: SlackBlock[];
  channel?: string;
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
}

/**
 * Slack Notification Service
 * Sends Slack notifications when in-app notifications are created
 */
export class SlackNotificationService {
  private config: SlackNotificationConfig;
  private monitoring: IMonitoringProvider;
  private deliveryTracking?: DeliveryTrackingService;

  constructor(
    config: SlackNotificationConfig,
    monitoring: IMonitoringProvider,
    deliveryTracking?: DeliveryTrackingService
  ) {
    this.config = {
      enabled: config.enabled,
      sendForTypes: config.sendForTypes || ['success', 'error', 'warning', 'information', 'alert'],
      skipForLowPriority: config.skipForLowPriority ?? false,
      defaultTimeout: config.defaultTimeout || 10000,
      maxRetries: config.maxRetries || 3,
    };
    this.monitoring = monitoring;
    this.deliveryTracking = deliveryTracking;
  }

  /**
   * Check if Slack message should be sent for this notification
   */
  private shouldSendSlack(notification: Notification, slackConfig: SlackConfig): boolean {
    if (!this.config.enabled) {
      return false;
    }

    if (!slackConfig.webhookUrl) {
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
   * Send Slack notification
   * This is called when a notification is created
   */
  async sendSlackNotification(
    notification: Notification,
    slackConfig: SlackConfig
  ): Promise<{ success: boolean; error?: string; statusCode?: number; messageTs?: string }> {
    if (!this.shouldSendSlack(notification, slackConfig)) {
      // Record skipped attempt
      if (this.deliveryTracking) {
        try {
          await this.deliveryTracking.recordAttempt(notification, {
            channel: 'slack',
            status: 'pending',
            error: 'Slack notification skipped by configuration',
          });
        } catch (error) {
          // Don't fail if tracking fails
          this.monitoring.trackException(error as Error, {
            operation: 'slack_notification.tracking',
            notificationId: notification.id,
          });
        }
      }
      return { success: false, error: 'Slack notification skipped' };
    }

    // Check if we should retry
    if (this.deliveryTracking && !this.deliveryTracking.shouldRetry(notification, 'slack')) {
      return { success: false, error: 'Slack notification not ready for retry or max attempts reached' };
    }

    try {
      const payload = this.buildSlackPayload(notification, slackConfig);

      // Record attempt as sent
      if (this.deliveryTracking) {
        try {
          await this.deliveryTracking.recordAttempt(notification, {
            channel: 'slack',
            status: 'sent',
            metadata: {
              webhookUrl: slackConfig.webhookUrl,
              channel: slackConfig.channel,
            },
          });
        } catch (error) {
          // Don't fail if tracking fails
          this.monitoring.trackException(error as Error, {
            operation: 'slack_notification.tracking',
            notificationId: notification.id,
          });
        }
      }

      const timeout = this.config.defaultTimeout || 10000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(slackConfig.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Slack returns 'ok' as plain text for successful webhooks
        const responseText = await response.text();

        if (response.ok && responseText === 'ok') {
          // Record successful delivery
          if (this.deliveryTracking) {
            try {
              const messageTs = response.headers.get('x-slack-req-id') || undefined;
              await this.deliveryTracking.recordAttempt(notification, {
                channel: 'slack',
                status: 'delivered',
                metadata: {
                  webhookUrl: slackConfig.webhookUrl,
                  channel: slackConfig.channel,
                  messageTs,
                  statusCode: response.status,
                },
              });
            } catch (error) {
              // Don't fail if tracking fails
              this.monitoring.trackException(error as Error, {
                operation: 'slack_notification.tracking',
                notificationId: notification.id,
              });
            }
          }

          const messageTs = response.headers.get('x-slack-req-id') || undefined;
          this.monitoring.trackEvent('slack_notification.sent', {
            notificationId: notification.id,
            notificationType: notification.type,
            statusCode: response.status,
            messageTs,
          });

          return { success: true, statusCode: response.status, messageTs };
        } else {
          // Record failed delivery
          const errorMessage = `HTTP ${response.status}: ${responseText}`;
          if (this.deliveryTracking) {
            try {
              await this.deliveryTracking.recordAttempt(notification, {
                channel: 'slack',
                status: 'failed',
                error: errorMessage,
                metadata: {
                  webhookUrl: slackConfig.webhookUrl,
                  channel: slackConfig.channel,
                  statusCode: response.status,
                },
              });
            } catch (error) {
              // Don't fail if tracking fails
              this.monitoring.trackException(error as Error, {
                operation: 'slack_notification.tracking',
                notificationId: notification.id,
              });
            }
          }

          this.monitoring.trackEvent('slack_notification.failed', {
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
                channel: 'slack',
                status: 'failed',
                error: errorMessage,
                metadata: {
                  webhookUrl: slackConfig.webhookUrl,
                  channel: slackConfig.channel,
                },
              });
            } catch (error) {
              // Don't fail if tracking fails
              this.monitoring.trackException(error as Error, {
                operation: 'slack_notification.tracking',
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
            channel: 'slack',
            status: 'failed',
            error: errorMessage,
            metadata: {
              webhookUrl: slackConfig.webhookUrl,
              channel: slackConfig.channel,
            },
          });
        } catch (trackingError) {
          // Don't fail if tracking fails
          this.monitoring.trackException(trackingError as Error, {
            operation: 'slack_notification.tracking',
            notificationId: notification.id,
          });
        }
      }

      this.monitoring.trackException(error as Error, {
        operation: 'slack_notification.send',
        notificationId: notification.id,
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Build Slack message payload with Block Kit formatting
   */
  private buildSlackPayload(notification: Notification, slackConfig: SlackConfig): SlackMessagePayload {
    const blocks: SlackBlock[] = [];

    // Header block with notification type and name
    const typeEmoji = this.getTypeEmoji(notification.type);
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${typeEmoji} ${notification.name}`,
        emoji: true,
      },
    });

    // Content block
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: notification.content,
      },
    });

    // Fields block with metadata
    const fields: Array<{ type: string; text: string }> = [
      {
        type: 'mrkdwn',
        text: `*Type:*\n${notification.type}`,
      },
    ];

    if (notification.priority) {
      fields.push({
        type: 'mrkdwn',
        text: `*Priority:*\n${notification.priority}`,
      });
    }

    if (notification.link) {
      fields.push({
        type: 'mrkdwn',
        text: `*Link:*\n<${notification.link}|View Details>`,
      });
    }

    if (fields.length > 1) {
      blocks.push({
        type: 'section',
        fields,
      });
    }

    // Link button if available
    if (notification.link) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Details',
            },
            url: notification.link,
            style: this.getButtonStyle(notification.type),
          },
        ],
      });
    }

    // Divider
    blocks.push({
      type: 'divider',
    });

    // Footer with timestamp
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Created: <!date^${Math.floor(new Date(notification.createdAt).getTime() / 1000)}^{date_short_pretty} at {time_secs}|${notification.createdAt}>`,
        },
      ],
    });

    const payload: SlackMessagePayload = {
      text: `${typeEmoji} ${notification.name}: ${notification.content}`, // Fallback text
      blocks,
    };

    // Add optional overrides
    if (slackConfig.channel) {
      payload.channel = slackConfig.channel;
    }
    if (slackConfig.username) {
      payload.username = slackConfig.username;
    }
    if (slackConfig.iconEmoji) {
      payload.icon_emoji = slackConfig.iconEmoji;
    }
    if (slackConfig.iconUrl) {
      payload.icon_url = slackConfig.iconUrl;
    }

    return payload;
  }

  /**
   * Get emoji for notification type
   */
  private getTypeEmoji(type: NotificationType): string {
    const emojis: Record<NotificationType, string> = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      information: 'ℹ️',
      alert: '🚨',
    };
    return emojis[type] || '📢';
  }

  /**
   * Get button style for notification type
   */
  private getButtonStyle(type: NotificationType): 'primary' | 'danger' | undefined {
    if (type === 'error' || type === 'alert') {
      return 'danger';
    }
    if (type === 'success') {
      return 'primary';
    }
    return undefined;
  }
}










