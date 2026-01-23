/**
 * Cache Warming Service
 * Preloads frequently accessed data into cache on startup or on-demand
 */
import type { Container } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CacheWarmingConfig, CacheWarmingResult, CacheWarmingStatus } from '../types/cache-stats.types.js';
import type { ShardCacheService } from './shard-cache.service.js';
import type { ACLCacheService } from './acl-cache.service.js';
export interface CacheWarmingDependencies {
    cosmosContainer: Container;
    redisClient?: Redis;
    monitoring?: IMonitoringProvider;
    shardCache?: ShardCacheService;
    aclCache?: ACLCacheService;
}
export declare class CacheWarmingService {
    private cosmosContainer;
    private monitoring?;
    private shardCache?;
    private aclCache?;
    private currentStatus;
    constructor(dependencies: CacheWarmingDependencies);
    /**
     * Warm cache with configured strategy
     */
    warmCache(config: CacheWarmingConfig): Promise<CacheWarmingResult>;
    /**
     * Get current warming status
     */
    getStatus(): CacheWarmingStatus;
    /**
     * Get list of tenants to warm
     */
    private getTenantsToWarm;
    /**
     * Warm shards for a tenant
     */
    private warmShards;
    /**
     * Get top shards for a tenant based on warming strategy
     */
    private getTopShards;
    /**
     * Warm ACL entries for a tenant
     */
    private warmACL;
    /**
     * Warm cache on startup (called during application initialization)
     */
    warmOnStartup(config: CacheWarmingConfig): Promise<void>;
}
//# sourceMappingURL=cache-warming.service.d.ts.map