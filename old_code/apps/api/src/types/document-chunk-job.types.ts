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
  shardId: string;                 // Document shard ID
  tenantId: string;               // Tenant ID for isolation
  userId?: string;                // User who uploaded the document
  projectId?: string;             // Project ID if associated
  containerName?: string;         // Azure Blob Storage container name
  documentFileName: string;       // Original document file name
  filePath: string;               // Storage path to the document
  enqueuedAt: string;             // ISO 8601 timestamp
}

/**
 * Document chunk job options for Service Bus
 */
export interface DocumentChunkJobOptions {
  skipEnqueueing?: boolean;       // Skip sending to Service Bus
  delayInSeconds?: number;        // Delay message processing
}
