/**
 * SendGrid Email Provider
 */

import { BaseEmailProvider } from './BaseEmailProvider';
import { IEmailProvider, SendEmailOptions, BulkEmailOptions, SendEmailResult, BulkEmailResult, DeliveryStatus, HealthCheckResult } from './IEmailProvider';

export interface SendGridConfig {
  apiKey: string;
  defaultFrom: string;
  defaultFromName: string;
}

export class SendGridProvider extends BaseEmailProvider implements IEmailProvider {
  private apiKey: string;

  constructor(config: SendGridConfig) {
    super(config.defaultFrom, config.defaultFromName);
    this.apiKey = config.apiKey;
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(this.apiKey);

      const from = options.from || this.formatFromAddress();
      const to = Array.isArray(options.to) ? options.to : [options.to];

      const msg = {
        to,
        from,
        subject: options.subject,
        html: options.html || '',
        text: options.text || this.generateTextFromHtml(options.html),
        replyTo: options.replyTo,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: typeof att.content === 'string' 
            ? Buffer.from(att.content, 'base64').toString('base64')
            : att.content.toString('base64'),
          type: att.contentType,
          contentId: att.contentId,
          disposition: 'attachment',
        })),
      };

      const [response] = await sgMail.default.send(msg);
      const messageId = response.headers['x-message-id'] || `sg-${Date.now()}`;

      return {
        success: true,
        messageId,
        providerResponse: response,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send email via SendGrid',
        providerResponse: error.response?.body,
      };
    }
  }

  async sendBulk(options: BulkEmailOptions): Promise<BulkEmailResult> {
    try {
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(this.apiKey);

      const from = options.from || this.formatFromAddress();
      const messages = options.messages.map(msg => ({
        to: msg.to,
        from,
        subject: msg.subject,
        html: msg.html || '',
        text: this.generateTextFromHtml(msg.html),
      }));

      const results = await Promise.allSettled(
        messages.map(msg => sgMail.default.send(msg))
      );

      const processedResults = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          const [response] = result.value;
          return {
            to: options.messages[index].to,
            success: true,
            messageId: response.headers['x-message-id'] || `sg-${Date.now()}-${index}`,
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
        success: true,
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
    // SendGrid doesn't provide a direct API for delivery status
    // This would require webhook integration or polling
    return {
      messageId,
      status: 'pending',
    };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(this.apiKey);

      // Simple validation - check if API key is set
      if (!this.apiKey) {
        return {
          healthy: false,
          message: 'API key not configured',
        };
      }

      const latency = Date.now() - startTime;
      return {
        healthy: true,
        message: 'SendGrid provider is healthy',
        latency,
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: error.message || 'Health check failed',
      };
    }
  }
}

