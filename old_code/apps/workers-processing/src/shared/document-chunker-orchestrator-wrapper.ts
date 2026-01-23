/**
 * Document Chunker Orchestrator Wrapper
 * 
 * Wraps the original DocumentChunkerOrchestrator but uses BullMQ for embedding jobs
 * instead of Service Bus. This allows us to reuse the orchestrator logic while
 * adapting it for Container Apps.
 */

import type { InvocationContext } from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';
import type { DocumentChunkJobMessage, ProcessingResult } from '@castiel/api-core';
import { 
  TextExtracterService,
  TextNormalizerService,
  ChunkingEngineService,
  ShardCreatorService,
  DocumentRelationshipUpdaterService
} from '@castiel/api-core';
import { BullMQEmbeddingEnqueuer } from './bullmq-embedding-enqueuer.js';

export class DocumentChunkerOrchestratorWrapper {
  constructor(
    private context: InvocationContext,
    private embeddingEnqueuer: BullMQEmbeddingEnqueuer
  ) {}

  async processDocument(message: DocumentChunkJobMessage): Promise<ProcessingResult> {
    const startTime = Date.now();

    // Validate message
    if (!message.shardId || !message.tenantId || !message.containerName || !message.filePath) {
      throw new Error('Invalid message: missing required fields');
    }

    try {
      // Step 1: Get blob client
      const connectionString = process.env.BLOB_STORAGE_CONNECTION_STRING || '';
      
      if (!connectionString) {
        throw new Error('Blob storage connection string not configured: BLOB_STORAGE_CONNECTION_STRING required');
      }

      this.context.log(`Using container: ${message.containerName}`);
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(message.containerName);
      const blobClient = containerClient.getBlockBlobClient(message.filePath);

      // Step 2: Extract text
      this.context.log('Step 1: Extracting text from document...');
      const extractor = new TextExtracterService(blobClient, this.context);
      const extractionResult = await extractor.extract();

      // Step 3: Normalize text
      this.context.log('Step 2: Normalizing text...');
      const normalizer = new TextNormalizerService(this.context);
      const normalizedText = normalizer.normalize(extractionResult.text);

      // Step 4: Chunk text
      this.context.log('Step 3: Chunking document...');
      const chunkingEngine = new ChunkingEngineService(this.context);
      const chunkingResult = chunkingEngine.chunk(normalizedText, extractionResult.metadata);

      if (chunkingResult.chunks.length === 0) {
        throw new Error('No chunks generated from document');
      }

      // Step 5: Create shards in Cosmos DB
      this.context.log('Step 4: Creating chunk shards in Cosmos DB...');
      const shardCreator = new ShardCreatorService(this.context);
      const { createdIds, chunkNames, failedChunks } = await shardCreator.createChunkShards(
        message.shardId,
        message.tenantId,
        chunkingResult.chunks,
        extractionResult.metadata,
        message.documentFileName,
        message.projectId
      );

      // Step 5.5: Update parent document's internal_relationships
      if (createdIds.length > 0) {
        this.context.log('Step 4.5: Updating parent document relationships...');
        const relationshipUpdater = new DocumentRelationshipUpdaterService(this.context);
        await relationshipUpdater.updateParentDocumentRelationships(
          message.shardId,
          message.tenantId,
          createdIds,
          chunkNames
        );
      }

      // Step 6: Enqueue embedding jobs using BullMQ (instead of Service Bus)
      this.context.log('Step 5: Enqueueing embedding jobs via BullMQ...');
      const { enqueuedCount } = await this.embeddingEnqueuer.enqueueEmbeddingJobs(
        createdIds,
        message.tenantId
      );

      const duration = Date.now() - startTime;

      const result: ProcessingResult = {
        documentShardId: message.shardId,
        chunkCount: chunkingResult.chunks.length,
        totalTokens: chunkingResult.metadata.totalTokens,
        durationMs: duration,
        status: failedChunks.length === 0 ? 'success' : 'partial',
        failedChunks,
      };

      this.context.log(`Document processing completed: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.context.error(`Document processing failed: ${error}`);
      throw error;
    }
  }
}

