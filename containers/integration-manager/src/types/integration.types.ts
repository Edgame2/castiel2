/**
 * Integration Manager types
 * Core data model for integration management
 */

export enum AuthMethod {
  OAUTH = 'oauth',
  API_KEY = 'apikey',
  SERVICE_ACCOUNT = 'serviceaccount',
  BASIC = 'basic',
}

export enum SyncDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
  BIDIRECTIONAL = 'bidirectional',
}

export enum IntegrationStatus {
  PENDING = 'pending',
  CONNECTED = 'connected',
  ERROR = 'error',
  DISABLED = 'disabled',
}

export enum ConnectionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  ERROR = 'error',
}

export enum SyncJobType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  WEBHOOK = 'webhook',
  MANUAL = 'manual',
}

export enum SyncTrigger {
  SCHEDULED = 'scheduled',
  WEBHOOK = 'webhook',
  MANUAL = 'manual',
  RETRY = 'retry',
}

export enum SyncStatus {
  RUNNING = 'running',
  SUCCESS = 'success',
  PARTIAL = 'partial',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface SyncFrequency {
  type: 'interval' | 'cron' | 'manual';
  intervalMinutes?: number; // 5, 15, 30, 60
  cronExpression?: string; // "0 0 */4 * * *"
}

export interface EntityMapping {
  id: string;
  externalEntity: string; // e.g., "Account", "Contact"
  shardTypeId: string; // e.g., "c_account", "c_contact"
  fieldMappings: FieldMapping[];
  enabled: boolean;
}

export interface FieldMapping {
  externalField: string;
  shardField: string;
  transform?: string; // Transform function name
  required?: boolean;
}

export interface PullFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'in' | 'not_in';
  value: any;
}

export interface WriteBackConfig {
  enabled: boolean;
  allowedShardTypes: string[];
  conflictResolution: ConflictResolutionMode;
}

export enum ConflictResolutionMode {
  EXTERNAL_WINS = 'external_wins',
  INTERNAL_WINS = 'internal_wins',
  MANUAL = 'manual',
  LAST_WRITE_WINS = 'last_write_wins',
}

/**
 * Integration Provider (catalog entry)
 */
export interface OAuthProviderConfig {
  authorizationUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  userInfoUrl?: string;
  scopes: string[];
  clientIdEnvVar?: string;
  clientSecretEnvVar?: string;
  redirectUri: string;
  pkce: boolean;
  additionalParams?: Record<string, string>;
}

export interface IntegrationProvider {
  id: string;
  category: string; // Partition key
  provider: string; // e.g., "salesforce", "hubspot"
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  authMethods: AuthMethod[];
  supportedEntities: string[]; // External entity types
  requiresUserScoping?: boolean;
  webhookSupport: boolean;
  oauthConfig?: OAuthProviderConfig; // OAuth configuration if authMethods includes 'oauth'
  documentationUrl?: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Integration (tenant-specific instance)
 */
export interface Integration {
  id: string;
  tenantId: string; // Partition key
  integrationId: string; // Reference to provider
  providerName: string; // Denormalized
  name: string;
  description?: string;
  icon?: string;
  credentialSecretName: string; // Reference to Secret Management
  authMethod: AuthMethod;
  instanceUrl?: string;
  settings: Record<string, any>;
  syncConfig?: {
    syncEnabled: boolean;
    syncDirection: SyncDirection;
    syncFrequency?: SyncFrequency;
    entityMappings: EntityMapping[];
    pullFilters?: PullFilter[];
    syncUserScoped?: boolean;
    writeBack?: WriteBackConfig;
    conflictResolution: ConflictResolutionMode;
    maxRecordsPerSync?: number;
  };
  userScoped?: boolean;
  allowedShardTypes?: string[];
  searchEnabled?: boolean;
  searchableEntities?: string[];
  status: IntegrationStatus;
  connectionStatus?: ConnectionStatus;
  lastConnectedAt?: Date;
  lastConnectionTestAt?: Date;
  lastConnectionTestResult?: 'success' | 'failed';
  connectionError?: string;
  lastSyncAt?: Date;
  lastSyncStatus?: SyncStatus;
  lastSyncMessage?: string;
  lastSyncRecordsProcessed?: number;
  nextSyncAt?: Date;
  enabledAt: Date;
  enabledBy: string;
  createdAt: Date;
  updatedAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create integration input
 */
export interface CreateIntegrationInput {
  tenantId: string;
  userId: string;
  integrationId: string; // Provider ID
  name: string;
  description?: string;
  credentialSecretName: string;
  authMethod: AuthMethod;
  instanceUrl?: string;
  settings?: Record<string, any>;
  syncConfig?: Integration['syncConfig'];
  userScoped?: boolean;
  allowedShardTypes?: string[];
  searchEnabled?: boolean;
}

/**
 * Update integration input
 */
export interface UpdateIntegrationInput {
  name?: string;
  description?: string;
  settings?: Record<string, any>;
  syncConfig?: Integration['syncConfig'];
  userScoped?: boolean;
  allowedShardTypes?: string[];
  searchEnabled?: boolean;
  status?: IntegrationStatus;
}

/**
 * Webhook
 */
export interface Webhook {
  id: string;
  tenantId: string; // Partition key
  integrationId: string; // Reference to integration
  providerName: string; // Denormalized
  webhookUrl: string; // External webhook URL
  webhookId?: string; // External webhook ID
  webhookSecret?: string; // Reference to secret
  events: string[]; // Event types to subscribe to
  isActive: boolean;
  lastTriggeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create webhook input
 */
export interface CreateWebhookInput {
  tenantId: string;
  userId: string;
  integrationId: string;
  webhookUrl: string;
  events: string[];
  webhookSecret?: string;
}

/**
 * Update webhook input
 */
export interface UpdateWebhookInput {
  webhookUrl?: string;
  events?: string[];
  isActive?: boolean;
}

/**
 * Sync Task
 */
export interface SyncTask {
  id: string;
  tenantId: string; // Partition key
  integrationId: string; // Reference to integration
  providerName: string; // Denormalized
  jobId: string; // Unique job identifier
  jobType: SyncJobType;
  trigger: SyncTrigger;
  triggeredBy?: string; // User ID if manual
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  status: SyncStatus;
  statusMessage?: string;
  stats: {
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsFailed: number;
  };
  entityStats?: {
    entity: string;
    processed: number;
    created: number;
    updated: number;
    failed: number;
  }[];
  errors?: {
    entity?: string;
    recordId?: string;
    message: string;
    details?: any;
  }[];
  createdAt: Date;
  updatedAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create sync task input
 */
export interface CreateSyncTaskInput {
  tenantId: string;
  userId: string;
  integrationId: string;
  jobType: SyncJobType;
  trigger: SyncTrigger;
  entityMappings?: EntityMapping[];
}

