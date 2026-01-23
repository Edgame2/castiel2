/**
 * Sync Task Types
 * Scheduled and manual data synchronization
 */

// ============================================
// Schedule Types
// ============================================

/**
 * Schedule type
 */
export type ScheduleType = 'manual' | 'interval' | 'cron' | 'realtime';

/**
 * Interval unit
 */
export type IntervalUnit = 'minutes' | 'hours' | 'days' | 'weeks';

/**
 * Manual schedule config
 */
export interface ManualScheduleConfig {
  type: 'manual';
}

/**
 * Interval schedule config
 */
export interface IntervalScheduleConfig {
  type: 'interval';
  interval: number;
  unit: IntervalUnit;
}

/**
 * Cron schedule config
 */
export interface CronScheduleConfig {
  type: 'cron';
  expression: string;
  timezone: string;
}

/**
 * Realtime schedule config (webhook-based)
 */
export interface RealtimeScheduleConfig {
  type: 'realtime';
  webhookUrl: string;
  webhookSecret: string;
}

/**
 * Schedule config union
 */
export type ScheduleConfig =
  | ManualScheduleConfig
  | IntervalScheduleConfig
  | CronScheduleConfig
  | RealtimeScheduleConfig;

/**
 * Sync schedule
 */
export interface SyncSchedule {
  type: ScheduleType;
  config: ScheduleConfig;
}

// ============================================
// Sync Task
// ============================================

/**
 * Sync direction
 */
export type SyncDirection = 'pull' | 'push' | 'bidirectional';

/**
 * Sync task status
 */
export type SyncTaskStatus = 'active' | 'paused' | 'error' | 'disabled';

/**
 * Conflict resolution strategy
 */
export type ConflictResolution = 'newest_wins' | 'source_wins' | 'target_wins' | 'manual' | 'merge';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  retryDelaySeconds: number;
  exponentialBackoff: boolean;
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  onSuccess: boolean;
  onFailure: boolean;
  onPartial: boolean;
  recipients: string[];
}

/**
 * Sync task statistics
 */
export interface SyncTaskStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
}

/**
 * Sync task error info
 */
export interface SyncTaskError {
  message: string;
  timestamp: Date;
  details?: any;
}

/**
 * Sync task
 */
export interface SyncTask {
  id: string;
  tenantIntegrationId: string;
  tenantId: string;
  name: string;
  description?: string;
  
  // What to sync
  conversionSchemaId: string;
  
  // Direction
  direction: SyncDirection;
  
  // Schedule
  schedule: SyncSchedule;
  
  // Task-specific configuration
  config: Record<string, any>;
  
  // Bidirectional options
  conflictResolution?: ConflictResolution;
  
  // Status
  status: SyncTaskStatus;
  
  // Execution tracking
  lastRunAt?: Date;
  lastRunStatus?: 'success' | 'partial' | 'failed';
  nextRunAt?: Date;
  
  // Statistics
  stats: SyncTaskStats;
  
  // Error tracking
  lastError?: SyncTaskError;
  
  // Retry configuration
  retryConfig: RetryConfig;
  
  // Notifications
  notifications: NotificationConfig;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create sync task input
 */
export interface CreateSyncTaskInput {
  tenantIntegrationId: string;
  tenantId: string;
  name: string;
  description?: string;
  conversionSchemaId: string;
  direction: SyncDirection;
  schedule: SyncSchedule;
  config?: Record<string, any>;
  conflictResolution?: ConflictResolution;
  retryConfig?: Partial<RetryConfig>;
  notifications?: Partial<NotificationConfig>;
  createdBy: string;
}

/**
 * Update sync task input
 */
export interface UpdateSyncTaskInput {
  name?: string;
  description?: string;
  conversionSchemaId?: string;
  direction?: SyncDirection;
  schedule?: SyncSchedule;
  config?: Record<string, any>;
  conflictResolution?: ConflictResolution;
  status?: SyncTaskStatus;
  retryConfig?: Partial<RetryConfig>;
  notifications?: Partial<NotificationConfig>;
}

/**
 * Sync task list filter
 */
export interface SyncTaskListFilter {
  tenantId: string;
  tenantIntegrationId?: string;
  status?: SyncTaskStatus;
  direction?: SyncDirection;
}

/**
 * Sync task list options
 */
export interface SyncTaskListOptions {
  filter: SyncTaskListFilter;
  limit?: number;
  offset?: number;
}

/**
 * Sync task list result
 */
export interface SyncTaskListResult {
  tasks: SyncTask[];
  total: number;
  hasMore: boolean;
}

// ============================================
// Sync Execution
// ============================================

/**
 * Sync execution trigger
 */
export type SyncTrigger = 'schedule' | 'manual' | 'webhook' | 'retry';

/**
 * Sync execution status
 */
export type SyncExecutionStatus = 'running' | 'success' | 'partial' | 'failed' | 'cancelled';

/**
 * Sync execution phase
 */
export type SyncPhase = 'initializing' | 'fetching' | 'transforming' | 'saving' | 'complete';

/**
 * Sync execution progress
 */
export interface SyncProgress {
  phase: SyncPhase;
  totalRecords?: number;
  processedRecords: number;
  percentage: number;
}

/**
 * Sync execution results
 */
export interface SyncResults {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  deleted?: number;
}

/**
 * Sync error
 */
export interface SyncError {
  timestamp: Date;
  phase: SyncPhase;
  recordId?: string;
  externalId?: string;
  error: string;
  details?: any;
  recoverable: boolean;
}

/**
 * Sync execution
 */
export interface SyncExecution {
  id: string;
  syncTaskId: string;
  tenantIntegrationId: string;
  tenantId: string;
  
  // Timing
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  
  // Trigger
  triggeredBy: SyncTrigger;
  triggeredByUserId?: string;
  
  // Status
  status: SyncExecutionStatus;
  
  // Progress
  progress: SyncProgress;
  
  // Results
  results: SyncResults;
  
  // Errors
  errors: SyncError[];
  
  // For retry
  retryCount: number;
  retryOf?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create sync execution input
 */
export interface CreateSyncExecutionInput {
  syncTaskId: string;
  tenantIntegrationId: string;
  tenantId: string;
  triggeredBy: SyncTrigger;
  triggeredByUserId?: string;
  retryOf?: string;
}

/**
 * Update sync execution input
 */
export interface UpdateSyncExecutionInput {
  status?: SyncExecutionStatus;
  progress?: Partial<SyncProgress>;
  results?: Partial<SyncResults>;
  errors?: SyncError[];
  completedAt?: Date;
  durationMs?: number;
  retryCount?: number;
}

/**
 * Sync execution list filter
 */
export interface SyncExecutionListFilter {
  tenantId: string;
  syncTaskId?: string;
  tenantIntegrationId?: string;
  status?: SyncExecutionStatus;
  triggeredBy?: SyncTrigger;
  startedAfter?: Date;
  startedBefore?: Date;
}

/**
 * Sync execution list options
 */
export interface SyncExecutionListOptions {
  filter: SyncExecutionListFilter;
  limit?: number;
  offset?: number;
}

/**
 * Sync execution list result
 */
export interface SyncExecutionListResult {
  executions: SyncExecution[];
  total: number;
  hasMore: boolean;
}

// ============================================
// Sync Log
// ============================================

/**
 * Log level
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Sync log entry
 */
export interface SyncLog {
  id: string;
  syncExecutionId: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: Record<string, any>;
}

// ============================================
// Sync Conflict
// ============================================

/**
 * Conflict status
 */
export type ConflictStatus = 'pending' | 'resolved' | 'ignored';

/**
 * Conflicting field
 */
export interface ConflictingField {
  field: string;
  externalValue: any;
  localValue: any;
  externalModifiedAt: Date;
  localModifiedAt: Date;
}

/**
 * Conflict resolution info
 */
export interface ConflictResolutionInfo {
  strategy: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  finalData: Record<string, any>;
}

/**
 * Sync conflict
 */
export interface SyncConflict {
  id: string;
  syncExecutionId: string;
  tenantId: string;
  
  // Conflicting records
  externalId: string;
  shardId: string;
  
  // Data
  externalData: Record<string, any>;
  localData: Record<string, any>;
  
  // Conflicting fields
  conflictingFields: ConflictingField[];
  
  // Resolution
  status: ConflictStatus;
  resolution?: ConflictResolutionInfo;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Resolve conflict input
 */
export interface ResolveConflictInput {
  strategy: ConflictResolution | 'custom';
  resolvedBy: string;
  finalData?: Record<string, any>;
}











