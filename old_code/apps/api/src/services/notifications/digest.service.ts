/**
 * Notification Digest Service
 * 
 * Handles compilation and sending of notification digests.
 * Digests batch multiple notifications into a single message sent via email, Slack, or Teams.
 */

import { NotificationRepository } from '../../repositories/notification.repository.js';
import { NotificationDigestRepository } from '../../repositories/notification-digest.repository.js';
import { NotificationPreferenceRepository } from '../../repositories/notification-preference.repository.js';
import {
  NotificationDigest,
  Notification,
  DigestCompilationResult,
  NotificationType,
  NotificationPriority,
} from '../../types/notification.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { UnifiedEmailService } from '../email/email.service.js';
import { SlackNotificationService } from './slack-notification.service.js';
import { TeamsNotificationService } from './teams-notification.service.js';
import { UserService } from '../auth/user.service.js';

export interface DigestServiceConfig {
  enabled: boolean;
  minNotificationsForDigest?: number; // Minimum notifications to send a digest (default: 1)
  baseUrl?: string; // Base URL for links in digest emails
}

/**
 * Notification Digest Service
 * Compiles and sends notification digests
 */
export class DigestService {
  private notificationRepository: NotificationRepository;
  private digestRepository: NotificationDigestRepository;
  private preferenceRepository?: NotificationPreferenceRepository;
  private userService: UserService;
  private emailService?: UnifiedEmailService;
  private slackNotificationService?: SlackNotificationService;
  private teamsNotificationService?: TeamsNotificationService;
  private monitoring: IMonitoringProvider;
  private config: DigestServiceConfig;

  constructor(
    notificationRepository: NotificationRepository,
    digestRepository: NotificationDigestRepository,
    userService: UserService,
    monitoring: IMonitoringProvider,
    config: DigestServiceConfig,
    emailService?: UnifiedEmailService,
    slackNotificationService?: SlackNotificationService,
    teamsNotificationService?: TeamsNotificationService,
    preferenceRepository?: NotificationPreferenceRepository
  ) {
    this.notificationRepository = notificationRepository;
    this.digestRepository = digestRepository;
    this.preferenceRepository = preferenceRepository;
    this.userService = userService;
    this.emailService = emailService;
    this.slackNotificationService = slackNotificationService;
    this.teamsNotificationService = teamsNotificationService;
    this.monitoring = monitoring;
    this.config = {
      enabled: config.enabled,
      minNotificationsForDigest: config.minNotificationsForDigest || 1,
      baseUrl: config.baseUrl || 'https://app.castiel.ai',
    };
  }

  /**
   * Compile a digest: fetch notifications and create summary
   */
  async compileDigest(digest: NotificationDigest): Promise<DigestCompilationResult> {
    // Fetch all notifications in the digest
    const notifications = await this.notificationRepository.findByIds(
      digest.notificationIds,
      digest.tenantId,
      digest.userId
    );

    // Calculate summary
    const summary = {
      total: notifications.length,
      byType: notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<NotificationType, number>),
      byPriority: notifications.reduce((acc, n) => {
        const priority = n.priority || 'none';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as Record<NotificationPriority | 'none', number>),
    };

    // Update digest status to compiled
    const compiled = await this.digestRepository.updateStatus(
      digest.id,
      digest.tenantId,
      digest.userId,
      'compiled'
    );

    if (!compiled) {
      throw new Error('Failed to update digest status to compiled');
    }

    return {
      digest: compiled,
      notifications,
      summary,
    };
  }

  /**
   * Send a compiled digest via the appropriate channel
   */
  async sendDigest(compilation: DigestCompilationResult): Promise<{ success: boolean; error?: string }> {
    const { digest, notifications, summary } = compilation;

    // Check minimum notifications threshold
    if (notifications.length < this.config.minNotificationsForDigest!) {
      // Mark as sent (skipped due to threshold)
      await this.digestRepository.updateStatus(
        digest.id,
        digest.tenantId,
        digest.userId,
        'sent',
        `Skipped: Only ${notifications.length} notification(s), minimum is ${this.config.minNotificationsForDigest}`
      );
      return { success: true };
    }

    try {
      // Get user for email address
      const user = await this.userService.findById(digest.userId, digest.tenantId);
      if (!user) {
        throw new Error(`User ${digest.userId} not found`);
      }

      // Send via appropriate channel
      let result: { success: boolean; error?: string };

      switch (digest.channel) {
        case 'email':
          result = await this.sendEmailDigest(digest, notifications, summary, user.email);
          break;
        case 'slack':
          result = await this.sendSlackDigest(digest, notifications, summary);
          break;
        case 'teams':
          result = await this.sendTeamsDigest(digest, notifications, summary);
          break;
        default:
          throw new Error(`Unsupported digest channel: ${digest.channel}`);
      }

      if (result.success) {
        // Mark digest as sent
        await this.digestRepository.updateStatus(
          digest.id,
          digest.tenantId,
          digest.userId,
          'sent'
        );
        this.monitoring.trackEvent('digest.sent', {
          digestId: digest.id,
          channel: digest.channel,
          notificationCount: notifications.length,
        });
      } else {
        // Mark digest as failed
        await this.digestRepository.updateStatus(
          digest.id,
          digest.tenantId,
          digest.userId,
          'failed',
          result.error
        );
        this.monitoring.trackEvent('digest.failed', {
          digestId: digest.id,
          channel: digest.channel,
          error: result.error,
        });
      }

      return result;
    } catch (error) {
      const errorMessage = (error as Error).message;
      await this.digestRepository.updateStatus(
        digest.id,
        digest.tenantId,
        digest.userId,
        'failed',
        errorMessage
      );
      this.monitoring.trackException(error as Error, {
        operation: 'digest.send',
        digestId: digest.id,
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send email digest
   */
  private async sendEmailDigest(
    digest: NotificationDigest,
    notifications: Notification[],
    summary: DigestCompilationResult['summary'],
    userEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.emailService || !this.emailService.isReady()) {
      return { success: false, error: 'Email service not available' };
    }

    // Build digest email content
    const periodLabel = digest.schedule === 'daily' ? 'Today' : 'This Week';
    const subject = `Castiel ${periodLabel}'s Digest - ${summary.total} Notification${summary.total !== 1 ? 's' : ''}`;

    // Build HTML email body
    const htmlBody = this.buildEmailDigestBody(digest, notifications, summary);
    const textBody = this.buildEmailDigestText(digest, notifications, summary);

    // Send email using UnifiedEmailService directly
    try {
      const result = await this.emailService.send({
        to: userEmail,
        subject,
        text: textBody,
        html: htmlBody,
      });

      if (result.success) {
        this.monitoring.trackEvent('digest.email.sent', {
          digestId: digest.id,
          notificationCount: notifications.length,
          messageId: result.messageId,
        });
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.monitoring.trackException(error as Error, {
        operation: 'digest.email.send',
        digestId: digest.id,
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Build HTML email body for digest
   */
  private buildEmailDigestBody(
    digest: NotificationDigest,
    notifications: Notification[],
    summary: DigestCompilationResult['summary']
  ): string {
    const periodLabel = digest.schedule === 'daily' ? 'Today' : 'This Week';
    const periodStart = new Date(digest.periodStart);
    const periodEnd = new Date(digest.periodEnd);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0078D4; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .summary { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #0078D4; }
          .notification { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #ddd; }
          .notification-type { font-weight: bold; color: #0078D4; }
          .notification-time { color: #666; font-size: 0.9em; }
          .footer { text-align: center; color: #666; font-size: 0.9em; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${periodLabel}'s Digest</h1>
            <p>${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}</p>
          </div>
          <div class="content">
            <div class="summary">
              <h2>Summary</h2>
              <p><strong>Total Notifications:</strong> ${summary.total}</p>
              <p><strong>By Type:</strong> ${Object.entries(summary.byType).map(([type, count]) => `${type}: ${count}`).join(', ')}</p>
              <p><strong>By Priority:</strong> ${Object.entries(summary.byPriority).map(([priority, count]) => `${priority}: ${count}`).join(', ')}</p>
            </div>
            <h2>Notifications</h2>
    `;

    for (const notification of notifications) {
      const typeColor = this.getTypeColor(notification.type);
      const createdAt = new Date(notification.createdAt).toLocaleString();
      html += `
        <div class="notification" style="border-left-color: ${typeColor};">
          <div class="notification-type">${notification.name}</div>
          <div class="notification-time">${createdAt}</div>
          <p>${notification.content}</p>
          ${notification.link ? `<p><a href="${notification.link}">View Details →</a></p>` : ''}
        </div>
      `;
    }

    html += `
          </div>
          <div class="footer">
            <p>You received this digest because digest mode is enabled for ${digest.channel} notifications.</p>
            <p><a href="${this.config.baseUrl || 'https://app.castiel.ai'}/notifications/preferences">Manage Preferences</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Build plain text email body for digest
   */
  private buildEmailDigestText(
    digest: NotificationDigest,
    notifications: Notification[],
    summary: DigestCompilationResult['summary']
  ): string {
    const periodLabel = digest.schedule === 'daily' ? 'Today' : 'This Week';
    const periodStart = new Date(digest.periodStart);
    const periodEnd = new Date(digest.periodEnd);

    let text = `
${periodLabel}'s Digest
${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}

Summary:
- Total Notifications: ${summary.total}
- By Type: ${Object.entries(summary.byType).map(([type, count]) => `${type}: ${count}`).join(', ')}
- By Priority: ${Object.entries(summary.byPriority).map(([priority, count]) => `${priority}: ${count}`).join(', ')}

Notifications:
${'='.repeat(50)}
    `;

    for (const notification of notifications) {
      const createdAt = new Date(notification.createdAt).toLocaleString();
      text += `
[${notification.type.toUpperCase()}] ${notification.name}
Time: ${createdAt}
${notification.content}
${notification.link ? `View Details: ${notification.link}` : ''}
${'-'.repeat(50)}
      `;
    }

    text += `
You received this digest because digest mode is enabled for ${digest.channel} notifications.
Manage preferences: ${this.config.baseUrl || 'https://app.castiel.ai'}/notifications/preferences
    `;

    return text.trim();
  }

  /**
   * Send Slack digest
   */
  private async sendSlackDigest(
    digest: NotificationDigest,
    notifications: Notification[],
    summary: DigestCompilationResult['summary']
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.slackNotificationService) {
      return { success: false, error: 'Slack notification service not available' };
    }

    if (!this.preferenceRepository) {
      return { success: false, error: 'Notification preference repository not available' };
    }

    try {
      // Get user preferences to retrieve Slack webhook URL
      const preferences = await this.preferenceRepository.getPreferences(digest.tenantId, digest.userId);
      if (!preferences) {
        return { success: false, error: 'User notification preferences not found' };
      }

      const slackConfig = preferences.channels.slack;
      if (!slackConfig?.enabled || !slackConfig.webhookUrl) {
        return { success: false, error: 'Slack notifications not enabled or webhook URL not configured' };
      }

      // Build Slack Block Kit message for digest
      const payload = this.buildSlackDigestContent(digest, notifications, summary, slackConfig.webhookUrl, slackConfig.channel);

      // Send via Slack webhook
      const response = await fetch(slackConfig.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        this.monitoring.trackEvent('digest.slack_sent', {
          digestId: digest.id,
          tenantId: digest.tenantId,
          userId: digest.userId,
          notificationCount: notifications.length,
        });
        return { success: true };
      } else {
        const errorText = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }
    } catch (error: any) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'digest.send_slack',
        digestId: digest.id,
      });
      return { success: false, error: error.message || String(error) };
    }
  }

  /**
   * Build Slack Block Kit message content for digest
   */
  private buildSlackDigestContent(
    _digest: NotificationDigest,
    notifications: Notification[],
    summary: DigestCompilationResult['summary'],
    _webhookUrl: string,
    channel?: string
  ): any {
    const blocks: any[] = [];

    // Calculate unread count and types count
    const unreadCount = notifications.filter(n => n.status === 'unread').length;
    const typesCount = Object.keys(summary.byType).length;

    // Header block
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📬 Notification Digest - ${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`,
        emoji: true,
      },
    });

    // Summary section
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Summary:*\n${summary.total} total | ${unreadCount} unread | ${typesCount} types`,
      },
    });

    blocks.push({ type: 'divider' });

    // Group notifications by type
    const byType = notifications.reduce((acc, notif) => {
      if (!acc[notif.type]) {acc[notif.type] = [];}
      acc[notif.type].push(notif);
      return acc;
    }, {} as Record<NotificationType, Notification[]>);

    // Add notification blocks grouped by type
    for (const [type, typeNotifications] of Object.entries(byType)) {
      const typeEmoji = this.getTypeEmoji(type as NotificationType);
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${typeEmoji} ${type.toUpperCase()}* (${typeNotifications.length})`,
        },
      });

      // Add each notification (limit to first 10 per type to avoid message size limits)
      for (const notif of typeNotifications.slice(0, 10)) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `• *${notif.name}*\n${notif.content.substring(0, 200)}${notif.content.length > 200 ? '...' : ''}`,
          },
        });

        if (notif.link) {
          blocks.push({
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'View',
                },
                url: notif.link,
              },
            ],
          });
        }
      }

      if (typeNotifications.length > 10) {
        blocks.push({
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `_...and ${typeNotifications.length - 10} more ${type} notification${typeNotifications.length - 10 !== 1 ? 's' : ''}_`,
            },
          ],
        });
      }

      blocks.push({ type: 'divider' });
    }

    // Footer with link to view all
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<${this.config.baseUrl}/notifications|View all notifications> | <${this.config.baseUrl}/notifications/preferences|Manage preferences>`,
      },
    });

    const payload: any = {
      text: `Notification Digest: ${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`,
      blocks,
    };

    if (channel) {
      payload.channel = channel;
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
   * Send Teams digest
   */
  private async sendTeamsDigest(
    digest: NotificationDigest,
    notifications: Notification[],
    summary: DigestCompilationResult['summary']
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.teamsNotificationService) {
      return { success: false, error: 'Teams notification service not available' };
    }

    if (!this.preferenceRepository) {
      return { success: false, error: 'Notification preference repository not available' };
    }

    try {
      // Get user preferences to retrieve Teams webhook URL
      const preferences = await this.preferenceRepository.getPreferences(digest.tenantId, digest.userId);
      if (!preferences) {
        return { success: false, error: 'User notification preferences not found' };
      }

      const teamsConfig = preferences.channels.teams;
      if (!teamsConfig?.enabled || !teamsConfig.webhookUrl) {
        return { success: false, error: 'Teams notifications not enabled or webhook URL not configured' };
      }

      // Build Teams Adaptive Card for digest
      const card = this.buildTeamsDigestContent(digest, notifications, summary);

      // Send via Teams webhook
      const response = await fetch(teamsConfig.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'message',
          attachments: [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: card,
          }],
        }),
      });

      if (response.ok) {
        this.monitoring.trackEvent('digest.teams_sent', {
          digestId: digest.id,
          tenantId: digest.tenantId,
          userId: digest.userId,
          notificationCount: notifications.length,
        });
        return { success: true };
      } else {
        const errorText = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }
    } catch (error: any) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'digest.send_teams',
        digestId: digest.id,
      });
      return { success: false, error: error.message || String(error) };
    }
  }

  /**
   * Build Teams Adaptive Card content for digest
   */
  private buildTeamsDigestContent(
    _digest: NotificationDigest,
    notifications: Notification[],
    summary: DigestCompilationResult['summary']
  ): any {
    // Calculate unread count and types count
    const unreadCount = notifications.filter(n => n.status === 'unread').length;
    const typesCount = Object.keys(summary.byType).length;

    const card: any = {
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          size: 'Large',
          weight: 'Bolder',
          text: `📬 Notification Digest`,
          wrap: true,
        },
        {
          type: 'TextBlock',
          text: `${notifications.length} notification${notifications.length !== 1 ? 's' : ''} | ${unreadCount} unread`,
          wrap: true,
          spacing: 'Small',
        },
        {
          type: 'FactSet',
          facts: [
            { title: 'Total', value: summary.total.toString() },
            { title: 'Unread', value: unreadCount.toString() },
            { title: 'Types', value: typesCount.toString() },
          ],
        },
        {
          type: 'Divider',
        },
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View All Notifications',
          url: `${this.config.baseUrl}/notifications`,
        },
        {
          type: 'Action.OpenUrl',
          title: 'Manage Preferences',
          url: `${this.config.baseUrl}/notifications/preferences`,
        },
      ],
    };

    // Group notifications by type
    const byType = notifications.reduce((acc, notif) => {
      if (!acc[notif.type]) {acc[notif.type] = [];}
      acc[notif.type].push(notif);
      return acc;
    }, {} as Record<NotificationType, Notification[]>);

    // Add notification sections grouped by type
    for (const [type, typeNotifications] of Object.entries(byType)) {
      card.body.push({
        type: 'TextBlock',
        size: 'Medium',
        weight: 'Bolder',
        text: `${this.getTypeEmoji(type as NotificationType)} ${type.toUpperCase()} (${typeNotifications.length})`,
        wrap: true,
        spacing: 'Medium',
      });

      // Add each notification (limit to first 5 per type)
      for (const notif of typeNotifications.slice(0, 5)) {
        card.body.push({
          type: 'TextBlock',
          text: `**${notif.name}**\n${notif.content.substring(0, 150)}${notif.content.length > 150 ? '...' : ''}`,
          wrap: true,
          spacing: 'Small',
        });

        if (notif.link) {
          card.actions.push({
            type: 'Action.OpenUrl',
            title: `View: ${notif.name}`,
            url: notif.link,
          });
        }
      }

      if (typeNotifications.length > 5) {
        card.body.push({
          type: 'TextBlock',
          text: `_...and ${typeNotifications.length - 5} more ${type} notification${typeNotifications.length - 5 !== 1 ? 's' : ''}_`,
          wrap: true,
          isSubtle: true,
          spacing: 'Small',
        });
      }

      card.body.push({
        type: 'Divider',
      });
    }

    return card;
  }

  /**
   * Get color for notification type
   */
  private getTypeColor(type: NotificationType): string {
    const colors: Record<NotificationType, string> = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      information: '#17a2b8',
      alert: '#fd7e14',
    };
    return colors[type] || '#0078D4';
  }
}

