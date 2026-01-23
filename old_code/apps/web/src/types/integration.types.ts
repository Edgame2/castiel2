/**
 * Integration Types for Frontend
 */

// ============================================
// Integration Definition
// ============================================

export type IntegrationCategory = 'crm' | 'communication' | 'data_source' | 'storage' | 'custom';

export type IntegrationCapability = 'read' | 'write' | 'delete' | 'search' | 'realtime' | 'bulk' | 'attachments';

export type AuthType = 'oauth2' | 'api_key' | 'basic' | 'custom';

export type ConnectionScope = 'system' | 'tenant';

export type IntegrationStatus = 'active' | 'beta' | 'deprecated' | 'disabled';

export interface IntegrationEntity {
  name: string;
  displayName: string;
  description?: string;
  fields: IntegrationEntityField[];
  supportsPull: boolean;
  supportsPush: boolean;
  supportsDelete: boolean;
  supportsWebhook: boolean;
  idField: string;
  modifiedField?: string;
}

export interface IntegrationEntityField {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'array' | 'object';
  required: boolean;
  readOnly?: boolean;
  description?: string;
}

export interface IntegrationDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: IntegrationCategory;
  icon: string;
  color: string;
  visibility: 'public' | 'superadmin_only';
  isPremium: boolean;
  requiredPlan?: string;
  capabilities: IntegrationCapability[];
  supportedSyncDirections: ('pull' | 'push' | 'bidirectional')[];
  supportsRealtime: boolean;
  supportsWebhooks: boolean;
  authType: AuthType;
  availableEntities: IntegrationEntity[];
  connectionScope: ConnectionScope;
  status: IntegrationStatus;
  version: string;
  documentationUrl?: string;
  supportUrl?: string;
}

export interface IntegrationCatalogEntry {
  id: string;
  category: string;
  name: string;
  displayName: string;
  provider: string;
  description?: string;
  status: 'active' | 'beta' | 'deprecated' | 'disabled';
  audience: 'system' | 'tenant';
  capabilities: IntegrationCapability[];
  supportedSyncDirections: ('pull' | 'push' | 'bidirectional')[];
  supportsRealtime: boolean;
  supportsWebhooks: boolean;
  authType: AuthType;
  availableEntities: IntegrationEntity[];
  icon: string;
  color: string;
  documentationUrl?: string;
  supportUrl?: string;
  version: string;
  requiredPlan?: string;
  allowedTenants?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface CatalogListResult {
  entries: IntegrationCatalogEntry[];
  total: number;
  hasMore: boolean;
}

// ============================================
// Tenant Integration
// ============================================

export type TenantIntegrationStatus = 'pending' | 'connected' | 'error' | 'disabled';

export interface TenantIntegration {
  id: string;
  tenantId: string;
  integrationId: string;
  status: TenantIntegrationStatus;
  enabledAt: string;
  enabledBy: string;
  connectionId?: string;
  lastConnectedAt?: string;
  connectionError?: string;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Connection
// ============================================

export type ConnectionStatus = 'active' | 'expired' | 'revoked' | 'error';

export interface ConnectionStatusInfo {
  connected: boolean;
  status?: ConnectionStatus;
  displayName?: string;
  lastValidatedAt?: string;
  expiresAt?: string;
  error?: string;
}

// ============================================
// Conversion Schema
// ============================================

export type FieldMappingType = 'direct' | 'transform' | 'conditional' | 'default' | 'composite' | 'flatten' | 'lookup';

export type TransformationType =
  | 'uppercase' | 'lowercase' | 'trim' | 'truncate' | 'replace' | 'regex_replace' | 'split' | 'concat'
  | 'round' | 'floor' | 'ceil' | 'multiply' | 'divide' | 'add' | 'subtract' | 'abs'
  | 'parse_date' | 'format_date' | 'add_days' | 'to_timestamp' | 'to_iso_string'
  | 'to_string' | 'to_number' | 'to_boolean' | 'to_array' | 'to_date' | 'parse_json' | 'stringify_json'
  | 'custom';

export interface Transformation {
  type: TransformationType;
  config?: Record<string, any>;
}

export interface FieldMapping {
  id: string;
  targetField: string;
  mappingType: FieldMappingType;
  config: {
    type: FieldMappingType;
    sourceField?: string;
    sourceFields?: string[];
    transformations?: Transformation[];
    conditions?: ConditionalRule[];
    default?: any;
    value?: any;
    path?: string;
    separator?: string;
    template?: string;
  };
  required?: boolean;
}

export interface ConditionalRule {
  condition: {
    field: string;
    operator: string;
    value: any;
  };
  then: {
    type: 'value' | 'field' | 'transform';
    value?: any;
    sourceField?: string;
    transformations?: Transformation[];
  };
}

export interface ConversionSchema {
  id: string;
  tenantIntegrationId: string;
  tenantId: string;
  name: string;
  description?: string;
  source: {
    entity: string;
    filters?: Array<{ field: string; operator: string; value: any }>;
  };
  target: {
    shardTypeId: string;
    createIfMissing: boolean;
    updateIfExists: boolean;
    deleteIfRemoved: boolean;
  };
  fieldMappings: FieldMapping[];
  relationshipMappings?: Array<{
    relationshipType: string;
    targetField: string;
    sourceField: string;
    lookupShardType: string;
    lookupByExternalId: boolean;
  }>;
  deduplication: {
    strategy: 'external_id' | 'field_match' | 'composite';
    externalIdField?: string;
    matchFields?: string[];
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Sync Task
// ============================================

export type ScheduleType = 'manual' | 'interval' | 'cron' | 'realtime';
export type IntervalUnit = 'minutes' | 'hours' | 'days' | 'weeks';
export type SyncDirection = 'pull' | 'push' | 'bidirectional';
export type SyncTaskStatus = 'active' | 'paused' | 'error' | 'disabled';
export type ConflictResolution = 'newest_wins' | 'source_wins' | 'target_wins' | 'manual' | 'merge';

export interface SyncSchedule {
  type: ScheduleType;
  config: {
    type: ScheduleType;
    interval?: number;
    unit?: IntervalUnit;
    expression?: string;
    timezone?: string;
  };
}

export interface SyncTaskStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
}

export interface SyncTask {
  id: string;
  tenantIntegrationId: string;
  tenantId: string;
  name: string;
  description?: string;
  conversionSchemaId: string;
  direction: SyncDirection;
  schedule: SyncSchedule;
  config: Record<string, any>;
  conflictResolution?: ConflictResolution;
  status: SyncTaskStatus;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'partial' | 'failed';
  nextRunAt?: string;
  stats: SyncTaskStats;
  lastError?: {
    message: string;
    timestamp: string;
  };
  retryConfig: {
    maxRetries: number;
    retryDelaySeconds: number;
    exponentialBackoff: boolean;
  };
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    onPartial: boolean;
    recipients: string[];
  };
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Sync Execution
// ============================================

export type SyncExecutionStatus = 'running' | 'success' | 'partial' | 'failed' | 'cancelled';
export type SyncTrigger = 'schedule' | 'manual' | 'webhook' | 'retry';
export type SyncPhase = 'initializing' | 'fetching' | 'transforming' | 'saving' | 'complete';

export interface SyncExecution {
  id: string;
  syncTaskId: string;
  tenantIntegrationId: string;
  tenantId: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  triggeredBy: SyncTrigger;
  triggeredByUserId?: string;
  status: SyncExecutionStatus;
  progress: {
    phase: SyncPhase;
    totalRecords?: number;
    processedRecords: number;
    percentage: number;
  };
  results: {
    fetched: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  errors: Array<{
    timestamp: string;
    phase: string;
    recordId?: string;
    externalId?: string;
    error: string;
    recoverable: boolean;
  }>;
  retryCount: number;
}

// ============================================
// API Response Types
// ============================================

export interface IntegrationListResponse {
  integrations: IntegrationDefinition[];
  total: number;
  hasMore: boolean;
}

export interface TenantIntegrationListResponse {
  integrations: TenantIntegration[];
  total: number;
  hasMore: boolean;
}

export interface ConversionSchemaListResponse {
  schemas: ConversionSchema[];
  total: number;
  hasMore: boolean;
}

export interface SyncTaskListResponse {
  tasks: SyncTask[];
  total: number;
  hasMore: boolean;
}

export interface SyncExecutionListResponse {
  executions: SyncExecution[];
  total: number;
  hasMore: boolean;
}

export interface SchemaTestResult {
  success: boolean;
  transformedData?: Record<string, any>;
  fieldResults: Array<{
    targetField: string;
    sourceValue: any;
    transformedValue: any;
    success: boolean;
    error?: string;
  }>;
  errors: string[];
}





export interface InteractionVisibilityRule {
  // Placeholder if not found, but trying to match API
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
}

export interface IntegrationVisibilityRule {
  id: string;
  tenantId: string;
  integrationId: string;
  isVisible: boolean;
  isEnabled: boolean;
  requiresApproval: boolean;
  isApproved: boolean;
  availableInPlan?: 'free' | 'pro' | 'enterprise';
  billingTierId?: string;
  customRateLimit?: Partial<RateLimitConfig>;
  customCapabilities?: IntegrationCapability[];
  customSyncDirections?: ('pull' | 'push' | 'bidirectional')[];
  requestedAt?: string;
  requestedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  deniedAt?: string;
  denialReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}






