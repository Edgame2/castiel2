import { MigrationStrategy, MigrationStatus } from '../types/schema-migration.types.js';
import { SchemaMigrationRepository } from '../repositories/schema-migration.repository.js';
import { SchemaMigrationService } from './schema-migration.service.js';
/**
 * Lazy Migration Service
 * Handles on-the-fly migration of Shards when they are read
 */
export class LazyMigrationService {
    migrationRepository;
    migrationService;
    shardRepository;
    shardTypeRepository;
    monitoring;
    // Cache for ShardType versions to avoid repeated lookups
    shardTypeVersionCache = new Map();
    CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    constructor(monitoring, shardRepository, shardTypeRepository, migrationService) {
        this.monitoring = monitoring;
        this.shardRepository = shardRepository;
        this.shardTypeRepository = shardTypeRepository;
        this.migrationRepository = new SchemaMigrationRepository(monitoring);
        // Use provided service or create new one
        this.migrationService = migrationService || new SchemaMigrationService(monitoring, shardRepository, shardTypeRepository);
    }
    /**
     * Initialize the service
     */
    async initialize() {
        await this.migrationRepository.ensureContainer();
    }
    /**
     * Check if a Shard needs migration and optionally apply it
     * @param shard The Shard to check
     * @param applyMigration Whether to apply the migration if needed
     * @returns The (potentially migrated) Shard and migration info
     */
    async checkAndMigrate(shard, applyMigration = true) {
        const shardVersion = shard.schemaVersion || 1;
        // Get current ShardType version (with caching)
        const currentTypeVersion = await this.getShardTypeVersion(shard.tenantId, shard.shardTypeId);
        // No migration needed if versions match
        if (shardVersion >= currentTypeVersion) {
            return { shard, wasMigrated: false };
        }
        this.monitoring.trackEvent('lazyMigration.needed', {
            shardId: shard.id,
            tenantId: shard.tenantId,
            shardTypeId: shard.shardTypeId,
            fromVersion: shardVersion,
            toVersion: currentTypeVersion,
        });
        if (!applyMigration) {
            return { shard, wasMigrated: false };
        }
        // Find migration path
        const migrations = await this.migrationRepository.findMigrationPath(shard.tenantId, shard.shardTypeId, shardVersion, currentTypeVersion);
        if (migrations.length === 0) {
            // No migration records found - just update version
            this.monitoring.trackEvent('lazyMigration.noMigrationRecords', {
                shardId: shard.id,
                tenantId: shard.tenantId,
                shardTypeId: shard.shardTypeId,
            });
            return { shard, wasMigrated: false };
        }
        // Apply migrations in sequence
        let migratedData = { ...shard.structuredData };
        const allChangesApplied = [];
        let currentVersion = shardVersion;
        for (const migration of migrations) {
            // Only apply lazy migrations
            if (migration.strategy !== MigrationStrategy.LAZY && migration.strategy !== MigrationStrategy.NONE) {
                continue;
            }
            // Skip if migration isn't ready
            if (migration.status === MigrationStatus.PENDING || migration.status === MigrationStatus.CANCELLED) {
                continue;
            }
            const result = await this.migrationService.migrateShardData({ ...shard, structuredData: migratedData, schemaVersion: currentVersion }, migration);
            if (result.success && result.migratedData) {
                migratedData = result.migratedData;
                allChangesApplied.push(...result.changesApplied);
                currentVersion = migration.toVersion;
            }
            else if (!result.success) {
                this.monitoring.trackEvent('lazyMigration.migrationFailed', {
                    shardId: shard.id,
                    migrationId: migration.id,
                    error: result.error,
                });
                // Continue with partially migrated data
            }
        }
        // If data was migrated, update the Shard
        if (allChangesApplied.length > 0 || currentVersion > shardVersion) {
            try {
                // Update Shard with migrated data and new version
                const updatedShard = await this.updateShardWithMigration(shard.id, shard.tenantId, migratedData, currentVersion);
                this.monitoring.trackEvent('lazyMigration.success', {
                    shardId: shard.id,
                    tenantId: shard.tenantId,
                    fromVersion: shardVersion,
                    toVersion: currentVersion,
                    changesApplied: allChangesApplied.length,
                });
                return {
                    shard: updatedShard || { ...shard, structuredData: migratedData, schemaVersion: currentVersion },
                    wasMigrated: true,
                    migrationApplied: {
                        fromVersion: shardVersion,
                        toVersion: currentVersion,
                        changesApplied: allChangesApplied,
                    },
                };
            }
            catch (error) {
                this.monitoring.trackException(error, {
                    operation: 'lazyMigration.updateShard',
                    shardId: shard.id,
                });
                // Return migrated data even if save failed
                return {
                    shard: { ...shard, structuredData: migratedData, schemaVersion: currentVersion },
                    wasMigrated: true,
                    migrationApplied: {
                        fromVersion: shardVersion,
                        toVersion: currentVersion,
                        changesApplied: allChangesApplied,
                    },
                };
            }
        }
        return { shard, wasMigrated: false };
    }
    /**
     * Get ShardType version with caching
     */
    async getShardTypeVersion(tenantId, shardTypeId) {
        const cacheKey = `${tenantId}:${shardTypeId}`;
        const cached = this.shardTypeVersionCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.version;
        }
        const shardType = await this.shardTypeRepository.findById(shardTypeId, tenantId);
        const version = shardType?.schemaVersion || 1;
        this.shardTypeVersionCache.set(cacheKey, {
            version,
            expiresAt: Date.now() + this.CACHE_TTL_MS,
        });
        return version;
    }
    /**
     * Update Shard with migrated data
     */
    async updateShardWithMigration(shardId, tenantId, migratedData, newVersion) {
        // Get current shard to preserve other fields
        const current = await this.shardRepository.findById(shardId, tenantId);
        if (!current) {
            return null;
        }
        // Update with new data and version
        const updateInput = {
            structuredData: migratedData,
            schemaVersion: newVersion,
        };
        const updated = await this.shardRepository.update(shardId, tenantId, updateInput);
        return updated;
    }
    /**
     * Clear the ShardType version cache
     */
    clearCache() {
        this.shardTypeVersionCache.clear();
    }
    /**
     * Invalidate cache for a specific ShardType
     */
    invalidateShardTypeCache(tenantId, shardTypeId) {
        const cacheKey = `${tenantId}:${shardTypeId}`;
        this.shardTypeVersionCache.delete(cacheKey);
    }
    /**
     * Check if a Shard needs migration without applying it
     */
    async needsMigration(shard) {
        const shardVersion = shard.schemaVersion || 1;
        const currentTypeVersion = await this.getShardTypeVersion(shard.tenantId, shard.shardTypeId);
        return shardVersion < currentTypeVersion;
    }
    /**
     * Get migration status for a Shard
     */
    async getMigrationStatus(shard) {
        const shardVersion = shard.schemaVersion || 1;
        const currentTypeVersion = await this.getShardTypeVersion(shard.tenantId, shard.shardTypeId);
        if (shardVersion >= currentTypeVersion) {
            return {
                needsMigration: false,
                currentVersion: shardVersion,
                targetVersion: currentTypeVersion,
                pendingMigrations: 0,
            };
        }
        const migrations = await this.migrationRepository.findMigrationPath(shard.tenantId, shard.shardTypeId, shardVersion, currentTypeVersion);
        return {
            needsMigration: true,
            currentVersion: shardVersion,
            targetVersion: currentTypeVersion,
            pendingMigrations: migrations.length,
        };
    }
}
//# sourceMappingURL=lazy-migration.service.js.map