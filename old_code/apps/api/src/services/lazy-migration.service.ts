import { IMonitoringProvider } from '@castiel/monitoring';
import { Shard, UpdateShardInput } from '../types/shard.types.js';
import { ShardType } from '../types/shard-type.types.js';
import { SchemaMigration, MigrationStrategy, MigrationStatus } from '../types/schema-migration.types.js';
import { SchemaMigrationRepository } from '../repositories/schema-migration.repository.js';
import { SchemaMigrationService } from './schema-migration.service.js';
import {
  ShardRepository,
  ShardTypeRepository,
} from '@castiel/api-core';

/**
 * Lazy Migration Service
 * Handles on-the-fly migration of Shards when they are read
 */
export class LazyMigrationService {
  private migrationRepository: SchemaMigrationRepository;
  private migrationService: SchemaMigrationService;
  private shardRepository: ShardRepository;
  private shardTypeRepository: ShardTypeRepository;
  private monitoring: IMonitoringProvider;

  // Cache for ShardType versions to avoid repeated lookups
  private shardTypeVersionCache: Map<string, { version: number; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    monitoring: IMonitoringProvider,
    shardRepository: ShardRepository,
    shardTypeRepository: ShardTypeRepository,
    migrationService?: SchemaMigrationService
  ) {
    this.monitoring = monitoring;
    this.shardRepository = shardRepository;
    this.shardTypeRepository = shardTypeRepository;
    this.migrationRepository = new SchemaMigrationRepository(monitoring);
    
    // Use provided service or create new one
    this.migrationService = migrationService || new SchemaMigrationService(
      monitoring,
      shardRepository,
      shardTypeRepository
    );
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.migrationRepository.ensureContainer();
  }

  /**
   * Check if a Shard needs migration and optionally apply it
   * @param shard The Shard to check
   * @param applyMigration Whether to apply the migration if needed
   * @returns The (potentially migrated) Shard and migration info
   */
  async checkAndMigrate(
    shard: Shard,
    applyMigration: boolean = true
  ): Promise<{
    shard: Shard;
    wasMigrated: boolean;
    migrationApplied?: {
      fromVersion: number;
      toVersion: number;
      changesApplied: string[];
    };
  }> {
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
    const migrations = await this.migrationRepository.findMigrationPath(
      shard.tenantId,
      shard.shardTypeId,
      shardVersion,
      currentTypeVersion
    );

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
    const allChangesApplied: string[] = [];
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

      const result = await this.migrationService.migrateShardData(
        { ...shard, structuredData: migratedData, schemaVersion: currentVersion },
        migration
      );

      if (result.success && result.migratedData) {
        migratedData = result.migratedData;
        allChangesApplied.push(...result.changesApplied);
        currentVersion = migration.toVersion;
      } else if (!result.success) {
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
        const updatedShard = await this.updateShardWithMigration(
          shard.id,
          shard.tenantId,
          migratedData,
          currentVersion
        );

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
      } catch (error) {
        this.monitoring.trackException(error as Error, {
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
  private async getShardTypeVersion(tenantId: string, shardTypeId: string): Promise<number> {
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
  private async updateShardWithMigration(
    shardId: string,
    tenantId: string,
    migratedData: Record<string, any>,
    newVersion: number
  ): Promise<Shard | null> {
    // Get current shard to preserve other fields
    const current = await this.shardRepository.findById(shardId, tenantId);
    if (!current) {return null;}

    // Update with new data and version
    const updateInput: UpdateShardInput = {
      structuredData: migratedData,
      schemaVersion: newVersion,
    };

    const updated = await this.shardRepository.update(shardId, tenantId, updateInput);

    return updated;
  }

  /**
   * Clear the ShardType version cache
   */
  clearCache(): void {
    this.shardTypeVersionCache.clear();
  }

  /**
   * Invalidate cache for a specific ShardType
   */
  invalidateShardTypeCache(tenantId: string, shardTypeId: string): void {
    const cacheKey = `${tenantId}:${shardTypeId}`;
    this.shardTypeVersionCache.delete(cacheKey);
  }

  /**
   * Check if a Shard needs migration without applying it
   */
  async needsMigration(shard: Shard): Promise<boolean> {
    const shardVersion = shard.schemaVersion || 1;
    const currentTypeVersion = await this.getShardTypeVersion(shard.tenantId, shard.shardTypeId);
    return shardVersion < currentTypeVersion;
  }

  /**
   * Get migration status for a Shard
   */
  async getMigrationStatus(shard: Shard): Promise<{
    needsMigration: boolean;
    currentVersion: number;
    targetVersion: number;
    pendingMigrations: number;
  }> {
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

    const migrations = await this.migrationRepository.findMigrationPath(
      shard.tenantId,
      shard.shardTypeId,
      shardVersion,
      currentTypeVersion
    );

    return {
      needsMigration: true,
      currentVersion: shardVersion,
      targetVersion: currentTypeVersion,
      pendingMigrations: migrations.length,
    };
  }
}










