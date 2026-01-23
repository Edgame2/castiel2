/**
 * Bulk Document Service
 *
 * Handles asynchronous bulk operations for documents:
 * - Bulk upload
 * - Bulk delete
 * - Bulk update metadata
 * - Bulk collection assignment
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { BulkJobRepository } from '../repositories/bulk-job.repository.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { DocumentAuditIntegration } from './document-audit-integration.service.js';
import { AuditWebhookEmitter } from './audit-webhook-emitter.service.js';
import { BulkJob, BulkJobItemResult } from '../types/document.types.js';
/**
 * Input for bulk upload
 */
export interface BulkUploadInput {
    tenantId: string;
    userId: string;
    userEmail?: string;
    items: Array<{
        name: string;
        fileSize: number;
        mimeType: string;
        storagePath: string;
        category?: string;
        tags?: string[];
        visibility: 'public' | 'internal' | 'confidential';
    }>;
}
/**
 * Input for bulk delete
 */
export interface BulkDeleteInput {
    tenantId: string;
    userId: string;
    userEmail?: string;
    documentIds: string[];
    reason?: string;
    hardDelete?: boolean;
}
/**
 * Input for bulk update
 */
export interface BulkUpdateInput {
    tenantId: string;
    userId: string;
    userEmail?: string;
    updates: Array<{
        documentId: string;
        category?: string;
        tags?: string[];
        visibility?: 'public' | 'internal' | 'confidential';
    }>;
}
/**
 * Input for bulk collection assignment
 */
export interface BulkCollectionAssignInput {
    tenantId: string;
    userId: string;
    userEmail?: string;
    collectionId: string;
    documentIds: string[];
}
/**
 * Bulk Document Service
 */
export declare class BulkDocumentService {
    private jobRepository;
    private shardRepository;
    private auditIntegration;
    private webhookEmitter?;
    private monitoring?;
    constructor(jobRepository: BulkJobRepository, shardRepository: ShardRepository, auditIntegration: DocumentAuditIntegration, webhookEmitter?: AuditWebhookEmitter | undefined, monitoring?: IMonitoringProvider | undefined);
    /**
     * Start a bulk upload job
     */
    startBulkUpload(input: BulkUploadInput): Promise<BulkJob>;
    /**
     * Start a bulk delete job
     */
    startBulkDelete(input: BulkDeleteInput): Promise<BulkJob>;
    /**
     * Start a bulk update job
     */
    startBulkUpdate(input: BulkUpdateInput): Promise<BulkJob>;
    /**
     * Start a bulk collection assignment job
     */
    startBulkCollectionAssign(input: BulkCollectionAssignInput): Promise<BulkJob>;
    /**
     * Get job status
     */
    getJobStatus(jobId: string, tenantId: string): Promise<BulkJob | null>;
    /**
     * Cancel a job
     */
    cancelJob(jobId: string, tenantId: string, cancelledBy: string, reason: string): Promise<BulkJob>;
    /**
     * Process bulk upload (called by background worker)
     */
    processBulkUpload(job: BulkJob, items: BulkUploadInput['items']): Promise<void>;
    /**
     * Process bulk delete (called by background worker)
     */
    processBulkDelete(job: BulkJob, documentIds: string[]): Promise<void>;
    /**
     * Get job results (paginated)
     */
    getJobResults(jobId: string, tenantId: string, limit?: number, offset?: number): Promise<{
        results: BulkJobItemResult[];
        total: number;
    }>;
}
//# sourceMappingURL=bulk-document.service.d.ts.map