import { ShardEdgeRepository } from '../repositories/shard-edge.repository.js';
/**
 * Shard Relationship Service
 * Handles relationship management and graph traversal
 */
export class ShardRelationshipService {
    edgeRepository;
    shardRepository;
    monitoring;
    constructor(monitoring, shardRepository) {
        this.monitoring = monitoring;
        this.edgeRepository = new ShardEdgeRepository(monitoring);
        this.shardRepository = shardRepository;
    }
    /**
     * Initialize the service
     */
    async initialize() {
        await this.edgeRepository.ensureContainer();
        this.monitoring.trackEvent('shardRelationship.service.initialized');
    }
    /**
     * Create a relationship between two shards
     */
    async createRelationship(input) {
        // Validate shards exist
        const [sourceShard, targetShard] = await Promise.all([
            this.shardRepository.findById(input.sourceShardId, input.tenantId),
            this.shardRepository.findById(input.targetShardId, input.tenantId),
        ]);
        if (!sourceShard) {
            throw new Error(`Source shard not found: ${input.sourceShardId}`);
        }
        if (!targetShard) {
            throw new Error(`Target shard not found: ${input.targetShardId}`);
        }
        // Check for existing relationship
        const existing = await this.edgeRepository.findBetween(input.tenantId, input.sourceShardId, input.targetShardId, input.relationshipType);
        if (existing) {
            throw new Error(`Relationship already exists between ${input.sourceShardId} and ${input.targetShardId}`);
        }
        // Populate shard type info
        const enrichedInput = {
            ...input,
            sourceShardTypeId: sourceShard.shardTypeId,
            sourceShardTypeName: sourceShard.shardTypeName || sourceShard.shardTypeId,
            targetShardTypeId: targetShard.shardTypeId,
            targetShardTypeName: targetShard.shardTypeName || targetShard.shardTypeId,
        };
        const edge = await this.edgeRepository.create(enrichedInput);
        this.monitoring.trackEvent('shardRelationship.created', {
            edgeId: edge.id,
            tenantId: input.tenantId,
            relationshipType: input.relationshipType,
            sourceShardId: input.sourceShardId,
            targetShardId: input.targetShardId,
        });
        return edge;
    }
    /**
     * Update a relationship
     */
    async updateRelationship(edgeId, tenantId, input) {
        const edge = await this.edgeRepository.update(edgeId, tenantId, input);
        if (edge) {
            this.monitoring.trackEvent('shardRelationship.updated', {
                edgeId,
                tenantId,
            });
        }
        return edge;
    }
    /**
     * Delete a relationship
     */
    async deleteRelationship(edgeId, tenantId, deleteInverse = true) {
        const deleted = await this.edgeRepository.delete(edgeId, tenantId, deleteInverse);
        if (deleted) {
            this.monitoring.trackEvent('shardRelationship.deleted', {
                edgeId,
                tenantId,
            });
        }
        return deleted;
    }
    /**
     * Delete relationship by source, target, and type
     */
    async deleteRelationshipBetween(tenantId, sourceShardId, targetShardId, relationshipType) {
        const edge = await this.edgeRepository.findBetween(tenantId, sourceShardId, targetShardId, relationshipType);
        if (!edge) {
            return false;
        }
        return this.deleteRelationship(edge.id, tenantId);
    }
    /**
     * Get all relationships for a shard
     */
    async getRelationships(tenantId, shardId, direction = 'both', options) {
        const results = [];
        if (direction === 'outgoing' || direction === 'both') {
            const outgoing = await this.edgeRepository.getOutgoing(tenantId, shardId, {
                relationshipType: options?.relationshipType,
                limit: options?.limit,
            });
            results.push(...outgoing);
        }
        if (direction === 'incoming' || direction === 'both') {
            const incoming = await this.edgeRepository.getIncoming(tenantId, shardId, {
                relationshipType: options?.relationshipType,
                limit: options?.limit,
            });
            results.push(...incoming);
        }
        return results;
    }
    /**
     * Get related shards (with shard data)
     */
    async getRelatedShards(tenantId, shardId, direction = 'both', options) {
        const edges = await this.getRelationships(tenantId, shardId, direction, {
            relationshipType: options?.relationshipType,
            limit: options?.limit,
        });
        // Filter by target type if specified
        const filteredEdges = options?.targetShardTypeId
            ? edges.filter(e => (direction === 'outgoing' || direction === 'both') && e.targetShardTypeId === options.targetShardTypeId ||
                (direction === 'incoming' || direction === 'both') && e.sourceShardTypeId === options.targetShardTypeId)
            : edges;
        // Get related shard IDs
        const relatedShardIds = new Set();
        for (const edge of filteredEdges) {
            if (edge.sourceShardId !== shardId) {
                relatedShardIds.add(edge.sourceShardId);
            }
            if (edge.targetShardId !== shardId) {
                relatedShardIds.add(edge.targetShardId);
            }
        }
        // Fetch shards
        const shardMap = new Map();
        await Promise.all(Array.from(relatedShardIds).map(async (id) => {
            const shard = await this.shardRepository.findById(id, tenantId);
            if (shard) {
                shardMap.set(id, shard);
            }
        }));
        // Combine edges with shards
        return filteredEdges
            .map(edge => {
            const relatedId = edge.sourceShardId === shardId ? edge.targetShardId : edge.sourceShardId;
            const shard = shardMap.get(relatedId);
            return shard ? { edge, shard } : null;
        })
            .filter((item) => item !== null);
    }
    /**
     * Get relationship summary for a shard
     */
    async getRelationshipSummary(tenantId, shardId) {
        return this.edgeRepository.getRelationshipSummary(tenantId, shardId);
    }
    /**
     * Traverse relationship graph from a root shard
     */
    async traverseGraph(options) {
        const { tenantId, rootShardId, maxDepth = 2, direction = 'both', relationshipTypes, excludeShardTypes, includeShardTypes, maxNodes = 100, } = options;
        const visited = new Set();
        const nodes = [];
        const edges = [];
        const traverse = async (shardId, depth) => {
            if (depth > maxDepth || visited.has(shardId) || nodes.length >= maxNodes) {
                return;
            }
            visited.add(shardId);
            // Get shard data
            const shard = await this.shardRepository.findById(shardId, tenantId);
            if (!shard) {
                return;
            }
            // Check type filters
            if (excludeShardTypes?.includes(shard.shardTypeId)) {
                return;
            }
            if (includeShardTypes && !includeShardTypes.includes(shard.shardTypeId)) {
                return;
            }
            // Add node
            nodes.push({
                id: shard.id,
                shardTypeId: shard.shardTypeId,
                shardTypeName: shard.shardTypeName || shard.shardTypeId,
                label: shard.structuredData?.name || shard.structuredData?.title || shard.id,
                data: {
                    status: shard.status,
                    createdAt: shard.createdAt,
                    structuredData: shard.structuredData,
                },
            });
            // Get relationships
            const relationshipEdges = await this.getRelationships(tenantId, shardId, direction, {
                relationshipType: relationshipTypes?.[0], // TODO: support multiple types
            });
            // Filter by relationship types if specified
            const filteredEdges = relationshipTypes
                ? relationshipEdges.filter(e => relationshipTypes.includes(e.relationshipType))
                : relationshipEdges;
            // Add edges and traverse
            for (const edge of filteredEdges) {
                // Avoid duplicate edges
                if (!edges.find(e => e.id === edge.id)) {
                    edges.push(edge);
                }
                // Traverse to connected shard
                const nextShardId = edge.sourceShardId === shardId ? edge.targetShardId : edge.sourceShardId;
                await traverse(nextShardId, depth + 1);
            }
        };
        await traverse(rootShardId, 0);
        this.monitoring.trackEvent('shardRelationship.graphTraversed', {
            tenantId,
            rootShardId,
            maxDepth,
            nodesCount: nodes.length,
            edgesCount: edges.length,
        });
        return {
            nodes,
            edges,
            rootNodeId: rootShardId,
            depth: maxDepth,
        };
    }
    /**
     * Find path between two shards
     */
    async findPath(tenantId, sourceShardId, targetShardId, maxDepth = 5) {
        const visited = new Set();
        const queue = [
            { shardId: sourceShardId, path: [] },
        ];
        while (queue.length > 0) {
            const current = queue.shift();
            if (current.path.length > maxDepth) {
                continue;
            }
            if (visited.has(current.shardId)) {
                continue;
            }
            visited.add(current.shardId);
            // Check if we reached target
            if (current.shardId === targetShardId) {
                return { found: true, path: current.path, depth: current.path.length };
            }
            // Get connected shards
            const edges = await this.edgeRepository.getOutgoing(tenantId, current.shardId);
            for (const edge of edges) {
                if (!visited.has(edge.targetShardId)) {
                    queue.push({
                        shardId: edge.targetShardId,
                        path: [...current.path, edge],
                    });
                }
            }
        }
        return { found: false, path: [], depth: 0 };
    }
    /**
     * Bulk create relationships
     */
    async bulkCreateRelationships(tenantId, input) {
        const result = {
            success: true,
            summary: { total: input.edges.length, created: 0, failed: 0 },
            results: [],
        };
        for (let i = 0; i < input.edges.length; i++) {
            const edgeInput = input.edges[i];
            try {
                // Ensure tenant ID is set
                const fullInput = {
                    ...edgeInput,
                    tenantId,
                };
                const edge = await this.createRelationship(fullInput);
                result.results.push({
                    index: i,
                    status: 'created',
                    edgeId: edge.id,
                });
                result.summary.created++;
            }
            catch (error) {
                result.results.push({
                    index: i,
                    status: 'failed',
                    error: error.message,
                });
                result.summary.failed++;
                if (input.options?.onError === 'abort') {
                    result.success = false;
                    break;
                }
            }
        }
        result.success = result.summary.failed === 0;
        this.monitoring.trackEvent('shardRelationship.bulkCreated', {
            tenantId,
            total: result.summary.total,
            created: result.summary.created,
            failed: result.summary.failed,
        });
        return result;
    }
    /**
     * Query edges
     */
    async queryEdges(options) {
        return this.edgeRepository.query(options);
    }
    /**
     * Get edge by ID
     */
    async getEdge(edgeId, tenantId) {
        return this.edgeRepository.findById(edgeId, tenantId);
    }
    /**
     * Check if relationship exists
     */
    async relationshipExists(tenantId, sourceShardId, targetShardId, relationshipType) {
        return this.edgeRepository.exists(tenantId, sourceShardId, targetShardId, relationshipType);
    }
    /**
     * Delete all relationships when shard is deleted
     */
    async onShardDeleted(tenantId, shardId) {
        const deletedCount = await this.edgeRepository.deleteAllForShard(tenantId, shardId);
        this.monitoring.trackEvent('shardRelationship.shardDeleted', {
            tenantId,
            shardId,
            deletedEdges: deletedCount,
        });
        return deletedCount;
    }
    /**
     * Get repository for direct access
     */
    getRepository() {
        return this.edgeRepository;
    }
}
//# sourceMappingURL=shard-relationship.service.js.map