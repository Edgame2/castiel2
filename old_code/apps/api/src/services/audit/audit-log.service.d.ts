/**
 * Centralized Audit Log Service
 * Handles logging, querying, and exporting audit events across the application
 */
import { Container } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import type { AuditLogEntry, CreateAuditLogInput, AuditLogQuery, AuditLogListResponse, AuditLogStats, AuditEventType, AuditOutcome } from '../../types/audit.types.js';
import { AuditSeverity } from '../../types/audit.types.js';
/**
 * Audit Log Service
 */
export declare class AuditLogService {
    private container;
    private monitoring?;
    private environment;
    private serviceName;
    constructor(container: Container, options?: {
        environment?: string;
        serviceName?: string;
        monitoring?: IMonitoringProvider;
    });
    /**
     * Log an audit event
     * This method is designed to never throw - audit logging should not break app flow
     */
    log(input: CreateAuditLogInput): Promise<AuditLogEntry | null>;
    /**
     * Helper method for authentication events
     */
    logAuth(tenantId: string, eventType: AuditEventType, outcome: AuditOutcome, options: {
        actorId?: string;
        actorEmail?: string;
        ipAddress?: string;
        userAgent?: string;
        message?: string;
        details?: Record<string, any>;
        errorMessage?: string;
    }): Promise<AuditLogEntry | null>;
    /**
     * Helper method for user management events
     */
    logUserEvent(tenantId: string, eventType: AuditEventType, outcome: AuditOutcome, options: {
        actorId?: string;
        actorEmail?: string;
        targetId?: string;
        targetName?: string;
        ipAddress?: string;
        userAgent?: string;
        message?: string;
        details?: Record<string, any>;
    }): Promise<AuditLogEntry | null>;
    /**
     * Helper method for tenant management events
     */
    logTenantEvent(tenantId: string, eventType: AuditEventType, outcome: AuditOutcome, options: {
        actorId?: string;
        actorEmail?: string;
        targetId?: string;
        targetName?: string;
        ipAddress?: string;
        userAgent?: string;
        message?: string;
        details?: Record<string, any>;
    }): Promise<AuditLogEntry | null>;
    /**
     * Helper method for security events
     */
    logSecurityEvent(tenantId: string, eventType: AuditEventType, severity: AuditSeverity, options: {
        actorId?: string;
        actorEmail?: string;
        ipAddress?: string;
        userAgent?: string;
        message: string;
        details?: Record<string, any>;
    }): Promise<AuditLogEntry | null>;
    /**
     * Query audit logs
     */
    query(query: AuditLogQuery): Promise<AuditLogListResponse>;
    /**
     * Get audit log by ID
     */
    getById(id: string, tenantId: string): Promise<AuditLogEntry | null>;
    /**
     * Get audit statistics for a tenant
     */
    getStats(tenantId: string, days?: number): Promise<AuditLogStats>;
    /**
     * Export audit logs to CSV
     */
    exportToCSV(query: AuditLogQuery): Promise<string>;
    /**
     * Delete old audit logs (for retention policy)
     */
    purgeOldLogs(tenantId: string, beforeDate: string): Promise<number>;
    /**
     * Infer severity from event type and outcome
     */
    private inferSeverity;
    /**
     * Get default message for event type
     */
    private getDefaultMessage;
}
export declare function getAuditLogService(): AuditLogService | null;
export declare function setAuditLogService(service: AuditLogService): void;
//# sourceMappingURL=audit-log.service.d.ts.map