/**
 * Delivery Manager
 * 
 * Orchestrates delivery across multiple channels
 */

import { getDatabaseClient } from '@coder/shared';
import { 
  NotificationChannel, 
  NotificationInput,
  NotificationStatus 
} from '../types/notification';
import { IEmailProvider } from './providers/email/IEmailProvider';
import { ProviderRegistry } from './providers/email/ProviderRegistry';
import { DeliveryTracker } from './DeliveryTracker';
import { RetryService } from './RetryService';
import { SecretManagementClient } from './SecretManagementClient';
import { getConfig } from '../config/index.js';

export interface DeliveryResult {
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
}

export class DeliveryManager {
  private db = getDatabaseClient() as any;
  private config = getConfig();
  private deliveryTracker?: DeliveryTracker;
  private retryService?: RetryService;
  private secretClient: SecretManagementClient;

  constructor(
    deliveryTracker?: DeliveryTracker,
    retryService?: RetryService
  ) {
    this.deliveryTracker = deliveryTracker;
    this.retryService = retryService;
    this.secretClient = new SecretManagementClient();
  }

  /**
   * Deliver notification across multiple channels
   */
  async deliverNotification(
    notificationId: string,
    notification: NotificationInput,
    channels: NotificationChannel[]
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    // Deliver to each channel
    for (const channel of channels) {
      try {
        const result = await this.deliverToChannel(
          notificationId,
          notification,
          channel
        );
        results.push(result);

        // Track delivery
        if (this.deliveryTracker) {
          await this.deliveryTracker.trackDelivery(
            notificationId,
            channel,
            result.success,
            result.messageId,
            result.error
          );
        }
      } catch (error: any) {
        results.push({
          channel,
          success: false,
          error: error.message || 'Delivery failed',
        });
      }
    }

    // Update notification status
    await this.updateNotificationStatus(notificationId, results);

    return results;
  }

  /**
   * Deliver to a specific channel
   */
  private async deliverToChannel(
    notificationId: string,
    notification: NotificationInput,
    channel: NotificationChannel
  ): Promise<DeliveryResult> {
    switch (channel) {
      case 'EMAIL':
        return await this.deliverEmail(notification);
      
      case 'IN_APP':
        return await this.deliverInApp(notificationId, notification);
      
      case 'PUSH':
        return await this.deliverPush(notification);
      
      case 'SMS':
        return await this.deliverSMS(notification);
      
      case 'WHATSAPP':
        return await this.deliverWhatsApp(notification);
      
      case 'VOICE':
        return await this.deliverVoice(notification);
      
      default:
        return {
          channel,
          success: false,
          error: `Unknown channel: ${channel}`,
        };
    }
  }

  /**
   * Deliver via email
   */
  private async deliverEmail(notification: NotificationInput): Promise<DeliveryResult> {
    try {
      const emailProvider = await ProviderRegistry.getEmailProvider();
      
      const result = await emailProvider.send({
        to: notification.recipientEmail || '',
        subject: notification.title,
        html: notification.bodyHtml || notification.body,
        text: notification.body,
        from: this.config.notification.providers.email?.from_address,
      });

      if (result.success) {
        return {
          channel: 'EMAIL',
          success: true,
          messageId: result.messageId,
        };
      } else {
        return {
          channel: 'EMAIL',
          success: false,
          error: result.error,
        };
      }
    } catch (error: any) {
      return {
        channel: 'EMAIL',
        success: false,
        error: error.message || 'Email delivery failed',
      };
    }
  }

  /**
   * Deliver via in-app (RabbitMQ)
   */
  private async deliverInApp(
    notificationId: string,
    notification: NotificationInput
  ): Promise<DeliveryResult> {
    try {
      const { InAppProvider } = await import('./providers/inapp/InAppProvider');
      const inAppProvider = new InAppProvider();
      
      const result = await inAppProvider.send({
        userId: notification.recipientId,
        tenantId: notification.tenantId,
        notificationId,
        title: notification.title,
        body: notification.body,
        bodyHtml: notification.bodyHtml,
        actionUrl: notification.actionUrl,
        actionLabel: notification.actionLabel,
        imageUrl: notification.imageUrl,
        metadata: notification.metadata,
      });

      if (result.success) {
        return {
          channel: 'IN_APP',
          success: true,
          messageId: result.messageId,
        };
      } else {
        return {
          channel: 'IN_APP',
          success: false,
          error: result.error,
        };
      }
    } catch (error: any) {
      return {
        channel: 'IN_APP',
        success: false,
        error: error.message || 'In-app delivery failed',
      };
    }
  }

  /**
   * Deliver via push notification
   */
  private async deliverPush(notification: NotificationInput): Promise<DeliveryResult> {
    try {
      // Push: resolve device tokens from user profile when implemented
      return {
        channel: 'PUSH',
        success: false,
        error: 'Push notifications require device tokens (not yet implemented)',
      };
    } catch (error: any) {
      return {
        channel: 'PUSH',
        success: false,
        error: error.message || 'Push delivery failed',
      };
    }
  }

  /**
   * Deliver via SMS
   */
  private async deliverSMS(notification: NotificationInput): Promise<DeliveryResult> {
    try {
      const smsConfig = (this.config.notification as any)?.providers?.sms as { enabled?: boolean; secret_id?: string } | undefined;
      if (!smsConfig?.enabled || !smsConfig?.secret_id) {
        return {
          channel: 'SMS',
          success: false,
          error: 'SMS provider not configured',
        };
      }

      const secret = await this.secretClient.getSecretValue(smsConfig.secret_id);
      const twilioConfig = typeof secret === 'object' 
        ? secret 
        : JSON.parse(secret as string);

      const { TwilioSMSProvider } = await import('./providers/sms/TwilioSMSProvider');
      const smsProvider = new TwilioSMSProvider({
        accountSid: twilioConfig.accountSid || twilioConfig.account_sid,
        authToken: twilioConfig.authToken || twilioConfig.auth_token,
        fromNumber: twilioConfig.fromNumber || twilioConfig.from_number || process.env.TWILIO_FROM_NUMBER || '',
      });

      const result = await smsProvider.send({
        to: notification.recipientPhone || '',
        message: notification.body,
      });

      if (result.success) {
        return {
          channel: 'SMS',
          success: true,
          messageId: result.messageId,
        };
      } else {
        return {
          channel: 'SMS',
          success: false,
          error: result.error,
        };
      }
    } catch (error: any) {
      return {
        channel: 'SMS',
        success: false,
        error: error.message || 'SMS delivery failed',
      };
    }
  }

  /**
   * Deliver via WhatsApp
   */
  private async deliverWhatsApp(notification: NotificationInput): Promise<DeliveryResult> {
    try {
      const whatsappConfig = (this.config.notification as any)?.providers?.whatsapp as { enabled?: boolean; secret_id?: string } | undefined;
      if (!whatsappConfig?.enabled || !whatsappConfig?.secret_id) {
        return {
          channel: 'WHATSAPP',
          success: false,
          error: 'WhatsApp provider not configured',
        };
      }

      const secret = await this.secretClient.getSecretValue(whatsappConfig.secret_id);
      const twilioConfig = typeof secret === 'object' 
        ? secret 
        : JSON.parse(secret as string);

      const { TwilioWhatsAppProvider } = await import('./providers/whatsapp/TwilioWhatsAppProvider');
      const whatsappProvider = new TwilioWhatsAppProvider({
        accountSid: twilioConfig.accountSid || twilioConfig.account_sid,
        authToken: twilioConfig.authToken || twilioConfig.auth_token,
        fromNumber: twilioConfig.whatsappNumber || twilioConfig.whatsapp_number || process.env.TWILIO_WHATSAPP_NUMBER || '',
      });

      const result = await whatsappProvider.send({
        to: notification.recipientPhone || '',
        message: notification.body,
      });

      if (result.success) {
        return {
          channel: 'WHATSAPP',
          success: true,
          messageId: result.messageId,
        };
      } else {
        return {
          channel: 'WHATSAPP',
          success: false,
          error: result.error,
        };
      }
    } catch (error: any) {
      return {
        channel: 'WHATSAPP',
        success: false,
        error: error.message || 'WhatsApp delivery failed',
      };
    }
  }

  /**
   * Deliver via voice call
   */
  private async deliverVoice(notification: NotificationInput): Promise<DeliveryResult> {
    try {
      const voiceConfig = (this.config.notification as any)?.providers?.voice as { enabled?: boolean; secret_id?: string } | undefined;
      if (!voiceConfig?.enabled || !voiceConfig?.secret_id) {
        return {
          channel: 'VOICE',
          success: false,
          error: 'Voice provider not configured',
        };
      }

      const secret = await this.secretClient.getSecretValue(voiceConfig!.secret_id!);
      const twilioConfig = typeof secret === 'object' 
        ? secret 
        : JSON.parse(secret as string);

      const { TwilioVoiceProvider } = await import('./providers/voice/TwilioVoiceProvider');
      const voiceProvider = new TwilioVoiceProvider({
        accountSid: twilioConfig.accountSid || twilioConfig.account_sid,
        authToken: twilioConfig.authToken || twilioConfig.auth_token,
        fromNumber: twilioConfig.fromNumber || twilioConfig.from_number || process.env.TWILIO_FROM_NUMBER || '',
      });

      const result = await voiceProvider.send({
        to: notification.recipientPhone || '',
        message: notification.body,
      });

      if (result.success) {
        return {
          channel: 'VOICE',
          success: true,
          messageId: result.callId,
        };
      } else {
        return {
          channel: 'VOICE',
          success: false,
          error: result.error,
        };
      }
    } catch (error: any) {
      return {
        channel: 'VOICE',
        success: false,
        error: error.message || 'Voice delivery failed',
      };
    }
  }

  /**
   * Update notification status based on delivery results
   */
  private async updateNotificationStatus(
    notificationId: string,
    results: DeliveryResult[]
  ): Promise<void> {
    const allSuccess = results.every(r => r.success);
    const someSuccess = results.some(r => r.success);
    const allFailed = results.every(r => !r.success);

    let status: NotificationStatus;
    if (allSuccess) {
      status = 'DELIVERED';
    } else if (someSuccess) {
      status = 'PARTIALLY_DELIVERED';
    } else {
      status = 'FAILED';
    }

    const channelsDelivered = results
      .filter(r => r.success)
      .map(r => r.channel);

    await this.db.notification_notifications.update({
      where: { id: notificationId },
      data: {
        status,
        channelsDelivered,
        processedAt: new Date(),
        completedAt: allSuccess || allFailed ? new Date() : undefined,
      },
    });
  }
}
