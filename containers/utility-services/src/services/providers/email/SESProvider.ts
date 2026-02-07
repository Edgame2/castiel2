/**
 * AWS SES Email Provider
 */

import { BaseEmailProvider } from './BaseEmailProvider';
import { IEmailProvider, SendEmailOptions, BulkEmailOptions, SendEmailResult, BulkEmailResult, DeliveryStatus, HealthCheckResult } from './IEmailProvider';

export interface SESConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  defaultFrom: string;
  defaultFromName: string;
}

export class SESProvider extends BaseEmailProvider implements IEmailProvider {
  private config: SESConfig;

  constructor(config: SESConfig) {
    super(config.defaultFrom, config.defaultFromName);
    this.config = config;
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');

      const client = new SESClient({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
      });

      const from = options.from || this.formatFromAddress();
      const fromEmail = from.match(/<(.+)>/)?.[1] || from;
      const to = Array.isArray(options.to) ? options.to : [options.to];

      const command = new SendEmailCommand({
        Source: fromEmail,
        Destination: {
          ToAddresses: to,
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: options.html || '',
              Charset: 'UTF-8',
            },
            Text: {
              Data: options.text || this.generateTextFromHtml(options.html),
              Charset: 'UTF-8',
            },
          },
        },
        ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
      });

      const response = await client.send(command);
      const messageId = response.MessageId || `ses-${Date.now()}`;

      return {
        success: true,
        messageId,
        providerResponse: response,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send email via AWS SES',
        providerResponse: error,
      };
    }
  }

  async sendBulk(options: BulkEmailOptions): Promise<BulkEmailResult> {
    try {
      const { SESClient } = await import('@aws-sdk/client-ses');

      const _client = new SESClient({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
      });

      // AWS SES bulk sending requires templates, so we'll send individually
      const results = await Promise.allSettled(
        options.messages.map(msg => this.send({
          to: msg.to,
          subject: msg.subject,
          html: msg.html,
          text: this.generateTextFromHtml(msg.html),
          from: options.from,
        }))
      );

      const processedResults = results.map((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          return {
            to: options.messages[index].to,
            success: true,
            messageId: result.value.messageId,
          };
        } else {
          return {
            to: options.messages[index].to,
            success: false,
            error: result.status === 'rejected'
              ? result.reason?.message
              : result.value.error || 'Failed to send',
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

  async getDeliveryStatus(messageId: string): Promise<DeliveryStatus> {
    // AWS SES provides delivery status via SNS notifications or CloudWatch
    // This would require webhook integration
    return {
      messageId,
      status: 'pending',
    };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();
      const { SESClient, GetSendQuotaCommand } = await import('@aws-sdk/client-ses');

      const client = new SESClient({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
      });

      // Check quota to verify credentials
      const command = new GetSendQuotaCommand({});
      await client.send(command);

      const latency = Date.now() - startTime;
      return {
        healthy: true,
        message: 'AWS SES is accessible',
        latency,
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: error.message || 'AWS SES health check failed',
      };
    }
  }
}

