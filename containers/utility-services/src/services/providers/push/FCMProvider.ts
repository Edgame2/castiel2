/**
 * Firebase Cloud Messaging (FCM) Push Provider
 */

import { IPushProvider, SendPushOptions, BulkPushOptions, SendPushResult, BulkPushResult, HealthCheckResult } from './IPushProvider';
import { SecretManagementClient } from '../../SecretManagementClient';

export interface FCMConfig {
  serviceAccountKey: string | Record<string, any>;
  defaultFrom?: string;
}

export class FCMProvider implements IPushProvider {
  private config: FCMConfig;
  private admin: any;

  constructor(config: FCMConfig) {
    this.config = config;
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private async initializeAdmin(): Promise<void> {
    if (this.admin) {
      return;
    }

    try {
      const admin = await import('firebase-admin');
      
      if (!admin.apps.length) {
        const serviceAccount = typeof this.config.serviceAccountKey === 'string'
          ? JSON.parse(this.config.serviceAccountKey)
          : this.config.serviceAccountKey;

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }

      this.admin = admin;
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('firebase-admin package is not installed. Run: npm install firebase-admin');
      }
      throw error;
    }
  }

  async send(options: SendPushOptions): Promise<SendPushResult> {
    try {
      await this.initializeAdmin();
      
      const tokens = Array.isArray(options.deviceToken) ? options.deviceToken : [options.deviceToken];
      
      const message = {
        notification: {
          title: options.title,
          body: options.body,
          imageUrl: options.imageUrl,
        },
        data: options.data || {},
        android: {
          priority: options.priority === 'high' ? 'high' : 'normal',
          ttl: options.ttl ? options.ttl * 1000 : undefined, // Convert to milliseconds
        },
        apns: {
          headers: {
            'apns-priority': options.priority === 'high' ? '10' : '5',
          },
        },
        webpush: {
          notification: {
            title: options.title,
            body: options.body,
            icon: options.imageUrl,
          },
        },
      };

      // Send to all tokens
      const response = await this.admin.messaging().sendEachForMulticast({
        tokens,
        ...message,
      });

      if (response.successCount > 0) {
        return {
          success: true,
          messageId: response.responses[0].messageId || `fcm-${Date.now()}`,
          providerResponse: response,
        };
      } else {
        return {
          success: false,
          error: response.responses[0]?.error?.message || 'Failed to send push notification',
          providerResponse: response,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send push notification via FCM',
        providerResponse: error,
      };
    }
  }

  async sendBulk(options: BulkPushOptions): Promise<BulkPushResult> {
    try {
      await this.initializeAdmin();
      
      const messages = options.messages.map(msg => ({
        token: msg.deviceToken,
        notification: {
          title: msg.title,
          body: msg.body,
        },
        data: msg.data || {},
      }));

      const response = await this.admin.messaging().sendEach(messages);

      const results = response.responses.map((resp: any, index: number) => ({
        deviceToken: options.messages[index].deviceToken,
        success: resp.success,
        messageId: resp.messageId,
        error: resp.error?.message,
      }));

      return {
        success: response.responses.some((r: any) => r.success),
        results,
        totalSent: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length,
      };
    } catch (error: any) {
      return {
        success: false,
        results: options.messages.map(msg => ({
          deviceToken: msg.deviceToken,
          success: false,
          error: error.message || 'Bulk send failed',
        })),
        totalSent: 0,
        totalFailed: options.messages.length,
      };
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();
      await this.initializeAdmin();
      
      // Simple validation - check if admin is initialized
      if (!this.admin) {
        return {
          healthy: false,
          message: 'FCM not initialized',
        };
      }

      const latency = Date.now() - startTime;
      return {
        healthy: true,
        message: 'FCM provider is healthy',
        latency,
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: error.message || 'FCM health check failed',
      };
    }
  }
}

