/**
 * MFA Audit Controller
 *
 * HTTP handlers for MFA audit endpoints
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { MFAAuditService } from '../services/audit/mfa-audit.service.js';
/**
 * MFA Audit Controller
 */
export declare class MFAAuditController {
    private readonly mfaAuditService;
    constructor(mfaAuditService: MFAAuditService);
    /**
     * GET /api/admin/mfa/audit
     * Get MFA audit logs for the tenant
     */
    getAuditLogs(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/admin/mfa/stats
     * Get MFA statistics for the tenant
     */
    getStatistics(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/admin/mfa/audit/user/:userId
     * Get MFA audit trail for a specific user
     */
    getUserAuditTrail(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/admin/mfa/audit/failed-attempts
     * Get failed MFA verification attempts (security monitoring)
     */
    getFailedAttempts(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/admin/mfa/audit/export
     * Export MFA audit logs for compliance
     */
    exportAuditLogs(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Check if user has admin role
     */
    private isAdmin;
}
//# sourceMappingURL=mfa-audit.controller.d.ts.map