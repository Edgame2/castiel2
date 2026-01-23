/**
 * SMS Provider Interface
 */

export interface SendSMSOptions {
  to: string;
  message: string;
  from?: string;
}

export interface BulkSMSOptions {
  messages: Array<{
    to: string;
    message: string;
  }>;
  from?: string;
}

export interface SendSMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  providerResponse?: any;
}

export interface BulkSMSResult {
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

export interface HealthCheckResult {
  healthy: boolean;
  message?: string;
  latency?: number;
}

export interface ISMSProvider {
  send(options: SendSMSOptions): Promise<SendSMSResult>;
  sendBulk(options: BulkSMSOptions): Promise<BulkSMSResult>;
  healthCheck(): Promise<HealthCheckResult>;
}

