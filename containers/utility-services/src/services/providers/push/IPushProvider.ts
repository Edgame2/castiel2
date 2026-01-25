/**
 * Push Notification Provider Interface
 */

export interface SendPushOptions {
  deviceToken: string | string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  priority?: 'normal' | 'high';
  ttl?: number; // Time to live in seconds
}

export interface BulkPushOptions {
  messages: Array<{
    deviceToken: string;
    title: string;
    body: string;
    data?: Record<string, any>;
  }>;
}

export interface SendPushResult {
  success: boolean;
  messageId?: string;
  error?: string;
  providerResponse?: any;
}

export interface BulkPushResult {
  success: boolean;
  results: Array<{
    deviceToken: string;
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

export interface IPushProvider {
  send(options: SendPushOptions): Promise<SendPushResult>;
  sendBulk(options: BulkPushOptions): Promise<BulkPushResult>;
  healthCheck(): Promise<HealthCheckResult>;
}

