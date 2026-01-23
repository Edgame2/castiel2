/**
 * Audit Log Controller
 * Handles HTTP requests for audit log operations
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuditLogService } from '../services/audit/audit-log.service.js';
import type { AuditCategory, AuditEventType, AuditSeverity, AuditOutcome } from '../types/audit.types.js';
interface QueryAuditLogsParams {
    Querystring: {
        category?: AuditCategory;
        eventType?: AuditEventType;
        severity?: AuditSeverity;
        outcome?: AuditOutcome;
        actorId?: string;
        actorEmail?: string;
        targetId?: string;
        targetType?: string;
        startDate?: string;
        endDate?: string;
        search?: string;
        limit?: number;
        offset?: number;
        sortBy?: 'timestamp' | 'severity' | 'category';
        sortOrder?: 'asc' | 'desc';
    };
}
interface GetAuditLogParams {
    Params: {
        id: string;
    };
}
interface GetStatsParams {
    Querystring: {
        days?: number;
    };
}
interface ExportParams {
    Querystring: QueryAuditLogsParams['Querystring'] & {
        format?: 'csv' | 'json';
    };
}
export declare class AuditLogController {
    private readonly auditLogService;
    constructor(auditLogService: AuditLogService);
    /**
     * List audit logs
     * GET /api/audit-logs
     */
    listLogs(request: FastifyRequest<QueryAuditLogsParams>, reply: FastifyReply): Promise<void>;
    /**
     * Get single audit log by ID
     * GET /api/audit-logs/:id
     */
    getLog(request: FastifyRequest<GetAuditLogParams>, reply: FastifyReply): Promise<void>;
    /**
     * Get audit log statistics
     * GET /api/audit-logs/stats
     */
    getStats(request: FastifyRequest<GetStatsParams>, reply: FastifyReply): Promise<void>;
    /**
     * Export audit logs
     * GET /api/audit-logs/export
     */
    exportLogs(request: FastifyRequest<ExportParams>, reply: FastifyReply): Promise<void>;
    /**
     * Get available filter options
     * GET /api/audit-logs/filters
     */
    getFilterOptions(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
export {};
//# sourceMappingURL=audit-log.controller.d.ts.map