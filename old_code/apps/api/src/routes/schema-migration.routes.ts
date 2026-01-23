import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { SchemaMigrationController } from '../controllers/schema-migration.controller.js';
import {
  ShardRepository,
  ShardTypeRepository,
} from '@castiel/api-core';
import { ShardCacheService } from '../services/shard-cache.service.js';
import { MigrationStatus, MigrationStrategy } from '../types/schema-migration.types.js';

interface SchemaMigrationRoutesOptions extends FastifyPluginOptions {
  monitoring: IMonitoringProvider;
  shardRepository: ShardRepository;
  shardTypeRepository: ShardTypeRepository;
}

/**
 * Register schema migration routes
 */
export async function schemaMigrationRoutes(
  server: FastifyInstance,
  options: SchemaMigrationRoutesOptions
): Promise<void> {
  const { monitoring, shardRepository, shardTypeRepository } = options;
  const controller = new SchemaMigrationController(monitoring, shardRepository, shardTypeRepository);

  await controller.initialize();

  // List migrations
  server.route({
    method: 'GET',
    url: '/',
    schema: {
      tags: ['Schema Migrations'],
      summary: 'List schema migrations',
      querystring: {
        type: 'object',
        properties: {
          shardTypeId: { type: 'string' },
          status: { type: 'string', enum: Object.values(MigrationStatus) },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          continuationToken: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            migrations: { type: 'array', items: { type: 'object' } },
            continuationToken: { type: 'string' },
            count: { type: 'integer' },
          },
        },
      },
    },
    handler: controller.listMigrations,
  });

  // Get migration by ID
  server.route({
    method: 'GET',
    url: '/:id',
    schema: {
      tags: ['Schema Migrations'],
      summary: 'Get migration by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        200: { type: 'object' },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: controller.getMigration,
  });

  // Preview schema changes
  server.route({
    method: 'POST',
    url: '/preview',
    schema: {
      tags: ['Schema Migrations'],
      summary: 'Preview schema changes without creating migration',
      body: {
        type: 'object',
        required: ['shardTypeId', 'newSchema'],
        properties: {
          shardTypeId: { type: 'string' },
          newSchema: { type: 'object' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            currentVersion: { type: 'integer' },
            nextVersion: { type: 'integer' },
            diff: { type: 'object' },
            compatibility: { type: 'object' },
            shardType: { type: 'object' },
          },
        },
      },
    },
    handler: controller.previewSchemaChanges,
  });

  // Create migration
  server.route({
    method: 'POST',
    url: '/',
    schema: {
      tags: ['Schema Migrations'],
      summary: 'Create a new schema migration',
      body: {
        type: 'object',
        required: ['shardTypeId', 'newSchema'],
        properties: {
          shardTypeId: { type: 'string' },
          newSchema: { type: 'object' },
          strategy: { type: 'string', enum: Object.values(MigrationStrategy) },
          fieldMappings: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
          defaultValues: {
            type: 'object',
            additionalProperties: {},
          },
        },
      },
      response: {
        201: { type: 'object' },
      },
    },
    handler: controller.createMigration,
  });

  // Run migration
  server.route({
    method: 'POST',
    url: '/:id/run',
    schema: {
      tags: ['Schema Migrations'],
      summary: 'Run an eager migration (process all Shards)',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      querystring: {
        type: 'object',
        properties: {
          continuationToken: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            migrationId: { type: 'string' },
            processed: { type: 'integer' },
            succeeded: { type: 'integer' },
            failed: { type: 'integer' },
            results: { type: 'array', items: { type: 'object' } },
            continuationToken: { type: 'string' },
            hasMore: { type: 'boolean' },
          },
        },
      },
    },
    handler: controller.runMigration,
  });

  // Cancel migration
  server.route({
    method: 'POST',
    url: '/:id/cancel',
    schema: {
      tags: ['Schema Migrations'],
      summary: 'Cancel a pending migration',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        200: { type: 'object' },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: controller.cancelMigration,
  });

  // Get migrations for a ShardType
  server.route({
    method: 'GET',
    url: '/shard-types/:shardTypeId',
    schema: {
      tags: ['Schema Migrations'],
      summary: 'Get all migrations for a ShardType',
      params: {
        type: 'object',
        properties: {
          shardTypeId: { type: 'string' },
        },
        required: ['shardTypeId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            migrations: { type: 'array', items: { type: 'object' } },
            count: { type: 'integer' },
          },
        },
      },
    },
    handler: controller.getMigrationsForShardType,
  });

  // Get migration path
  server.route({
    method: 'GET',
    url: '/path',
    schema: {
      tags: ['Schema Migrations'],
      summary: 'Get migration path between versions',
      querystring: {
        type: 'object',
        required: ['shardTypeId', 'fromVersion', 'toVersion'],
        properties: {
          shardTypeId: { type: 'string' },
          fromVersion: { type: 'integer' },
          toVersion: { type: 'integer' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            migrations: { type: 'array', items: { type: 'object' } },
            count: { type: 'integer' },
          },
        },
      },
    },
    handler: controller.getMigrationPath,
  });
}
