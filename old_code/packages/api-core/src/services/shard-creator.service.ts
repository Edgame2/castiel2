import { InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { randomUUID } from 'crypto';
import { DocumentChunk, TextExtractionMetadata, DocumentChunkShard } from '../types/document-chunking.types.js';

export class ShardCreatorService {
  private cosmosClient: CosmosClient;

  constructor(private context: InvocationContext) {
    const endpoint = process.env.COSMOS_DB_ENDPOINT || '';
    const key = process.env.COSMOS_DB_KEY || '';

    if (!endpoint || !key) {
      throw new Error('Cosmos DB configuration missing: COSMOS_DB_ENDPOINT and COSMOS_DB_KEY required');
    }

    this.cosmosClient = new CosmosClient({ endpoint, key });
  }

  async createChunkShards(
    documentShardId: string,
    tenantId: string,
    chunks: DocumentChunk[],
    extractionMetadata: TextExtractionMetadata,
    documentFileName: string,
    projectId?: string
  ): Promise<{ createdIds: string[]; chunkNames: string[]; failedChunks: string[] }> {
    const database = this.cosmosClient.database(process.env.COSMOS_DB_DATABASE || 'castiel-db');
    const container = database.container(process.env.COSMOS_DB_SHARDS_CONTAINER || 'shards');

    const createdIds: string[] = [];
    const chunkNames: string[] = [];
    const failedChunks: string[] = [];

    for (const chunk of chunks) {
      try {
        const shardId = randomUUID();
        // Generate name from first 155 characters of chunk text
        const chunkName = chunk.text.substring(0, 155);
        // Generate descriptive chunk name for relationships
        const chunkRelationshipName = chunk.metadata?.sectionHeading 
          ? `${documentFileName} - ${chunk.metadata.sectionHeading} (Chunk ${chunk.sequenceNumber})`
          : `${documentFileName} - Chunk ${chunk.sequenceNumber}`;
        
        const shard: DocumentChunkShard = {
          id: shardId,
          tenantId,
          shardTypeId: 'c_documentChunk',
          documentShardId,
          structuredData: {
            name: chunkName,
            sequenceNumber: chunk.sequenceNumber,
            text: chunk.text,
            startOffset: chunk.startOffset,
            endOffset: chunk.endOffset,
            tokenCount: chunk.tokenCount,
          },
          metadata: {
            ...chunk.metadata,
            extractionMetadata,
            documentFileName,
          },
          embeddingStatus: 'pending',
          revisionId: randomUUID(),
          revisionNumber: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          vectors: [],
          internal_relationships: [
            // Project relationship (if projectId is provided)
            ...(projectId ? [{
              shardId: projectId,
              shardTypeId: 'c_project',
              shardTypeName: 'c_project',
              shardName: projectId,
              createdAt: new Date().toISOString(),
            }] : []),
            // Document relationship
            {
              shardId: documentShardId,
              shardTypeId: 'c_document',
              shardTypeName: 'c_document',
              shardName: documentFileName,
              createdAt: new Date().toISOString(),
            },
          ],
        };

        await container.items.create(shard);
        createdIds.push(shardId);
        chunkNames.push(chunkRelationshipName);
        this.context.log(`Created chunk shard ${shardId}`);
      } catch (error) {
        this.context.error(`Failed to create shard for chunk ${chunk.id}: ${error}`);
        failedChunks.push(chunk.id);
      }
    }

    return { createdIds, chunkNames, failedChunks };
  }
}
