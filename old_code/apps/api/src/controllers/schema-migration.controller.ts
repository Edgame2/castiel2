import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { SchemaMigrationService } from '../services/schema-migration.service.js';
import {
  ShardTypeRepository,
  ShardRepository,
} from '@castiel/api-core';
import { ShardCacheService } from '../services/shard-cache.service.js';
import {
  MigrationStatus,
  MigrationStrategy,
  SchemaMigration,
} from '../types/schema-migration.types.js';
import { detectSchemaFormat, ShardTypeSchema } from '../types/shard-type.types.js';

interface AuthContext {
  tenantId: string;
  userId: string;
  roles?: string[];
}

// AuthContext declaration moved to types/fastify.d.ts

/**
 * Schema Migration Controller
 * Handles schema evolution and migration operations
 */
export class SchemaMigrationController {
  private migrationService: SchemaMigrationService;
  private shardTypeRepository: ShardTypeRepository;
  private monitoring: IMonitoringProvider;

  constructor(
    monitoring: IMonitoringProvider,
    shardRepository: ShardRepository,
    shardTypeRepository: ShardTypeRepository
  ) {
    this.monitoring = monitoring;
    this.shardTypeRepository = shardTypeRepository;
    this.migrationService = new SchemaMigrationService(
      monitoring,
      shardRepository,
      shardTypeRepository
    );
  }

  /**
   * Initialize the controller
   */
  async initialize(): Promise<void> {
    await this.migrationService.initialize();
  }

  /**
   * GET /api/v1/schema-migrations
   * List migrations
   */
  listMigrations = async (
    req: FastifyRequest<{
      Querystring: {
        shardTypeId?: string;
        status?: MigrationStatus;
        limit?: number;
        continuationToken?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const auth = req.auth;
      if (!auth || !auth.tenantId) {
        reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
        return;
      }
      const { tenantId } = auth;
      if (!tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { shardTypeId, status, limit, continuationToken } = req.query;

      const result = await this.migrationService.getRepository().list({
        tenantId,
        shardTypeId,
        status,
        limit,
        continuationToken,
      });

      this.monitoring.trackMetric('api.schemaMigrations.list.duration', Date.now() - startTime);
      return reply.status(200).send(result);
    } catch (error: any) {
      this.monitoring.trackException(error, { operation: 'schemaMigrations.list' });
      return reply.status(500).send({ error: 'Failed to list migrations', details: error.message });
    }
  };

  /**
   * GET /api/v1/schema-migrations/:id
   * Get a specific migration
   */
  getMigration = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const auth = req.auth;
      if (!auth || !auth.tenantId) {
        reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
        return;
      }
      const { tenantId } = auth;
      if (!tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const migration = await this.migrationService.getMigration(id, tenantId);

      if (!migration) {
        return reply.status(404).send({ error: 'Migration not found' });
      }

      this.monitoring.trackMetric('api.schemaMigrations.get.duration', Date.now() - startTime);
      return reply.status(200).send(migration);
    } catch (error: any) {
      this.monitoring.trackException(error, { operation: 'schemaMigrations.get' });
      return reply.status(500).send({ error: 'Failed to get migration', details: error.message });
    }
  };

  /**
   * POST /api/v1/schema-migrations/preview
   * Preview schema changes without creating a migration
   */
  previewSchemaChanges = async (
    req: FastifyRequest<{
      Body: {
        shardTypeId: string;
        newSchema: ShardTypeSchema;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const auth = req.auth;
      if (!auth || !auth.tenantId) {
        reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
        return;
      }
      const { tenantId } = auth;
      if (!tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { shardTypeId, newSchema } = req.body;

      // Get current ShardType
      const shardType = await this.shardTypeRepository.findById(shardTypeId, tenantId);
      if (!shardType) {
        return reply.status(404).send({ error: 'ShardType not found' });
      }

      const schemaFormat = detectSchemaFormat(newSchema);

      // Generate diff
      const diff = this.migrationService.diffSchemas(shardType.schema, newSchema, schemaFormat);

      // Check compatibility
      const compatibility = this.migrationService.checkCompatibility(
        shardType.schema,
        newSchema,
        schemaFormat
      );

      this.monitoring.trackMetric('api.schemaMigrations.preview.duration', Date.now() - startTime);
      return reply.status(200).send({
        currentVersion: shardType.schemaVersion || 1,
        nextVersion: (shardType.schemaVersion || 1) + 1,
        diff,
        compatibility,
        shardType: {
          id: shardType.id,
          name: shardType.name,
          displayName: shardType.displayName,
        },
      });
    } catch (error: any) {
      this.monitoring.trackException(error, { operation: 'schemaMigrations.preview' });
      return reply.status(500).send({ error: 'Failed to preview changes', details: error.message });
    }
  };

  /**
   * POST /api/v1/schema-migrations
   * Create a new migration (usually called when ShardType schema is updated)
   */
  createMigration = async (
    req: FastifyRequest<{
      Body: {
        shardTypeId: string;
        newSchema: ShardTypeSchema;
        strategy?: MigrationStrategy;
        fieldMappings?: Record<string, string>;
        defaultValues?: Record<string, any>;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const auth = req.auth as AuthContext | undefined;
      if (!auth || !auth.tenantId || !auth.userId) {
        reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        return;
      }
      const { tenantId, userId } = auth;
      if (!tenantId || !userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { shardTypeId, newSchema, strategy, fieldMappings, defaultValues } = req.body;

      // Get current ShardType
      const shardType = await this.shardTypeRepository.findById(shardTypeId, tenantId);
      if (!shardType) {
        return reply.status(404).send({ error: 'ShardType not found' });
      }

      // Create migration
      const migration = await this.migrationService.createMigration(
        tenantId,
        shardType,
        newSchema,
        userId,
        { strategy, fieldMappings, defaultValues }
      );

      this.monitoring.trackMetric('api.schemaMigrations.create.duration', Date.now() - startTime);
      return reply.status(201).send(migration);
    } catch (error: any) {
      this.monitoring.trackException(error, { operation: 'schemaMigrations.create' });
      return reply.status(500).send({ error: 'Failed to create migration', details: error.message });
    }
  };

  /**
   * POST /api/v1/schema-migrations/:id/run
   * Run an eager migration (process all Shards)
   */
  runMigration = async (
    req: FastifyRequest<{
      Params: { id: string };
      Querystring: { continuationToken?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const auth = req.auth;
      if (!auth || !auth.tenantId) {
        reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
        return;
      }
      const { tenantId } = auth;
      if (!tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const { continuationToken } = req.query;

      const result = await this.migrationService.runEagerMigration(id, tenantId, continuationToken);

      this.monitoring.trackMetric('api.schemaMigrations.run.duration', Date.now() - startTime);
      return reply.status(200).send(result);
    } catch (error: any) {
      this.monitoring.trackException(error, { operation: 'schemaMigrations.run' });
      return reply.status(500).send({ error: 'Failed to run migration', details: error.message });
    }
  };

  /**
   * POST /api/v1/schema-migrations/:id/cancel
   * Cancel a pending migration
   */
  cancelMigration = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const auth = req.auth;
      if (!auth || !auth.tenantId) {
        reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
        return;
      }
      const { tenantId } = auth;
      if (!tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const migration = await this.migrationService.cancelMigration(id, tenantId);

      this.monitoring.trackMetric('api.schemaMigrations.cancel.duration', Date.now() - startTime);
      return reply.status(200).send(migration);
    } catch (error: any) {
      if (error.message?.includes('Cannot cancel')) {
        return reply.status(400).send({ error: error.message });
      }
      this.monitoring.trackException(error, { operation: 'schemaMigrations.cancel' });
      return reply.status(500).send({ error: 'Failed to cancel migration', details: error.message });
    }
  };

  /**
   * GET /api/v1/schema-migrations/shard-types/:shardTypeId
   * Get all migrations for a ShardType
   */
  getMigrationsForShardType = async (
    req: FastifyRequest<{ Params: { shardTypeId: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const auth = req.auth;
      if (!auth || !auth.tenantId) {
        reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
        return;
      }
      const { tenantId } = auth;
      if (!tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { shardTypeId } = req.params;
      const migrations = await this.migrationService.getMigrationsForShardType(tenantId, shardTypeId);

      this.monitoring.trackMetric('api.schemaMigrations.byShardType.duration', Date.now() - startTime);
      return reply.status(200).send({ migrations, count: migrations.length });
    } catch (error: any) {
      this.monitoring.trackException(error, { operation: 'schemaMigrations.byShardType' });
      return reply.status(500).send({ error: 'Failed to get migrations', details: error.message });
    }
  };

  /**
   * GET /api/v1/schema-migrations/path
   * Get migration path from one version to another
   */
  getMigrationPath = async (
    req: FastifyRequest<{
      Querystring: {
        shardTypeId: string;
        fromVersion: number;
        toVersion: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const auth = req.auth;
      if (!auth || !auth.tenantId) {
        reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
        return;
      }
      const { tenantId } = auth;
      if (!tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { shardTypeId, fromVersion, toVersion } = req.query;

      const migrations = await this.migrationService.getMigrationPath(
        tenantId,
        shardTypeId,
        fromVersion,
        toVersion
      );

      this.monitoring.trackMetric('api.schemaMigrations.path.duration', Date.now() - startTime);
      return reply.status(200).send({ migrations, count: migrations.length });
    } catch (error: any) {
      this.monitoring.trackException(error, { operation: 'schemaMigrations.path' });
      return reply.status(500).send({ error: 'Failed to get migration path', details: error.message });
    }
  };

  /**
   * Get the migration service for external use
   */
  getMigrationService(): SchemaMigrationService {
    return this.migrationService;
  }
}
