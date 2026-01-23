/**
 * Shard Relationship Repository
 *
 * Handles Cosmos DB operations for shard relationships (knowledge graph edges)
 */
import { CosmosClient } from '@azure/cosmos';
import { config } from '../config/env.js';
import { RelationshipDirection, } from '../types/shard-relationship.types.js';
import { v4 as uuidv4 } from 'uuid';
/**
 * Container configuration for relationships
 */
const RELATIONSHIP_CONTAINER_CONFIG = {
    id: 'shard-relationships',
    partitionKey: {
        paths: ['/tenantId'],
    },
    indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent',
        includedPaths: [{ path: '/*' }],
        excludedPaths: [{ path: '/_etag/?' }],
        compositeIndexes: [
            [
                { path: '/tenantId', order: 'ascending' },
                { path: '/sourceShardId', order: 'ascending' },
                { path: '/type', order: 'ascending' },
            ],
            [
                { path: '/tenantId', order: 'ascending' },
                { path: '/targetShardId', order: 'ascending' },
                { path: '/type', order: 'ascending' },
            ],
            [
                { path: '/tenantId', order: 'ascending' },
                { path: '/createdAt', order: 'descending' },
            ],
        ],
    },
};
/**
 * Shard Relationship Repository
 */
export class ShardRelationshipRepository {
    monitoring;
    shardRepository;
    client;
    container;
    constructor(monitoring, shardRepository) {
        this.monitoring = monitoring;
        this.shardRepository = shardRepository;
        this.client = new CosmosClient({
            endpoint: config.cosmosDb.endpoint,
            key: config.cosmosDb.key,
        });
        this.container = this.client
            .database(config.cosmosDb.databaseId)
            .container('shard-relationships');
    }
    /**
     * Ensure container exists
     */
    async ensureContainer() {
        try {
            const { database } = await this.client.databases.createIfNotExists({
                id: config.cosmosDb.databaseId,
            });
            await database.containers.createIfNotExists(RELATIONSHIP_CONTAINER_CONFIG);
            this.monitoring.trackEvent('cosmosdb.container.ensured', {
                container: 'shard-relationships',
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'relationship.repository.ensureContainer',
            });
            throw error;
        }
    }
    /**
     * Create a new relationship
     */
    async create(tenantId, userId, input) {
        const startTime = Date.now();
        try {
            // Check for existing relationship
            const existing = await this.findByPair(tenantId, input.sourceShardId, input.targetShardId, input.type);
            if (existing) {
                throw new Error('Relationship already exists');
            }
            // Prevent self-relationships
            if (input.sourceShardId === input.targetShardId) {
                throw new Error('Self-relationships are not allowed');
            }
            const relationship = {
                id: uuidv4(),
                tenantId,
                sourceShardId: input.sourceShardId,
                targetShardId: input.targetShardId,
                type: input.type,
                customType: input.customType,
                bidirectional: input.bidirectional ?? false,
                label: input.label,
                description: input.description,
                strength: input.strength,
                properties: input.properties,
                createdAt: new Date(),
                createdBy: userId,
            };
            const { resource } = await this.container.items.create(relationship);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.relationship.create', 'CosmosDB', config.cosmosDb.endpoint, duration, true);
            this.monitoring.trackEvent('relationship.created', {
                relationshipId: relationship.id,
                type: relationship.type,
                tenantId,
            });
            return resource;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('cosmosdb.relationship.create', 'CosmosDB', config.cosmosDb.endpoint, duration, false);
            throw error;
        }
    }
    /**
     * Find relationship by ID
     */
    async findById(id, tenantId) {
        try {
            const { resource } = await this.container.item(id, tenantId).read();
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Find relationship by source/target pair
     */
    async findByPair(tenantId, sourceShardId, targetShardId, type) {
        let query = `
      SELECT * FROM c 
      WHERE c.tenantId = @tenantId 
      AND c.sourceShardId = @sourceShardId 
      AND c.targetShardId = @targetShardId
    `;
        const parameters = [
            { name: '@tenantId', value: tenantId },
            { name: '@sourceShardId', value: sourceShardId },
            { name: '@targetShardId', value: targetShardId },
        ];
        if (type) {
            query += ' AND c.type = @type';
            parameters.push({ name: '@type', value: type });
        }
        const { resources } = await this.container.items.query({
            query,
            parameters,
        }).fetchAll();
        return resources[0] || null;
    }
    /**
     * Get relationships for a shard
     */
    async getRelationshipsForShard(filter) {
        let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
        const parameters = [{ name: '@tenantId', value: filter.tenantId }];
        if (filter.shardId) {
            switch (filter.direction) {
                case RelationshipDirection.OUTGOING:
                    query += ' AND c.sourceShardId = @shardId';
                    break;
                case RelationshipDirection.INCOMING:
                    query += ' AND c.targetShardId = @shardId';
                    break;
                case RelationshipDirection.BOTH:
                default:
                    query += ' AND (c.sourceShardId = @shardId OR c.targetShardId = @shardId)';
                    break;
            }
            parameters.push({ name: '@shardId', value: filter.shardId });
        }
        if (filter.types && filter.types.length > 0) {
            query += ` AND c.type IN (${filter.types.map((_, i) => `@type${i}`).join(', ')})`;
            filter.types.forEach((type, i) => {
                parameters.push({ name: `@type${i}`, value: type });
            });
        }
        if (filter.minStrength !== undefined) {
            query += ' AND c.strength.value >= @minStrength';
            parameters.push({ name: '@minStrength', value: filter.minStrength });
        }
        query += ' ORDER BY c.createdAt DESC';
        const { resources } = await this.container.items.query({
            query,
            parameters,
        }).fetchAll();
        return resources;
    }
    /**
     * Get related shards with shard data
     */
    async getRelatedShards(tenantId, shardId, options) {
        const relationships = await this.getRelationshipsForShard({
            tenantId,
            shardId,
            direction: options?.direction || RelationshipDirection.BOTH,
            types: options?.types,
        });
        const shards = [];
        for (const rel of relationships.slice(0, options?.limit || 50)) {
            const relatedShardId = rel.sourceShardId === shardId
                ? rel.targetShardId
                : rel.sourceShardId;
            const direction = rel.sourceShardId === shardId ? 'outgoing' : 'incoming';
            if (this.shardRepository) {
                const shard = await this.shardRepository.findById(relatedShardId, tenantId);
                if (shard) {
                    shards.push({
                        id: shard.id,
                        shardTypeId: shard.shardTypeId,
                        structuredData: shard.structuredData,
                        relationship: {
                            id: rel.id,
                            type: rel.type,
                            direction,
                            strength: rel.strength?.value,
                        },
                    });
                }
            }
        }
        return {
            relationships,
            shards,
            total: relationships.length,
        };
    }
    /**
     * Traverse the graph from a starting shard
     */
    async traverseGraph(tenantId, options) {
        const nodes = new Map();
        const edges = [];
        const visited = new Set();
        const queue = [
            { shardId: options.startShardId, depth: 0 },
        ];
        while (queue.length > 0) {
            const { shardId, depth } = queue.shift();
            if (visited.has(shardId) || depth > options.maxDepth) {
                continue;
            }
            visited.add(shardId);
            // Get shard data
            if (options.includeShardData && this.shardRepository) {
                const shard = await this.shardRepository.findById(shardId, tenantId);
                if (shard) {
                    nodes.set(shardId, {
                        shardId,
                        shardTypeId: shard.shardTypeId,
                        structuredData: shard.structuredData,
                        depth,
                    });
                }
            }
            else {
                nodes.set(shardId, { shardId, shardTypeId: '', depth });
            }
            // Get relationships
            const relationships = await this.getRelationshipsForShard({
                tenantId,
                shardId,
                direction: options.direction,
                types: options.relationshipTypes,
            });
            let addedThisLevel = 0;
            for (const rel of relationships) {
                if (options.limitPerLevel && addedThisLevel >= options.limitPerLevel) {
                    break;
                }
                const nextShardId = rel.sourceShardId === shardId
                    ? rel.targetShardId
                    : rel.sourceShardId;
                edges.push({
                    relationshipId: rel.id,
                    sourceShardId: rel.sourceShardId,
                    targetShardId: rel.targetShardId,
                    type: rel.type,
                    label: rel.label,
                    strength: rel.strength?.value,
                });
                if (!visited.has(nextShardId) && depth < options.maxDepth) {
                    queue.push({ shardId: nextShardId, depth: depth + 1 });
                    addedThisLevel++;
                }
            }
        }
        return {
            nodes: Array.from(nodes.values()),
            edges,
            totalNodes: nodes.size,
            totalEdges: edges.length,
            truncated: options.limitPerLevel !== undefined,
        };
    }
    /**
     * Update a relationship
     */
    async update(id, tenantId, input) {
        const existing = await this.findById(id, tenantId);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...input,
            updatedAt: new Date(),
        };
        const { resource } = await this.container.item(id, tenantId).replace(updated);
        return resource;
    }
    /**
     * Delete a relationship
     */
    async delete(id, tenantId) {
        try {
            await this.container.item(id, tenantId).delete();
            this.monitoring.trackEvent('relationship.deleted', {
                relationshipId: id,
                tenantId,
            });
            return true;
        }
        catch (error) {
            if (error.code === 404) {
                return false;
            }
            throw error;
        }
    }
    /**
     * Delete all relationships for a shard (when shard is deleted)
     */
    async deleteAllForShard(tenantId, shardId) {
        const relationships = await this.getRelationshipsForShard({
            tenantId,
            shardId,
            direction: RelationshipDirection.BOTH,
        });
        let deleted = 0;
        for (const rel of relationships) {
            const success = await this.delete(rel.id, tenantId);
            if (success) {
                deleted++;
            }
        }
        return deleted;
    }
    /**
     * Count relationships for a shard
     */
    async countForShard(tenantId, shardId) {
        const query = `
      SELECT VALUE COUNT(1) FROM c 
      WHERE c.tenantId = @tenantId 
      AND (c.sourceShardId = @shardId OR c.targetShardId = @shardId)
    `;
        const { resources } = await this.container.items.query({
            query,
            parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@shardId', value: shardId },
            ],
        }).fetchAll();
        return resources[0] || 0;
    }
}
//# sourceMappingURL=shard-relationship.repository.js.map