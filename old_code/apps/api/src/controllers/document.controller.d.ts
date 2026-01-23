/**
 * Document Controller
 * Provides document management: metadata CRUD, file upload/download
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { AuditLogService } from '../services/audit/audit-log.service.js';
import { AuditWebhookEmitter } from '../services/audit-webhook-emitter.service.js';
import type { TenantDocumentSettings, GlobalDocumentSettings } from '../types/document.types.js';
/**
 * Document Controller
 * Provides document metadata CRUD and file operations
 */
export declare class DocumentController {
    private readonly monitoring;
    private readonly auditLogService;
    private readonly webhookEmitter?;
    private shardRepository;
    private blobStorageService?;
    private documentUploadService?;
    private documentSettingsService?;
    private validationService?;
    private documentAuditIntegration?;
    constructor(monitoring: IMonitoringProvider, auditLogService: AuditLogService, blobStorageConfig?: {
        connectionString: string;
        accountName: string;
        accountKey: string;
        documentsContainer: string;
        quarantineContainer: string;
    }, webhookEmitter?: AuditWebhookEmitter | undefined);
    /**
     * Initialize repositories
     */
    initialize(): Promise<void>;
    /**
     * GET /api/v1/documents/:id
     * Get document metadata
     */
    getDocument(request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/documents
     * List documents (filtered by tenant)
     */
    listDocuments(request: FastifyRequest<{
        Querystring: {
            limit?: string;
            continuationToken?: string;
            shardTypeId?: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * PUT /api/v1/documents/:id
     * Update document metadata
     */
    updateDocument(request: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: {
            name?: string;
            category?: string;
            tags?: string[];
            description?: string;
            customMetadata?: Record<string, any>;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * DELETE /api/v1/documents/:id
     * Soft delete a document
     */
    deleteDocument(request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/documents/:id/restore
     * Restore a soft-deleted document
     */
    restoreDocument(request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/documents/upload
     * Upload a document file
     */
    uploadDocument(request: FastifyRequest<{
        Body: {
            name: string;
            description?: string;
            category?: string;
            visibility?: string;
            tags?: string[];
            metadata?: Record<string, any>;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/documents/:id/download
     * Generate download URL with SAS token
     */
    downloadDocument(request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/documents/settings
     * Get effective settings for current tenant
     */
    getTenantSettings(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * PUT /api/v1/documents/settings
     * Update settings for current tenant (Restricted to Tenant Admin)
     */
    updateTenantSettings(request: FastifyRequest<{
        Body: Partial<TenantDocumentSettings>;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/admin/documents/settings/global
     * Get global settings (Super Admin)
     */
    getGlobalSettings(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * PUT /api/v1/admin/documents/settings/global
     * Update global settings (Super Admin)
     */
    updateGlobalSettings(request: FastifyRequest<{
        Body: Partial<GlobalDocumentSettings>;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * PUT /api/v1/admin/documents/settings/tenants/:tenantId  /**
     * Override tenant settings (Super Admin)
     */
    updateTenantSettingsOverride(request: FastifyRequest<{
        Params: {
            tenantId: string;
        };
        Body: Partial<TenantDocumentSettings>;
    }>, reply: FastifyReply): Promise<never>;
    /**
     * Get tenant settings for override (Super Admin)
     */
    getTenantSettingsOverride(request: FastifyRequest<{
        Params: {
            tenantId: string;
        };
    }>, reply: FastifyReply): Promise<never>;
}
//# sourceMappingURL=document.controller.d.ts.map