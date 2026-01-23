/**
 * Slack Channel Adapter
 * Formats and delivers notifications to Slack using Block Kit
 */

import axios, { AxiosError } from 'axios';
// @ts-ignore - notification.types may not exist
import { QueuedNotification, NotificationEventType } from '../types/notification.types';
import type { IMonitoringProvider } from '@castiel/monitoring';

/**
 * Slack message block structure
 */
interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: any[];
  fields?: {
    type: string;
    text: string;
  }[];
  accessory?: any;
}

/**
 * Slack message payload
 */
interface SlackMessagePayload {
  text: string; // Fallback text
  blocks?: SlackBlock[];
  username?: string;
  icon_emoji?: string;
  channel?: string;
}

/**
 * Delivery result
 */
export interface SlackDeliveryResult {
  success: boolean;
  messageTs?: string;
  error?: string;
  statusCode?: number;
  retryAfter?: number;
}

export class SlackChannelAdapter {
  private readonly monitoring?: IMonitoringProvider;
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private readonly MAX_RETRIES = 3;

  constructor(monitoring?: IMonitoringProvider) {
    this.monitoring = monitoring;
  }

  /**
   * Send notification to Slack
   */
  async sendNotification(
    webhookUrl: string,
    notification: QueuedNotification,
  ): Promise<SlackDeliveryResult> {
    try {
      const payload = this.buildSlackPayload(notification);

      const response = await axios.post(webhookUrl, payload, {
        timeout: this.DEFAULT_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200 && response.data === 'ok') {
        return {
          success: true,
          messageTs: response.headers['x-slack-req-id'],
        };
      }

      return {
        success: false,
        error: `Unexpected response: ${response.data}`,
        statusCode: response.status,
      };
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  /**
   * Build Slack message payload with Block Kit
   */
  private buildSlackPayload(notification: QueuedNotification): SlackMessagePayload {
    const { templateVars, template, metadata } = notification;
    const eventType = templateVars.eventType || 'notification';

    // Fallback text for notifications and search
    const fallbackText = this.getFallbackText(notification);

    // Build blocks based on event type
    const blocks = this.buildBlocksForEvent(eventType, notification);

    return {
      text: fallbackText,
      blocks,
      username: metadata?.slackUsername || 'Castiel',
      icon_emoji: metadata?.slackIconEmoji || ':sparkles:',
      channel: metadata?.slackChannel,
    };
  }

  /**
   * Build Block Kit blocks based on event type
   */
  private buildBlocksForEvent(
    eventType: string,
    notification: QueuedNotification,
  ): SlackBlock[] {
    const { templateVars } = notification;

    switch (eventType) {
      case NotificationEventType.PROJECT_SHARED:
        return this.buildProjectSharedBlocks(templateVars);

      case NotificationEventType.COLLABORATOR_ADDED:
        return this.buildCollaboratorAddedBlocks(templateVars);

      case NotificationEventType.SHARD_CREATED:
        return this.buildShardCreatedBlocks(templateVars);

      case NotificationEventType.RECOMMENDATION_GENERATED:
        return this.buildRecommendationBlocks(templateVars);

      case NotificationEventType.ACTIVITY_THRESHOLD_EXCEEDED:
        return this.buildActivityAlertBlocks(templateVars);

      default:
        return this.buildGenericBlocks(templateVars);
    }
  }

  /**
   * Build blocks for project shared notification
   */
  private buildProjectSharedBlocks(vars: Record<string, any>): SlackBlock[] {
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🔗 Project Shared with You',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${vars.senderName}* has shared *${vars.projectName}* with you.`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Role:*\n${vars.role || 'Viewer'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Organization:*\n${vars.organizationName || 'Personal'}`,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Open Project',
              emoji: true,
            },
            url: vars.actionUrl,
            style: 'primary',
          },
        ],
      },
    ];
  }

  /**
   * Build blocks for collaborator added
   */
  private buildCollaboratorAddedBlocks(vars: Record<string, any>): SlackBlock[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `👥 *${vars.senderName}* added you as a collaborator to *${vars.projectName}*`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Access level: *${vars.role}* | ${vars.timestamp}`,
          },
        ],
      },
    ];
  }

  /**
   * Build blocks for shard created
   */
  private buildShardCreatedBlocks(vars: Record<string, any>): SlackBlock[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `📝 New shard created in *${vars.projectName}*`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Type:*\n${vars.shardType || 'Unknown'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Created by:*\n${vars.senderName}`,
          },
        ],
      },
    ];
  }

  /**
   * Build blocks for recommendation generated
   */
  private buildRecommendationBlocks(vars: Record<string, any>): SlackBlock[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `💡 *New Recommendation*\n${vars.message || 'A new recommendation has been generated for your project.'}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Confidence:*\n${vars.confidence || 'High'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Project:*\n${vars.projectName}`,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Details',
            },
            url: vars.actionUrl,
          },
        ],
      },
    ];
  }

  /**
   * Build blocks for activity threshold alert
   */
  private buildActivityAlertBlocks(vars: Record<string, any>): SlackBlock[] {
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⚠️ Activity Alert',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: vars.message || 'Activity threshold has been exceeded.',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Project:*\n${vars.projectName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Threshold:*\n${vars.threshold || 'N/A'}`,
          },
        ],
      },
    ];
  }

  /**
   * Build generic blocks for any notification
   */
  private buildGenericBlocks(vars: Record<string, any>): SlackBlock[] {
    const blocks: SlackBlock[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: vars.message || 'You have a new notification from Castiel.',
        },
      },
    ];

    // Add context if available
    if (vars.projectName || vars.senderName) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: [
              vars.projectName && `Project: *${vars.projectName}*`,
              vars.senderName && `From: ${vars.senderName}`,
              vars.timestamp,
            ]
              .filter(Boolean)
              .join(' | '),
          },
        ],
      });
    }

    // Add action button if URL available
    if (vars.actionUrl) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Details',
            },
            url: vars.actionUrl,
          },
        ],
      });
    }

    return blocks;
  }

  /**
   * Get fallback text for notification
   */
  private getFallbackText(notification: QueuedNotification): string {
    const { templateVars, template } = notification;

    if (template?.body) {
      return this.interpolateTemplate(template.body, templateVars);
    }

    if (templateVars.message) {
      return templateVars.message;
    }

    return `New notification from ${templateVars.senderName || 'Castiel'}`;
  }

  /**
   * Simple template interpolation
   */
  private interpolateTemplate(template: string, vars: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return vars[key] || match;
    });
  }

  /**
   * Handle delivery errors
   */
  private handleError(error: AxiosError): SlackDeliveryResult {
    this.monitoring?.trackException(error, {
      operation: 'slack-channel-adapter.send-notification',
      code: error.code,
      status: error.response?.status,
    });
    if (error.response) {
      // HTTP error response
      const statusCode = error.response.status;
      const data = error.response.data as any;

      this.monitoring?.trackEvent('slack-channel-adapter.api-error', {
        statusCode,
        error: JSON.stringify(data),
      });

      // Check for rate limiting
      if (statusCode === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
        return {
          success: false,
          error: 'Rate limited',
          statusCode,
          retryAfter,
        };
      }

      return {
        success: false,
        error: data?.error || 'Slack API error',
        statusCode,
      };
    }

    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: 'Request timeout',
      };
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'Network error',
      };
    }

    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }

  /**
   * Send with retry logic
   */
  async sendWithRetry(
    webhookUrl: string,
    notification: QueuedNotification,
    maxRetries: number = this.MAX_RETRIES,
  ): Promise<SlackDeliveryResult> {
    let lastResult: SlackDeliveryResult | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      lastResult = await this.sendNotification(webhookUrl, notification);

      if (lastResult.success) {
        return lastResult;
      }

      // Don't retry on client errors (4xx except 429)
      if (
        lastResult.statusCode &&
        lastResult.statusCode >= 400 &&
        lastResult.statusCode < 500 &&
        lastResult.statusCode !== 429
      ) {
        this.monitoring?.trackEvent('slack-channel-adapter.delivery-failed-client-error', {
          error: lastResult.error,
        });
        return lastResult;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = lastResult.retryAfter
          ? lastResult.retryAfter * 1000
          : Math.min(1000 * Math.pow(2, attempt - 1), 30000);

        this.monitoring?.trackEvent('slack-channel-adapter.retry', {
          attempt,
          maxRetries,
          delayMs: delay,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return lastResult || { success: false, error: 'All retries failed' };
  }
}
