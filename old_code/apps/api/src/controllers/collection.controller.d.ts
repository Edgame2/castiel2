/**
 * Collection Controller
 * Manages document collections (folders, tags, smart collections)
 * Collections have independent ACL from documents
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { AuditLogService } from '../services/audit/audit-log.service.js';
import { CollectionType } from '../types/document.types.js';
/**
 * Collection Controller
 * Handles CRUD operations for document collections
 */
export declare class CollectionController {
    private readonly monitoring;
    private readonly auditLogService?;
    private shardRepository;
    private documentAuditIntegration?;
    constructor(monitoring: IMonitoringProvider, auditLogService?: AuditLogService | undefined);
    /**
     * Initialize repositories
     */
    initialize(): Promise<void>;
    /**
     * POST /api/v1/collections
     * Create a new collection
     */
    createCollection(request: FastifyRequest<{
        Body: {
            name: string;
            description?: string;
            collectionType: CollectionType;
            visibility?: string;
            tags?: string[];
            query?: any;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/collections/:id
     * Get collection metadata
     */
    getCollection(request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/collections
     * List collections
     */
    listCollections(request: FastifyRequest<{
        Querystring: {
            limit?: string;
            continuationToken?: string;
            collectionType?: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * PUT /api/v1/collections/:id
     * Update collection metadata
     */
    updateCollection(request: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: {
            name?: string;
            description?: string;
            visibility?: string;
            tags?: string[];
            query?: any;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * DELETE /api/v1/collections/:id
     * Delete a collection (does not delete documents)
     */
    deleteCollection(request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/collections/:id/documents
     * Add documents to collection
     */
    addDocuments(request: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: {
            documentIds: string[];
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * DELETE /api/v1/collections/:id/documents/:documentId
     * Remove document from collection
     */
    removeDocument(request: FastifyRequest<{
        Params: {
            id: string;
            documentId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/collections/:id/documents
     * Get all documents in a collection
     */
    getCollectionDocuments(request: FastifyRequest<{
        Params: {
            id: string;
        };
        Querystring: {
            limit?: string;
            offset?: string;
        };
    }>, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=collection.controller.d.ts.map