import { InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

export interface InternalRelationship {
  shardId: string;
  shardTypeId: string;
  shardTypeName: string;
  shardName: string;
  createdAt: string;
}

export class DocumentRelationshipUpdaterService {
  private cosmosClient: CosmosClient;

  constructor(private context: InvocationContext) {
    const endpoint = process.env.COSMOS_DB_ENDPOINT || '';
    const key = process.env.COSMOS_DB_KEY || '';

    if (!endpoint || !key) {
      throw new Error('Cosmos DB configuration missing: COSMOS_DB_ENDPOINT and COSMOS_DB_KEY required');
    }

    this.cosmosClient = new CosmosClient({ endpoint, key });
  }

  /**
   * Updates the parent document's internal_relationships array with newly created chunk shards
   * @param documentShardId - ID of the parent document shard
   * @param tenantId - Tenant ID for partition key
   * @param chunkShardIds - Array of newly created chunk shard IDs
   * @param chunkNames - Array of chunk names corresponding to the shard IDs
   * @returns Number of relationships added
   */
  async updateParentDocumentRelationships(
    documentShardId: string,
    tenantId: string,
    chunkShardIds: string[],
    chunkNames: string[]
  ): Promise<number> {
    if (chunkShardIds.length === 0) {
      this.context.log('No chunk shards to add to parent document relationships');
      return 0;
    }

    const database = this.cosmosClient.database(process.env.COSMOS_DB_DATABASE || 'castiel-db');
    const container = database.container(process.env.COSMOS_DB_SHARDS_CONTAINER || 'shards');

    try {
      // Fetch the parent document
      const { resource: parentDocument } = await container.item(documentShardId, tenantId).read();

      if (!parentDocument) {
        throw new Error(`Parent document not found: ${documentShardId}`);
      }

      // Initialize internal_relationships array if it doesn't exist
      if (!parentDocument.internal_relationships) {
        parentDocument.internal_relationships = [];
      }

      // Create relationship entries for each chunk
      const createdAt = new Date().toISOString();
      const newRelationships: InternalRelationship[] = chunkShardIds.map((shardId, index) => ({
        shardId,
        shardTypeId: 'c_documentChunk',
        shardTypeName: 'DocumentChunk',
        shardName: chunkNames[index] || `Chunk ${index + 1}`,
        createdAt,
      }));

      // Append new relationships to existing ones
      parentDocument.internal_relationships.push(...newRelationships);

      // Update the parent document
      await container.item(documentShardId, tenantId).replace(parentDocument);

      this.context.log(
        `Updated parent document ${documentShardId} with ${newRelationships.length} chunk relationships`
      );

      return newRelationships.length;
    } catch (error) {
      this.context.error(`Failed to update parent document relationships: ${error}`);
      throw error;
    }
  }
}
