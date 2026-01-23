/**
 * Integration Sync Types
 * Type definitions for integration synchronization
 */

export type SyncTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type SyncDirection = 'inbound' | 'outbound' | 'bidirectional';
export type ConflictResolutionStrategy = 'source_wins' | 'target_wins' | 'manual' | 'merge';

export interface SyncTask {
  taskId: string;
  tenantId: string;
  integrationId: string;
  direction: SyncDirection;
  status: SyncTaskStatus;
  entityType?: string;
  filters?: Record<string, any>;
  startedAt?: Date | string;
  completedAt?: Date | string;
  error?: string;
  recordsProcessed?: number;
  recordsCreated?: number;
  recordsUpdated?: number;
  recordsFailed?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SyncExecution {
  executionId: string;
  taskId: string;
  tenantId: string;
  status: SyncTaskStatus;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  startedAt: Date | string;
  completedAt?: Date | string;
  error?: string;
}

export interface SyncConflict {
  conflictId: string;
  taskId: string;
  tenantId: string;
  entityId: string;
  entityType: string;
  sourceData: any;
  targetData: any;
  resolutionStrategy: ConflictResolutionStrategy;
  resolved: boolean;
  resolvedAt?: Date | string;
  resolvedBy?: string;
  createdAt: Date | string;
}

export interface Webhook {
  webhookId: string;
  tenantId: string;
  integrationId: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}
