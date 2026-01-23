/**
 * Conversion Schema Routes
 * Registers all conversion schema-related API routes
 */

import type { FastifyInstance } from 'fastify';
import { ConversionSchemaController } from '../controllers/conversion-schema.controller.js';
import { ConversionSchemaService, ConversionSchemaRepository } from '@castiel/api-core';
import { requireAuth } from '../middleware/authorization.js';
import { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import { config } from '../config/env.js';

export async function registerConversionSchemaRoutes(server: FastifyInstance): Promise<void> {
  const monitoring = (server as any).monitoring as IMonitoringProvider | undefined;
  const cosmosClient = (server as any).cosmosClient || (server as any).cosmosDbClient;

  if (!monitoring) {
    server.log.warn('⚠️  Conversion schema routes not registered - monitoring not available');
    return;
  }

  if (!cosmosClient) {
    server.log.warn('⚠️  Conversion schema routes not registered - Cosmos DB client not available');
    return;
  }

  if (!(server as any).authenticate) {
    server.log.warn('⚠️  Conversion schema routes not registered - authentication decorator missing');
    return;
  }

  try {
    // Initialize repository
    const databaseId = config.cosmosDb.databaseId;
    const containerId = config.cosmosDb.containers.conversionSchemas;
    const container = await ConversionSchemaRepository.ensureContainer(
      cosmosClient,
      databaseId,
      containerId
    );
    const repository = new ConversionSchemaRepository(cosmosClient, databaseId, containerId);

    // Initialize service
    const service = new ConversionSchemaService(repository, monitoring);

    // Initialize controller
    const controller = new ConversionSchemaController(service, monitoring);

    // ============================================================================
    // Conversion Schema Routes
    // ============================================================================

    // POST /api/v1/integrations/:integrationId/conversion-schemas
    server.post(
      '/api/v1/integrations/:integrationId/conversion-schemas',
      {
        schema: {
          description: 'Create a new conversion schema',
          tags: ['Integrations', 'Conversion Schemas'],
          params: {
            type: 'object',
            required: ['integrationId'],
            properties: {
              integrationId: { type: 'string', description: 'Integration ID' },
            },
          },
          body: {
            type: 'object',
            required: ['name', 'source', 'target', 'fieldMappings'],
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              source: {
                type: 'object',
                required: ['entity'],
                properties: {
                  entity: { type: 'string' },
                  filters: { type: 'array' },
                },
              },
              target: {
                type: 'object',
                required: ['shardTypeId'],
                properties: {
                  shardTypeId: { type: 'string' },
                  createIfMissing: { type: 'boolean' },
                  updateIfExists: { type: 'boolean' },
                  deleteIfRemoved: { type: 'boolean' },
                },
              },
              fieldMappings: { type: 'array' },
              relationshipMappings: { type: 'array' },
              preserveRelationships: { type: 'boolean' },
              deduplication: {
                type: 'object',
                required: ['strategy'],
                properties: {
                  strategy: { type: 'string', enum: ['external_id', 'field_match', 'composite'] },
                  externalIdField: { type: 'string' },
                  matchFields: { type: 'array', items: { type: 'string' } },
                  compositeFields: { type: 'array', items: { type: 'string' } },
                },
              },
              isActive: { type: 'boolean' },
            },
          },
          response: {
            201: {
              description: 'Conversion schema created',
              type: 'object',
            },
            401: {
              description: 'Unauthorized',
              type: 'object',
            },
            500: {
              description: 'Internal server error',
              type: 'object',
            },
          },
        },
        onRequest: [
          (server as any).authenticate,
          requireAuth(),
        ],
      },
      (request, reply) => controller.create(request, reply)
    );

    // GET /api/v1/integrations/:integrationId/conversion-schemas
    server.get(
      '/api/v1/integrations/:integrationId/conversion-schemas',
      {
        schema: {
          description: 'List conversion schemas for an integration',
          tags: ['Integrations', 'Conversion Schemas'],
          params: {
            type: 'object',
            required: ['integrationId'],
            properties: {
              integrationId: { type: 'string', description: 'Integration ID' },
            },
          },
          querystring: {
            type: 'object',
            properties: {
              limit: { type: 'number', minimum: 1, maximum: 100 },
              offset: { type: 'number', minimum: 0 },
              isActive: { type: 'boolean' },
            },
          },
          response: {
            200: {
              description: 'List of conversion schemas',
              type: 'object',
            },
            401: {
              description: 'Unauthorized',
              type: 'object',
            },
            500: {
              description: 'Internal server error',
              type: 'object',
            },
          },
        },
        onRequest: [
          (server as any).authenticate,
          requireAuth(),
        ],
      },
      (request, reply) => controller.list(request, reply)
    );

    // GET /api/v1/integrations/:integrationId/conversion-schemas/:schemaId
    server.get(
      '/api/v1/integrations/:integrationId/conversion-schemas/:schemaId',
      {
        schema: {
          description: 'Get a specific conversion schema',
          tags: ['Integrations', 'Conversion Schemas'],
          params: {
            type: 'object',
            required: ['integrationId', 'schemaId'],
            properties: {
              integrationId: { type: 'string', description: 'Integration ID' },
              schemaId: { type: 'string', description: 'Conversion schema ID' },
            },
          },
          response: {
            200: {
              description: 'Conversion schema',
              type: 'object',
            },
            404: {
              description: 'Conversion schema not found',
              type: 'object',
            },
            401: {
              description: 'Unauthorized',
              type: 'object',
            },
            500: {
              description: 'Internal server error',
              type: 'object',
            },
          },
        },
        onRequest: [
          (server as any).authenticate,
          requireAuth(),
        ],
      },
      (request, reply) => controller.get(request, reply)
    );

    // PATCH /api/v1/integrations/:integrationId/conversion-schemas/:schemaId
    server.patch(
      '/api/v1/integrations/:integrationId/conversion-schemas/:schemaId',
      {
        schema: {
          description: 'Update a conversion schema',
          tags: ['Integrations', 'Conversion Schemas'],
          params: {
            type: 'object',
            required: ['integrationId', 'schemaId'],
            properties: {
              integrationId: { type: 'string', description: 'Integration ID' },
              schemaId: { type: 'string', description: 'Conversion schema ID' },
            },
          },
          body: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              source: { type: 'object' },
              target: { type: 'object' },
              fieldMappings: { type: 'array' },
              relationshipMappings: { type: 'array' },
              preserveRelationships: { type: 'boolean' },
              deduplication: { type: 'object' },
              isActive: { type: 'boolean' },
            },
          },
          response: {
            200: {
              description: 'Updated conversion schema',
              type: 'object',
            },
            404: {
              description: 'Conversion schema not found',
              type: 'object',
            },
            401: {
              description: 'Unauthorized',
              type: 'object',
            },
            500: {
              description: 'Internal server error',
              type: 'object',
            },
          },
        },
        onRequest: [
          (server as any).authenticate,
          requireAuth(),
        ],
      },
      (request, reply) => controller.update(request, reply)
    );

    // DELETE /api/v1/integrations/:integrationId/conversion-schemas/:schemaId
    server.delete(
      '/api/v1/integrations/:integrationId/conversion-schemas/:schemaId',
      {
        schema: {
          description: 'Delete a conversion schema',
          tags: ['Integrations', 'Conversion Schemas'],
          params: {
            type: 'object',
            required: ['integrationId', 'schemaId'],
            properties: {
              integrationId: { type: 'string', description: 'Integration ID' },
              schemaId: { type: 'string', description: 'Conversion schema ID' },
            },
          },
          response: {
            204: {
              description: 'Conversion schema deleted',
            },
            404: {
              description: 'Conversion schema not found',
              type: 'object',
            },
            401: {
              description: 'Unauthorized',
              type: 'object',
            },
            500: {
              description: 'Internal server error',
              type: 'object',
            },
          },
        },
        onRequest: [
          (server as any).authenticate,
          requireAuth(),
        ],
      },
      (request, reply) => controller.delete(request, reply)
    );

    // POST /api/v1/integrations/:integrationId/conversion-schemas/:schemaId/test
    server.post(
      '/api/v1/integrations/:integrationId/conversion-schemas/:schemaId/test',
      {
        schema: {
          description: 'Test a conversion schema with sample data',
          tags: ['Integrations', 'Conversion Schemas'],
          params: {
            type: 'object',
            required: ['integrationId', 'schemaId'],
            properties: {
              integrationId: { type: 'string', description: 'Integration ID' },
              schemaId: { type: 'string', description: 'Conversion schema ID' },
            },
          },
          body: {
            type: 'object',
            required: ['sampleData'],
            properties: {
              sampleData: { type: 'object' },
            },
          },
          response: {
            200: {
              description: 'Test result',
              type: 'object',
            },
            401: {
              description: 'Unauthorized',
              type: 'object',
            },
            500: {
              description: 'Internal server error',
              type: 'object',
            },
          },
        },
        onRequest: [
          (server as any).authenticate,
          requireAuth(),
        ],
      },
      (request, reply) => controller.test(request, reply)
    );

    server.log.info('✅ Conversion schema routes registered');
  } catch (error) {
    server.log.warn({ err: error }, '⚠️  Conversion schema routes not registered');
  }
}
