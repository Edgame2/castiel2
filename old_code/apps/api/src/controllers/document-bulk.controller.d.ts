/**
 * Document Bulk Controller
 *
 * Handles bulk document operation requests
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { BulkDocumentService, BulkUploadInput, BulkUpdateInput } from '../services/bulk-document.service.js';
import type { AuthUser } from '../types/auth.types.js';
type AuthenticatedRequest<T extends Record<string, any> = Record<string, any>> = FastifyRequest<T> & {
    auth?: AuthUser;
};
/**
 * Document Bulk Controller
 */
export declare class DocumentBulkController {
    private bulkService;
    private monitoring;
    constructor(bulkService: BulkDocumentService, monitoring: IMonitoringProvider);
    /**
     * Start a bulk upload job
     * POST /api/v1/documents/bulk-upload
     */
    startBulkUpload: (req: AuthenticatedRequest<{
        Body: {
            items: BulkUploadInput["items"];
        };
    }>, reply: FastifyReply) => Promise<never>;
    /**
     * Start a bulk delete job
     * POST /api/v1/documents/bulk-delete
     */
    startBulkDelete: (req: AuthenticatedRequest<{
        Body: {
            documentIds: string[];
            reason?: string;
            hardDelete?: boolean;
        };
    }>, reply: FastifyReply) => Promise<never>;
    /**
     * Start a bulk update job
     * POST /api/v1/documents/bulk-update
     */
    startBulkUpdate: (req: AuthenticatedRequest<{
        Body: {
            updates: BulkUpdateInput["updates"];
        };
    }>, reply: FastifyReply) => Promise<never>;
    /**
     * Start a bulk collection assignment job
     * POST /api/v1/collections/:collectionId/bulk-assign
     */
    startBulkCollectionAssign: (req: AuthenticatedRequest<{
        Params: {
            collectionId: string;
        };
        Body: {
            documentIds: string[];
        };
    }>, reply: FastifyReply) => Promise<never>;
    /**
     * Get job status
     * GET /api/v1/bulk-jobs/:jobId
     */
    getJobStatus: (req: AuthenticatedRequest<{
        Params: {
            jobId: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
    /**
     * Get job results
     * GET /api/v1/bulk-jobs/:jobId/results
     */
    getJobResults: (req: AuthenticatedRequest<{
        Params: {
            jobId: string;
        };
        Querystring: {
            limit?: string;
            offset?: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
    /**
     * Cancel a job
     * POST /api/v1/bulk-jobs/:jobId/cancel
     */
    cancelJob: (req: AuthenticatedRequest<{
        Params: {
            jobId: string;
        };
        Body: {
            reason?: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
}
export {};
//# sourceMappingURL=document-bulk.controller.d.ts.map