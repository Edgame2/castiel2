/**
 * Hierarchical Memory Service
 * Multi-tiered memory system with adaptive retrieval
 * 
 * Tiers:
 * - Immediate: Current session/request (Redis, 5 min TTL)
 * - Session: Current user session (Redis, 1 hour TTL)
 * - Temporal: Recent time-based memories (Cosmos DB, 30 days TTL)
 * - Relational: Entity relationship memories (Cosmos DB, 90 days TTL)
 * - Global: Long-term patterns and learnings (Cosmos DB, permanent)
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { contextKeyGenerator } from '../utils/context-key-generator.js';
import type {
  MemoryTier,
  MemoryTierConfig,
  MemoryRecord,
  MemoryRetrievalResult,
  Context,
} from '../types/adaptive-learning.types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Default tier configurations
 */
const DEFAULT_TIER_CONFIGS: Record<MemoryTier, MemoryTierConfig> = {
  immediate: {
    tier: 'immediate',
    ttl: 5 * 60, // 5 minutes
    maxSize: 100,
    storage: 'redis',
  },
  session: {
    tier: 'session',
    ttl: 60 * 60, // 1 hour
    maxSize: 500,
    storage: 'redis',
  },
  temporal: {
    tier: 'temporal',
    ttl: 30 * 24 * 60 * 60, // 30 days
    maxSize: 10000,
    storage: 'cosmos',
  },
  relational: {
    tier: 'relational',
    ttl: 90 * 24 * 60 * 60, // 90 days
    maxSize: 50000,
    storage: 'cosmos',
  },
  global: {
    tier: 'global',
    ttl: 0, // Permanent
    maxSize: Infinity,
    storage: 'cosmos',
  },
};

/**
 * Hierarchical Memory Service
 */
export class HierarchicalMemoryService {
  private client: CosmosClient;
  private database: Database;
  private memoryContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private tierConfigs: Record<MemoryTier, MemoryTierConfig>;

  constructor(cosmosClient: CosmosClient, redis?: Redis, monitoring?: IMonitoringProvider) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.tierConfigs = { ...DEFAULT_TIER_CONFIGS };

    // Initialize Cosmos client
    const connectionPolicy: ConnectionPolicy = {
      connectionMode: 'Direct' as any, // Best performance (ConnectionMode enum not available in this version)
      requestTimeout: 30000,
      enableEndpointDiscovery: true,
      retryOptions: {
        maxRetryAttemptCount: 9,
        fixedRetryIntervalInMilliseconds: 0,
        maxWaitTimeInSeconds: 30,
      } as RetryOptions,
    };

    this.client = cosmosClient || new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
      connectionPolicy,
    });

    this.database = this.client.database(config.cosmosDb.databaseId);
    this.memoryContainer = this.database.container(config.cosmosDb.containers.hierarchicalMemory);
  }

  /**
   * Store memory in appropriate tier
   */
  async storeMemory(
    tenantId: string,
    context: Context,
    content: any,
    tier?: MemoryTier, // Auto-select if not provided
    relevanceScore: number = 0.5,
    tags: string[] = []
  ): Promise<MemoryRecord> {
    const contextKey = contextKeyGenerator.generateSimple(context);
    const memoryId = uuidv4();
    const now = new Date();

    // Auto-select tier if not provided
    const selectedTier = tier || this.selectTier(content, context, relevanceScore);
    const tierConfig = this.tierConfigs[selectedTier];

    const memory: MemoryRecord = {
      id: memoryId,
      tenantId,
      tier: selectedTier,
      content,
      relevanceScore,
      accessedAt: now,
      accessCount: 0,
      contextKey,
      tags,
      createdAt: now,
      updatedAt: now,
    };

    // Store based on tier storage type
    if (tierConfig.storage === 'redis' || tierConfig.storage === 'both') {
      if (this.redis) {
        const key = `memory:${tenantId}:${selectedTier}:${memoryId}`;
        await this.redis.setex(key, tierConfig.ttl, JSON.stringify(memory));
      }
    }

    if (tierConfig.storage === 'cosmos' || tierConfig.storage === 'both') {
      await this.memoryContainer.items.create(memory);
    }

    this.monitoring?.trackEvent('hierarchical_memory.stored', {
      tenantId,
      tier: selectedTier,
      contextKey,
    });

    return memory;
  }

  /**
   * Retrieve memories from appropriate tiers
   */
  async retrieveMemories(
    tenantId: string,
    context: Context,
    query?: string,
    maxResults: number = 10,
    preferredTiers?: MemoryTier[]
  ): Promise<MemoryRetrievalResult[]> {
    const startTime = Date.now();
    const contextKey = contextKeyGenerator.generateSimple(context);
    const results: MemoryRetrievalResult[] = [];

    // Determine which tiers to search
    const tiersToSearch = preferredTiers || this.getSearchOrder(context);

    for (const tier of tiersToSearch) {
      const tierConfig = this.tierConfigs[tier];
      const tierResults: MemoryRecord[] = [];

      // Search Redis for immediate/session tiers
      if ((tierConfig.storage === 'redis' || tierConfig.storage === 'both') && this.redis) {
        const pattern = `memory:${tenantId}:${tier}:*`;
        const keys = await this.redis.keys(pattern);
        
        for (const key of keys.slice(0, tierConfig.maxSize)) {
          const data = await this.redis.get(key);
          if (data) {
            const memory = JSON.parse(data) as MemoryRecord;
            // Filter by context and query
            if (this.matchesQuery(memory, contextKey, query)) {
              tierResults.push(memory);
            }
          }
        }
      }

      // Search Cosmos DB for temporal/relational/global tiers
      if (tierConfig.storage === 'cosmos' || tierConfig.storage === 'both') {
        let querySpec: any = {
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.tier = @tier',
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@tier', value: tier },
          ],
        };

        // Add context filter if needed
        if (contextKey !== 'all') {
          querySpec.query += ' AND c.contextKey = @contextKey';
          querySpec.parameters.push({ name: '@contextKey', value: contextKey });
        }

        // Add query filter if provided
        if (query) {
          querySpec.query += ' AND CONTAINS(c.content, @query, true)';
          querySpec.parameters.push({ name: '@query', value: query });
        }

        querySpec.query += ' ORDER BY c.relevanceScore DESC, c.accessedAt DESC';

        const { resources } = await this.memoryContainer.items.query(querySpec).fetchAll();
        tierResults.push(...(resources as MemoryRecord[]).slice(0, maxResults));
      }

      // Sort by relevance and update access
      tierResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
      const topResults = tierResults.slice(0, maxResults);

      // Update access metadata
      for (const memory of topResults) {
        await this.updateAccess(memory);
      }

      if (topResults.length > 0) {
        const avgRelevance = topResults.reduce((sum, m) => sum + m.relevanceScore, 0) / topResults.length;
        results.push({
          records: topResults,
          tier,
          relevanceScore: avgRelevance,
          retrievalTime: Date.now() - startTime,
        });
      }

      // Stop if we have enough results
      if (results.reduce((sum, r) => sum + r.records.length, 0) >= maxResults) {
        break;
      }
    }

    this.monitoring?.trackEvent('hierarchical_memory.retrieved', {
      tenantId,
      tiers: tiersToSearch.join(','),
      resultCount: results.reduce((sum, r) => sum + r.records.length, 0),
    });

    return results;
  }

  /**
   * Auto-select tier based on content and context
   */
  private selectTier(content: any, context: Context, relevanceScore: number): MemoryTier {
    // High relevance + recent context -> immediate
    if (relevanceScore > 0.8) {
      return 'immediate';
    }

    // Entity relationships -> relational
    if (content.entityId || content.relationshipType) {
      return 'relational';
    }

    // Time-based patterns -> temporal
    if (content.timestamp || content.date) {
      return 'temporal';
    }

    // Long-term patterns -> global
    if (relevanceScore < 0.3) {
      return 'global';
    }

    // Default to session
    return 'session';
  }

  /**
   * Determine search order for tiers
   */
  private getSearchOrder(context: Context): MemoryTier[] {
    // Start with most recent/relevant tiers first
    return ['immediate', 'session', 'temporal', 'relational', 'global'];
  }

  /**
   * Check if memory matches query
   */
  private matchesQuery(memory: MemoryRecord, contextKey: string, query?: string): boolean {
    // Check context match
    if (memory.contextKey !== contextKey && memory.contextKey !== 'all') {
      return false;
    }

    // Check query match if provided
    if (query) {
      const contentStr = JSON.stringify(memory.content).toLowerCase();
      const queryLower = query.toLowerCase();
      return contentStr.includes(queryLower) || 
             memory.tags.some(tag => tag.toLowerCase().includes(queryLower));
    }

    return true;
  }

  /**
   * Update memory access metadata
   */
  private async updateAccess(memory: MemoryRecord): Promise<void> {
    memory.accessCount += 1;
    memory.accessedAt = new Date();
    memory.updatedAt = new Date();

    // Update in storage
    const tierConfig = this.tierConfigs[memory.tier];
    
    if ((tierConfig.storage === 'redis' || tierConfig.storage === 'both') && this.redis) {
      const key = `memory:${memory.tenantId}:${memory.tier}:${memory.id}`;
      await this.redis.setex(key, tierConfig.ttl, JSON.stringify(memory));
    }

    if (tierConfig.storage === 'cosmos' || tierConfig.storage === 'both') {
      await this.memoryContainer.item(memory.id, memory.tenantId).replace(memory);
    }
  }

  /**
   * Archive memory (move to lower tier or archive)
   */
  async archiveMemory(memoryId: string, tenantId: string): Promise<void> {
    try {
      const { resource: memory } = await this.memoryContainer.item(memoryId, tenantId).read<MemoryRecord>();
      if (!memory) {
        return;
      }

      memory.archivedAt = new Date();
      memory.tier = 'global'; // Move to global tier
      memory.relevanceScore = Math.max(0.1, memory.relevanceScore * 0.5); // Reduce relevance

      await this.memoryContainer.item(memoryId, tenantId).replace(memory);

      // Remove from Redis if present
      if (this.redis) {
        const key = `memory:${tenantId}:${memory.tier}:${memoryId}`;
        await this.redis.del(key);
      }

      this.monitoring?.trackEvent('hierarchical_memory.archived', {
        tenantId,
        memoryId,
        originalTier: memory.tier,
      });
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        operation: 'archiveMemory',
        tenantId,
        memoryId,
      });
    }
  }

  /**
   * Promote memory to higher tier (based on access patterns)
   */
  async promoteMemory(memoryId: string, tenantId: string, newTier: MemoryTier): Promise<void> {
    try {
      const { resource: memory } = await this.memoryContainer.item(memoryId, tenantId).read<MemoryRecord>();
      if (!memory) {
        return;
      }

      const oldTier = memory.tier;
      memory.tier = newTier;
      memory.updatedAt = new Date();

      await this.memoryContainer.item(memoryId, tenantId).replace(memory);

      // Update Redis if needed
      if (this.redis) {
        const oldKey = `memory:${tenantId}:${oldTier}:${memoryId}`;
        await this.redis.del(oldKey);

        const newTierConfig = this.tierConfigs[newTier];
        if (newTierConfig.storage === 'redis' || newTierConfig.storage === 'both') {
          const newKey = `memory:${tenantId}:${newTier}:${memoryId}`;
          await this.redis.setex(newKey, newTierConfig.ttl, JSON.stringify(memory));
        }
      }

      this.monitoring?.trackEvent('hierarchical_memory.promoted', {
        tenantId,
        memoryId,
        oldTier,
        newTier,
      });
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        operation: 'promoteMemory',
        tenantId,
        memoryId,
      });
    }
  }
}
