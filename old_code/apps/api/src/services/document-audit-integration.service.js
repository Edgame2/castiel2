/**
 * Document Audit Integration Adapter
 * Bridges AuditLogService (existing) and DocumentAuditService
 * Also emits audit events to configured webhooks
 */
/**
 * Simple wrapper using AuditLogService (no NestJS dependency)
 * Also emits to webhooks via Redis queue for async processing
 */
export class DocumentAuditIntegration {
    auditLogService;
    webhookEmitter;
    monitoring;
    constructor(auditLogService, webhookEmitter, monitoring) {
        this.auditLogService = auditLogService;
        this.webhookEmitter = webhookEmitter;
        this.monitoring = monitoring;
    }
    /**
     * Log document upload
     */
    async logUpload(tenantId, userId, documentId, fileName, payload, ipAddress, userAgent) {
        try {
            await this.auditLogService.log({
                tenantId,
                userId,
                action: 'document.uploaded',
                resourceType: 'document',
                resourceId: documentId,
                metadata: {
                    fileName,
                    ...payload,
                    ipAddress,
                    userAgent,
                },
            });
            // Emit webhook event (async, non-blocking)
            if (this.webhookEmitter) {
                await this.webhookEmitter.emitAuditEvent({
                    id: `audit-${documentId}-${Date.now()}`,
                    tenantId,
                    userId,
                    action: 'document.uploaded',
                    timestamp: new Date().toISOString(),
                    ipAddress,
                    userAgent,
                    documentId,
                    metadata: payload,
                    status: 'success',
                });
            }
        }
        catch (err) {
            // Log error but don't break upload flow
            this.monitoring?.trackException(err, { operation: 'document-audit-integration.log-upload' });
        }
    }
    /**
     * Log document download
     */
    async logDownload(tenantId, userId, documentId, fileName, payload, ipAddress, userAgent) {
        try {
            await this.auditLogService.log({
                tenantId,
                userId,
                action: 'document.downloaded',
                resourceType: 'document',
                resourceId: documentId,
                metadata: {
                    fileName,
                    ...payload,
                    ipAddress,
                    userAgent,
                },
            });
            // Emit webhook event
            if (this.webhookEmitter) {
                await this.webhookEmitter.emitAuditEvent({
                    id: `audit-${documentId}-${Date.now()}`,
                    tenantId,
                    userId,
                    action: 'document.downloaded',
                    timestamp: new Date().toISOString(),
                    ipAddress,
                    userAgent,
                    documentId,
                    metadata: payload,
                    status: 'success',
                });
            }
        }
        catch (err) {
            this.monitoring?.trackException(err, { operation: 'document-audit-integration.log-download' });
        }
    }
    /**
     * Log document delete
     */
    async logDelete(tenantId, userId, documentId, fileName, payload, ipAddress, userAgent) {
        try {
            await this.auditLogService.log({
                tenantId,
                userId,
                action: 'document.deleted',
                resourceType: 'document',
                resourceId: documentId,
                metadata: {
                    fileName,
                    ...payload,
                    ipAddress,
                    userAgent,
                },
            });
            // Emit webhook event
            if (this.webhookEmitter) {
                await this.webhookEmitter.emitAuditEvent({
                    id: `audit-${documentId}-${Date.now()}`,
                    tenantId,
                    userId,
                    action: 'document.deleted',
                    timestamp: new Date().toISOString(),
                    ipAddress,
                    userAgent,
                    documentId,
                    metadata: payload,
                    status: 'success',
                });
            }
        }
        catch (err) {
            this.monitoring?.trackException(err instanceof Error ? err : new Error(String(err)), {
                component: 'DocumentAuditIntegration',
                operation: 'logDelete',
            });
        }
    }
    /**
     * Log document view
     */
    async logView(tenantId, userId, documentId, fileName, ipAddress, userAgent) {
        try {
            await this.auditLogService.log({
                tenantId,
                userId,
                action: 'document.viewed',
                resourceType: 'document',
                resourceId: documentId,
                metadata: {
                    fileName,
                    ipAddress,
                    userAgent,
                },
            });
            // Emit webhook event
            if (this.webhookEmitter) {
                await this.webhookEmitter.emitAuditEvent({
                    id: `audit-${documentId}-${Date.now()}`,
                    tenantId,
                    userId,
                    action: 'document.viewed',
                    timestamp: new Date().toISOString(),
                    ipAddress,
                    userAgent,
                    documentId,
                    metadata: { fileName },
                    status: 'success',
                });
            }
        }
        catch (err) {
            this.monitoring?.trackException(err instanceof Error ? err : new Error(String(err)), {
                component: 'DocumentAuditIntegration',
                operation: 'logView',
            });
        }
    }
    /**
     * Log document update
     */
    async logUpdate(tenantId, userId, documentId, fileName, changes, ipAddress, userAgent) {
        try {
            await this.auditLogService.log({
                tenantId,
                userId,
                action: 'document.updated',
                resourceType: 'document',
                resourceId: documentId,
                metadata: {
                    fileName,
                    changes,
                    ipAddress,
                    userAgent,
                },
            });
            // Emit webhook event
            if (this.webhookEmitter) {
                await this.webhookEmitter.emitAuditEvent({
                    id: `audit-${documentId}-${Date.now()}`,
                    tenantId,
                    userId,
                    action: 'document.updated',
                    timestamp: new Date().toISOString(),
                    ipAddress,
                    userAgent,
                    documentId,
                    metadata: { fileName, changes },
                    status: 'success',
                });
            }
        }
        catch (err) {
            this.monitoring?.trackException(err instanceof Error ? err : new Error(String(err)), {
                component: 'DocumentAuditIntegration',
                operation: 'logUpdate',
            });
        }
    }
    /**
     * Log document restore
     */
    async logRestore(tenantId, userId, documentId, fileName, ipAddress, userAgent) {
        try {
            await this.auditLogService.log({
                tenantId,
                userId,
                action: 'document.restored',
                resourceType: 'document',
                resourceId: documentId,
                metadata: {
                    fileName,
                    ipAddress,
                    userAgent,
                },
            });
            // Emit webhook event
            if (this.webhookEmitter) {
                await this.webhookEmitter.emitAuditEvent({
                    id: `audit-${documentId}-${Date.now()}`,
                    tenantId,
                    userId,
                    action: 'document.restored',
                    timestamp: new Date().toISOString(),
                    ipAddress,
                    userAgent,
                    documentId,
                    metadata: { fileName },
                    status: 'success',
                });
            }
        }
        catch (err) {
            this.monitoring?.trackException(err, { operation: 'document-audit-integration.log-restore' });
        }
    }
    /**
     * Log permission change
     */
    async logPermissionChange(tenantId, userId, documentId, fileName, changes, ipAddress, userAgent) {
        try {
            await this.auditLogService.log({
                tenantId,
                userId,
                action: 'document.permission_changed',
                resourceType: 'document',
                resourceId: documentId,
                metadata: {
                    fileName,
                    ...changes,
                    ipAddress,
                    userAgent,
                },
            });
            // Emit webhook event
            if (this.webhookEmitter) {
                await this.webhookEmitter.emitAuditEvent({
                    id: `audit-${documentId}-${Date.now()}`,
                    tenantId,
                    userId,
                    action: 'document.permission_changed',
                    timestamp: new Date().toISOString(),
                    ipAddress,
                    userAgent,
                    documentId,
                    metadata: { fileName, ...changes },
                    status: 'success',
                });
            }
        }
        catch (err) {
            this.monitoring?.trackException(err instanceof Error ? err : new Error(String(err)), {
                component: 'DocumentAuditIntegration',
                operation: 'logPermissionChange',
            });
        }
    }
}
//# sourceMappingURL=document-audit-integration.service.js.map