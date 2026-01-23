import { IMonitoringProvider } from '@castiel/monitoring';
import { Shard } from '../types/shard.types.js';
import { SchemaMigrationService } from './schema-migration.service.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
/**
 * Lazy Migration Service
 * Handles on-the-fly migration of Shards when they are read
 */
export declare class LazyMigrationService {
    private migrationRepository;
    private migrationService;
    private shardRepository;
    private shardTypeRepository;
    private monitoring;
    private shardTypeVersionCache;
    private readonly CACHE_TTL_MS;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository, migrationService?: SchemaMigrationService);
    /**
     * Initialize the service
     */
    initialize(): Promise<void>;
    /**
     * Check if a Shard needs migration and optionally apply it
     * @param shard The Shard to check
     * @param applyMigration Whether to apply the migration if needed
     * @returns The (potentially migrated) Shard and migration info
     */
    checkAndMigrate(shard: Shard, applyMigration?: boolean): Promise<{
        shard: Shard;
        wasMigrated: boolean;
        migrationApplied?: {
            fromVersion: number;
            toVersion: number;
            changesApplied: string[];
        };
    }>;
    /**
     * Get ShardType version with caching
     */
    private getShardTypeVersion;
    /**
     * Update Shard with migrated data
     */
    private updateShardWithMigration;
    /**
     * Clear the ShardType version cache
     */
    clearCache(): void;
    /**
     * Invalidate cache for a specific ShardType
     */
    invalidateShardTypeCache(tenantId: string, shardTypeId: string): void;
    /**
     * Check if a Shard needs migration without applying it
     */
    needsMigration(shard: Shard): Promise<boolean>;
    /**
     * Get migration status for a Shard
     */
    getMigrationStatus(shard: Shard): Promise<{
        needsMigration: boolean;
        currentVersion: number;
        targetVersion: number;
        pendingMigrations: number;
    }>;
}
//# sourceMappingURL=lazy-migration.service.d.ts.map