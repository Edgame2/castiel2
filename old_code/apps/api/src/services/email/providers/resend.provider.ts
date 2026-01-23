/**
 * Resend Email Provider
 * Uses Resend to send emails
 */

import type {
  IEmailProvider,
  EmailMessage,
  SendEmailResult,
  EmailProviderConfig,
} from '../email-provider.interface.js';
import type { IMonitoringProvider } from '@castiel/monitoring';

export interface ResendConfig extends EmailProviderConfig {
  apiKey: string;
}

/**
 * Resend Email Provider
 */
export class ResendEmailProvider implements IEmailProvider {
  readonly name = 'resend';
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private client: any = null;
  private initialized = false;
  private monitoring?: IMonitoringProvider;

  constructor(config: ResendConfig) {
    this.apiKey = config.apiKey;
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName || 'Castiel';
    this.monitoring = config.monitoring;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (!this.apiKey) {
      this.monitoring?.trackEvent('email-provider.resend.disabled', {
        reason: 'missing-api-key',
      });
      return;
    }

    try {
      // Dynamic import to avoid breaking builds when not installed
      const { Resend } = await import('resend');
      this.client = new Resend(this.apiKey);
      this.initialized = true;
      this.monitoring?.trackEvent('email-provider.resend.initialized', {
        success: true,
      });
    } catch (error: any) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'email-provider.resend.initialize',
      });
      this.initialized = false;
    }
  }

  isReady(): boolean {
    return this.initialized && this.client !== null;
  }

  async send(message: EmailMessage): Promise<SendEmailResult> {
    if (!this.isReady()) {
      this.monitoring?.trackEvent('email-provider.resend.send-skipped', {
        reason: 'provider-not-ready',
      });
      return { success: false, error: 'Provider not initialized' };
    }

    try {
      const toRecipients = Array.isArray(message.to) ? message.to : [message.to];
      
      const result = await this.client.emails.send({
        from: message.from || `${this.fromName} <${this.fromEmail}>`,
        to: toRecipients,
        subject: message.subject,
        text: message.text,
        html: message.html || message.text.replace(/\n/g, '<br>'),
        reply_to: message.replyTo,
        cc: message.cc,
        bcc: message.bcc,
        attachments: message.attachments?.map(att => ({
          filename: att.filename,
          content: typeof att.content === 'string' 
            ? Buffer.from(att.content, 'base64') 
            : att.content,
          content_type: att.contentType,
        })),
      });

      if (result.data) {
        this.monitoring?.trackEvent('email-provider.resend.sent', {
          messageId: result.data.id,
          recipientCount: toRecipients.length,
        });
        return { success: true, messageId: result.data.id };
      } else {
        const errorMessage = result.error?.message || 'Unknown error';
        this.monitoring?.trackException(new Error(errorMessage), {
          operation: 'email-provider.resend.send',
        });
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'email-provider.resend.send',
      });
      return { success: false, error: error.message };
    }
  }

  async sendBatch(messages: EmailMessage[]): Promise<SendEmailResult[]> {
    if (!this.isReady()) {
      return messages.map(() => ({ success: false, error: 'Provider not initialized' }));
    }

    try {
      const batchEmails = messages.map(message => ({
        from: message.from || `${this.fromName} <${this.fromEmail}>`,
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html || message.text.replace(/\n/g, '<br>'),
      }));

      const result = await this.client.batch.send(batchEmails);
      
      return result.data.map((r: any) => ({
        success: !!r.id,
        messageId: r.id,
        error: r.error?.message,
      }));
    } catch (error: any) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'email-provider.resend.sendBatch',
        messageCount: messages.length,
      });
      return messages.map(() => ({ success: false, error: error.message }));
    }
  }
}

