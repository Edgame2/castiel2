/**
 * Embedding Job Types
 *
 * Defines the message structure for shard embedding jobs
 * sent to Azure Service Bus for processing
 */
/**
 * Embedding job message for Azure Service Bus
 * Sent when a shard is created or updated
 */
export interface EmbeddingJobMessage {
    shardId: string;
    tenantId: string;
    shardTypeId: string;
    revisionNumber: number;
    dedupeKey: string;
    enqueuedAt: string;
}
/**
 * Embedding job options for Service Bus
 */
export interface EmbeddingJobOptions {
    skipEnqueueing?: boolean;
    delayInSeconds?: number;
}
/**
 * Embedding job filter configuration
 */
export interface EmbeddingJobFilterConfig {
    enabled: boolean;
    ignoredShardTypes: string[];
}
/**
 * Check if a shard type should be ignored from embedding
 */
export declare function shouldIgnoreShardType(shardTypeId: string, ignoredTypes: string[]): boolean;
//# sourceMappingURL=embedding-job.types.d.ts.map