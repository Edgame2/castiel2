/**
 * Audit Trail Service (Phase 2)
 * 
 * Creates governance shards for create/update flows and tracks access to redacted data.
 * Stores audit logs as shards for queryability and compliance.
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '@castiel/api-core';
import type { Shard } from '../types/shard.types.js';
import { ShardStatus, ShardSource } from '../types/shard.types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Audit event type
 */
export enum AuditEventType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  READ = 'read',
  REDACTED_ACCESS = 'redacted_access',
  RELATIONSHIP_ADD = 'relationship_add',
  RELATIONSHIP_REMOVE = 'relationship_remove',
}

/**
 * Audit log entry stored as a shard
 */
export interface AuditLogShard {
  id: string;
  tenantId: string;
  userId: string;
  shardTypeId: 'system.audit_log';
  structuredData: {
    eventType: AuditEventType;
    targetShardId: string;
    targetShardTypeId: string;
    action: string;
    changes?: {
      field: string;
      oldValue?: any;
      newValue?: any;
    }[];
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  };
  status: 'active';
  source: 'system';
  createdAt: Date;
  updatedAt: Date;
}

export class AuditTrailService {
  private shardRepository: ShardRepository;
  private monitoring: IMonitoringProvider;
  private enabled: boolean = true;

  constructor(
    monitoring: IMonitoringProvider,
    shardRepository: ShardRepository,
    enabled: boolean = true
  ) {
    this.monitoring = monitoring;
    this.shardRepository = shardRepository;
    this.enabled = enabled;
  }

  /**
   * Log a shard creation event
   */
  async logCreate(
    shard: Shard,
    userId: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    if (!this.enabled) {return;}

    try {
      await this.createAuditLog({
        tenantId: shard.tenantId,
        userId,
        eventType: AuditEventType.CREATE,
        targetShardId: shard.id,
        targetShardTypeId: shard.shardTypeId,
        action: 'shard_created',
        metadata,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        component: 'AuditTrailService',
        operation: 'log-create',
        shardId: shard.id,
      });
    }
  }

  /**
   * Log a shard update event
   */
  async logUpdate(
    shard: Shard,
    userId: string,
    changes: Array<{ field: string; oldValue?: any; newValue?: any }>,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    if (!this.enabled) {return;}

    try {
      await this.createAuditLog({
        tenantId: shard.tenantId,
        userId,
        eventType: AuditEventType.UPDATE,
        targetShardId: shard.id,
        targetShardTypeId: shard.shardTypeId,
        action: 'shard_updated',
        changes,
        metadata,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        component: 'AuditTrailService',
        operation: 'log-update',
        shardId: shard.id,
      });
    }
  }

  /**
   * Log access to redacted data
   */
  async logRedactedAccess(
    shardId: string,
    tenantId: string,
    userId: string,
    redactedFields: string[],
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    if (!this.enabled) {return;}

    try {
      // Get shard to determine type
      const shard = await this.shardRepository.findById(shardId, tenantId);
      if (!shard) {
        return;
      }

      await this.createAuditLog({
        tenantId,
        userId,
        eventType: AuditEventType.REDACTED_ACCESS,
        targetShardId: shardId,
        targetShardTypeId: shard.shardTypeId,
        action: 'redacted_data_accessed',
        metadata: {
          ...metadata,
          redactedFields,
        },
      });

      this.monitoring.trackEvent('audit.redacted-access', {
        tenantId,
        shardId,
        userId,
        redactedFieldCount: redactedFields.length,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        component: 'AuditTrailService',
        operation: 'log-redacted-access',
        shardId,
        tenantId,
      });
    }
  }

  /**
   * Log relationship changes
   */
  async logRelationshipChange(
    shardId: string,
    tenantId: string,
    userId: string,
    eventType: AuditEventType.RELATIONSHIP_ADD | AuditEventType.RELATIONSHIP_REMOVE,
    relatedShardId: string,
    relationshipType: 'internal' | 'external',
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    if (!this.enabled) {return;}

    try {
      const shard = await this.shardRepository.findById(shardId, tenantId);
      if (!shard) {
        return;
      }

      await this.createAuditLog({
        tenantId,
        userId,
        eventType,
        targetShardId: shardId,
        targetShardTypeId: shard.shardTypeId,
        action: `relationship_${eventType === AuditEventType.RELATIONSHIP_ADD ? 'added' : 'removed'}`,
        metadata: {
          ...metadata,
          relatedShardId,
          relationshipType,
        },
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        component: 'AuditTrailService',
        operation: 'log-relationship-change',
        shardId,
        tenantId,
      });
    }
  }

  /**
   * Create audit log shard
   */
  private async createAuditLog(params: {
    tenantId: string;
    userId: string;
    eventType: AuditEventType;
    targetShardId: string;
    targetShardTypeId: string;
    action: string;
    changes?: Array<{ field: string; oldValue?: any; newValue?: any }>;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      // Note: This assumes 'system.audit_log' shard type exists
      // In production, this would be a system shard type
      await this.shardRepository.create({
        tenantId: params.tenantId,
        userId: 'system',
        shardTypeId: 'system.audit_log', // Would need to be defined as a system shard type
        structuredData: {
          eventType: params.eventType,
          targetShardId: params.targetShardId,
          targetShardTypeId: params.targetShardTypeId,
          action: params.action,
          changes: params.changes,
          metadata: params.metadata,
          timestamp: new Date().toISOString(),
        },
        acl: [], // Audit logs are system-level, no ACL needed
        status: ShardStatus.ACTIVE,
        source: ShardSource.SYSTEM,
        sourceDetails: {
          integrationName: 'audit-trail',
          syncedAt: new Date(),
        },
      });
    } catch (error) {
      // Don't throw - audit logging should not break main flow
      this.monitoring.trackException(error as Error, {
        component: 'AuditTrailService',
        operation: 'create-audit-log',
        eventType: params.eventType,
      });
    }
  }

  /**
   * Query audit logs
   */
  async queryAuditLogs(params: {
    tenantId: string;
    targetShardId?: string;
    eventType?: AuditEventType;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Shard[]> {
    try {
      const filter: any = {
        tenantId: params.tenantId,
        shardTypeId: 'system.audit_log',
        status: 'active',
      };

      if (params.startDate) {
        filter.createdAfter = params.startDate;
      }
      if (params.endDate) {
        filter.createdBefore = params.endDate;
      }

      const shards = await this.shardRepository.list({
        filter,
        limit: params.limit || 100,
        orderBy: 'createdAt',
        orderDirection: 'desc',
      });

      // Filter by structured data fields (eventType, targetShardId, userId)
      let filtered = shards.shards;

      if (params.targetShardId) {
        filtered = filtered.filter(s => {
          const sd = s.structuredData as any;
          return sd.targetShardId === params.targetShardId;
        });
      }

      if (params.eventType) {
        filtered = filtered.filter(s => {
          const sd = s.structuredData as any;
          return sd.eventType === params.eventType;
        });
      }

      if (params.userId) {
        filtered = filtered.filter(s => s.userId === params.userId);
      }

      return filtered;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        component: 'AuditTrailService',
        operation: 'query-audit-logs',
        tenantId: params.tenantId,
      });
      return [];
    }
  }
}






