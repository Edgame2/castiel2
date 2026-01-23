/**
 * Email Provider Interface
 * Abstract interface for email sending providers
 */

export interface EmailMessage {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

import type { IMonitoringProvider } from '@castiel/monitoring';

export interface EmailProviderConfig {
  fromEmail: string;
  fromName?: string;
  monitoring?: IMonitoringProvider;
}

/**
 * Email Provider Interface
 * All email providers must implement this interface
 */
export interface IEmailProvider {
  /**
   * Provider name
   */
  readonly name: string;

  /**
   * Check if provider is ready to send emails
   */
  isReady(): boolean;

  /**
   * Send a single email
   */
  send(message: EmailMessage): Promise<SendEmailResult>;

  /**
   * Send multiple emails (batch)
   */
  sendBatch?(messages: EmailMessage[]): Promise<SendEmailResult[]>;
}

/**
 * Email provider factory function type
 */
export type EmailProviderFactory = (config: EmailProviderConfig & Record<string, any>) => IEmailProvider;

