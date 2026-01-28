/**
 * Integration Configuration Types
 * Comprehensive TypeScript interfaces for the integration configuration system
 * This file provides a single source of truth for all configuration-related types
 */

/**
 * Integration Type (Catalog Entry)
 * Represents an available integration type in the catalog
 */
export interface IntegrationType {
  id: string;
  name: string;
  description: string;
  category: 'crm' | 'documents' | 'communications' | 'meetings' | 'calendar';
  logoUrl?: string;
  authType: 'oauth2' | 'api_key' | 'basic';
  oauthConfig?: {
    authorizationUrl: string;
    tokenUrl: string;
    scopes: string[];
  };
  supportedEntities: string[];
  capabilities: {
    incrementalSync: boolean;
    webhooks: boolean;
    bidirectionalSync: boolean;
    bulkOperations: boolean;
    changeDataCapture: boolean;
  };
  defaultFieldMappings?: EntityMapping[];
  rateLimits?: {
    requestsPerSecond: number;
    requestsPerDay: number;
    quotaLimit?: number;
  };
  documentationUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tenant Integration
 * Represents a tenant's connected integration instance
 */
export interface TenantIntegration {
  id: string;
  tenantId: string;
  integrationType: string;
  integrationName: string; // Salesforce, HubSpot, etc.
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  connectionDetails: {
    connectedAt: Date;
    lastSync?: Date;
    accessToken?: string; // Encrypted (reference to secret)
    refreshToken?: string; // Encrypted (reference to secret)
    instanceUrl?: string;
    expiresAt?: Date;
  };
  syncConfig: SyncConfig;
  health?: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastSync?: Date;
    successRate?: number;
    errorCount?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sync Configuration
 * Defines how data is synced between external system and internal shards
 */
export interface SyncConfig {
  enabledEntities: string[];
  schedule: {
    frequency: 'manual' | '15min' | 'hourly' | 'daily' | 'weekly' | 'custom';
    cronExpression?: string;
    timezone?: string;
  };
  direction: 'one-way' | 'bidirectional';
  filters?: SyncFilter[];
  entityMappings: EntityMapping[];
  customTransforms?: Array<{
    name: string;
    code?: string;
    function?: (value: any, options?: Record<string, any>) => any;
  }>;
}

/**
 * Entity Mapping
 * Maps an external entity type to an internal shard type with field mappings
 */
export interface EntityMapping {
  id?: string;
  externalEntityName: string; // e.g., "Account", "Contact", "Opportunity"
  shardTypeId: string; // e.g., "c_account", "c_contact", "c_opportunity"
  shardTypeName?: string; // Human-readable name
  fieldMappings: FieldMapping[];
  enabled?: boolean;
}

/**
 * Field Mapping
 * Maps an external field to an internal shard field with optional transformation
 */
export interface FieldMapping {
  externalFieldName: string; // e.g., "Name", "Amount", "CloseDate"
  internalFieldName: string; // e.g., "name", "amount", "closeDate"
  transform?: string; // Transform function name (e.g., "toLowerCase", "parseDate")
  transformOptions?: Record<string, any>; // Options for the transform function
  defaultValue?: any; // Default value if external field is missing
  required: boolean;
}

/**
 * Sync Filter
 * Defines filtering criteria for synced data
 */
export interface SyncFilter {
  entityType: string;
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in' | 'not_equals' | 'not_in' | 'gt' | 'lt';
  value: any;
}

/**
 * Sync Execution
 * Represents a single sync execution/task
 */
export interface SyncExecution {
  id: string;
  integrationId: string;
  tenantId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'queued' | 'running' | 'completed' | 'failed';
  recordsProcessed: number;
  recordsFailed: number;
  duration?: number; // milliseconds
  entitiesSynced: string[];
  errors?: ErrorLog[];
}

/**
 * Error Log
 * Represents an error that occurred during sync or processing
 */
export interface ErrorLog {
  id: string;
  timestamp: Date;
  errorType: string;
  errorMessage: string;
  entityType?: string;
  externalId?: string;
  retryAttempts: number;
  status: 'resolved' | 'pending' | 'ignored';
  stackTrace?: string;
}

/**
 * Entity Linking Settings
 * Configuration for automatic entity linking
 */
export interface EntityLinkingSettings {
  tenantId: string;
  autoLinkThreshold: number; // 0.0-1.0 (default 0.8)
  suggestedLinkThreshold: number; // 0.0-1.0 (default 0.6)
  enabledStrategies: {
    explicitReference: boolean; // Always enabled
    participantMatching: boolean;
    contentAnalysis: boolean;
    temporalCorrelation: boolean;
    vectorSimilarity: boolean;
  };
  createdAt?: Date;
  updatedAt: Date;
}

/**
 * Suggested Link
 * Represents a suggested entity link that requires review
 */
export interface SuggestedLink {
  id: string;
  tenantId: string;
  sourceShardId: string;
  sourceShardType: string;
  targetShardId: string;
  targetShardType: string;
  confidence: number; // 0.0-1.0
  strategy: string; // Which linking strategy found this
  linkingReason: string; // Human-readable explanation
  status: 'pending_review' | 'approved' | 'rejected' | 'expired';
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Linking Rule
 * Custom rule for entity linking
 */
export interface LinkingRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  condition: {
    sourceShardType: string;
    field: string;
    operator: 'equals' | 'contains' | 'matches' | 'startsWith' | 'endsWith';
    value: any;
  };
  action: {
    targetShardType: string;
    linkType: string;
    confidence: number;
  };
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Document Processing Configuration
 */
export interface DocumentProcessingConfig {
  enabled: boolean;
  textExtraction: boolean;
  ocrForImages: boolean;
  contentAnalysis: boolean; // LLM-based
  entityExtraction: boolean;
  maxDocumentSizeMB: number;
  supportedFileTypes: string[];
}

/**
 * Email Processing Configuration
 */
export interface EmailProcessingConfig {
  enabled: boolean;
  sentimentAnalysis: boolean;
  actionItemExtraction: boolean;
  processAttachments: boolean;
  filterSpam: boolean;
  filters?: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'matches';
    value: any;
  }>;
}

/**
 * Meeting Processing Configuration
 */
export interface MeetingProcessingConfig {
  enabled: boolean;
  transcription: boolean;
  speakerDiarization: boolean;
  keyMomentDetection: boolean;
  actionItemExtraction: boolean;
  dealSignalDetection: boolean;
  transcriptionQuality: 'standard' | 'high';
  maxRecordingDurationMinutes: number;
}

/**
 * Processing Priority
 */
export interface ProcessingPriority {
  dataType: 'opportunities' | 'documents' | 'emails' | 'meetings' | 'messages';
  priority: number; // Lower number = higher priority
}

/**
 * Data Processing Settings
 */
export interface DataProcessingSettings {
  tenantId: string;
  documentProcessing: DocumentProcessingConfig;
  emailProcessing: EmailProcessingConfig;
  meetingProcessing: MeetingProcessingConfig;
  priorities: ProcessingPriority[];
  createdAt?: Date;
  updatedAt: Date;
}

/**
 * Integration Health
 * Health status for an integration
 */
export interface IntegrationHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'disconnected';
  lastSync?: Date | null;
  successRate7d?: number;
  successRate30d?: number;
  totalRecordsSynced?: number;
  apiQuotaUsed?: number;
  apiQuotaLimit?: number;
  connectionStatus: 'connected' | 'error' | 'disconnected';
  issues: string[];
}

/**
 * Data Quality Metrics
 */
export interface DataQualityMetrics {
  completeness: number; // 0.0-1.0
  accuracy: number; // 0.0-1.0
  timeliness: number; // 0.0-1.0
  consistency: number; // 0.0-1.0
  duplicateRate: number; // 0.0-1.0
  missingRequiredFields: number;
  invalidValues: number;
  lastAnalyzed?: Date;
}

/**
 * Performance Metrics
 */
export interface PerformanceMetrics {
  averageSyncDuration: number; // milliseconds
  averageRecordsPerSecond: number;
  p95SyncDuration: number; // milliseconds
  p99SyncDuration: number; // milliseconds
  errorRate: number; // 0.0-1.0
  queueDepth: number;
  processingLatency: number; // milliseconds
  lastUpdated: Date;
}
