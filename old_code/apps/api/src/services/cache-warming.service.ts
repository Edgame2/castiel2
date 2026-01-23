/**
 * Cache Warming Service
 * Preloads frequently accessed data into cache on startup or on-demand
 */

import type { Container } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type {
  CacheWarmingConfig,
  CacheWarmingResult,
  CacheWarmingStatus,
} from '../types/cache-stats.types.js';
import type { Shard } from '../types/shard.types.js';
import type { ShardCacheService } from './shard-cache.service.js';
import type { ACLCacheService } from './acl-cache.service.js';
import type { ShardTypeCacheService } from './shard-type-cache.service.js';

export interface CacheWarmingDependencies {
  cosmosContainer: Container;
  redisClient?: Redis;
  monitoring?: IMonitoringProvider;
  shardCache?: ShardCacheService;
  aclCache?: ACLCacheService;
  shardTypeCache?: ShardTypeCacheService;
}

export class CacheWarmingService {
  private cosmosContainer: Container;
  private monitoring?: IMonitoringProvider;
  private shardCache?: ShardCacheService;
  private aclCache?: ACLCacheService;
  private shardTypeCache?: ShardTypeCacheService;
  private currentStatus: CacheWarmingStatus;

  constructor(dependencies: CacheWarmingDependencies) {
    this.cosmosContainer = dependencies.cosmosContainer;
    this.monitoring = dependencies.monitoring;
    this.shardCache = dependencies.shardCache;
    this.aclCache = dependencies.aclCache;
    this.shardTypeCache = dependencies.shardTypeCache;

    this.currentStatus = {
      isWarming: false,
      status: 'idle',
      itemsWarmed: 0,
      itemsFailed: 0,
      tenantsProcessed: 0,
    };
  }

  /**
   * Warm cache with configured strategy
   */
  async warmCache(config: CacheWarmingConfig): Promise<CacheWarmingResult> {
    if (!config.enabled) {
      return {
        success: false,
        status: this.currentStatus,
        details: {
          shardsWarmed: 0,
          aclEntriesWarmed: 0,
          shardTypesWarmed: 0,
          tenantsProcessed: [],
          durationMs: 0,
          errors: ['Cache warming is disabled in config'],
        },
      };
    }

    if (this.currentStatus.isWarming) {
      return {
        success: false,
        status: this.currentStatus,
        details: {
          shardsWarmed: 0,
          aclEntriesWarmed: 0,
          shardTypesWarmed: 0,
          tenantsProcessed: [],
          durationMs: 0,
          errors: ['Cache warming is already in progress'],
        },
      };
    }

    const startTime = Date.now();
    this.currentStatus = {
      isWarming: true,
      startedAt: new Date(),
      status: 'in-progress',
      itemsWarmed: 0,
      itemsFailed: 0,
      tenantsProcessed: 0,
      errors: [],
    };

    const errors: string[] = [];
    let shardsWarmed = 0;
    let aclEntriesWarmed = 0;
    let shardTypesWarmed = 0;
    const tenantsProcessed: string[] = [];

    try {
      this.monitoring?.trackEvent('cache.warming.started', {
        strategy: config.strategy,
        topN: config.topN.toString(),
      });

      // Get tenants to warm
      const tenants = await this.getTenantsToWarm(config);

      for (const tenantId of tenants) {
        try {
          // Check if we've exceeded max duration
          const elapsed = Date.now() - startTime;
          if (elapsed > config.maxDurationMs) {
            this.monitoring?.trackEvent('cache.warming.max-duration-reached', {
              maxDurationMs: config.maxDurationMs,
              elapsedMs: elapsed,
            });
            break;
          }

          // Warm shards for this tenant
          if (config.includeShards && this.shardCache) {
            const warmCount = await this.warmShards(tenantId, config);
            shardsWarmed += warmCount;
            this.currentStatus.itemsWarmed += warmCount;
          }

          // Warm ACL entries for this tenant
          if (config.includeACL && this.aclCache) {
            const warmCount = await this.warmACL(tenantId, config);
            aclEntriesWarmed += warmCount;
            this.currentStatus.itemsWarmed += warmCount;
          }

          // Warm shard types for this tenant
          if (config.includeShardTypes && this.shardTypeCache) {
            const warmCount = await this.warmShardTypes(tenantId, config);
            shardTypesWarmed += warmCount;
            this.currentStatus.itemsWarmed += warmCount;
          }

          tenantsProcessed.push(tenantId);
          this.currentStatus.tenantsProcessed++;
        } catch (error) {
          const errorMsg = `Failed to warm cache for tenant ${tenantId}: ${error}`;
          this.monitoring?.trackException(error as Error, { operation: 'cache-warming.warm-tenant', tenantId });
          errors.push(errorMsg);
          this.currentStatus.itemsFailed++;
        }
      }

      const durationMs = Date.now() - startTime;
      const completedAt = new Date();

      this.currentStatus = {
        isWarming: false,
        startedAt: this.currentStatus.startedAt,
        completedAt,
        durationMs,
        itemsWarmed: shardsWarmed + aclEntriesWarmed + shardTypesWarmed,
        itemsFailed: this.currentStatus.itemsFailed,
        tenantsProcessed: tenantsProcessed.length,
        status: errors.length === 0 ? 'completed' : 'partial',
        errors: errors.length > 0 ? errors : undefined,
      };

      this.monitoring?.trackEvent('cache.warming.completed', {
        shardsWarmed,
        aclEntriesWarmed,
        shardTypesWarmed,
        tenantsProcessed: tenantsProcessed.length,
        durationMs,
      });

      this.monitoring?.trackEvent('cache.warming.completed', {
        durationMs: durationMs.toString(),
        shardsWarmed: shardsWarmed.toString(),
        aclEntriesWarmed: aclEntriesWarmed.toString(),
        shardTypesWarmed: shardTypesWarmed.toString(),
        tenantsProcessed: tenantsProcessed.length.toString(),
        errors: errors.length.toString(),
      });

      return {
        success: errors.length === 0,
        status: this.currentStatus,
        details: {
          shardsWarmed,
          aclEntriesWarmed,
          shardTypesWarmed,
          tenantsProcessed,
          durationMs,
          errors,
        },
      };
    } catch (error) {
      const errorMsg = `Cache warming failed: ${error}`;
      this.monitoring?.trackException(error as Error, { operation: 'cache-warming.warm' });
      errors.push(errorMsg);

      const durationMs = Date.now() - startTime;
      this.currentStatus = {
        isWarming: false,
        startedAt: this.currentStatus.startedAt,
        completedAt: new Date(),
        durationMs,
        itemsWarmed: shardsWarmed + aclEntriesWarmed + shardTypesWarmed,
        itemsFailed: this.currentStatus.itemsFailed,
        tenantsProcessed: tenantsProcessed.length,
        status: 'failed',
        errors,
      };

      this.monitoring?.trackEvent('cache.warming.failed', {
        durationMs: durationMs.toString(),
        error: errorMsg,
      });

      return {
        success: false,
        status: this.currentStatus,
        details: {
          shardsWarmed,
          aclEntriesWarmed,
          shardTypesWarmed,
          tenantsProcessed,
          durationMs,
          errors,
        },
      };
    }
  }

  /**
   * Get current warming status
   */
  getStatus(): CacheWarmingStatus {
    return { ...this.currentStatus };
  }

  /**
   * Get list of tenants to warm
   */
  private async getTenantsToWarm(
    config: CacheWarmingConfig
  ): Promise<string[]> {
    // If specific tenants are provided, use those
    if (config.tenants && config.tenants.length > 0) {
      return config.tenants;
    }

    // Otherwise, get all active tenants from Cosmos DB
    const query = `
      SELECT DISTINCT VALUE c.tenantId
      FROM c
      WHERE c.status = 'active'
    `;

    const { resources } = await this.cosmosContainer.items
      .query<string>(query)
      .fetchAll();

    return resources;
  }

  /**
   * Warm shards for a tenant
   */
  private async warmShards(
    tenantId: string,
    config: CacheWarmingConfig
  ): Promise<number> {
    if (!this.shardCache) {return 0;}

    try {
      // Get top shards based on strategy
      const shards = await this.getTopShards(tenantId, config);

      let warmed = 0;
      for (const shard of shards) {
        try {
          // Cache the shard's structured data
          await this.shardCache.cacheStructuredData(
            tenantId,
            shard.id,
            shard.structuredData
          );
          warmed++;
        } catch (error) {
          this.monitoring?.trackException(error as Error, { operation: 'cache-warming.cache-shard', shardId: shard.id });
          this.currentStatus.itemsFailed++;
        }
      }

      return warmed;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'cache-warming.warm-shards', tenantId });
      return 0;
    }
  }

  /**
   * Get top shards for a tenant based on warming strategy
   */
  private async getTopShards(
    tenantId: string,
    config: CacheWarmingConfig
  ): Promise<Shard[]> {
    let query = '';

    switch (config.strategy) {
      case 'frequency':
        // Most accessed shards (would need access logs, using recent as fallback)
        query = `
          SELECT TOP ${config.topN} *
          FROM c
          WHERE c.tenantId = @tenantId AND c.status = 'active'
          ORDER BY c.metadata.updatedAt DESC
        `;
        break;

      case 'recency':
        // Most recently updated shards
        query = `
          SELECT TOP ${config.topN} *
          FROM c
          WHERE c.tenantId = @tenantId AND c.status = 'active'
          ORDER BY c.metadata.updatedAt DESC
        `;
        break;

      case 'hybrid':
        // Combination of recent and frequently updated
        query = `
          SELECT TOP ${config.topN} *
          FROM c
          WHERE c.tenantId = @tenantId AND c.status = 'active'
          ORDER BY c.metadata.updatedAt DESC, c.metadata.version DESC
        `;
        break;

      default:
        query = `
          SELECT TOP ${config.topN} *
          FROM c
          WHERE c.tenantId = @tenantId AND c.status = 'active'
        `;
    }

    const { resources } = await this.cosmosContainer.items
      .query<Shard>({
        query,
        parameters: [{ name: '@tenantId', value: tenantId }],
      })
      .fetchAll();

    return resources;
  }

  /**
   * Warm ACL entries for a tenant
   */
  private async warmACL(
    tenantId: string,
    config: CacheWarmingConfig
  ): Promise<number> {
    if (!this.aclCache) {return 0;}

    try {
      // Get top shards (ACL is per-shard)
      const shards = await this.getTopShards(tenantId, config);

      let warmed = 0;
      for (const shard of shards) {
        try {
          // Get ACL for this shard from Cosmos DB
          const query = `
            SELECT *
            FROM c
            WHERE c.tenantId = @tenantId 
              AND c.type = 'acl'
              AND c.resourceId = @resourceId
          `;

          const { resources: aclEntries } = await this.cosmosContainer.items
            .query({
              query,
              parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@resourceId', value: shard.id },
              ],
            })
            .fetchAll();

          // Cache each ACL entry
          for (const acl of aclEntries) {
            try {
              const aclEntry = {
                tenantId,
                userId: acl.userId,
                shardId: shard.id,
                permissions: acl.permissions,
                effectivePermission: acl.permissions[0] || null,
                source: 'database' as const,
                cachedAt: Date.now(),
                expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
              };
              await this.aclCache.cachePermissions(aclEntry);
              warmed++;
            } catch (error) {
              this.monitoring?.trackException(error as Error, { operation: 'cache-warming.cache-acl' });
              this.currentStatus.itemsFailed++;
            }
          }
        } catch (error) {
          this.monitoring?.trackException(error as Error, { operation: 'cache-warming.get-acl', shardId: shard.id });
          this.currentStatus.itemsFailed++;
        }
      }

      return warmed;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'cache-warming.warm-acl', tenantId });
      return 0;
    }
  }

  /**
   * Warm shard types for a tenant
   */
  private async warmShardTypes(
    tenantId: string,
    config: CacheWarmingConfig
  ): Promise<number> {
    if (!this.shardTypeCache) {
      return 0;
    }

    try {
      // Get shard types for this tenant
      // Shard types are typically accessed from both tenant-specific and system tenant
      // We'll warm both tenant-specific and system (global) shard types
      const shardTypes = await this.getTopShardTypes(tenantId, config);

      let warmed = 0;
      for (const shardType of shardTypes) {
        try {
          // Cache the shard type
          await this.shardTypeCache.cacheShardType(
            shardType.tenantId,
            shardType.id,
            shardType
          );
          warmed++;
        } catch (error) {
          this.monitoring?.trackException(error as Error, {
            operation: 'cache-warming.cache-shard-type',
            shardTypeId: shardType.id,
          });
          this.currentStatus.itemsFailed++;
        }
      }

      // Also warm system (global) shard types if tenant is not system
      if (tenantId !== 'system') {
        const systemShardTypes = await this.getTopShardTypes('system', config);
        for (const shardType of systemShardTypes) {
          try {
            await this.shardTypeCache.cacheShardType(
              'system',
              shardType.id,
              shardType
            );
            warmed++;
          } catch (error) {
            this.monitoring?.trackException(error as Error, {
              operation: 'cache-warming.cache-shard-type-system',
              shardTypeId: shardType.id,
            });
            this.currentStatus.itemsFailed++;
          }
        }
      }

      return warmed;
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        operation: 'cache-warming.warm-shard-types',
        tenantId,
      });
      return 0;
    }
  }

  /**
   * Get top shard types for a tenant
   */
  private async getTopShardTypes(
    tenantId: string,
    config: CacheWarmingConfig
  ): Promise<ShardType[]> {
    // Shard types are typically accessed by ID, so we'll warm the most recently used ones
    // Since we don't have access logs, we'll warm all active shard types (they're not too many)
    const query = `
      SELECT TOP ${config.topN} *
      FROM c
      WHERE c.tenantId = @tenantId 
        AND c.status = 'active'
      ORDER BY c.updatedAt DESC
    `;

    try {
      const { resources } = await this.cosmosContainer.items
        .query({
          query,
          parameters: [{ name: '@tenantId', value: tenantId }],
        })
        .fetchAll();

      return resources;
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        operation: 'cache-warming.get-top-shard-types',
        tenantId,
      });
      return [];
    }
  }

  /**
   * Warm cache on startup (called during application initialization)
   */
  async warmOnStartup(config: CacheWarmingConfig): Promise<void> {
    if (!config.enabled) {
      this.monitoring?.trackEvent('cache.warming.startup-disabled');
      return;
    }

    this.monitoring?.trackEvent('cache.warming.startup-started');

    // Run warming in background (don't block startup)
    this.warmCache(config)
      .then((result) => {
        if (result.success) {
          this.monitoring?.trackEvent('cache.warming.startup-completed', {
            shardsWarmed: result.details.shardsWarmed,
            aclEntriesWarmed: result.details.aclEntriesWarmed,
            shardTypesWarmed: result.details.shardTypesWarmed || 0,
          });
        } else {
          this.monitoring?.trackEvent('cache.warming.startup-completed-with-errors', {
            errorCount: result.details.errors.length,
          });
        }
      })
      .catch((error) => {
        this.monitoring?.trackException(error as Error, { operation: 'cache-warming.startup-warming' });
      });
  }
}
