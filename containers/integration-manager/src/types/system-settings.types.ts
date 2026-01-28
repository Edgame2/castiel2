/**
 * System Settings Types
 * Types for managing system-wide settings (rate limits, capacity, feature flags)
 */

/**
 * Rate limit settings
 */
export interface RateLimitSettings {
  // Global rate limits
  global: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };

  // Default rate limits per integration type
  defaultByIntegrationType: Record<string, {
    requestsPerMinute: number;
    requestsPerHour: number;
  }>;

  // Per-tenant rate limits (optional overrides)
  tenantOverrides?: Record<string, {
    requestsPerMinute: number;
    requestsPerHour: number;
  }>;

  // Rate limit bypass for specific tenants (for testing/emergencies)
  bypassTenants?: string[];
}

/**
 * Processing capacity settings
 */
export interface ProcessingCapacitySettings {
  // Light processor settings
  lightProcessors: {
    minInstances: number;
    maxInstances: number;
    autoScaleThreshold: number; // CPU/Memory threshold for auto-scaling
    prefetch: number;
    concurrentProcessing: number;
    memoryLimitMB: number;
  };

  // Heavy processor settings
  heavyProcessors: {
    minInstances: number;
    maxInstances: number;
    autoScaleThreshold: number;
    prefetch: number;
    concurrentProcessing: number;
    memoryLimitMB: number;
  };
}

/**
 * Queue configuration settings
 */
export interface QueueConfiguration {
  // Queue TTL settings (in milliseconds)
  ttl: {
    integrationDataRaw: number;
    integrationDocuments: number;
    integrationCommunications: number;
    integrationMeetings: number;
    integrationEvents: number;
    shardMlAggregation: number;
  };

  // Dead-letter queue settings
  dlq: {
    maxRetries: number;
    alertThreshold: number; // Alert when DLQ depth exceeds this
  };

  // Message priority settings
  priority: {
    enabled: boolean;
    highPriorityQueues: string[];
  };

  // Queue depth alerts
  depthAlerts: {
    enabled: boolean;
    warningThreshold: number;
    criticalThreshold: number;
  };

  // Auto-scaling rules
  autoScaling: {
    enabled: boolean;
    scaleUpThreshold: number; // Queue depth to trigger scale-up
    scaleDownThreshold: number; // Queue depth to trigger scale-down
  };
}

/**
 * Feature flags
 */
export interface FeatureFlags {
  documentProcessing: boolean;
  emailProcessing: boolean;
  meetingTranscription: boolean;
  entityLinking: boolean;
  mlFieldAggregation: boolean;
  suggestedLinks: boolean;
  bidirectionalSync: boolean;
  webhooks: boolean;
  [key: string]: boolean; // Allow custom feature flags
}

/**
 * Azure service settings
 */
export interface AzureServiceSettings {
  blobStorage: {
    enabled: boolean;
    connectionString?: string; // Reference to Key Vault secret
  };
  computerVision: {
    enabled: boolean;
    endpoint?: string;
    key?: string; // Reference to Key Vault secret
  };
  speechServices: {
    enabled: boolean;
    endpoint?: string;
    key?: string; // Reference to Key Vault secret
  };
}

/**
 * Complete system settings
 */
export interface SystemSettings {
  id: string; // Always 'system' for singleton
  rateLimits: RateLimitSettings;
  capacity: ProcessingCapacitySettings;
  queueConfig: QueueConfiguration;
  featureFlags: FeatureFlags;
  azureServices?: AzureServiceSettings;
  updatedAt: Date;
  updatedBy: string;
}

/**
 * Update system settings input
 */
export interface UpdateSystemSettingsInput {
  rateLimits?: Partial<RateLimitSettings>;
  capacity?: Partial<ProcessingCapacitySettings>;
  queueConfig?: Partial<QueueConfiguration>;
  featureFlags?: Partial<FeatureFlags>;
  azureServices?: Partial<AzureServiceSettings>;
}
