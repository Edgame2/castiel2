/**
 * Audit Trail Service (Phase 2)
 *
 * Creates governance shards for create/update flows and tracks access to redacted data.
 * Stores audit logs as shards for queryability and compliance.
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import type { Shard } from '../types/shard.types.js';
/**
 * Audit event type
 */
export declare enum AuditEventType {
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
    READ = "read",
    REDACTED_ACCESS = "redacted_access",
    RELATIONSHIP_ADD = "relationship_add",
    RELATIONSHIP_REMOVE = "relationship_remove"
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
export declare class AuditTrailService {
    private shardRepository;
    private monitoring;
    private enabled;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, enabled?: boolean);
    /**
     * Log a shard creation event
     */
    logCreate(shard: Shard, userId: string, metadata?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<void>;
    /**
     * Log a shard update event
     */
    logUpdate(shard: Shard, userId: string, changes: Array<{
        field: string;
        oldValue?: any;
        newValue?: any;
    }>, metadata?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<void>;
    /**
     * Log access to redacted data
     */
    logRedactedAccess(shardId: string, tenantId: string, userId: string, redactedFields: string[], metadata?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<void>;
    /**
     * Log relationship changes
     */
    logRelationshipChange(shardId: string, tenantId: string, userId: string, eventType: AuditEventType.RELATIONSHIP_ADD | AuditEventType.RELATIONSHIP_REMOVE, relatedShardId: string, relationshipType: 'internal' | 'external', metadata?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<void>;
    /**
     * Create audit log shard
     */
    private createAuditLog;
    /**
     * Query audit logs
     */
    queryAuditLogs(params: {
        tenantId: string;
        targetShardId?: string;
        eventType?: AuditEventType;
        userId?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): Promise<Shard[]>;
}
//# sourceMappingURL=audit-trail.service.d.ts.map