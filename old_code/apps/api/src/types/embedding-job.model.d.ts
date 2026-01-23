export interface EmbeddingJob {
    id: string;
    tenantId: string;
    shardId: string;
    shardTypeId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    retryCount: number;
    error?: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    metadata?: {
        embeddingModel?: string;
        vectorCount?: number;
        processingTimeMs?: number;
    };
}
//# sourceMappingURL=embedding-job.model.d.ts.map