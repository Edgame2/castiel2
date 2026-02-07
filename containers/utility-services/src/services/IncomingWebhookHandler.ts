/**
 * Incoming Webhook Handler
 * 
 * Processes incoming webhooks from external services
 */

import { getNotificationEngine } from './NotificationEngineFactory';
import { NotificationInput, EventCategory, NotificationCriticality } from '../types/notification';
import { getConfig } from '../config/index.js';

export interface WebhookPayload {
  type: string;
  data: any;
  timestamp?: string;
  source?: string;
}

export class IncomingWebhookHandler {
  private config = getConfig();
  private notificationEngine = getNotificationEngine();

  /**
   * Process incoming webhook
   */
  async processWebhook(
    webhookConfig: any,
    payload: WebhookPayload
  ): Promise<string | null> {
    // Validate webhook signature if secret is configured
    // TODO: Implement signature validation

    // Map webhook payload to notification input
    const notificationInput = this.mapWebhookToNotification(webhookConfig, payload);
    
    if (!notificationInput) {
      return null;
    }

    // Process notification
    return await this.notificationEngine.processNotification(notificationInput, {
      eventData: payload.data,
    });
  }

  /**
   * Map webhook payload to notification input
   */
  private mapWebhookToNotification(
    webhookConfig: any,
    payload: WebhookPayload
  ): NotificationInput | null {
    // Extract recipient from webhook config or payload
    const recipientId = payload.data?.userId || webhookConfig.defaultRecipientId;
    const organizationId = webhookConfig.organizationId;

    if (!recipientId || !organizationId) {
      return null;
    }

    return {
      organizationId,
      eventType: payload.type || 'webhook.received',
      eventCategory: this.mapEventCategory(payload.type),
      sourceModule: payload.source || 'webhook',
      sourceResourceId: payload.data?.id,
      sourceResourceType: payload.data?.type,
      recipientId,
      recipientEmail: payload.data?.email,
      recipientPhone: payload.data?.phone,
      title: payload.data?.title || `Webhook: ${payload.type}`,
      body: payload.data?.message || payload.data?.body || JSON.stringify(payload.data),
      bodyHtml: payload.data?.bodyHtml,
      actionUrl: payload.data?.actionUrl,
      actionLabel: payload.data?.actionLabel,
      imageUrl: payload.data?.imageUrl,
      metadata: payload.data,
      criticality: this.mapCriticality(payload.data?.priority || 'medium'),
      channelsRequested: webhookConfig.defaultChannels || ['IN_APP', 'EMAIL'],
    };
  }

  /**
   * Map webhook event type to notification category
   */
  private mapEventCategory(eventType: string): EventCategory {
    if (eventType.includes('security') || eventType.includes('auth')) {
      return 'SECURITY';
    }
    if (eventType.includes('incident') || eventType.includes('alert')) {
      return 'INCIDENTS';
    }
    if (eventType.includes('plan') || eventType.includes('ai')) {
      return 'AI_PLANNING';
    }
    return 'SYSTEM_ADMIN';
  }

  /**
   * Map priority to criticality
   */
  private mapCriticality(priority: string): NotificationCriticality {
    const normalized = priority.toLowerCase();
    if (normalized === 'critical' || normalized === 'urgent') {
      return 'CRITICAL';
    }
    if (normalized === 'high') {
      return 'HIGH';
    }
    if (normalized === 'low') {
      return 'LOW';
    }
    return 'MEDIUM';
  }
}

