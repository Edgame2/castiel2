/**
 * Bidirectional Sync Engine
 * Handles two-way synchronization with intelligent conflict resolution
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { ConversionSchema } from '../types/conversion-schema.types.js';
import { v4 as uuidv4 } from 'uuid';

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
 * Bidirectional Sync Engine
 */
export class BidirectionalSyncEngine {
  private monitoring: IMonitoringProvider;
  private conflicts: Map<string, SyncConflict> = new Map();

  constructor(monitoring: IMonitoringProvider) {
    this.monitoring = monitoring;
  }

  /**
   * Detect conflicts between local and remote versions
   */
  async detectConflicts(
    localShard: any,
    remoteRecord: any,
    mapping: ConversionSchema,
    config: BidirectionalSyncConfig
  ): Promise<SyncConflict | null> {
    const startTime = Date.now();

    try {
      // Extract modification times
      const localModifiedAt = new Date(localShard.updatedAt);
      const remoteModifiedAt = this.extractRemoteModifiedAt(remoteRecord, mapping);

      // Check if both were modified concurrently
      const timeDiff = Math.abs(localModifiedAt.getTime() - remoteModifiedAt.getTime());
      const isConcurrent = timeDiff < 60000; // Within 1 minute

      if (!isConcurrent) {
        // No conflict if changes are not concurrent
        return null;
      }

      // Compare field by field
      const fieldConflicts = this.compareFields(
        localShard.structuredData,
        remoteRecord,
        mapping,
        localModifiedAt,
        remoteModifiedAt
      );

      if (fieldConflicts.length === 0) {
        // No actual conflicts
        return null;
      }

      // Create conflict record
      const conflict: SyncConflict = {
        id: uuidv4(),
        tenantId: localShard.tenantId,
        syncTaskId: '', // Set by caller
        shardId: localShard.id,
        externalId: remoteRecord.Id || remoteRecord.id,
        conflictType: 'concurrent_update',
        localVersion: localShard.structuredData,
        localModifiedAt,
        remoteVersion: remoteRecord,
        remoteModifiedAt,
        fieldConflicts,
        detectedAt: new Date(),
        status: 'pending',
        integrationId: mapping.tenantIntegrationId,
        schema: mapping.id,
      };

      this.conflicts.set(conflict.id, conflict);

      this.monitoring.trackEvent('sync.conflict.detected', {
        conflictId: conflict.id,
        tenantId: conflict.tenantId,
        shardId: conflict.shardId,
        conflictType: conflict.conflictType,
        fieldCount: fieldConflicts.length,
      });

      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('sync.conflict.detection.duration', duration);

      return conflict;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'detectConflicts',
        shardId: localShard.id,
      });
      return null;
    }
  }

  /**
   * Resolve conflict using specified strategy
   */
  async resolveConflict(
    conflict: SyncConflict,
    strategy: ConflictResolutionStrategy,
    resolvedBy?: string,
    customRules?: MergeRule[]
  ): Promise<ConflictResolution> {
    const startTime = Date.now();

    try {
      let mergedData: Record<string, any> = {};

      switch (strategy) {
        case 'source_wins':
          mergedData = { ...conflict.remoteVersion };
          break;

        case 'destination_wins':
          mergedData = { ...conflict.localVersion };
          break;

        case 'newest_wins':
          mergedData = conflict.remoteModifiedAt > conflict.localModifiedAt
            ? { ...conflict.remoteVersion }
            : { ...conflict.localVersion };
          break;

        case 'merge':
          mergedData = await this.mergeFields(
            conflict.localVersion,
            conflict.remoteVersion,
            conflict.fieldConflicts,
            customRules || []
          );
          break;

        case 'manual':
          // Return for manual resolution
          throw new Error('Manual resolution required');

        case 'custom':
          // Custom logic provided by caller
          if (customRules && customRules.length > 0) {
            mergedData = await this.applyCustomRules(
              conflict.localVersion,
              conflict.remoteVersion,
              customRules
            );
          } else {
            throw new Error('Custom rules required for custom strategy');
          }
          break;

        default:
          throw new Error(`Unknown resolution strategy: ${strategy}`);
      }

      const resolution: ConflictResolution = {
        strategy,
        resolvedBy,
        resolvedAt: new Date(),
        mergedData,
      };

      // Update conflict
      conflict.resolution = resolution;
      conflict.status = 'resolved';
      conflict.resolvedAt = new Date();
      this.conflicts.set(conflict.id, conflict);

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('sync.conflict.resolved', {
        conflictId: conflict.id,
        strategy,
        duration,
      });

      return resolution;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'resolveConflict',
        conflictId: conflict.id,
        strategy,
      });
      throw error;
    }
  }

  /**
   * Merge fields intelligently
   */
  async mergeFields(
    local: Record<string, any>,
    remote: Record<string, any>,
    conflicts: FieldConflict[],
    rules: MergeRule[]
  ): Promise<Record<string, any>> {
    const merged: Record<string, any> = { ...local };

    for (const conflict of conflicts) {
      const rule = rules.find((r) => r.field === conflict.fieldName);

      if (rule) {
        // Apply rule-based merge
        switch (rule.strategy) {
          case 'local':
            merged[conflict.fieldName] = conflict.localValue;
            break;
          case 'remote':
            merged[conflict.fieldName] = conflict.remoteValue;
            break;
          case 'newest':
            merged[conflict.fieldName] =
              conflict.lastRemoteChange > conflict.lastLocalChange
                ? conflict.remoteValue
                : conflict.localValue;
            break;
          case 'concat':
            if (Array.isArray(conflict.localValue) && Array.isArray(conflict.remoteValue)) {
              merged[conflict.fieldName] = [
                ...new Set([...conflict.localValue, ...conflict.remoteValue]),
              ];
            } else {
              merged[conflict.fieldName] = `${conflict.localValue} ${conflict.remoteValue}`;
            }
            break;
          case 'custom':
            if (rule.customLogic) {
              merged[conflict.fieldName] = rule.customLogic(
                conflict.localValue,
                conflict.remoteValue
              );
            }
            break;
        }
      } else {
        // Default: use newest
        merged[conflict.fieldName] =
          conflict.lastRemoteChange > conflict.lastLocalChange
            ? conflict.remoteValue
            : conflict.localValue;
      }
    }

    return merged;
  }

  /**
   * Apply custom merge rules
   */
  private async applyCustomRules(
    local: Record<string, any>,
    remote: Record<string, any>,
    rules: MergeRule[]
  ): Promise<Record<string, any>> {
    const merged: Record<string, any> = { ...local };

    for (const rule of rules) {
      const localValue = local[rule.field];
      const remoteValue = remote[rule.field];

      switch (rule.strategy) {
        case 'local':
          merged[rule.field] = localValue;
          break;
        case 'remote':
          merged[rule.field] = remoteValue;
          break;
        case 'custom':
          if (rule.customLogic) {
            merged[rule.field] = rule.customLogic(localValue, remoteValue);
          }
          break;
      }
    }

    return merged;
  }

  /**
   * Compare fields to find conflicts
   */
  private compareFields(
    local: Record<string, any>,
    remote: Record<string, any>,
    mapping: ConversionSchema,
    localModifiedAt: Date,
    remoteModifiedAt: Date
  ): FieldConflict[] {
    const conflicts: FieldConflict[] = [];

    // Compare mapped fields
    for (const fieldMapping of mapping.fieldMappings) {
      const localValue = local[fieldMapping.targetField];
      const remoteValue = this.extractRemoteValue(remote, fieldMapping);

      if (this.valuesConflict(localValue, remoteValue)) {
        conflicts.push({
          fieldName: fieldMapping.targetField,
          localValue,
          remoteValue,
          lastLocalChange: localModifiedAt,
          lastRemoteChange: remoteModifiedAt,
        });
      }
    }

    return conflicts;
  }

  /**
   * Check if values conflict
   */
  private valuesConflict(local: any, remote: any): boolean {
    // Null/undefined are not conflicts
    if (local == null && remote == null) {
      return false;
    }

    if (local == null || remote == null) {
      return false; // One is null, consider it not a conflict
    }

    // Deep equality check
    return JSON.stringify(local) !== JSON.stringify(remote);
  }

  /**
   * Extract remote modified timestamp
   */
  private extractRemoteModifiedAt(
    record: any,
    mapping: ConversionSchema
  ): Date {
    // Try common field names
    const modifiedField =
      record.LastModifiedDate ||
      record.ModifiedDate ||
      record.UpdatedAt ||
      record.updated_at ||
      record.lastModified ||
      record.lastModifiedAt;

    if (modifiedField) {
      return new Date(modifiedField);
    }

    // Fallback to current time
    return new Date();
  }

  /**
   * Extract remote value from record using field mapping
   */
  private extractRemoteValue(record: any, mapping: any): any {
    switch (mapping.mappingType || mapping.config?.type) {
      case 'direct':
        return record[mapping.config.sourceField];
      case 'transform':
        return record[mapping.config.sourceField];
      case 'composite':
        return mapping.config.sourceFields
          .map((f: string) => record[f])
          .filter((v: any) => v != null)
          .join(mapping.config.separator || ' ');
      default:
        return record[mapping.config?.sourceField || mapping.targetField];
    }
  }

  /**
   * Get conflict by ID
   */
  getConflict(conflictId: string): SyncConflict | undefined {
    return this.conflicts.get(conflictId);
  }

  /**
   * Get all pending conflicts for a tenant
   */
  getPendingConflicts(tenantId: string): SyncConflict[] {
    return Array.from(this.conflicts.values()).filter(
      (c) => c.tenantId === tenantId && c.status === 'pending'
    );
  }

  /**
   * Ignore a conflict (mark as resolved without changes)
   */
  ignoreConflict(conflictId: string): void {
    const conflict = this.conflicts.get(conflictId);
    if (conflict) {
      conflict.status = 'ignored';
      conflict.resolvedAt = new Date();
      this.conflicts.set(conflictId, conflict);

      this.monitoring.trackEvent('sync.conflict.ignored', {
        conflictId,
        tenantId: conflict.tenantId,
      });
    }
  }

  /**
   * Clear resolved conflicts older than specified days
   */
  clearOldConflicts(daysOld: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let cleared = 0;
    for (const [id, conflict] of this.conflicts.entries()) {
      if (
        conflict.status !== 'pending' &&
        conflict.resolvedAt &&
        conflict.resolvedAt < cutoffDate
      ) {
        this.conflicts.delete(id);
        cleared++;
      }
    }

    this.monitoring.trackEvent('sync.conflict.cleared', {
      count: cleared,
      daysOld,
    });

    return cleared;
  }

  /**
   * Get conflict statistics
   */
  getConflictStats(tenantId?: string): {
    total: number;
    pending: number;
    resolved: number;
    ignored: number;
  } {
    const conflicts = tenantId
      ? Array.from(this.conflicts.values()).filter((c) => c.tenantId === tenantId)
      : Array.from(this.conflicts.values());

    return {
      total: conflicts.length,
      pending: conflicts.filter((c) => c.status === 'pending').length,
      resolved: conflicts.filter((c) => c.status === 'resolved').length,
      ignored: conflicts.filter((c) => c.status === 'ignored').length,
    };
  }
}
