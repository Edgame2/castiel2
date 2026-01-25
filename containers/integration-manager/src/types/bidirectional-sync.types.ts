/**
 * Bidirectional Sync Types
 * Types for conflict detection and resolution in two-way synchronization
 */

/**
 * Conflict resolution strategy
 */
export type ConflictResolutionStrategy =
  | 'source_wins'        // External system always wins
  | 'destination_wins'   // Castiel always wins
  | 'newest_wins'        // Most recent change wins
  | 'merge'              // Intelligent field-level merge
  | 'manual'             // Queue for manual resolution
  | 'custom';            // Custom resolution logic

/**
 * Change tracking method
 */
export type ChangeTrackingMethod =
  | 'timestamp'          // Compare lastModifiedAt
  | 'version'            // Version numbers
  | 'checksum'           // Content hash
  | 'webhook';           // Real-time webhook events

/**
 * Bidirectional sync configuration
 */
export interface BidirectionalSyncConfig {
  enabled: boolean;
  conflictResolution: ConflictResolutionStrategy;
  changeTracking: ChangeTrackingMethod;
  webhookSupport: boolean;
}

/**
 * Sync conflict
 */
export interface SyncConflict {
  id: string;
  tenantId: string;
  syncTaskId: string;
  shardId: string;
  externalId: string;
  
  /** Type of conflict */
  conflictType: 'field_mismatch' | 'deleted_on_source' | 'deleted_on_destination' | 'concurrent_update';
  
  /** Local (Castiel) version */
  localVersion: Record<string, any>;
  localModifiedAt: Date;
  
  /** Remote (external system) version */
  remoteVersion: Record<string, any>;
  remoteModifiedAt: Date;
  
  /** Field-level conflicts */
  fieldConflicts: FieldConflict[];
  
  /** Timestamps */
  detectedAt: Date;
  resolvedAt?: Date;
  
  /** Resolution */
  resolution?: ConflictResolution;
  
  /** Status */
  status: 'pending' | 'resolved' | 'ignored';
  
  /** Metadata */
  integrationId: string;
  schema: string;
}

/**
 * Field conflict
 */
export interface FieldConflict {
  fieldName: string;
  localValue: any;
  remoteValue: any;
  lastLocalChange: Date;
  lastRemoteChange: Date;
}

/**
 * Conflict resolution
 */
export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  resolvedBy?: string;
  resolvedAt: Date;
  mergedData: Record<string, any>;
  notes?: string;
}

/**
 * Merge rule for field-level merging
 */
export interface MergeRule {
  field: string;
  strategy: 'local' | 'remote' | 'newest' | 'concat' | 'custom';
  customLogic?: (local: any, remote: any) => any;
}

/**
 * Conflict detection input
 */
export interface DetectConflictInput {
  localShard: Record<string, any>;
  remoteRecord: Record<string, any>;
  mapping: any; // ConversionSchema
  config: BidirectionalSyncConfig;
  syncTaskId: string;
  integrationId: string;
  schemaId: string;
}

/**
 * Resolve conflict input
 */
export interface ResolveConflictInput {
  conflictId: string;
  strategy: ConflictResolutionStrategy;
  resolvedBy?: string;
  customRules?: MergeRule[];
}
