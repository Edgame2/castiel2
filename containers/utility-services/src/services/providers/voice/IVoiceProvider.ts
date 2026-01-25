/**
 * Voice Provider Interface
 */

export interface SendVoiceOptions {
  to: string;
  message: string;
  from?: string;
  language?: string;
  voice?: 'male' | 'female';
}

export interface SendVoiceResult {
  success: boolean;
  callId?: string;
  error?: string;
  providerResponse?: any;
}

export interface HealthCheckResult {
  healthy: boolean;
  message?: string;
  latency?: number;
}

export interface IVoiceProvider {
  send(options: SendVoiceOptions): Promise<SendVoiceResult>;
  healthCheck(): Promise<HealthCheckResult>;
}

