/**
 * Audit Log Controller
 * Handles HTTP requests for audit log operations
 */
export class AuditLogController {
    auditLogService;
    constructor(auditLogService) {
        this.auditLogService = auditLogService;
    }
    /**
     * List audit logs
     * GET /api/audit-logs
     */
    async listLogs(request, reply) {
        try {
            const user = request.user;
            const query = {
                tenantId: user.tenantId,
                ...request.query,
            };
            const result = await this.auditLogService.query(query);
            reply.send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to list audit logs');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to retrieve audit logs',
            });
        }
    }
    /**
     * Get single audit log by ID
     * GET /api/audit-logs/:id
     */
    async getLog(request, reply) {
        try {
            const user = request.user;
            const { id } = request.params;
            const log = await this.auditLogService.getById(id, user.tenantId);
            if (!log) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Audit log not found',
                });
                return;
            }
            reply.send(log);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get audit log');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to retrieve audit log',
            });
        }
    }
    /**
     * Get audit log statistics
     * GET /api/audit-logs/stats
     */
    async getStats(request, reply) {
        try {
            const user = request.user;
            const days = request.query.days || 30;
            const stats = await this.auditLogService.getStats(user.tenantId, days);
            reply.send(stats);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get audit log stats');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to retrieve audit statistics',
            });
        }
    }
    /**
     * Export audit logs
     * GET /api/audit-logs/export
     */
    async exportLogs(request, reply) {
        try {
            const user = request.user;
            const { format = 'csv', ...queryParams } = request.query;
            const query = {
                tenantId: user.tenantId,
                ...queryParams,
            };
            if (format === 'csv') {
                const csv = await this.auditLogService.exportToCSV(query);
                reply
                    .header('Content-Type', 'text/csv')
                    .header('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`)
                    .send(csv);
            }
            else {
                // JSON export
                const result = await this.auditLogService.query({ ...query, limit: 10000, offset: 0 });
                reply
                    .header('Content-Type', 'application/json')
                    .header('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`)
                    .send(result.logs);
            }
            // Log the export action
            await this.auditLogService.log({
                tenantId: user.tenantId,
                category: 'data_access',
                eventType: 'data_export',
                outcome: 'success',
                actorId: user.sub,
                actorEmail: user.email,
                message: `Exported audit logs in ${format.toUpperCase()} format`,
                details: { format, filters: queryParams },
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to export audit logs');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to export audit logs',
            });
        }
    }
    /**
     * Get available filter options
     * GET /api/audit-logs/filters
     */
    async getFilterOptions(request, reply) {
        try {
            // Return static filter options
            reply.send({
                categories: [
                    { value: 'authentication', label: 'Authentication' },
                    { value: 'authorization', label: 'Authorization' },
                    { value: 'user_management', label: 'User Management' },
                    { value: 'tenant_management', label: 'Tenant Management' },
                    { value: 'data_access', label: 'Data Access' },
                    { value: 'data_modification', label: 'Data Modification' },
                    { value: 'system', label: 'System' },
                    { value: 'security', label: 'Security' },
                    { value: 'api', label: 'API' },
                ],
                severities: [
                    { value: 'info', label: 'Info' },
                    { value: 'warning', label: 'Warning' },
                    { value: 'error', label: 'Error' },
                    { value: 'critical', label: 'Critical' },
                ],
                outcomes: [
                    { value: 'success', label: 'Success' },
                    { value: 'failure', label: 'Failure' },
                    { value: 'partial', label: 'Partial' },
                ],
                eventTypes: [
                    // Authentication
                    { value: 'login_success', label: 'Login Success', category: 'authentication' },
                    { value: 'login_failure', label: 'Login Failure', category: 'authentication' },
                    { value: 'logout', label: 'Logout', category: 'authentication' },
                    { value: 'password_reset_request', label: 'Password Reset Request', category: 'authentication' },
                    { value: 'password_reset_success', label: 'Password Reset Success', category: 'authentication' },
                    { value: 'mfa_enroll', label: 'MFA Enrollment', category: 'authentication' },
                    { value: 'mfa_verify', label: 'MFA Verification', category: 'authentication' },
                    // User Management
                    { value: 'user_create', label: 'User Created', category: 'user_management' },
                    { value: 'user_update', label: 'User Updated', category: 'user_management' },
                    { value: 'user_delete', label: 'User Deleted', category: 'user_management' },
                    { value: 'user_activate', label: 'User Activated', category: 'user_management' },
                    { value: 'user_deactivate', label: 'User Deactivated', category: 'user_management' },
                    { value: 'user_role_change', label: 'Role Changed', category: 'user_management' },
                    { value: 'user_invite', label: 'User Invited', category: 'user_management' },
                    // Tenant Management
                    { value: 'tenant_create', label: 'Tenant Created', category: 'tenant_management' },
                    { value: 'tenant_update', label: 'Tenant Updated', category: 'tenant_management' },
                    { value: 'tenant_switch', label: 'Tenant Switch', category: 'tenant_management' },
                    // Security
                    { value: 'suspicious_activity', label: 'Suspicious Activity', category: 'security' },
                    { value: 'rate_limit_exceeded', label: 'Rate Limit Exceeded', category: 'security' },
                    { value: 'account_lockout', label: 'Account Lockout', category: 'security' },
                ],
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get filter options');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to retrieve filter options',
            });
        }
    }
}
//# sourceMappingURL=audit-log.controller.js.map