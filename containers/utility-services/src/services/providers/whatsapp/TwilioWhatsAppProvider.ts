/**
 * Twilio WhatsApp Provider
 */

import { IWhatsAppProvider, SendWhatsAppOptions, SendWhatsAppResult, HealthCheckResult } from './IWhatsAppProvider';

export interface TwilioWhatsAppConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string; // WhatsApp number in format: whatsapp:+14155238886
}

export class TwilioWhatsAppProvider implements IWhatsAppProvider {
  private config: TwilioWhatsAppConfig;
  private client: any;

  constructor(config: TwilioWhatsAppConfig) {
    this.config = config;
  }

  /**
   * Initialize Twilio client
   */
  private async initializeClient(): Promise<void> {
    if (this.client) {
      return;
    }

    try {
      const twilio = await import('twilio');
      this.client = twilio.default(this.config.accountSid, this.config.authToken);
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('twilio package is not installed. Run: npm install twilio');
      }
      throw error;
    }
  }

  async send(options: SendWhatsAppOptions): Promise<SendWhatsAppResult> {
    try {
      await this.initializeClient();

      // Format WhatsApp number
      const to = options.to.startsWith('whatsapp:') ? options.to : `whatsapp:${options.to}`;
      const from = (options.from || this.config.fromNumber).startsWith('whatsapp:')
        ? options.from || this.config.fromNumber
        : `whatsapp:${options.from || this.config.fromNumber}`;

      const messageData: any = {
        body: options.message,
        from,
        to,
      };

      if (options.mediaUrl) {
        messageData.mediaUrl = [options.mediaUrl];
      }

      const message = await this.client.messages.create(messageData);

      return {
        success: true,
        messageId: message.sid,
        providerResponse: message,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send WhatsApp message via Twilio',
        providerResponse: error,
      };
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();
      await this.initializeClient();

      if (!this.config.accountSid || !this.config.authToken) {
        return {
          healthy: false,
          message: 'Twilio credentials not configured',
        };
      }

      const latency = Date.now() - startTime;
      return {
        healthy: true,
        message: 'Twilio WhatsApp provider is healthy',
        latency,
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: error.message || 'Twilio WhatsApp health check failed',
      };
    }
  }
}

