/**
 * Twilio SMS Provider
 */

import { ISMSProvider, SendSMSOptions, BulkSMSOptions, SendSMSResult, BulkSMSResult, HealthCheckResult } from './ISMSProvider';

export interface TwilioSMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export class TwilioSMSProvider implements ISMSProvider {
  private config: TwilioSMSConfig;
  private client: any;

  constructor(config: TwilioSMSConfig) {
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

  async send(options: SendSMSOptions): Promise<SendSMSResult> {
    try {
      await this.initializeClient();

      const message = await this.client.messages.create({
        body: options.message,
        from: options.from || this.config.fromNumber,
        to: options.to,
      });

      return {
        success: true,
        messageId: message.sid,
        providerResponse: message,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send SMS via Twilio',
        providerResponse: error,
      };
    }
  }

  async sendBulk(options: BulkSMSOptions): Promise<BulkSMSResult> {
    try {
      await this.initializeClient();

      const results = await Promise.allSettled(
        options.messages.map(msg => 
          this.client.messages.create({
            body: msg.message,
            from: options.from || this.config.fromNumber,
            to: msg.to,
          })
        )
      );

      const processedResults = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return {
            to: options.messages[index].to,
            success: true,
            messageId: result.value.sid,
          };
        } else {
          return {
            to: options.messages[index].to,
            success: false,
            error: result.reason?.message || 'Failed to send',
          };
        }
      });

      return {
        success: processedResults.some(r => r.success),
        results: processedResults,
        totalSent: processedResults.filter(r => r.success).length,
        totalFailed: processedResults.filter(r => !r.success).length,
      };
    } catch (error: any) {
      return {
        success: false,
        results: options.messages.map(msg => ({
          to: msg.to,
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
      await this.initializeClient();

      // Simple validation - check if credentials are set
      if (!this.config.accountSid || !this.config.authToken) {
        return {
          healthy: false,
          message: 'Twilio credentials not configured',
        };
      }

      const latency = Date.now() - startTime;
      return {
        healthy: true,
        message: 'Twilio SMS provider is healthy',
        latency,
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: error.message || 'Twilio SMS health check failed',
      };
    }
  }
}

