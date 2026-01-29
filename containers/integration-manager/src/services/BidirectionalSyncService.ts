/**
 * Bidirectional Sync Service
 * Handles two-way synchronization with intelligent conflict resolution
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared';
import { log } from '../utils/logger';
import {
  SyncConflict,
  ConflictResolution,
  FieldConflict,
  MergeRule,
  DetectConflictInput,
  ResolveConflictInput,
} from '../types/bidirectional-sync.types';

export class BidirectionalSyncService {
  private conflicts: Map<string, SyncConflict> = new Map();
  private containerName = 'integration_sync_conflicts';

  /**
   * Detect conflicts between local and remote versions
   */
  async detectConflicts(input: DetectConflictInput): Promise<SyncConflict | null> {
    const startTime = Date.now();

    try {
      const { localShard, remoteRecord, mapping, syncTaskId, integrationId, schemaId } = input;

      // Extract modification times
      const localModifiedAt = new Date(localShard.updatedAt || localShard.createdAt);
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
        localShard.structuredData || localShard,
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
        syncTaskId,
        shardId: localShard.id,
        externalId: remoteRecord.Id || remoteRecord.id || '',
        conflictType: 'concurrent_update',
        localVersion: localShard.structuredData || localShard,
        localModifiedAt,
        remoteVersion: remoteRecord,
        remoteModifiedAt,
        fieldConflicts,
        detectedAt: new Date(),
        status: 'pending',
        integrationId,
        schema: schemaId,
      };

      // Store in memory
      this.conflicts.set(conflict.id, conflict);

      // Persist to Cosmos DB
      try {
        const container = getContainer(this.containerName);
        await container.items.create(conflict, {
          partitionKey: conflict.tenantId,
        } as Parameters<typeof container.items.create>[1]);
      } catch (error: any) {
        log.warn('Failed to persist conflict to database', {
          error: error.message,
          conflictId: conflict.id,
          service: 'integration-manager',
        });
      }

      log.info('Conflict detected', {
        conflictId: conflict.id,
        tenantId: conflict.tenantId,
        shardId: conflict.shardId,
        conflictType: conflict.conflictType,
        fieldCount: fieldConflicts.length,
        service: 'integration-manager',
      });

      const duration = Date.now() - startTime;
      log.info('Conflict detection completed', {
        duration,
        conflictId: conflict.id,
        service: 'integration-manager',
      });

      return conflict;
    } catch (error: any) {
      log.error('Failed to detect conflicts', error, {
        shardId: input.localShard.id,
        service: 'integration-manager',
      });
      return null;
    }
  }

  /**
   * Resolve conflict using specified strategy
   */
  async resolveConflict(input: ResolveConflictInput): Promise<ConflictResolution> {
    const startTime = Date.now();

    try {
      const { conflictId, strategy, resolvedBy, customRules } = input;

      const conflict = this.conflicts.get(conflictId);
      if (!conflict) {
        // Try to load from database
        const container = getContainer(this.containerName);
        const { resource } = await container.item(conflictId, '').read<SyncConflict>();
        if (!resource) {
          throw new Error(`Conflict ${conflictId} not found`);
        }
        this.conflicts.set(conflictId, resource);
        return this.resolveConflict(input);
      }

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
          throw new Error('Manual resolution required');

        case 'custom':
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

      // Persist to database
      try {
        const container = getContainer(this.containerName);
        await container.item(conflict.id, conflict.tenantId).replace(conflict);
      } catch (error: any) {
        log.warn('Failed to persist conflict resolution', {
          error: error.message,
          conflictId: conflict.id,
          service: 'integration-manager',
        });
      }

      const duration = Date.now() - startTime;
      log.info('Conflict resolved', {
        conflictId: conflict.id,
        strategy,
        duration,
        service: 'integration-manager',
      });

      return resolution;
    } catch (error: any) {
      log.error('Failed to resolve conflict', error, {
        conflictId: input.conflictId,
        strategy: input.strategy,
        service: 'integration-manager',
      });
      throw error;
    }
  }

  /**
   * Merge fields intelligently
   */
  private async mergeFields(
    local: Record<string, any>,
    _remote: Record<string, any>,
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
    mapping: any,
    localModifiedAt: Date,
    remoteModifiedAt: Date
  ): FieldConflict[] {
    const conflicts: FieldConflict[] = [];

    // Compare mapped fields
    const fieldMappings = mapping.fieldMappings || mapping.config?.fieldMappings || [];
    for (const fieldMapping of fieldMappings) {
      const targetField = fieldMapping.targetField || fieldMapping.config?.targetField;
      if (!targetField) continue;

      const localValue = local[targetField];
      const remoteValue = this.extractRemoteValue(remote, fieldMapping);

      if (this.valuesConflict(localValue, remoteValue)) {
        conflicts.push({
          fieldName: targetField,
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
  private extractRemoteModifiedAt(record: any, _mapping: any): Date {
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
    const sourceField = mapping.sourceField || mapping.config?.sourceField;
    if (!sourceField) {
      return undefined;
    }

    switch (mapping.mappingType || mapping.config?.type) {
      case 'direct':
        return record[sourceField];
      case 'transform':
        return record[sourceField];
      case 'composite':
        const sourceFields = mapping.config?.sourceFields || [sourceField];
        return sourceFields
          .map((f: string) => record[f])
          .filter((v: any) => v != null)
          .join(mapping.config?.separator || ' ');
      default:
        return record[sourceField];
    }
  }

  /**
   * Get conflict by ID
   */
  async getConflict(conflictId: string, tenantId: string): Promise<SyncConflict | null> {
    // Check memory first
    const conflict = this.conflicts.get(conflictId);
    if (conflict && conflict.tenantId === tenantId) {
      return conflict;
    }

    // Load from database
    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(conflictId, tenantId).read<SyncConflict>();
      if (resource) {
        this.conflicts.set(conflictId, resource);
        return resource;
      }
    } catch (error: any) {
      if (error.code !== 404) {
        log.warn('Failed to load conflict from database', {
          error: error.message,
          conflictId,
          service: 'integration-manager',
        });
      }
    }

    return null;
  }

  /**
   * Get all pending conflicts for a tenant
   */
  async getPendingConflicts(tenantId: string): Promise<SyncConflict[]> {
    try {
      const container = getContainer(this.containerName);
      const { resources } = await container.items
        .query<SyncConflict>({
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.status = "pending"',
          parameters: [{ name: '@tenantId', value: tenantId }],
        })
        .fetchAll();

      // Update memory cache
      for (const conflict of resources) {
        this.conflicts.set(conflict.id, conflict);
      }

      return resources;
    } catch (error: any) {
      log.error('Failed to get pending conflicts', error, {
        tenantId,
        service: 'integration-manager',
      });
      return [];
    }
  }

  /**
   * Ignore a conflict (mark as resolved without changes)
   */
  async ignoreConflict(conflictId: string, tenantId: string): Promise<void> {
    const conflict = await this.getConflict(conflictId, tenantId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    conflict.status = 'ignored';
    conflict.resolvedAt = new Date();
    this.conflicts.set(conflictId, conflict);

    // Persist to database
    try {
      const container = getContainer(this.containerName);
      await container.item(conflictId, tenantId).replace(conflict);
    } catch (error: any) {
      log.warn('Failed to persist conflict ignore', {
        error: error.message,
        conflictId,
        service: 'integration-manager',
      });
    }

    log.info('Conflict ignored', {
      conflictId,
      tenantId,
      service: 'integration-manager',
    });
  }

  /**
   * Get conflict statistics
   */
  async getConflictStats(tenantId: string): Promise<{
    total: number;
    pending: number;
    resolved: number;
    ignored: number;
  }> {
    try {
      const container = getContainer(this.containerName);
      const { resources } = await container.items
        .query<SyncConflict>({
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
          parameters: [{ name: '@tenantId', value: tenantId }],
        })
        .fetchAll();

      return {
        total: resources.length,
        pending: resources.filter((c) => c.status === 'pending').length,
        resolved: resources.filter((c) => c.status === 'resolved').length,
        ignored: resources.filter((c) => c.status === 'ignored').length,
      };
    } catch (error: any) {
      log.error('Failed to get conflict stats', error, {
        tenantId,
        service: 'integration-manager',
      });
      return {
        total: 0,
        pending: 0,
        resolved: 0,
        ignored: 0,
      };
    }
  }
}
