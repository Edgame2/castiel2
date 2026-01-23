/**
 * SMTP Email Provider
 */

import { BaseEmailProvider } from './BaseEmailProvider';
import { IEmailProvider, SendEmailOptions, BulkEmailOptions, SendEmailResult, BulkEmailResult, DeliveryStatus, HealthCheckResult } from './IEmailProvider';

export interface SMTPConfig {
  host: string;
  port: number;
  secure?: boolean;
  user?: string;
  password?: string;
  defaultFrom: string;
  defaultFromName: string;
}

export class SMTPProvider extends BaseEmailProvider implements IEmailProvider {
  private config: SMTPConfig;

  constructor(config: SMTPConfig) {
    super(config.defaultFrom, config.defaultFromName);
    this.config = config;
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const nodemailer = await import('nodemailer');

      const transporter = nodemailer.default.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure || this.config.port === 465,
        auth: this.config.user && this.config.password ? {
          user: this.config.user,
          pass: this.config.password,
        } : undefined,
      });

      const from = options.from || this.formatFromAddress();
      const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;

      const info = await transporter.sendMail({
        from,
        to,
        subject: options.subject,
        html: options.html || '',
        text: options.text || this.generateTextFromHtml(options.html),
        replyTo: options.replyTo,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          cid: att.contentId,
        })),
      });

      return {
        success: true,
        messageId: info.messageId || `smtp-${Date.now()}`,
        providerResponse: info,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send email via SMTP',
      };
    }
  }

  async sendBulk(options: BulkEmailOptions): Promise<BulkEmailResult> {
    // SMTP doesn't support true bulk sending, so we send individually
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
  }

  async getDeliveryStatus(messageId: string): Promise<DeliveryStatus> {
    // SMTP doesn't provide delivery status tracking
    return {
      messageId,
      status: 'pending',
    };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();
      const nodemailer = await import('nodemailer');

      const transporter = nodemailer.default.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure || this.config.port === 465,
        auth: this.config.user && this.config.password ? {
          user: this.config.user,
          pass: this.config.password,
        } : undefined,
      });

      // Verify connection
      await transporter.verify();
      const latency = Date.now() - startTime;

      return {
        healthy: true,
        message: 'SMTP server is reachable',
        latency,
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: error.message || 'SMTP health check failed',
      };
    }
  }
}

