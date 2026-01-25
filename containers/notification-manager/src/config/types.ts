/**
 * Configuration types for Notification Manager module
 */

export interface ModuleConfig {
  module: {
    name: string;
    version: string;
  };
  server: {
    port: number | string;
    host: string;
  };
  cosmos_db: {
    endpoint: string;
    key: string;
    database_id: string;
    containers?: Record<string, string>;
  };
  database: {
    url: string;
  };
  rabbitmq?: {
    url?: string;
  };
  redis?: {
    url?: string;
    enabled?: boolean;
  };
  notification: {
    providers: {
      email?: {
        enabled?: boolean;
        provider?: 'sendgrid' | 'ses' | 'smtp';
        secret_id?: string | null;
        from_address?: string;
        from_name?: string;
      };
      push?: {
        enabled?: boolean;
        provider?: 'firebase' | 'onesignal';
        secret_id?: string | null;
      };
      sms?: {
        enabled?: boolean;
        provider?: 'twilio' | 'aws-sns' | 'vonage';
        secret_id?: string | null;
      };
      whatsapp?: {
        enabled?: boolean;
        provider?: 'twilio' | 'meta';
        secret_id?: string | null;
      };
      voice?: {
        enabled?: boolean;
        provider?: 'twilio' | 'vonage';
        secret_id?: string | null;
      };
      inapp?: {
        enabled?: boolean;
        exchange?: string;
      };
    };
    defaults: {
      retry_attempts?: number;
      retry_delay_ms?: number;
      rate_limit_per_user?: number;
      rate_limit_per_org?: number;
      max_retry_delay_ms?: number;
      deduplication_ttl_seconds?: number;
    };
    features?: {
      email_templates?: boolean;
      delivery_tracking?: boolean;
      presence_aware?: boolean;
      escalation_chains?: boolean;
      quiet_hours?: boolean;
      batch_digest?: boolean;
      webhooks?: boolean;
    };
  };
  services: {
    user_management: {
      url: string;
      timeout?: number;
    };
    secret_management: {
      url: string;
      timeout?: number;
    };
    logging: {
      url: string;
      timeout?: number;
    };
  };
  app?: {
    url?: string;
  };
  /** Plan §8.5.2, §8.5.4: metrics.path, require_auth, bearer_token */
  metrics?: { path?: string; require_auth?: boolean; bearer_token?: string };
  features?: {
    email_templates?: boolean;
    delivery_tracking?: boolean;
    presence_aware?: boolean;
    escalation_chains?: boolean;
    quiet_hours?: boolean;
    batch_digest?: boolean;
    webhooks?: boolean;
  };
}

