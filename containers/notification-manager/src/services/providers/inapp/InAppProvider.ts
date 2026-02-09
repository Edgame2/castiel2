/**
 * In-App Notification Provider
 * 
 * Publishes notifications to RabbitMQ for the main app to relay via WebSocket
 */

import { EventPublisher } from '@coder/shared';
import { getConfig } from '../../../config';

export interface SendInAppOptions {
  userId: string;
  organizationId: string;
  notificationId: string;
  title: string;
  body: string;
  bodyHtml?: string;
  actionUrl?: string;
  actionLabel?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
}

export interface SendInAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class InAppProvider {
  private publisher: EventPublisher;
  private exchange: string;
  private config = getConfig();

  constructor() {
    this.exchange = this.config.notification.providers.inapp?.exchange || 'notification.inapp.deliver';
    const url = (this.config as any).rabbitmq?.url ?? '';
    this.publisher = new EventPublisher(
      { url, exchange: this.exchange },
      'notification-manager'
    );
  }

  /**
   * Send in-app notification via RabbitMQ
   */
  async send(options: SendInAppOptions): Promise<SendInAppResult> {
    try {
      const event = {
        type: 'notification.inapp.delivered',
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: 'notification-manager',
        organizationId: options.organizationId,
        userId: options.userId,
        data: {
          notificationId: options.notificationId,
          title: options.title,
          body: options.body,
          bodyHtml: options.bodyHtml,
          actionUrl: options.actionUrl,
          actionLabel: options.actionLabel,
          imageUrl: options.imageUrl,
          metadata: options.metadata || {},
        },
      };

      await this.publisher.publish(
        'notification.inapp.delivered',
        options.organizationId,
        event.data
      );

      return {
        success: true,
        messageId: options.notificationId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send in-app notification',
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      // Check if publisher is connected
      // Connection check: add when EventPublisher exposes connection status
      return {
        healthy: true,
        message: 'In-app provider is healthy',
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: error.message || 'In-app provider health check failed',
      };
    }
  }
}

