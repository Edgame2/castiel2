import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { WebhookController } from '../controllers/webhook.controller.js';
import { WebhookDeliveryService } from '../services/webhook-delivery.service.js';
import { ShardEventType } from '../types/shard-event.types.js';
import { DocumentAuditEventType } from '../types/document-audit.types.js';

// JSON Schema for webhook creation
const createWebhookSchema = {
  type: 'object',
  required: ['name', 'url', 'events'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
    url: { type: 'string', format: 'uri' },
    method: { type: 'string', enum: ['POST', 'PUT'], default: 'POST' },
    headers: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
    events: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'string',
        enum: [
          ...Object.values(ShardEventType),
          ...Object.values(DocumentAuditEventType),
        ],
      },
    },
    filters: {
      type: 'object',
      properties: {
        shardTypeIds: { type: 'array', items: { type: 'string' } },
        status: { type: 'array', items: { type: 'string' } },
      },
    },
    retryCount: { type: 'integer', minimum: 0, maximum: 10, default: 3 },
    retryDelayMs: { type: 'integer', minimum: 100, maximum: 60000, default: 1000 },
    timeoutMs: { type: 'integer', minimum: 1000, maximum: 60000, default: 30000 },
  },
};

// JSON Schema for webhook update
const updateWebhookSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
    url: { type: 'string', format: 'uri' },
    method: { type: 'string', enum: ['POST', 'PUT'] },
    headers: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
    events: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'string',
        enum: [
          ...Object.values(ShardEventType),
          ...Object.values(DocumentAuditEventType),
        ],
      },
    },
    filters: {
      type: 'object',
      properties: {
        shardTypeIds: { type: 'array', items: { type: 'string' } },
        status: { type: 'array', items: { type: 'string' } },
      },
    },
    retryCount: { type: 'integer', minimum: 0, maximum: 10 },
    retryDelayMs: { type: 'integer', minimum: 100, maximum: 60000 },
    timeoutMs: { type: 'integer', minimum: 1000, maximum: 60000 },
    isActive: { type: 'boolean' },
  },
};

interface WebhookRoutesOptions extends FastifyPluginOptions {
  monitoring: IMonitoringProvider;
  deliveryService: WebhookDeliveryService;
}

/**
 * Register webhook routes
 */
export async function webhookRoutes(
  server: FastifyInstance,
  options: WebhookRoutesOptions
): Promise<void> {
  const { monitoring, deliveryService } = options;
  const controller = new WebhookController(monitoring, deliveryService);

  // Create webhook
  server.route({
    method: 'POST',
    url: '/',
    schema: {
      tags: ['Webhooks'],
      summary: 'Create a new webhook',
      body: createWebhookSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            tenantId: { type: 'string' },
            name: { type: 'string' },
            url: { type: 'string' },
            events: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean' },
            secretMasked: { type: 'string' },
            createdAt: { type: 'string' },
          },
        },
      },
    },
    handler: controller.createWebhook,
  });

  // List webhooks
  server.route({
    method: 'GET',
    url: '/',
    schema: {
      tags: ['Webhooks'],
      summary: 'List webhooks',
      querystring: {
        type: 'object',
        properties: {
          isActive: { type: 'boolean' },
          eventType: {
            type: 'string',
            enum: [
              ...Object.values(ShardEventType),
              ...Object.values(DocumentAuditEventType),
            ],
          },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          continuationToken: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            webhooks: { type: 'array', items: { type: 'object' } },
            continuationToken: { type: 'string' },
            count: { type: 'integer' },
          },
        },
      },
    },
    handler: controller.listWebhooks,
  });

  // Get webhook by ID
  server.route({
    method: 'GET',
    url: '/:id',
    schema: {
      tags: ['Webhooks'],
      summary: 'Get webhook by ID',
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
    handler: controller.getWebhook,
  });

  // Update webhook
  server.route({
    method: 'PATCH',
    url: '/:id',
    schema: {
      tags: ['Webhooks'],
      summary: 'Update webhook',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: updateWebhookSchema,
      response: {
        200: { type: 'object' },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: controller.updateWebhook,
  });

  // Delete webhook
  server.route({
    method: 'DELETE',
    url: '/:id',
    schema: {
      tags: ['Webhooks'],
      summary: 'Delete webhook',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        204: { type: 'null' },
      },
    },
    handler: controller.deleteWebhook,
  });

  // Regenerate webhook secret
  server.route({
    method: 'POST',
    url: '/:id/regenerate-secret',
    schema: {
      tags: ['Webhooks'],
      summary: 'Regenerate webhook secret',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: { secret: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: controller.regenerateSecret,
  });

  // Test webhook
  server.route({
    method: 'POST',
    url: '/:id/test',
    schema: {
      tags: ['Webhooks'],
      summary: 'Send a test event to webhook',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            delivery: { type: 'object' },
          },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: controller.testWebhook,
  });

  // Get webhook statistics
  server.route({
    method: 'GET',
    url: '/:id/stats',
    schema: {
      tags: ['Webhooks'],
      summary: 'Get webhook delivery statistics',
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
          since: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            success: { type: 'integer' },
            failed: { type: 'integer' },
            pending: { type: 'integer' },
            retrying: { type: 'integer' },
            avgResponseTime: { type: 'number' },
          },
        },
      },
    },
    handler: controller.getWebhookStats,
  });

  // List webhook deliveries
  server.route({
    method: 'GET',
    url: '/:id/deliveries',
    schema: {
      tags: ['Webhooks'],
      summary: 'List webhook deliveries',
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
          status: { type: 'string', enum: ['pending', 'success', 'failed', 'retrying'] },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          continuationToken: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            deliveries: { type: 'array', items: { type: 'object' } },
            continuationToken: { type: 'string' },
            count: { type: 'integer' },
          },
        },
      },
    },
    handler: controller.listDeliveries,
  });

  // Get delivery by ID
  server.route({
    method: 'GET',
    url: '/deliveries/:deliveryId',
    schema: {
      tags: ['Webhooks'],
      summary: 'Get delivery by ID',
      params: {
        type: 'object',
        properties: {
          deliveryId: { type: 'string', format: 'uuid' },
        },
        required: ['deliveryId'],
      },
      response: {
        200: { type: 'object' },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: controller.getDelivery,
  });

  // Retry failed delivery
  server.route({
    method: 'POST',
    url: '/deliveries/:deliveryId/retry',
    schema: {
      tags: ['Webhooks'],
      summary: 'Retry a failed delivery',
      params: {
        type: 'object',
        properties: {
          deliveryId: { type: 'string', format: 'uuid' },
        },
        required: ['deliveryId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            delivery: { type: 'object' },
          },
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: controller.retryDelivery,
  });
}
