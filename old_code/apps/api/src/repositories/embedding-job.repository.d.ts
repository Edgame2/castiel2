import type { EmbeddingJob } from '../types/embedding-job.model.js';
export declare class EmbeddingJobRepository {
    private client;
    private container;
    constructor();
    create(job: EmbeddingJob): Promise<EmbeddingJob>;
    update(jobId: string, tenantId: string, updates: Partial<EmbeddingJob>): Promise<EmbeddingJob>;
    findByStatus(status: EmbeddingJob['status'], tenantId: string): Promise<EmbeddingJob[]>;
    findById(jobId: string, tenantId: string): Promise<EmbeddingJob | null>;
    list(tenantId: string, options?: {
        status?: EmbeddingJob['status'];
        shardId?: string;
        shardTypeId?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        jobs: EmbeddingJob[];
        total: number;
    }>;
    getStats(tenantId: string): Promise<{
        pending: number;
        processing: number;
        completed: number;
        failed: number;
    }>;
}
//# sourceMappingURL=embedding-job.repository.d.ts.map