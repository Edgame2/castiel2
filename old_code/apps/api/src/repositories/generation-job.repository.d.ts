/**
 * Generation Job Repository
 *
 * Manages generation job status in Cosmos DB
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { GenerationJob, GenerationJobStatus } from '../services/content-generation/types/generation.types.js';
export declare class GenerationJobRepository {
    private client;
    private container;
    private monitoring?;
    constructor(monitoring?: IMonitoringProvider);
    /**
     * Health check - verify Cosmos DB connectivity
     */
    healthCheck(): Promise<boolean>;
    /**
     * Create a new generation job
     */
    create(job: GenerationJob): Promise<GenerationJob>;
    /**
     * Update job status and metadata
     */
    update(jobId: string, tenantId: string, updates: Partial<GenerationJob>): Promise<GenerationJob>;
    /**
     * Find job by ID
     */
    findById(jobId: string, tenantId: string): Promise<GenerationJob | null>;
    /**
     * Delete a generation job
     */
    delete(jobId: string, tenantId: string): Promise<void>;
    /**
     * Find jobs by status
     */
    findByStatus(status: GenerationJobStatus, tenantId: string): Promise<GenerationJob[]>;
    /**
     * List jobs with filters
     */
    list(tenantId: string, options?: {
        status?: GenerationJobStatus;
        userId?: string;
        templateId?: string;
        limit?: number;
        offset?: number;
        createdAfter?: Date;
        createdBefore?: Date;
    }): Promise<{
        jobs: GenerationJob[];
        total: number;
    }>;
    /**
     * Get job statistics for a tenant
     */
    getStats(tenantId: string): Promise<{
        pending: number;
        processing: number;
        completed: number;
        failed: number;
        cancelled: number;
        total: number;
        analytics?: {
            averageDuration?: number;
            successRate?: number;
            averagePlaceholdersFilled?: number;
            averageTokensUsed?: number;
            mostCommonErrors?: Array<{
                errorCode: string;
                count: number;
            }>;
            jobsByTemplate?: Array<{
                templateId: string;
                count: number;
            }>;
        };
    }>;
    /**
     * Cancel all pending/processing jobs for a template
     * Used when template is deleted or archived
     */
    cancelJobsForTemplate(templateId: string, tenantId: string): Promise<number>;
    /**
     * Delete old completed/failed/cancelled jobs (cleanup)
     */
    deleteOldJobs(tenantId: string, olderThanDays?: number): Promise<number>;
    /**
     * Find stuck jobs (processing jobs that have exceeded timeout)
     */
    findStuckJobs(tenantId: string, timeoutMs: number): Promise<GenerationJob[]>;
    /**
     * Mark stuck jobs as failed
     */
    markStuckJobsAsFailed(tenantId: string, timeoutMs: number): Promise<number>;
}
//# sourceMappingURL=generation-job.repository.d.ts.map