/**
 * WhatsApp Provider Interface
 */

export interface SendWhatsAppOptions {
  to: string;
  message: string;
  from?: string;
  mediaUrl?: string;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  providerResponse?: any;
}

export interface HealthCheckResult {
  healthy: boolean;
  message?: string;
  latency?: number;
}

export interface IWhatsAppProvider {
  send(options: SendWhatsAppOptions): Promise<SendWhatsAppResult>;
  healthCheck(): Promise<HealthCheckResult>;
}

