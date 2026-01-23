/**
 * Document Audit Integration Adapter
 * Bridges AuditLogService (existing) and DocumentAuditService
 * Also emits audit events to configured webhooks
 */
import { AuditLogService } from './audit/audit-log.service.js';
import { AuditWebhookEmitter } from './audit-webhook-emitter.service.js';
import { IMonitoringProvider } from '@castiel/monitoring';
import { DocumentUploadAuditPayload, DocumentDownloadAuditPayload, DocumentDeleteAuditPayload } from '../types/document-audit.types.js';
/**
 * Simple wrapper using AuditLogService (no NestJS dependency)
 * Also emits to webhooks via Redis queue for async processing
 */
export declare class DocumentAuditIntegration {
    private auditLogService;
    private webhookEmitter?;
    private monitoring?;
    constructor(auditLogService: AuditLogService, webhookEmitter?: AuditWebhookEmitter | undefined, monitoring?: IMonitoringProvider | undefined);
    /**
     * Log document upload
     */
    logUpload(tenantId: string, userId: string, documentId: string, fileName: string, payload: DocumentUploadAuditPayload, ipAddress?: string, userAgent?: string): Promise<void>;
    /**
     * Log document download
     */
    logDownload(tenantId: string, userId: string, documentId: string, fileName: string, payload: DocumentDownloadAuditPayload, ipAddress?: string, userAgent?: string): Promise<void>;
    /**
     * Log document delete
     */
    logDelete(tenantId: string, userId: string, documentId: string, fileName: string, payload: DocumentDeleteAuditPayload, ipAddress?: string, userAgent?: string): Promise<void>;
    /**
     * Log document view
     */
    logView(tenantId: string, userId: string, documentId: string, fileName: string, ipAddress?: string, userAgent?: string): Promise<void>;
    /**
     * Log document update
     */
    logUpdate(tenantId: string, userId: string, documentId: string, fileName: string, changes: any, ipAddress?: string, userAgent?: string): Promise<void>;
    /**
     * Log document restore
     */
    logRestore(tenantId: string, userId: string, documentId: string, fileName: string, ipAddress?: string, userAgent?: string): Promise<void>;
    /**
     * Log permission change
     */
    logPermissionChange(tenantId: string, userId: string, documentId: string, fileName: string, changes: any, ipAddress?: string, userAgent?: string): Promise<void>;
}
//# sourceMappingURL=document-audit-integration.service.d.ts.map