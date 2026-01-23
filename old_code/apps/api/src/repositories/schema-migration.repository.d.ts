import { IMonitoringProvider } from '@castiel/monitoring';
import { SchemaMigration, MigrationStatus, MigrationProgress, MigrationQueryOptions, MigrationListResult, CreateMigrationInput, FieldChange } from '../types/schema-migration.types.js';
/**
 * Schema Migration Repository
 * Handles Cosmos DB operations for schema migrations
 */
export declare class SchemaMigrationRepository {
    private client;
    private container;
    private monitoring;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Initialize container
     */
    ensureContainer(): Promise<void>;
    /**
     * Create a new schema migration
     */
    create(tenantId: string, input: CreateMigrationInput, changes: FieldChange[], shardTypeName: string): Promise<SchemaMigration>;
    /**
     * Find migration by ID
     */
    findById(id: string, tenantId: string): Promise<SchemaMigration | undefined>;
    /**
     * Find latest migration for a ShardType
     */
    findLatestForShardType(tenantId: string, shardTypeId: string): Promise<SchemaMigration | undefined>;
    /**
     * Find migration by version range
     */
    findByVersionRange(tenantId: string, shardTypeId: string, fromVersion: number, toVersion: number): Promise<SchemaMigration | undefined>;
    /**
     * Find all migrations for a path (from version X to version Y)
     */
    findMigrationPath(tenantId: string, shardTypeId: string, fromVersion: number, toVersion: number): Promise<SchemaMigration[]>;
    /**
     * Update migration status and progress
     */
    updateStatus(id: string, tenantId: string, status: MigrationStatus, progress?: Partial<MigrationProgress>, error?: string): Promise<SchemaMigration>;
    /**
     * List migrations
     */
    list(options: MigrationQueryOptions): Promise<MigrationListResult>;
    /**
     * Find pending/in-progress migrations that need processing
     */
    findPendingMigrations(tenantId?: string, limit?: number): Promise<SchemaMigration[]>;
    /**
     * Delete a migration (only if pending)
     */
    delete(id: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=schema-migration.repository.d.ts.map