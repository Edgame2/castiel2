/**
 * Audit & Enterprise Integration Types
 * Audit logging, SSO integration, data warehouse connectors, real-time streaming
 */

/**
 * Audit Log Entry
 */
export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  resourceName?: string;
  changes?: AuditChange[];
  severity: AuditSeverity;
  status: AuditStatus;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  timestamp: Date;
  duration?: number; // milliseconds
  metadata?: Record<string, any>;
  ttl?: number; // 365 days default (31536000 seconds)
}

/**
 * Audit Actions
 */
export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
  ARCHIVE = 'ARCHIVE',
  UNARCHIVE = 'UNARCHIVE',
  SHARE = 'SHARE',
  UNSHARE = 'UNSHARE',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  PUBLISH = 'PUBLISH',
  ROLLBACK = 'ROLLBACK',
  LINK = 'LINK',
  UNLINK = 'UNLINK',
  BULK_ACTION = 'BULK_ACTION',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  AUTH_FAILURE = 'AUTH_FAILURE',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  API_KEY_GENERATE = 'API_KEY_GENERATE',
  API_KEY_REVOKE = 'API_KEY_REVOKE',
  CUSTOM = 'CUSTOM',
}

/**
 * Resource Types
 */
export enum ResourceType {
  PROJECT = 'PROJECT',
  TEMPLATE = 'TEMPLATE',
  SHARD = 'SHARD',
  SHARED_PROJECT = 'SHARED_PROJECT',
  VERSION = 'VERSION',
  ACTIVITY = 'ACTIVITY',
  NOTIFICATION = 'NOTIFICATION',
  USER = 'USER',
  ROLE = 'ROLE',
  PERMISSION = 'PERMISSION',
  TENANT_CONFIG = 'TENANT_CONFIG',
  INTEGRATION = 'INTEGRATION',
  API_KEY = 'API_KEY',
  EXPORT = 'EXPORT',
  REPORT = 'REPORT',
  CUSTOM_METRIC = 'CUSTOM_METRIC',
  WEBHOOK = 'WEBHOOK',
  SSO_CONFIG = 'SSO_CONFIG',
}

/**
 * Audit Severity Levels
 */
export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  SECURITY_EVENT = 'SECURITY_EVENT',
}

/**
 * Audit Status
 */
export enum AuditStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PARTIAL = 'PARTIAL',
}

/**
 * Change Tracking
 */
export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'modified' | 'removed';
}

/**
 * Audit Query & Filtering
 */
export interface AuditQuery {
  tenantId: string;
  userId?: string;
  action?: AuditAction;
  resourceType?: ResourceType;
  resourceId?: string;
  severity?: AuditSeverity;
  status?: AuditStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'action';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Audit Report
 */
export interface AuditReport {
  id: string;
  tenantId: string;
  generatedBy: string;
  reportType: AuditReportType;
  startDate: Date;
  endDate: Date;
  totalEvents: number;
  eventsByAction: Record<AuditAction, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  eventsByResourceType: Record<ResourceType, number>;
  topActions: Array<{ action: AuditAction; count: number }>;
  topUsers: Array<{ userId: string; eventCount: number }>;
  failureRate: number;
  criticalEventsCount: number;
  exportFormat?: 'json' | 'csv' | 'pdf';
  generatedAt: Date;
  expiresAt?: Date;
}

/**
 * Audit Report Types
 */
export enum AuditReportType {
  SUMMARY = 'SUMMARY',
  DETAILED = 'DETAILED',
  SECURITY = 'SECURITY',
  COMPLIANCE = 'COMPLIANCE',
  USER_ACTIVITY = 'USER_ACTIVITY',
  RESOURCE_ACCESS = 'RESOURCE_ACCESS',
}

/**
 * SSO Configuration
 */
export interface SSOConfig {
  id: string;
  tenantId: string;
  provider: SSOProvider;
  enabled: boolean;
  clientId: string;
  clientSecret: string; // Encrypted
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  redirectUrl: string;
  scopes: string[];
  mappings: SSOUserMapping;
  autoProvisionUsers: boolean;
  defaultRole?: string;
  enforceSSO: boolean;
  createdAt: Date;
  updatedAt: Date;
  testResult?: SSOTestResult;
}

/**
 * SSO Providers
 */
export enum SSOProvider {
  OAUTH2 = 'OAUTH2',
  SAML2 = 'SAML2',
  OPENID_CONNECT = 'OPENID_CONNECT',
  AZURE_AD = 'AZURE_AD',
  GOOGLE = 'GOOGLE',
  OKTA = 'OKTA',
  AUTH0 = 'AUTH0',
}

/**
 * SSO User Mapping
 */
export interface SSOUserMapping {
  idClaim: string;
  emailClaim: string;
  firstNameClaim: string;
  lastNameClaim: string;
  roleClaim?: string;
  departmentClaim?: string;
  customClaimMapping?: Record<string, string>;
}

/**
 * SSO Test Result
 */
export interface SSOTestResult {
  timestamp: Date;
  status: 'success' | 'failure';
  message: string;
  responseTime: number;
}

/**
 * Data Warehouse Connector
 */
export interface DataWarehouseConnector {
  id: string;
  tenantId: string;
  name: string;
  type: DataWarehouseType;
  connectionString: string; // Encrypted
  enabled: boolean;
  syncSchedule: SyncSchedule;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  syncStatus: SyncStatus;
  datasetMappings: DatasetMapping[];
  retryPolicy: RetryPolicy;
  createdAt: Date;
  updatedAt: Date;
  testResult?: ConnectionTestResult;
}

/**
 * Data Warehouse Types
 */
export enum DataWarehouseType {
  SNOWFLAKE = 'SNOWFLAKE',
  BIGQUERY = 'BIGQUERY',
  REDSHIFT = 'REDSHIFT',
  DATABRICKS = 'DATABRICKS',
  SYNAPSE = 'SYNAPSE',
  POSTGRES = 'POSTGRES',
  MYSQL = 'MYSQL',
}

/**
 * Sync Schedule
 */
export interface SyncSchedule {
  frequency: SyncFrequency;
  interval?: number; // For custom frequencies
  dayOfWeek?: number; // 0-6 for WEEKLY
  dayOfMonth?: number; // 1-31 for MONTHLY
  timeOfDay?: string; // HH:mm format
  timezone: string;
}

/**
 * Sync Frequency
 */
export enum SyncFrequency {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
}

/**
 * Sync Status
 */
export enum SyncStatus {
  IDLE = 'IDLE',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PARTIAL = 'PARTIAL',
}

/**
 * Dataset Mapping
 */
export interface DatasetMapping {
  sourceCollection: string; // Cosmos DB collection
  destinationTable: string; // Data warehouse table
  columns: ColumnMapping[];
  filters?: Record<string, any>; // Optional filtering
  incrementalKey?: string; // For incremental syncs
  enabled: boolean;
}

/**
 * Column Mapping
 */
export interface ColumnMapping {
  sourceField: string;
  destinationColumn: string;
  transformation?: string; // Custom transformation script
  dataType?: string;
}

/**
 * Retry Policy
 */
export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Connection Test Result
 */
export interface ConnectionTestResult {
  timestamp: Date;
  status: 'success' | 'failure';
  message: string;
  responseTime: number;
}

/**
 * Sync History
 */
export interface SyncHistory {
  id: string;
  connectorId: string;
  tenantId: string;
  startTime: Date;
  endTime?: Date;
  status: SyncStatus;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errorMessages: string[];
  datasetResults: DatasetSyncResult[];
}

/**
 * Dataset Sync Result
 */
export interface DatasetSyncResult {
  datasetMapping: DatasetMapping;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errorMessages: string[];
}

/**
 * Real-time Stream Configuration
 */
export interface RealtimeStreamConfig {
  id: string;
  tenantId: string;
  name: string;
  type: StreamType;
  enabled: boolean;
  connectionString: string; // Encrypted
  topicName: string;
  consumerGroup?: string;
  eventMappings: EventMapping[];
  batchSize: number;
  flushIntervalMs: number;
  retryPolicy: RetryPolicy;
  createdAt: Date;
  updatedAt: Date;
  testResult?: ConnectionTestResult;
}

/**
 * Stream Types (Event Hub, Kafka, Kinesis, etc.)
 */
export enum StreamType {
  EVENT_HUB = 'EVENT_HUB',
  KAFKA = 'KAFKA',
  KINESIS = 'KINESIS',
  PUBSUB = 'PUBSUB',
  SQS = 'SQS',
  RABBITMQ = 'RABBITMQ',
}

/**
 * Event Mapping for Streams
 */
export interface EventMapping {
  sourceEvent: string; // Event type in Castiel
  destinationTopic: string; // Destination topic/queue
  transformation?: string; // Optional transformation
  enabled: boolean;
}

/**
 * Stream Event
 */
export interface StreamEvent {
  id: string;
  tenantId: string;
  timestamp: Date;
  eventType: string;
  payload: Record<string, any>;
  metadata: Record<string, any>;
  partitionKey?: string;
}

/**
 * Stream Metrics
 */
export interface StreamMetrics {
  streamId: string;
  tenantId: string;
  eventsPublished: number;
  eventsFailed: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  bytesPublished: number;
  period: string; // e.g., 'hour', 'day'
  timestamp: Date;
}

/**
 * Enterprise Export Configuration
 */
export interface EnterpriseExport {
  id: string;
  tenantId: string;
  resourceType: ResourceType;
  resourceIds: string[];
  format: ExportFormat;
  includeMetadata: boolean;
  includeHistory: boolean;
  encryptionEnabled: boolean;
  compressionEnabled: boolean;
  schedule?: ExportSchedule;
  webhook?: string; // Webhook URL for notifications
  status: ExportStatus;
  createdAt: Date;
  completedAt?: Date;
  fileUrl?: string;
  fileSize?: number;
  rowsExported?: number;
}

/**
 * Export Formats
 */
export enum ExportFormat {
  JSON = 'JSON',
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  PARQUET = 'PARQUET',
  AVRO = 'AVRO',
  PDF = 'PDF',
}

/**
 * Export Schedule
 */
export interface ExportSchedule {
  frequency: SyncFrequency;
  timeOfDay?: string;
  timezone: string;
  retentionDays: number;
}

/**
 * Export Status
 */
export enum ExportStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Compliance Settings
 */
export interface ComplianceSettings {
  id: string;
  tenantId: string;
  gdprEnabled: boolean;
  hipaaEnabled: boolean;
  socCompliant: boolean;
  dataResidency: string; // Geographic region
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  tlsMinVersion: string; // e.g., '1.2', '1.3'
  allowedIpRanges: string[]; // CIDR notation
  requireMfa: boolean;
  sessionTimeout: number; // minutes
  passwordPolicy: PasswordPolicy;
  auditLogRetention: number; // days
  dataRetentionPolicy: DataRetentionPolicy;
  updatedAt: Date;
}

/**
 * Password Policy
 */
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expirationDays?: number;
  historyCount: number; // Prevent reuse
}

/**
 * Data Retention Policy
 */
export interface DataRetentionPolicy {
  auditLogsRetentionDays: number;
  analyticsEventRetentionDays: number;
  deletedProjectsRetentionDays: number;
  backupRetentionDays: number;
  autoDeleteExpired: boolean;
}

/**
 * Webhook Configuration
 */
export interface WebhookConfig {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  headers?: Record<string, string>;
  enabled: boolean;
  retryPolicy: RetryPolicy;
  createdAt: Date;
  updatedAt: Date;
  testResult?: WebhookTestResult;
}

/**
 * Webhook Events
 */
export enum WebhookEvent {
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  PROJECT_DELETED = 'PROJECT_DELETED',
  SHARING_CHANGED = 'SHARING_CHANGED',
  VERSION_CREATED = 'VERSION_CREATED',
  USER_CREATED = 'USER_CREATED',
  USER_DELETED = 'USER_DELETED',
  EXPORT_COMPLETED = 'EXPORT_COMPLETED',
  SYNC_COMPLETED = 'SYNC_COMPLETED',
  SECURITY_EVENT = 'SECURITY_EVENT',
}

/**
 * Webhook Test Result
 */
export interface WebhookTestResult {
  timestamp: Date;
  status: 'success' | 'failure';
  statusCode: number;
  responseTime: number;
  errorMessage?: string;
}

/**
 * API Key
 */
export interface APIKey {
  id: string;
  tenantId: string;
  name: string;
  key: string; // Hashed for storage
  prefix: string; // First 8 chars for display
  permissions: APIKeyPermission[];
  rateLimit?: RateLimit;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API Key Permissions
 */
export interface APIKeyPermission {
  resource: string; // e.g., 'projects', 'analytics', 'exports'
  actions: string[]; // ['read', 'write', 'delete']
}

/**
 * Rate Limit
 */
export interface RateLimit {
  requestsPerHour: number;
  requestsPerDay: number;
  concurrentRequests: number;
}

/**
 * Integration Health Status
 */
export interface IntegrationHealth {
  integrationId: string;
  integrationName: string;
  type: 'SSO' | 'DATA_WAREHOUSE' | 'STREAM' | 'WEBHOOK';
  status: 'healthy' | 'degraded' | 'failed';
  lastCheckAt: Date;
  nextCheckAt: Date;
  message: string;
  latencyMs: number;
  errorRate: number; // percentage
}
