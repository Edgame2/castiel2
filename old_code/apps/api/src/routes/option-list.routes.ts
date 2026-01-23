/**
 * Option List Routes
 * 
 * REST API routes for managing reusable option lists.
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { OptionListController } from '../controllers/option-list.controller.js';

/**
 * Register option list routes
 */
export async function optionListRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions & { monitoring: IMonitoringProvider }
): Promise<void> {
  const controller = new OptionListController(options.monitoring);
  await controller.initialize();

  // ============================================================================
  // Collection Routes
  // ============================================================================

  /**
   * POST /api/v1/option-lists
   * Create a new option list
   */
  fastify.post('/', {
    schema: {
      description: 'Create a new option list',
      tags: ['Option Lists'],
      body: {
        type: 'object',
        required: ['name', 'displayName', 'options'],
        properties: {
          name: { type: 'string', description: 'Unique name (lowercase, alphanumeric with hyphens)' },
          displayName: { type: 'string', description: 'Display name for UI' },
          description: { type: 'string', description: 'Description' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              required: ['value', 'label'],
              properties: {
                value: { type: 'string' },
                label: { type: 'string' },
                description: { type: 'string' },
                icon: { type: 'string' },
                color: { type: 'string' },
                disabled: { type: 'boolean' },
                group: { type: 'string' },
              },
            },
          },
          isSystem: { type: 'boolean', description: 'System list (requires SUPER_ADMIN)' },
          allowTenantOverride: { type: 'boolean', description: 'Allow tenants to override' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      response: {
        201: {
          description: 'Option list created',
          type: 'object',
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        409: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: controller.createOptionList,
  });

  /**
   * GET /api/v1/option-lists
   * List option lists
   */
  fastify.get('/', {
    schema: {
      description: 'List option lists for the tenant',
      tags: ['Option Lists'],
      querystring: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          isSystem: { type: 'string', enum: ['true', 'false'] },
          isActive: { type: 'string', enum: ['true', 'false'] },
          tags: { type: 'string', description: 'Comma-separated tags' },
          search: { type: 'string' },
          limit: { type: 'string' },
          orderBy: { type: 'string', enum: ['name', 'displayName', 'createdAt', 'updatedAt'] },
          orderDirection: { type: 'string', enum: ['asc', 'desc'] },
          continuationToken: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            optionLists: { type: 'array' },
            continuationToken: { type: 'string' },
            count: { type: 'number' },
          },
        },
      },
    },
    handler: controller.listOptionLists,
  });

  /**
   * GET /api/v1/option-lists/available
   * Get all available lists for tenant (system + tenant-specific)
   */
  fastify.get('/available', {
    schema: {
      description: 'Get all available option lists for the tenant',
      tags: ['Option Lists'],
      response: {
        200: {
          type: 'object',
          properties: {
            optionLists: { type: 'array' },
            count: { type: 'number' },
          },
        },
      },
    },
    handler: controller.getAvailableLists,
  });

  /**
   * GET /api/v1/option-lists/system
   * Get all system option lists
   */
  fastify.get('/system', {
    schema: {
      description: 'Get all system option lists',
      tags: ['Option Lists'],
      response: {
        200: {
          type: 'object',
          properties: {
            optionLists: { type: 'array' },
            continuationToken: { type: 'string' },
            count: { type: 'number' },
          },
        },
      },
    },
    handler: controller.getSystemLists,
  });

  // ============================================================================
  // By Name Routes
  // ============================================================================

  /**
   * GET /api/v1/option-lists/by-name/:name
   * Get an option list by name
   */
  fastify.get('/by-name/:name', {
    schema: {
      description: 'Get an option list by name',
      tags: ['Option Lists'],
      params: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
        },
      },
      response: {
        200: { type: 'object' },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: controller.getOptionListByName,
  });

  /**
   * GET /api/v1/option-lists/by-name/:name/options
   * Get just the options for a list by name
   */
  fastify.get('/by-name/:name/options', {
    schema: {
      description: 'Get options for a list by name',
      tags: ['Option Lists'],
      params: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          scope: { type: 'string', enum: ['system', 'tenant'], default: 'tenant' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            options: { type: 'array' },
            count: { type: 'number' },
          },
        },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: controller.getOptions,
  });

  /**
   * POST /api/v1/option-lists/system/:name/override
   * Create a tenant override for a system list
   */
  fastify.post('/system/:name/override', {
    schema: {
      description: 'Create a tenant override for a system option list',
      tags: ['Option Lists'],
      params: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['options'],
        properties: {
          options: {
            type: 'array',
            items: {
              type: 'object',
              required: ['value', 'label'],
              properties: {
                value: { type: 'string' },
                label: { type: 'string' },
                description: { type: 'string' },
                icon: { type: 'string' },
                color: { type: 'string' },
                disabled: { type: 'boolean' },
                group: { type: 'string' },
              },
            },
          },
        },
      },
      response: {
        201: { type: 'object' },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: controller.createTenantOverride,
  });

  // ============================================================================
  // Individual Resource Routes
  // ============================================================================

  /**
   * GET /api/v1/option-lists/:id
   * Get an option list by ID
   */
  fastify.get('/:id', {
    schema: {
      description: 'Get an option list by ID',
      tags: ['Option Lists'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: { type: 'object' },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: controller.getOptionList,
  });

  /**
   * PATCH /api/v1/option-lists/:id
   * Update an option list
   */
  fastify.patch('/:id', {
    schema: {
      description: 'Update an option list',
      tags: ['Option Lists'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          displayName: { type: 'string' },
          description: { type: 'string' },
          options: { type: 'array' },
          allowTenantOverride: { type: 'boolean' },
          isActive: { type: 'boolean' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      response: {
        200: { type: 'object' },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: controller.updateOptionList,
  });

  /**
   * DELETE /api/v1/option-lists/:id
   * Delete an option list
   */
  fastify.delete('/:id', {
    schema: {
      description: 'Delete an option list',
      tags: ['Option Lists'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        204: { type: 'null' },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: controller.deleteOptionList,
  });

  /**
   * POST /api/v1/option-lists/:id/options
   * Add options to an existing list
   */
  fastify.post('/:id/options', {
    schema: {
      description: 'Add options to an existing option list',
      tags: ['Option Lists'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['options'],
        properties: {
          options: {
            type: 'array',
            items: {
              type: 'object',
              required: ['value', 'label'],
              properties: {
                value: { type: 'string' },
                label: { type: 'string' },
                description: { type: 'string' },
                icon: { type: 'string' },
                color: { type: 'string' },
                disabled: { type: 'boolean' },
                group: { type: 'string' },
              },
            },
          },
        },
      },
      response: {
        200: { type: 'object' },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: controller.addOptions,
  });

  /**
   * DELETE /api/v1/option-lists/:id/options
   * Remove options from an existing list
   */
  fastify.delete('/:id/options', {
    schema: {
      description: 'Remove options from an existing option list',
      tags: ['Option Lists'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['values'],
        properties: {
          values: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of option values to remove',
          },
        },
      },
      response: {
        200: { type: 'object' },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: controller.removeOptions,
  });
}

export default optionListRoutes;











