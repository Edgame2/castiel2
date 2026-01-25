/**
 * Email Provider Interface
 * 
 * All email provider implementations must conform to this contract.
 * Follows ModuleImplementationGuide Section 6.2
 */

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Attachment[];
  metadata?: Record<string, any>;
}

export interface BulkEmailOptions {
  messages: Array<{
    to: string;
    subject: string;
    html?: string;
    text?: string;
    metadata?: Record<string, any>;
  }>;
  from?: string;
}

export interface Attachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  contentId?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  providerResponse?: any;
}

export interface BulkEmailResult {
  success: boolean;
  results: Array<{
    to: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
  totalSent: number;
  totalFailed: number;
}

export interface DeliveryStatus {
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'rejected' | 'failed';
  deliveredAt?: Date;
  bouncedAt?: Date;
  error?: string;
  providerData?: any;
}

export interface HealthCheckResult {
  healthy: boolean;
  message?: string;
  latency?: number;
}

/**
 * Email provider interface
 * All email implementations must conform to this contract
 */
export interface IEmailProvider {
  /**
   * Send a single email
   */
  send(options: SendEmailOptions): Promise<SendEmailResult>;
  
  /**
   * Send bulk emails
   */
  sendBulk(options: BulkEmailOptions): Promise<BulkEmailResult>;
  
  /**
   * Get delivery status
   */
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
  
  /**
   * Verify provider is configured and reachable
   */
  healthCheck(): Promise<HealthCheckResult>;
}

