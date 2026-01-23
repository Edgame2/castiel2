/**
 * Proactive Insights Digest Worker
 * 
 * Background worker that processes queued proactive insights and sends them
 * as email digests according to user preferences (frequency, time, quiet hours).
 */

import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { UnifiedEmailService } from './email/email.service.js';
import { ProactiveInsightsDeliveryPreferencesRepository } from '../repositories/proactive-insights-delivery-preferences.repository.js';
import { UserService } from './auth/user.service.js';
import type { DeliveryPreferences, DigestFrequency } from '../types/proactive-insights.types.js';
import type { ProactiveInsightsAnalyticsService } from './proactive-insights-analytics.service.js';

export interface ProactiveInsightsDigestWorkerConfig {
  pollIntervalMs?: number; // Default: 60000 (1 minute)
  enabled?: boolean; // Default: true
}

interface QueuedInsight {
  deliveryId: string;
  insightId: string;
  type: string;
  priority: string;
  title: string;
  summary: string;
  shardName?: string;
  createdAt: string;
}

/**
 * Background worker for processing proactive insights email digests
 */
export class ProactiveInsightsDigestWorker {
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs: number;
  private readonly enabled: boolean;

  constructor(
    private readonly redis: Redis,
    private readonly emailService: UnifiedEmailService,
    private readonly deliveryPreferencesRepository: ProactiveInsightsDeliveryPreferencesRepository,
    private readonly userService: UserService,
    private readonly monitoring: IMonitoringProvider,
    private readonly analyticsService?: ProactiveInsightsAnalyticsService,
    config: ProactiveInsightsDigestWorkerConfig = {}
  ) {
    this.pollIntervalMs = config.pollIntervalMs || 60000; // 1 minute default
    this.enabled = config.enabled !== false;
  }

  /**
   * Start the background worker
   */
  public start(): void {
    if (!this.enabled) {
      this.monitoring.trackEvent('proactive_insights_digest_worker.disabled');
      return;
    }

    if (this.isRunning) {
      this.monitoring.trackEvent('proactive_insights_digest_worker.already_running');
      return;
    }

    this.isRunning = true;
    this.monitoring.trackEvent('proactive_insights_digest_worker.started', {
      pollIntervalMs: this.pollIntervalMs,
    });

    // Start polling immediately
    this.poll();
  }

  /**
   * Stop the background worker
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }

    this.monitoring.trackEvent('proactive_insights_digest_worker.stopped');
  }

  /**
   * Check if the worker is running
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Main polling loop
   */
  private poll(): void {
    if (!this.isRunning) {
      return;
    }

    // Process digests (non-blocking)
    this.processDigests().catch((error) => {
      this.monitoring.trackException(error as Error, {
        operation: 'proactive_insights_digest_worker.poll',
      });
    });

    // Schedule next poll
    this.pollInterval = setTimeout(() => {
      this.poll();
    }, this.pollIntervalMs);
  }

  /**
   * Process pending digests
   */
  private async processDigests(): Promise<void> {
    try {
      // Find all pending digest queues
      const pattern = 'digest:pending:*:*';
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        return;
      }

      // Process each queue
      for (const key of keys) {
        try {
          await this.processDigestQueue(key);
        } catch (error) {
          this.monitoring.trackException(error as Error, {
            operation: 'proactive_insights_digest_worker.processQueue',
            queueKey: key,
          });
        }
      }
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'proactive_insights_digest_worker.processDigests',
      });
    }
  }

  /**
   * Process a single digest queue
   * Queue key format: digest:pending:${tenantId}:${userId}
   */
  private async processDigestQueue(queueKey: string): Promise<void> {
    const parts = queueKey.split(':');
    if (parts.length !== 4) {
      this.monitoring.trackEvent('proactive_insights_digest_worker.invalid_queue_key', {
        queueKey,
      });
      return;
    }

    const tenantId = parts[2];
    const userId = parts[3];

    // Get user preferences
    const preferences = await this.deliveryPreferencesRepository.getPreferences(tenantId, userId);
    if (!preferences || !preferences.channels.email?.enabled) {
      // Clear queue if email is disabled
      await this.redis.del(queueKey);
      return;
    }

    // Check if it's time to send digest
    const shouldSend = await this.shouldSendDigest(preferences);
    if (!shouldSend) {
      return; // Wait for next poll
    }

    // Get all queued insights
    const queuedItems = await this.redis.lrange(queueKey, 0, -1);
    if (queuedItems.length === 0) {
      return;
    }

    // Parse queued insights
    const insights: QueuedInsight[] = queuedItems
      .map((item) => {
        try {
          return JSON.parse(item) as QueuedInsight;
        } catch {
          return null;
        }
      })
      .filter((item): item is QueuedInsight => item !== null);

    if (insights.length === 0) {
      // Clear empty queue
      await this.redis.del(queueKey);
      return;
    }

    // Send digest email
    await this.sendDigestEmail(tenantId, userId, insights, preferences);

    // Clear the queue after sending
    await this.redis.del(queueKey);

    this.monitoring.trackEvent('proactive_insights_digest_worker.digest_sent', {
      tenantId,
      userId,
      insightCount: insights.length,
    });
  }

  /**
   * Check if it's time to send a digest based on preferences
   */
  private async shouldSendDigest(preferences: DeliveryPreferences): Promise<boolean> {
    const emailConfig = preferences.channels.email;
    if (!emailConfig || !emailConfig.enabled) {
      return false;
    }

    const frequency = emailConfig.digestFrequency || 'daily';
    const digestTime = emailConfig.digestTime || '09:00';

    // Check quiet hours
    if (preferences.quietHours?.enabled) {
      if (this.isInQuietHours(preferences.quietHours)) {
        return false;
      }
    }

    // Check if it's time to send based on frequency
    return this.isTimeToSend(frequency, digestTime);
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(quietHours: { start: string; end: string; timezone: string }): boolean {
    const now = new Date();
    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);

    // Simple UTC-based check (in production, use proper timezone library)
    const currentHour = now.getUTCHours();
    const currentMin = now.getUTCMinutes();
    const currentTime = currentHour * 60 + currentMin;
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime > endTime) {
      // Overnight quiet hours (e.g., 22:00 - 07:00)
      return currentTime >= startTime || currentTime < endTime;
    } else {
      // Same-day quiet hours
      return currentTime >= startTime && currentTime < endTime;
    }
  }

  /**
   * Check if it's time to send digest based on frequency and time
   */
  private isTimeToSend(frequency: DigestFrequency, digestTime: string): boolean {
    if (frequency === 'immediate') {
      return true; // Always send immediately
    }

    const now = new Date();
    const [digestHour, digestMin] = digestTime.split(':').map(Number);
    const currentHour = now.getUTCHours();
    const currentMin = now.getUTCMinutes();

    // Check if we're within the polling window (within 1 minute of digest time)
    const currentTime = currentHour * 60 + currentMin;
    const targetTime = digestHour * 60 + digestMin;
    const timeDiff = Math.abs(currentTime - targetTime);

    if (timeDiff > 1) {
      return false; // Not time yet
    }

    // Check frequency
    switch (frequency) {
      case 'hourly':
        // Send every hour at the specified minute
        return currentMin === digestMin;

      case 'daily':
        // Send once per day at the specified time
        return currentHour === digestHour && currentMin === digestMin;

      case 'weekly':
        // Send once per week (Monday at specified time)
        return now.getUTCDay() === 1 && currentHour === digestHour && currentMin === digestMin;

      default:
        return false;
    }
  }

  /**
   * Send digest email
   */
  private async sendDigestEmail(
    tenantId: string,
    userId: string,
    insights: QueuedInsight[],
    preferences: DeliveryPreferences
  ): Promise<void> {
    // Get user for email address
    const user = await this.userService.findById(userId, tenantId);
    if (!user || !user.email) {
      this.monitoring.trackEvent('proactive_insights_digest_worker.user_not_found', {
        tenantId,
        userId,
      });
      return;
    }

    // Build email content
    const frequency = preferences.channels.email?.digestFrequency || 'daily';
    const periodLabel = this.getPeriodLabel(frequency);
    const subject = `Castiel Proactive Insights ${periodLabel} - ${insights.length} Insight${insights.length !== 1 ? 's' : ''}`;

    const htmlBody = this.buildDigestEmailBody(insights, periodLabel);
    const textBody = this.buildDigestEmailText(insights, periodLabel);

    // Send email
    const sendStartTime = Date.now();
    try {
      if (!this.emailService.isReady()) {
        this.monitoring.trackEvent('proactive_insights_digest_worker.email_service_not_ready', {
          tenantId,
          userId,
        });
        // Record analytics events for skipped insights
        if (this.analyticsService) {
          await this.recordDigestAnalytics(tenantId, insights, 'failed', 0);
        }
        return;
      }

      const result = await this.emailService.send({
        to: user.email,
        subject,
        text: textBody,
        html: htmlBody,
      });

      const latencyMs = Date.now() - sendStartTime;

      if (result.success) {
        this.monitoring.trackEvent('proactive_insights_digest_worker.email_sent', {
          tenantId,
          userId,
          insightCount: insights.length,
          messageId: result.messageId,
        });

        // Record analytics events for each insight in the digest
        if (this.analyticsService) {
          await this.recordDigestAnalytics(tenantId, insights, 'sent', latencyMs);
        }
      } else {
        this.monitoring.trackEvent('proactive_insights_digest_worker.email_failed', {
          tenantId,
          userId,
          insightCount: insights.length,
          error: result.error,
        });

        // Record analytics events for failed digest delivery
        if (this.analyticsService) {
          await this.recordDigestAnalytics(tenantId, insights, 'failed', latencyMs);
        }
      }
    } catch (error) {
      const latencyMs = Date.now() - sendStartTime;
      this.monitoring.trackException(error as Error, {
        operation: 'proactive_insights_digest_worker.sendEmail',
        tenantId,
        userId,
      });

      // Record analytics events for exception during digest delivery
      if (this.analyticsService) {
        await this.recordDigestAnalytics(tenantId, insights, 'failed', latencyMs);
      }
    }
  }

  /**
   * Record analytics events for all insights in a digest
   */
  private async recordDigestAnalytics(
    tenantId: string,
    insights: QueuedInsight[],
    status: 'sent' | 'failed',
    latencyMs: number
  ): Promise<void> {
    if (!this.analyticsService) {
      return;
    }

    // Record analytics event for each insight in the digest
    // Use the same latency for all insights since they're sent together
    const analyticsPromises = insights.map((insight) =>
      this.analyticsService!.recordDeliveryEvent({
        tenantId,
        insightId: insight.insightId,
        channel: 'email_digest',
        status,
        latencyMs,
        timestamp: new Date(),
      }).catch((analyticsError) => {
        // Non-blocking - don't fail if analytics recording fails
        this.monitoring.trackException(analyticsError as Error, {
          operation: 'proactive_insights_digest_worker.recordAnalytics',
          insightId: insight.insightId,
        });
      })
    );

    await Promise.all(analyticsPromises);
  }

  /**
   * Get period label for email subject
   */
  private getPeriodLabel(frequency: DigestFrequency): string {
    switch (frequency) {
      case 'immediate':
        return 'Update';
      case 'hourly':
        return 'Hourly Update';
      case 'daily':
        return 'Daily Digest';
      case 'weekly':
        return 'Weekly Digest';
      default:
        return 'Digest';
    }
  }

  /**
   * Build HTML email body
   */
  private buildDigestEmailBody(insights: QueuedInsight[], periodLabel: string): string {
    const insightsHtml = insights
      .map((insight) => {
        const priorityColor = this.getPriorityColor(insight.priority);
        return `
      <div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid ${priorityColor}; background-color: #f9fafb;">
        <h3 style="margin-top: 0; color: #111827;">${this.escapeHtml(insight.title)}</h3>
        <p style="margin: 10px 0; color: #6b7280;">${this.escapeHtml(insight.summary)}</p>
        <div style="font-size: 12px; color: #9ca3af;">
          <span style="background-color: ${priorityColor}; color: white; padding: 2px 8px; border-radius: 4px; margin-right: 8px;">
            ${this.escapeHtml(insight.priority.toUpperCase())}
          </span>
          ${insight.shardName ? `<span>${this.escapeHtml(insight.shardName)}</span>` : ''}
        </div>
      </div>
    `;
      })
      .join('');

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          ${periodLabel}
        </h1>
        <p style="color: #6b7280; margin-bottom: 30px;">
          You have ${insights.length} proactive insight${insights.length !== 1 ? 's' : ''} to review.
        </p>
        ${insightsHtml}
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>This is an automated email from Castiel. You can manage your notification preferences in your account settings.</p>
        </div>
      </body>
    </html>
  `;
  }

  /**
   * Build plain text email body
   */
  private buildDigestEmailText(insights: QueuedInsight[], periodLabel: string): string {
    const insightsText = insights
      .map((insight, index) => {
        return `
${index + 1}. ${insight.title} [${insight.priority.toUpperCase()}]
   ${insight.summary}
   ${insight.shardName ? `Related to: ${insight.shardName}` : ''}
`;
      })
      .join('\n');

    return `
${periodLabel}

You have ${insights.length} proactive insight${insights.length !== 1 ? 's' : ''} to review:

${insightsText}

---
This is an automated email from Castiel. You can manage your notification preferences in your account settings.
`;
  }

  /**
   * Get color for priority level
   */
  private getPriorityColor(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'critical':
        return '#dc2626'; // red
      case 'high':
        return '#ea580c'; // orange
      case 'medium':
        return '#ca8a04'; // yellow
      case 'low':
        return '#2563eb'; // blue
      default:
        return '#6b7280'; // gray
    }
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

