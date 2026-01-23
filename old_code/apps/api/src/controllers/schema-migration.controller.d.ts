import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { SchemaMigrationService } from '../services/schema-migration.service.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { MigrationStatus, MigrationStrategy } from '../types/schema-migration.types.js';
import { ShardTypeSchema } from '../types/shard-type.types.js';
/**
 * Schema Migration Controller
 * Handles schema evolution and migration operations
 */
export declare class SchemaMigrationController {
    private migrationService;
    private shardTypeRepository;
    private monitoring;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository);
    /**
     * Initialize the controller
     */
    initialize(): Promise<void>;
    /**
     * GET /api/v1/schema-migrations
     * List migrations
     */
    listMigrations: (req: FastifyRequest<{
        Querystring: {
            shardTypeId?: string;
            status?: MigrationStatus;
            limit?: number;
            continuationToken?: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/schema-migrations/:id
     * Get a specific migration
     */
    getMigration: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/schema-migrations/preview
     * Preview schema changes without creating a migration
     */
    previewSchemaChanges: (req: FastifyRequest<{
        Body: {
            shardTypeId: string;
            newSchema: ShardTypeSchema;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/schema-migrations
     * Create a new migration (usually called when ShardType schema is updated)
     */
    createMigration: (req: FastifyRequest<{
        Body: {
            shardTypeId: string;
            newSchema: ShardTypeSchema;
            strategy?: MigrationStrategy;
            fieldMappings?: Record<string, string>;
            defaultValues?: Record<string, any>;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/schema-migrations/:id/run
     * Run an eager migration (process all Shards)
     */
    runMigration: (req: FastifyRequest<{
        Params: {
            id: string;
        };
        Querystring: {
            continuationToken?: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/schema-migrations/:id/cancel
     * Cancel a pending migration
     */
    cancelMigration: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/schema-migrations/shard-types/:shardTypeId
     * Get all migrations for a ShardType
     */
    getMigrationsForShardType: (req: FastifyRequest<{
        Params: {
            shardTypeId: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/schema-migrations/path
     * Get migration path from one version to another
     */
    getMigrationPath: (req: FastifyRequest<{
        Querystring: {
            shardTypeId: string;
            fromVersion: number;
            toVersion: number;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * Get the migration service for external use
     */
    getMigrationService(): SchemaMigrationService;
}
//# sourceMappingURL=schema-migration.controller.d.ts.map