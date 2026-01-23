/**
 * Bulk Job Repository
 * Manages bulk operation jobs in Cosmos DB
 */
import { Container } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { BulkJob, BulkJobStatus, BulkJobType, BulkJobItemResult } from '../types/document.types.js';
export interface CreateBulkJobInput {
    tenantId: string;
    jobType: BulkJobType;
    totalItems: number;
    createdBy: string;
    createdByEmail?: string;
}
export interface UpdateBulkJobInput {
    status?: BulkJobStatus;
    processedItems?: number;
    successCount?: number;
    failureCount?: number;
    results?: BulkJobItemResult[];
    errorMessage?: string;
    startedAt?: Date;
    completedAt?: Date;
    cancelledAt?: Date;
    cancelledBy?: string;
    cancellationReason?: string;
}
/**
 * Bulk Job Repository
 */
export declare class BulkJobRepository {
    private container;
    private monitoring;
    constructor(container: Container, monitoring: IMonitoringProvider);
    /**
     * Create a new bulk job
     */
    create(input: CreateBulkJobInput): Promise<BulkJob>;
    /**
     * Get bulk job by ID
     */
    findById(id: string, tenantId: string): Promise<BulkJob | null>;
    /**
     * Update bulk job
     */
    update(id: string, tenantId: string, updates: UpdateBulkJobInput): Promise<BulkJob>;
    /**
     * Add result to bulk job
     */
    addResult(id: string, tenantId: string, result: BulkJobItemResult): Promise<void>;
    /**
     * Mark job as processing
     */
    markProcessing(id: string, tenantId: string): Promise<BulkJob>;
    /**
     * Mark job as completed
     */
    markCompleted(id: string, tenantId: string): Promise<BulkJob>;
    /**
     * Mark job as failed
     */
    markFailed(id: string, tenantId: string, errorMessage: string): Promise<BulkJob>;
    /**
     * Cancel job
     */
    cancel(id: string, tenantId: string, cancelledBy: string, reason?: string): Promise<BulkJob>;
    /**
     * List jobs for tenant
     */
    listByTenant(tenantId: string, options?: {
        status?: BulkJobStatus;
        jobType?: BulkJobType;
        limit?: number;
        offset?: number;
    }): Promise<{
        jobs: BulkJob[];
        total: number;
    }>;
    /**
     * Delete old completed jobs (cleanup)
     */
    deleteOldJobs(tenantId: string, olderThanDays?: number): Promise<number>;
    /**
     * Find all jobs with a specific status (across all tenants)
     * Used by background worker to find pending jobs
     */
    findByStatus(status: BulkJobStatus, limit?: number): Promise<BulkJob[]>;
}
//# sourceMappingURL=bulk-job.repository.d.ts.map