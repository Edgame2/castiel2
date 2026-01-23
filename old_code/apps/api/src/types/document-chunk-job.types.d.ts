/**
 * Document Chunk Job Types
 *
 * Defines the message structure for document chunking jobs
 * sent to Azure Service Bus for processing
 */
/**
 * Document chunk job message for Azure Service Bus
 * Sent when a document is successfully uploaded
 */
export interface DocumentChunkJobMessage {
    shardId: string;
    tenantId: string;
    userId?: string;
    projectId?: string;
    containerName?: string;
    documentFileName: string;
    filePath: string;
    enqueuedAt: string;
}
/**
 * Document chunk job options for Service Bus
 */
export interface DocumentChunkJobOptions {
    skipEnqueueing?: boolean;
    delayInSeconds?: number;
}
//# sourceMappingURL=document-chunk-job.types.d.ts.map