/**
 * Centralized Audit Log Service
 * Handles logging, querying, and exporting audit events across the application
 */
import { v4 as uuidv4 } from 'uuid';
import { AuditSeverity } from '../../types/audit.types.js';
/**
 * Audit Log Service
 */
export class AuditLogService {
    container;
    monitoring;
    environment;
    serviceName;
    constructor(container, options) {
        this.container = container;
        this.monitoring = options?.monitoring;
        this.environment = options?.environment || process.env.NODE_ENV || 'development';
        this.serviceName = options?.serviceName || 'main-api';
    }
    /**
     * Log an audit event
     * This method is designed to never throw - audit logging should not break app flow
     */
    async log(input) {
        const entry = {
            id: uuidv4(),
            partitionKey: input.tenantId,
            tenantId: input.tenantId,
            category: input.category,
            eventType: input.eventType,
            severity: input.severity || this.inferSeverity(input.eventType, input.outcome),
            outcome: input.outcome,
            timestamp: new Date().toISOString(),
            actorId: input.actorId,
            actorEmail: input.actorEmail,
            actorType: input.actorType || 'user',
            targetId: input.targetId,
            targetType: input.targetType,
            targetName: input.targetName,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            requestId: input.requestId,
            sessionId: input.sessionId,
            message: input.message,
            details: input.details,
            errorCode: input.errorCode,
            errorMessage: input.errorMessage,
            metadata: {
                source: this.serviceName,
                version: process.env.APP_VERSION || '1.0.0',
                environment: this.environment,
                correlationId: input.requestId,
            },
        };
        try {
            await this.container.items.create(entry);
            return entry;
        }
        catch (error) {
            // Log but don't throw - audit logging should not break app flow
            this.monitoring?.trackException(error, {
                operation: 'audit-log.service.log',
                eventType: entry.eventType,
                tenantId: entry.tenantId,
            });
            return null;
        }
    }
    /**
     * Helper method for authentication events
     */
    async logAuth(tenantId, eventType, outcome, options) {
        return this.log({
            tenantId,
            category: 'authentication',
            eventType,
            outcome,
            message: options.message || this.getDefaultMessage(eventType, outcome),
            ...options,
        });
    }
    /**
     * Helper method for user management events
     */
    async logUserEvent(tenantId, eventType, outcome, options) {
        return this.log({
            tenantId,
            category: 'user_management',
            eventType,
            outcome,
            targetType: 'user',
            message: options.message || this.getDefaultMessage(eventType, outcome),
            ...options,
        });
    }
    /**
     * Helper method for tenant management events
     */
    async logTenantEvent(tenantId, eventType, outcome, options) {
        return this.log({
            tenantId,
            category: 'tenant_management',
            eventType,
            outcome,
            targetType: 'tenant',
            message: options.message || this.getDefaultMessage(eventType, outcome),
            ...options,
        });
    }
    /**
     * Helper method for security events
     */
    async logSecurityEvent(tenantId, eventType, severity, options) {
        return this.log({
            tenantId,
            category: 'security',
            eventType,
            severity,
            outcome: 'failure',
            ...options,
        });
    }
    /**
     * Query audit logs
     */
    async query(query) {
        const limit = Math.min(query.limit || 50, 1000);
        const offset = query.offset || 0;
        const sortBy = query.sortBy || 'timestamp';
        const sortOrder = query.sortOrder || 'desc';
        // Build WHERE clauses
        const conditions = ['c.tenantId = @tenantId'];
        const parameters = [
            { name: '@tenantId', value: query.tenantId },
        ];
        if (query.category) {
            conditions.push('c.category = @category');
            parameters.push({ name: '@category', value: query.category });
        }
        if (query.eventType) {
            conditions.push('c.eventType = @eventType');
            parameters.push({ name: '@eventType', value: query.eventType });
        }
        if (query.severity) {
            conditions.push('c.severity = @severity');
            parameters.push({ name: '@severity', value: query.severity });
        }
        if (query.outcome) {
            conditions.push('c.outcome = @outcome');
            parameters.push({ name: '@outcome', value: query.outcome });
        }
        if (query.actorId) {
            conditions.push('c.actorId = @actorId');
            parameters.push({ name: '@actorId', value: query.actorId });
        }
        if (query.actorEmail) {
            conditions.push('CONTAINS(LOWER(c.actorEmail), @actorEmail)');
            parameters.push({ name: '@actorEmail', value: query.actorEmail.toLowerCase() });
        }
        if (query.targetId) {
            conditions.push('c.targetId = @targetId');
            parameters.push({ name: '@targetId', value: query.targetId });
        }
        if (query.targetType) {
            conditions.push('c.targetType = @targetType');
            parameters.push({ name: '@targetType', value: query.targetType });
        }
        if (query.startDate) {
            conditions.push('c.timestamp >= @startDate');
            parameters.push({ name: '@startDate', value: query.startDate });
        }
        if (query.endDate) {
            conditions.push('c.timestamp <= @endDate');
            parameters.push({ name: '@endDate', value: query.endDate });
        }
        if (query.search) {
            conditions.push('(CONTAINS(LOWER(c.message), @search) OR CONTAINS(LOWER(c.actorEmail), @search))');
            parameters.push({ name: '@search', value: query.search.toLowerCase() });
        }
        const whereClause = conditions.join(' AND ');
        const orderClause = `c.${sortBy} ${sortOrder.toUpperCase()}`;
        try {
            // Get total count
            const countQuery = `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`;
            const { resources: countResult } = await this.container.items
                .query({ query: countQuery, parameters })
                .fetchAll();
            const total = countResult[0] || 0;
            // Get paginated results
            const dataQuery = `SELECT * FROM c WHERE ${whereClause} ORDER BY ${orderClause} OFFSET @offset LIMIT @limit`;
            const { resources: logs } = await this.container.items
                .query({
                query: dataQuery,
                parameters: [
                    ...parameters,
                    { name: '@offset', value: offset },
                    { name: '@limit', value: limit },
                ],
            })
                .fetchAll();
            return { logs, total, limit, offset };
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'audit-log.service.query' });
            throw new Error('Failed to query audit logs');
        }
    }
    /**
     * Get audit log by ID
     */
    async getById(id, tenantId) {
        try {
            const { resource } = await this.container.item(id, tenantId).read();
            return resource || null;
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'audit-log.service.get-log' });
            return null;
        }
    }
    /**
     * Get audit statistics for a tenant
     */
    async getStats(tenantId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString();
        try {
            const query = `
        SELECT * FROM c 
        WHERE c.tenantId = @tenantId AND c.timestamp >= @startDate
      `;
            const { resources: logs } = await this.container.items
                .query({
                query,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@startDate', value: startDateStr },
                ],
            })
                .fetchAll();
            // Calculate statistics
            const eventsByCategory = {};
            const eventsBySeverity = {};
            const eventsByOutcome = {};
            const eventTypeCount = {};
            const activityByDate = {};
            logs.forEach((log) => {
                // By category
                eventsByCategory[log.category] = (eventsByCategory[log.category] || 0) + 1;
                // By severity
                eventsBySeverity[log.severity] = (eventsBySeverity[log.severity] || 0) + 1;
                // By outcome
                eventsByOutcome[log.outcome] = (eventsByOutcome[log.outcome] || 0) + 1;
                // By event type
                eventTypeCount[log.eventType] = (eventTypeCount[log.eventType] || 0) + 1;
                // By date (for activity chart)
                const date = log.timestamp.split('T')[0];
                activityByDate[date] = (activityByDate[date] || 0) + 1;
            });
            // Get top 10 event types
            const topEventTypes = Object.entries(eventTypeCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([type, count]) => ({ type, count }));
            // Format recent activity
            const recentActivity = Object.entries(activityByDate)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, count]) => ({ date, count }));
            return {
                totalEvents: logs.length,
                eventsByCategory,
                eventsBySeverity,
                eventsByOutcome,
                topEventTypes,
                recentActivity,
            };
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'audit-log.service.get-stats' });
            throw new Error('Failed to get audit statistics');
        }
    }
    /**
     * Export audit logs to CSV
     */
    async exportToCSV(query) {
        const { logs } = await this.query({ ...query, limit: 10000, offset: 0 });
        const headers = [
            'Timestamp',
            'Category',
            'Event Type',
            'Severity',
            'Outcome',
            'Actor Email',
            'Target',
            'Message',
            'IP Address',
            'User Agent',
            'Error Message',
        ];
        const rows = logs.map((log) => [
            log.timestamp,
            log.category,
            log.eventType,
            log.severity,
            log.outcome,
            log.actorEmail || '',
            log.targetName || log.targetId || '',
            log.message,
            log.ipAddress || '',
            log.userAgent || '',
            log.errorMessage || '',
        ]);
        const csvLines = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ];
        return csvLines.join('\n');
    }
    /**
     * Delete old audit logs (for retention policy)
     */
    async purgeOldLogs(tenantId, beforeDate) {
        try {
            const query = `
        SELECT c.id FROM c 
        WHERE c.tenantId = @tenantId AND c.timestamp < @beforeDate
      `;
            const { resources: logsToDelete } = await this.container.items
                .query({
                query,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@beforeDate', value: beforeDate },
                ],
            })
                .fetchAll();
            let deletedCount = 0;
            for (const log of logsToDelete) {
                try {
                    await this.container.item(log.id, tenantId).delete();
                    deletedCount++;
                }
                catch (deleteError) {
                    this.monitoring?.trackException(deleteError, { operation: 'audit-log.service.delete-log', logId: log.id });
                }
            }
            return deletedCount;
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'audit-log.service.purge' });
            throw new Error('Failed to purge audit logs');
        }
    }
    /**
     * Infer severity from event type and outcome
     */
    inferSeverity(eventType, outcome) {
        // Security events are always at least WARNING
        if (eventType.startsWith('suspicious') || eventType.includes('lockout') || eventType.includes('blocked')) {
            return outcome === 'success' ? AuditSeverity.WARNING : AuditSeverity.CRITICAL;
        }
        // Failed authentication is warning
        if (eventType.includes('login_failure') || eventType.includes('mfa') && outcome === 'failure') {
            return AuditSeverity.WARNING;
        }
        // System/admin changes are info unless they fail
        if (eventType.includes('create') || eventType.includes('update') || eventType.includes('delete')) {
            return outcome === 'failure' ? AuditSeverity.WARNING : AuditSeverity.INFO;
        }
        // Default based on outcome
        return outcome === 'failure' ? AuditSeverity.WARNING : AuditSeverity.INFO;
    }
    /**
     * Get default message for event type
     */
    getDefaultMessage(eventType, outcome) {
        const outcomeStr = outcome === 'success' ? 'succeeded' : 'failed';
        const eventName = eventType.replace(/_/g, ' ');
        return `${eventName} ${outcomeStr}`;
    }
}
/**
 * Create a singleton instance helper
 */
let auditLogServiceInstance = null;
export function getAuditLogService() {
    return auditLogServiceInstance;
}
export function setAuditLogService(service) {
    auditLogServiceInstance = service;
}
//# sourceMappingURL=audit-log.service.js.map