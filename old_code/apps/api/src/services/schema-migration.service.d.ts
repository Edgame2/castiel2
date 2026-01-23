import { IMonitoringProvider } from '@castiel/monitoring';
import { SchemaMigrationRepository } from '../repositories/schema-migration.repository.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { SchemaMigration, MigrationStrategy, SchemaDiff, ShardMigrationResult, BatchMigrationResult, CompatibilityCheckResult } from '../types/schema-migration.types.js';
import { ShardType, ShardTypeSchema, SchemaFormat } from '../types/shard-type.types.js';
import { Shard } from '../types/shard.types.js';
/**
 * Schema Migration Service
 * Handles schema evolution, change detection, and data migration
 */
export declare class SchemaMigrationService {
    private repository;
    private shardRepository;
    private shardTypeRepository;
    private monitoring;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository);
    /**
     * Initialize the service
     */
    initialize(): Promise<void>;
    /**
     * Detect changes between two schemas and create a diff
     */
    diffSchemas(oldSchema: ShardTypeSchema, newSchema: ShardTypeSchema, schemaFormat: SchemaFormat): SchemaDiff;
    /**
     * Diff rich schema fields
     */
    private diffRichSchemaFields;
    /**
     * Diff JSON Schema properties
     */
    private diffJSONSchemaProperties;
    /**
     * Diff legacy schema fields
     */
    private diffLegacySchemaFields;
    /**
     * Check if config change is breaking
     */
    private checkBreakingConfigChange;
    /**
     * Suggest transformation function for type change
     */
    private suggestTransformation;
    /**
     * Generate human-readable diff summary
     */
    private generateDiffSummary;
    /**
     * Check schema compatibility
     */
    checkCompatibility(oldSchema: ShardTypeSchema, newSchema: ShardTypeSchema, schemaFormat: SchemaFormat): CompatibilityCheckResult;
    /**
     * Get resolution suggestion for a change
     */
    private getResolution;
    /**
     * Create a migration for a schema change
     */
    createMigration(tenantId: string, shardType: ShardType, newSchema: ShardTypeSchema, userId: string, options?: {
        strategy?: MigrationStrategy;
        fieldMappings?: Record<string, string>;
        defaultValues?: Record<string, any>;
    }): Promise<SchemaMigration>;
    /**
     * Apply migration to a single Shard (lazy migration)
     */
    migrateShardData(shard: Shard, migration: SchemaMigration): Promise<ShardMigrationResult>;
    /**
     * Apply a transformation function
     */
    private applyTransformation;
    /**
     * Run eager migration (batch process all Shards)
     */
    runEagerMigration(migrationId: string, tenantId: string, continuationToken?: string): Promise<BatchMigrationResult>;
    /**
     * Get migrations for a ShardType
     */
    getMigrationsForShardType(tenantId: string, shardTypeId: string): Promise<SchemaMigration[]>;
    /**
     * Get migration by ID
     */
    getMigration(id: string, tenantId: string): Promise<SchemaMigration | undefined>;
    /**
     * Get migration path from one version to another
     */
    getMigrationPath(tenantId: string, shardTypeId: string, fromVersion: number, toVersion: number): Promise<SchemaMigration[]>;
    /**
     * Cancel a pending migration
     */
    cancelMigration(id: string, tenantId: string): Promise<SchemaMigration>;
    /**
     * Get repository for direct access
     */
    getRepository(): SchemaMigrationRepository;
}
//# sourceMappingURL=schema-migration.service.d.ts.map