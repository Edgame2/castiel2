/**
 * Teams Notification Service
 * 
 * Handles sending notification messages to Microsoft Teams channels using incoming webhooks.
 * Supports Microsoft Adaptive Cards (MessageCard format) for rich messages.
 * Integrates with DeliveryTrackingService for delivery tracking and retry logic.
 */

import { Notification, NotificationType } from '../../../types/notification.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { DeliveryTrackingService } from './delivery-tracking.service.js';

export interface TeamsNotificationConfig {
  enabled: boolean;
  sendForTypes?: NotificationType[]; // Only send Teams messages for these types (default: all)
  skipForLowPriority?: boolean; // Skip Teams message for low priority notifications
  defaultTimeout?: number; // Default timeout in milliseconds (default: 10000)
  maxRetries?: number; // Max retry attempts (default: 3)
}

export interface TeamsConfig {
  webhookUrl: string;
  channel?: string; // Optional channel override (for reference)
}

/**
 * Teams MessageCard structure (Adaptive Cards v1.0)
 */
interface TeamsMessageCard {
  '@type': string;
  '@context': string;
  summary: string;
  themeColor?: string;
  title?: string;
  text?: string;
  sections?: TeamsSection[];
  potentialAction?: TeamsAction[];
}

interface TeamsSection {
  activityTitle?: string;
  activitySubtitle?: string;
  activityImage?: string;
  facts?: Array<{ name: string; value: string }>;
  text?: string;
  markdown?: boolean;
}

interface TeamsAction {
  '@type': string;
  name: string;
  targets?: Array<{ os: string; uri: string }>;
}

/**
 * Teams Notification Service
 * Sends Teams notifications when in-app notifications are created
 */
export class TeamsNotificationService {
  private config: TeamsNotificationConfig;
  private monitoring: IMonitoringProvider;
  private deliveryTracking?: DeliveryTrackingService;

  constructor(
    config: TeamsNotificationConfig,
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
   * Check if Teams message should be sent for this notification
   */
  private shouldSendTeams(notification: Notification, teamsConfig: TeamsConfig): boolean {
    if (!this.config.enabled) {
      return false;
    }

    if (!teamsConfig.webhookUrl) {
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
   * Send Teams notification
   * This is called when a notification is created
   */
  async sendTeamsNotification(
    notification: Notification,
    teamsConfig: TeamsConfig
  ): Promise<{ success: boolean; error?: string; statusCode?: number; messageId?: string }> {
    if (!this.shouldSendTeams(notification, teamsConfig)) {
      // Record skipped attempt
      if (this.deliveryTracking) {
        try {
          await this.deliveryTracking.recordAttempt(notification, {
            channel: 'teams',
            status: 'pending',
            error: 'Teams notification skipped by configuration',
          });
        } catch (error) {
          // Don't fail if tracking fails
          this.monitoring.trackException(error as Error, {
            operation: 'teams_notification.tracking',
            notificationId: notification.id,
          });
        }
      }
      return { success: false, error: 'Teams notification skipped' };
    }

    // Check if we should retry
    if (this.deliveryTracking && !this.deliveryTracking.shouldRetry(notification, 'teams')) {
      return { success: false, error: 'Teams notification not ready for retry or max attempts reached' };
    }

    try {
      const payload = this.buildTeamsPayload(notification);

      // Record attempt as sent
      if (this.deliveryTracking) {
        try {
          await this.deliveryTracking.recordAttempt(notification, {
            channel: 'teams',
            status: 'sent',
            metadata: {
              webhookUrl: teamsConfig.webhookUrl,
              channel: teamsConfig.channel,
            },
          });
        } catch (error) {
          // Don't fail if tracking fails
          this.monitoring.trackException(error as Error, {
            operation: 'teams_notification.tracking',
            notificationId: notification.id,
          });
        }
      }

      const timeout = this.config.defaultTimeout || 10000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(teamsConfig.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          // Teams returns 200 on success, message ID in headers
          const messageId = response.headers.get('x-ms-request-id') || undefined;

          // Record successful delivery
          if (this.deliveryTracking) {
            try {
              await this.deliveryTracking.recordAttempt(notification, {
                channel: 'teams',
                status: 'delivered',
                metadata: {
                  webhookUrl: teamsConfig.webhookUrl,
                  channel: teamsConfig.channel,
                  messageId,
                  statusCode: response.status,
                },
              });
            } catch (error) {
              // Don't fail if tracking fails
              this.monitoring.trackException(error as Error, {
                operation: 'teams_notification.tracking',
                notificationId: notification.id,
              });
            }
          }

          this.monitoring.trackEvent('teams_notification.sent', {
            notificationId: notification.id,
            notificationType: notification.type,
            statusCode: response.status,
            messageId,
          });

          return { success: true, statusCode: response.status, messageId };
        } else {
          // Record failed delivery
          const responseText = await response.text();
          const errorMessage = `HTTP ${response.status}: ${responseText}`;
          if (this.deliveryTracking) {
            try {
              await this.deliveryTracking.recordAttempt(notification, {
                channel: 'teams',
                status: 'failed',
                error: errorMessage,
                metadata: {
                  webhookUrl: teamsConfig.webhookUrl,
                  channel: teamsConfig.channel,
                  statusCode: response.status,
                },
              });
            } catch (error) {
              // Don't fail if tracking fails
              this.monitoring.trackException(error as Error, {
                operation: 'teams_notification.tracking',
                notificationId: notification.id,
              });
            }
          }

          this.monitoring.trackEvent('teams_notification.failed', {
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
                channel: 'teams',
                status: 'failed',
                error: errorMessage,
                metadata: {
                  webhookUrl: teamsConfig.webhookUrl,
                  channel: teamsConfig.channel,
                },
              });
            } catch (error) {
              // Don't fail if tracking fails
              this.monitoring.trackException(error as Error, {
                operation: 'teams_notification.tracking',
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
            channel: 'teams',
            status: 'failed',
            error: errorMessage,
            metadata: {
              webhookUrl: teamsConfig.webhookUrl,
              channel: teamsConfig.channel,
            },
          });
        } catch (trackingError) {
          // Don't fail if tracking fails
          this.monitoring.trackException(trackingError as Error, {
            operation: 'teams_notification.tracking',
            notificationId: notification.id,
          });
        }
      }

      this.monitoring.trackException(error as Error, {
        operation: 'teams_notification.send',
        notificationId: notification.id,
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Build Teams message payload with Adaptive Cards (MessageCard format)
   */
  private buildTeamsPayload(notification: Notification): TeamsMessageCard {
    const themeColor = this.getThemeColor(notification.type);
    const summary = `${notification.name}: ${notification.content}`;

    const card: TeamsMessageCard = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary,
      themeColor,
      title: notification.name,
      text: notification.content,
    };

    // Add sections with metadata
    const sections: TeamsSection[] = [];

    // Main content section
    sections.push({
      activityTitle: notification.name,
      activitySubtitle: this.getTypeLabel(notification.type),
      text: notification.content,
      markdown: true,
      facts: this.buildFacts(notification),
    });

    card.sections = sections;

    // Add action button if link is available
    if (notification.link) {
      card.potentialAction = [
        {
          '@type': 'OpenUri',
          name: 'View Details',
          targets: [
            {
              os: 'default',
              uri: notification.link,
            },
          ],
        },
      ];
    }

    return card;
  }

  /**
   * Build facts array for Teams card
   */
  private buildFacts(notification: Notification): Array<{ name: string; value: string }> {
    const facts: Array<{ name: string; value: string }> = [];

    facts.push({
      name: 'Type',
      value: notification.type,
    });

    if (notification.priority) {
      facts.push({
        name: 'Priority',
        value: notification.priority,
      });
    }

    if (notification.createdAt) {
      const date = new Date(notification.createdAt);
      facts.push({
        name: 'Created',
        value: date.toLocaleString(),
      });
    }

    if (notification.createdBy?.name) {
      facts.push({
        name: 'From',
        value: notification.createdBy.name,
      });
    }

    return facts;
  }

  /**
   * Get theme color for notification type
   */
  private getThemeColor(type: NotificationType): string {
    const colors: Record<NotificationType, string> = {
      success: '28a745', // Green
      error: 'dc3545',   // Red
      warning: 'ffc107', // Yellow
      information: '17a2b8', // Blue
      alert: 'fd7e14',   // Orange
    };
    return colors[type] || '0078D4'; // Default Teams blue
  }

  /**
   * Get type label for Teams card
   */
  private getTypeLabel(type: NotificationType): string {
    const labels: Record<NotificationType, string> = {
      success: 'Success Notification',
      error: 'Error Notification',
      warning: 'Warning Notification',
      information: 'Information',
      alert: 'Alert',
    };
    return labels[type] || 'Notification';
  }
}










