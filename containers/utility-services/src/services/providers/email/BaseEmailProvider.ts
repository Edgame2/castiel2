/**
 * Base Email Provider
 * 
 * Abstract base class for email providers with common functionality
 */

import { IEmailProvider, SendEmailResult, BulkEmailResult, DeliveryStatus, HealthCheckResult } from './IEmailProvider';

export abstract class BaseEmailProvider implements IEmailProvider {
  protected defaultFrom: string;
  protected defaultFromName: string;

  constructor(defaultFrom: string, defaultFromName: string) {
    this.defaultFrom = defaultFrom;
    this.defaultFromName = defaultFromName;
  }

  /**
   * Format from address with name
   */
  protected formatFromAddress(from?: string): string {
    if (from) {
      return from.includes('<') ? from : `${this.defaultFromName} <${from}>`;
    }
    return `${this.defaultFromName} <${this.defaultFrom}>`;
  }

  /**
   * Generate text from HTML if not provided
   */
  protected generateTextFromHtml(html?: string): string {
    if (!html) return '';
    // Simple HTML to text conversion (remove tags)
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Abstract methods that must be implemented by subclasses
   */
  abstract send(options: import('./IEmailProvider').SendEmailOptions): Promise<SendEmailResult>;
  abstract sendBulk(options: import('./IEmailProvider').BulkEmailOptions): Promise<BulkEmailResult>;
  abstract getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
  abstract healthCheck(): Promise<HealthCheckResult>;
}

