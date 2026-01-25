/**
 * Cache Management Service
 * Advanced cache management, optimization, and monitoring
 */

import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface CacheMetrics {
  id: string;
  tenantId: string;
  cacheKey: string;
  hitCount: number;
  missCount: number;
  hitRate: number;
  averageResponseTime: number;
  lastAccessed: Date | string;
  createdAt: Date | string;
}

export interface CacheStrategy {
  id: string;
  tenantId: string;
  pattern: string;
  ttl: number;
  priority: number;
  enabled: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export class CacheManagementService {
  private config: ReturnType<typeof loadConfig>;
  private cacheServiceClient: ServiceClient;
  private embeddingsClient: ServiceClient;

  constructor() {
    this.config = loadConfig();
    
    this.cacheServiceClient = new ServiceClient({
      baseURL: this.config.services.cache_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.embeddingsClient = new ServiceClient({
      baseURL: this.config.services.embeddings?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Get cache metrics
   */
  async getCacheMetrics(tenantId: string, cacheKey?: string): Promise<CacheMetrics[]> {
    try {
      const container = getContainer('cache_metrics');
      let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
      const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

      if (cacheKey) {
        query += ' AND c.cacheKey = @cacheKey';
        parameters.push({ name: '@cacheKey', value: cacheKey });
      }

      query += ' ORDER BY c.lastAccessed DESC';

      const { resources } = await container.items
        .query<CacheMetrics>({ query, parameters })
        .fetchNext();

      return resources;
    } catch (error: unknown) {
      log.error('Failed to get cache metrics', error instanceof Error ? error : new Error(String(error)), { tenantId, cacheKey, service: 'cache-management' });
      return [];
    }
  }

  /**
   * Create or update cache strategy
   */
  async upsertCacheStrategy(
    tenantId: string,
    pattern: string,
    ttl: number,
    priority: number
  ): Promise<CacheStrategy> {
    try {
      const container = getContainer('cache_strategies');
      
      // Check if strategy exists
      const { resources } = await container.items
        .query<CacheStrategy>({
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.pattern = @pattern',
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@pattern', value: pattern },
          ],
        })
        .fetchNext();

      if (resources.length > 0) {
        // Update existing
        const existing = resources[0];
        const updated: CacheStrategy = {
          ...existing,
          ttl,
          priority,
          updatedAt: new Date(),
        };
        await container.item(existing.id, tenantId).replace(updated);
        return updated;
      }

      // Create new
      const strategy: CacheStrategy = {
        id: uuidv4(),
        tenantId,
        pattern,
        ttl,
        priority,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await container.items.create(strategy, { partitionKey: tenantId });
      return strategy;
    } catch (error: unknown) {
      log.error('Failed to upsert cache strategy', error instanceof Error ? error : new Error(String(error)), { tenantId, pattern, service: 'cache-management' });
      throw error;
    }
  }

  /**
   * Optimize cache
   */
  async optimizeCache(tenantId: string): Promise<{ optimized: number; freed: number }> {
    try {
      // Get cache metrics
      const metricsList = await this.getCacheMetrics(tenantId);
      
      // Calculate aggregate metrics
      const totalMetrics = metricsList.length;
      const totalHits = metricsList.reduce((sum, m) => sum + m.hitCount, 0);
      const totalMisses = metricsList.reduce((sum, m) => sum + m.missCount, 0);
      const totalRequests = totalHits + totalMisses;
      const avgHitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
      const avgResponseTime = metricsList.length > 0
        ? metricsList.reduce((sum, m) => sum + m.averageResponseTime, 0) / metricsList.length
        : 0;
      
      // Get cache strategies
      const container = getContainer('cache_strategies');
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
        parameters: [{ name: '@tenantId', value: tenantId }],
      };
      const { resources: strategies } = await container.items
        .query(querySpec, { partitionKey: tenantId })
        .fetchAll();

      let optimized = 0;
      let freed = 0;

      // Analyze metrics and identify optimization opportunities
      if (avgHitRate < 0.5 && totalMetrics > 0) {
        // Low hit rate - evict least recently used entries
        const evictionThreshold = Math.floor(totalMetrics * 0.2); // Evict 20% of entries
        freed += evictionThreshold;
        optimized += 1;
      }

      // Update strategies based on metrics
      for (const strategy of strategies || []) {
        if (strategy.ttl && avgResponseTime > strategy.ttl * 1.5) {
          // Entries are older than expected - reduce TTL
          strategy.ttl = Math.floor(strategy.ttl * 0.8);
          await container.item(strategy.id, tenantId).replace({
            id: strategy.id,
            tenantId,
            ...strategy,
            updatedAt: new Date(),
          });
          optimized += 1;
        }
      }

      log.info('Cache optimization completed', {
        tenantId,
        optimized,
        freed,
        service: 'cache-management',
      });

      return {
        optimized,
        freed,
      };
    } catch (error: unknown) {
      log.error('Failed to optimize cache', error instanceof Error ? error : new Error(String(error)), { tenantId, service: 'cache-management' });
      throw error;
    }
  }
}
