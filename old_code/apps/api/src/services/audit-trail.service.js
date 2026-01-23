/**
 * Audit Trail Service (Phase 2)
 *
 * Creates governance shards for create/update flows and tracks access to redacted data.
 * Stores audit logs as shards for queryability and compliance.
 */
import { ShardStatus, ShardSource } from '../types/shard.types.js';
/**
 * Audit event type
 */
export var AuditEventType;
(function (AuditEventType) {
    AuditEventType["CREATE"] = "create";
    AuditEventType["UPDATE"] = "update";
    AuditEventType["DELETE"] = "delete";
    AuditEventType["READ"] = "read";
    AuditEventType["REDACTED_ACCESS"] = "redacted_access";
    AuditEventType["RELATIONSHIP_ADD"] = "relationship_add";
    AuditEventType["RELATIONSHIP_REMOVE"] = "relationship_remove";
})(AuditEventType || (AuditEventType = {}));
export class AuditTrailService {
    shardRepository;
    monitoring;
    enabled = true;
    constructor(monitoring, shardRepository, enabled = true) {
        this.monitoring = monitoring;
        this.shardRepository = shardRepository;
        this.enabled = enabled;
    }
    /**
     * Log a shard creation event
     */
    async logCreate(shard, userId, metadata) {
        if (!this.enabled) {
            return;
        }
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
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'AuditTrailService',
                operation: 'log-create',
                shardId: shard.id,
            });
        }
    }
    /**
     * Log a shard update event
     */
    async logUpdate(shard, userId, changes, metadata) {
        if (!this.enabled) {
            return;
        }
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
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'AuditTrailService',
                operation: 'log-update',
                shardId: shard.id,
            });
        }
    }
    /**
     * Log access to redacted data
     */
    async logRedactedAccess(shardId, tenantId, userId, redactedFields, metadata) {
        if (!this.enabled) {
            return;
        }
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
        }
        catch (error) {
            this.monitoring.trackException(error, {
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
    async logRelationshipChange(shardId, tenantId, userId, eventType, relatedShardId, relationshipType, metadata) {
        if (!this.enabled) {
            return;
        }
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
        }
        catch (error) {
            this.monitoring.trackException(error, {
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
    async createAuditLog(params) {
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
        }
        catch (error) {
            // Don't throw - audit logging should not break main flow
            this.monitoring.trackException(error, {
                component: 'AuditTrailService',
                operation: 'create-audit-log',
                eventType: params.eventType,
            });
        }
    }
    /**
     * Query audit logs
     */
    async queryAuditLogs(params) {
        try {
            const filter = {
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
                    const sd = s.structuredData;
                    return sd.targetShardId === params.targetShardId;
                });
            }
            if (params.eventType) {
                filtered = filtered.filter(s => {
                    const sd = s.structuredData;
                    return sd.eventType === params.eventType;
                });
            }
            if (params.userId) {
                filtered = filtered.filter(s => s.userId === params.userId);
            }
            return filtered;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'AuditTrailService',
                operation: 'query-audit-logs',
                tenantId: params.tenantId,
            });
            return [];
        }
    }
}
//# sourceMappingURL=audit-trail.service.js.map