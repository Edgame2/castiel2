/**
 * Configuration Types
 */

export interface LoggingConfig {
  application_insights?: { connection_string?: string; disable?: boolean };
  metrics?: { path?: string; require_auth?: boolean; bearer_token?: string };
  module: {
    name: string;
    version: string;
  };
  
  server: {
    port: number;
    host: string;
  };
  
  cosmos_db?: {
    endpoint: string;
    key: string;
    database_id: string;
    containers?: Record<string, string>;
  };
  
  database: {
    url: string;
    pool_size: number;
  };
  
  rabbitmq: {
    url: string;
    exchange: string;
    queue: string;
    bindings: string[];
    data_lake?: { queue: string; bindings: string[] };
    ml_audit?: { queue: string; bindings: string[] };
  };
  data_lake?: {
    connection_string: string;
    container: string;
    path_prefix: string;
    feedback_path_prefix?: string;
    audit_path_prefix: string;
    ml_inference_logs_prefix?: string;
  };
  
  storage: {
    provider: 'cosmos';
  };
  
  archive?: {
    enabled: boolean;
    provider: 'local' | 's3' | 'azure';
    local?: {
      basePath: string;
    };
    s3?: {
      bucket: string;
      region: string;
      prefix?: string;
      accessKeyId?: string;
      secretAccessKey?: string;
    };
    azure?: {
      connectionString: string;
      containerName: string;
      prefix?: string;
    };
  };
  
  siem: {
    enabled: boolean;
    provider: 'splunk' | 'datadog' | 'webhook';
    webhook?: {
      url: string;
      headers: Record<string, string>;
    };
  };
  
  defaults: {
    capture: {
      ip_address: boolean;
      user_agent: boolean;
      geolocation: boolean;
    };
    redaction: {
      enabled: boolean;
      patterns: string[];
    };
    retention: {
      default_days: number;
      min_days: number;
      max_days: number;
    };
    hash_chain: {
      enabled: boolean;
      algorithm: 'sha256' | 'sha512';
    };
    alerts: {
      enabled: boolean;
      check_interval_seconds: number;
    };
  };
  
  ingestion: {
    batch_size: number;
    flush_interval_ms: number;
    buffer: {
      enabled: boolean;
      max_size: number;
      file_path: string;
    };
  };
  
  rate_limit: {
    enabled: boolean;
    max_per_second: number;
    burst: number;
  };
  
  jobs: {
    retention: {
      enabled: boolean;
      schedule: string;
    };
    archive: {
      enabled: boolean;
      schedule: string;
    };
    partition: {
      enabled: boolean;
      schedule: string;
    };
    alerts: {
      enabled: boolean;
      schedule: string;
    };
  };
  
  services: {
    user_management: {
      url: string;
    };
    notification: {
      url: string;
    };
  };

  /** Enable/disable what gets stored in the main audit log (AND of all dimensions). When absent, all events are collected. */
  data_collection?: {
    default?: 'allow' | 'deny';
    severity?: Partial<Record<string, boolean>>;
    category?: Partial<Record<string, boolean>>;
    resource_type?: { default?: boolean; [key: string]: boolean | undefined };
    event_type?: {
      mode: 'allowlist' | 'denylist' | 'explicit';
      allow?: string[];
      deny?: string[];
      explicit?: Record<string, boolean>;
    };
  };
}

export interface OrganizationConfig {
  id: string;
  tenantId?: string; // undefined = global config
  
  // Capture settings
  captureIpAddress: boolean;
  captureUserAgent: boolean;
  captureGeolocation: boolean;
  
  // Redaction
  redactSensitiveData: boolean;
  redactionPatterns: string[];
  
  // Hash chain
  hashChainEnabled: boolean;
  
  // Alerts
  alertsEnabled: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateOrganizationConfigInput {
  captureIpAddress?: boolean;
  captureUserAgent?: boolean;
  captureGeolocation?: boolean;
  redactSensitiveData?: boolean;
  redactionPatterns?: string[];
  hashChainEnabled?: boolean;
  alertsEnabled?: boolean;
}

