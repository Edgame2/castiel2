/**
 * Console Email Provider
 * Logs emails to console instead of sending them
 * Useful for development and testing
 */

import type {
  IEmailProvider,
  EmailMessage,
  SendEmailResult,
  EmailProviderConfig,
} from '../email-provider.interface.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Console Email Provider - logs emails to console
 */
export class ConsoleEmailProvider implements IEmailProvider {
  readonly name = 'console';
  private fromEmail: string;
  private fromName: string;

  constructor(config: EmailProviderConfig) {
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName || 'Castiel';
  }

  isReady(): boolean {
    return true;
  }

  async send(message: EmailMessage): Promise<SendEmailResult> {
    const messageId = uuidv4();
    const toRecipients = Array.isArray(message.to) ? message.to : [message.to];
    
    console.log('\n' + '='.repeat(60));
    console.log('📧 EMAIL (Console Provider - Not Sent)');
    console.log('='.repeat(60));
    console.log(`Message ID: ${messageId}`);
    console.log(`From: ${message.from || `${this.fromName} <${this.fromEmail}>`}`);
    console.log(`To: ${toRecipients.join(', ')}`);
    if (message.cc?.length) {console.log(`Cc: ${message.cc.join(', ')}`);}
    if (message.bcc?.length) {console.log(`Bcc: ${message.bcc.join(', ')}`);}
    if (message.replyTo) {console.log(`Reply-To: ${message.replyTo}`);}
    console.log(`Subject: ${message.subject}`);
    console.log('-'.repeat(60));
    console.log('Body (Text):');
    console.log(message.text);
    if (message.html) {
      console.log('-'.repeat(60));
      console.log('Body (HTML):');
      console.log(message.html.substring(0, 500) + (message.html.length > 500 ? '...' : ''));
    }
    if (message.attachments?.length) {
      console.log('-'.repeat(60));
      console.log(`Attachments: ${message.attachments.map(a => a.filename).join(', ')}`);
    }
    console.log('='.repeat(60) + '\n');

    return { success: true, messageId };
  }

  async sendBatch(messages: EmailMessage[]): Promise<SendEmailResult[]> {
    return Promise.all(messages.map(msg => this.send(msg)));
  }
}

