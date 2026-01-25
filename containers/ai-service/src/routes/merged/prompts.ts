/**
 * Route Registration
 * Prompt Service routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { PromptService } from '../../services/PromptService';
import { ABTestService } from '../../services/ABTestService';
import {
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
  RenderPromptInput,
  CreatePromptABTestInput,
  PromptStatus,
  PromptABTestStatus,
} from '../../types/prompt.types';

export async function registerPromptsRoutes(app: FastifyInstance, config: any): Promise<void> {
  const promptService = new PromptService();
  const abTestService = new ABTestService();

  // ===== PROMPT TEMPLATE ROUTES =====

  /**
   * Create prompt template
   * POST /api/v1/prompts
   */
  app.post<{ Body: Omit<CreatePromptTemplateInput, 'tenantId' | 'userId'> }>(
    '/api/v1/prompts',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new prompt template',
        tags: ['Prompts'],
        body: {
          type: 'object',
          required: ['slug', 'name', 'content'],
          properties: {
            slug: { type: 'string', minLength: 1 },
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            category: { type: 'string' },
            content: { type: 'string', minLength: 1 },
            variables: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string', enum: ['string', 'number', 'boolean', 'object', 'array'] },
                  required: { type: 'boolean' },
                  defaultValue: { type: ['string', 'number', 'boolean', 'object', 'array'] },
                  description: { type: 'string' },
                },
              },
            },
            organizationId: { type: 'string', format: 'uuid' },
            tags: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Prompt template created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreatePromptTemplateInput = {
        ...request.body,
        tenantId,
        userId,
      };

      const prompt = await promptService.create(input);
      reply.code(201).send(prompt);
    }
  );

  /**
   * Get prompt template by ID
   * GET /api/v1/prompts/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/prompts/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get prompt template by ID',
        tags: ['Prompts'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Prompt template details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const prompt = await promptService.getById(request.params.id, tenantId);
      reply.send(prompt);
    }
  );

  /**
   * Get prompt template by slug
   * GET /api/v1/prompts/slug/:slug
   */
  app.get<{ Params: { slug: string }; Querystring: { organizationId?: string } }>(
    '/api/v1/prompts/slug/:slug',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get prompt template by slug',
        tags: ['Prompts'],
        params: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            organizationId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Prompt template details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const prompt = await promptService.getBySlug(tenantId, request.params.slug, request.query.organizationId);
      reply.send(prompt);
    }
  );

  /**
   * Update prompt template
   * PUT /api/v1/prompts/:id
   */
  app.put<{ Params: { id: string }; Body: UpdatePromptTemplateInput }>(
    '/api/v1/prompts/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update prompt template',
        tags: ['Prompts'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            content: { type: 'string' },
            variables: { type: 'array' },
            status: { type: 'string', enum: ['draft', 'active', 'archived', 'deprecated'] },
            tags: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Prompt template updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const prompt = await promptService.update(request.params.id, tenantId, userId, request.body);
      reply.send(prompt);
    }
  );

  /**
   * Delete prompt template
   * DELETE /api/v1/prompts/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/prompts/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete prompt template',
        tags: ['Prompts'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Prompt template deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await promptService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List prompt templates
   * GET /api/v1/prompts
   */
  app.get<{
    Querystring: {
      category?: string;
      status?: string;
      organizationId?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/prompts',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List prompt templates',
        tags: ['Prompts'],
        querystring: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'active', 'archived', 'deprecated'] },
            organizationId: { type: 'string', format: 'uuid' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of prompt templates',
            properties: {
              items: { type: 'array' },
              continuationToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await promptService.list(tenantId, {
        category: request.query.category,
        status: request.query.status as any,
        organizationId: request.query.organizationId,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  /**
   * Render prompt
   * POST /api/v1/prompts/render
   */
  app.post<{ Body: Omit<RenderPromptInput, 'tenantId'> }>(
    '/api/v1/prompts/render',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Render prompt with variables',
        tags: ['Prompts'],
        body: {
          type: 'object',
          required: ['slug', 'variables'],
          properties: {
            slug: { type: 'string' },
            variables: { type: 'object', additionalProperties: true },
            organizationId: { type: 'string', format: 'uuid' },
            version: { type: 'number' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Rendered prompt',
            properties: {
              rendered: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const input: RenderPromptInput = {
        ...request.body,
        tenantId,
      };

      const rendered = await promptService.render(input);
      reply.send({ rendered });
    }
  );

  /**
   * Get prompt versions
   * GET /api/v1/prompts/:id/versions
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/prompts/:id/versions',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get all versions of a prompt template',
        tags: ['Prompts'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of prompt versions',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const versions = await promptService.getVersions(tenantId, request.params.id);
      reply.send(versions);
    }
  );

  // ===== A/B TEST ROUTES =====

  /**
   * Create A/B test
   * POST /api/v1/prompts/ab-tests
   */
  app.post<{ Body: Omit<CreatePromptABTestInput, 'tenantId' | 'userId'> }>(
    '/api/v1/prompts/ab-tests',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new A/B test',
        tags: ['A/B Tests'],
        body: {
          type: 'object',
          required: ['name', 'variants', 'primaryMetric'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            hypothesis: { type: 'string' },
            promptSlug: { type: 'string' },
            variants: {
              type: 'array',
              items: {
                type: 'object',
                required: ['variantId', 'promptId', 'promptSlug', 'name', 'trafficPercentage'],
                properties: {
                  variantId: { type: 'string' },
                  promptId: { type: 'string', format: 'uuid' },
                  promptSlug: { type: 'string' },
                  name: { type: 'string' },
                  trafficPercentage: { type: 'number', minimum: 0, maximum: 100 },
                  description: { type: 'string' },
                },
              },
            },
            primaryMetric: { type: 'string', enum: ['quality', 'latency', 'satisfaction', 'cost', 'success_rate'] },
            successCriteria: { type: 'object' },
            targeting: { type: 'object' },
            minDuration: { type: 'number' },
            minSamplesPerVariant: { type: 'number' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'A/B test created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreatePromptABTestInput = {
        ...request.body,
        tenantId,
        userId,
      };

      const abTest = await abTestService.create(input);
      reply.code(201).send(abTest);
    }
  );

  /**
   * Get A/B test by ID
   * GET /api/v1/prompts/ab-tests/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/prompts/ab-tests/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get A/B test by ID',
        tags: ['A/B Tests'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'A/B test details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const abTest = await abTestService.getById(request.params.id, tenantId);
      reply.send(abTest);
    }
  );

  /**
   * Update A/B test
   * PUT /api/v1/prompts/ab-tests/:id
   */
  app.put<{ Params: { id: string }; Body: { status?: string; startDate?: string; endDate?: string; results?: any } }>(
    '/api/v1/prompts/ab-tests/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update A/B test',
        tags: ['A/B Tests'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['draft', 'active', 'paused', 'completed', 'cancelled'] },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            results: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'A/B test updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const abTest = await abTestService.update(request.params.id, tenantId, {
        status: request.body.status as any,
        startDate: request.body.startDate ? new Date(request.body.startDate) : undefined,
        endDate: request.body.endDate ? new Date(request.body.endDate) : undefined,
        results: request.body.results,
      });
      reply.send(abTest);
    }
  );

  /**
   * Select variant for A/B test
   * POST /api/v1/prompts/ab-tests/:id/select-variant
   */
  app.post<{ Params: { id: string } }>(
    '/api/v1/prompts/ab-tests/:id/select-variant',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Select variant for A/B test (consistent hashing)',
        tags: ['A/B Tests'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Selected variant',
            properties: {
              variantId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const variantId = await abTestService.selectVariant(request.params.id, tenantId, userId);
      reply.send({ variantId });
    }
  );

  /**
   * Record variant usage
   * POST /api/v1/prompts/ab-tests/:id/record-usage
   */
  app.post<{
    Params: { id: string };
    Body: {
      variantId: string;
      success: boolean;
      tokens?: number;
      latencyMs?: number;
      cost?: number;
      feedbackScore?: number;
      positiveFeedback?: boolean;
      negativeFeedback?: boolean;
    };
  }>(
    '/api/v1/prompts/ab-tests/:id/record-usage',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Record variant usage metrics',
        tags: ['A/B Tests'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['variantId', 'success'],
          properties: {
            variantId: { type: 'string' },
            success: { type: 'boolean' },
            tokens: { type: 'number' },
            latencyMs: { type: 'number' },
            cost: { type: 'number' },
            feedbackScore: { type: 'number', minimum: 0, maximum: 5 },
            positiveFeedback: { type: 'boolean' },
            negativeFeedback: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Usage recorded successfully',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      await abTestService.recordUsage(request.params.id, tenantId, request.body.variantId, request.body);
      reply.send({ success: true });
    }
  );

  /**
   * List A/B tests
   * GET /api/v1/prompts/ab-tests
   */
  app.get<{
    Querystring: {
      status?: string;
      promptSlug?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/prompts/ab-tests',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List A/B tests',
        tags: ['A/B Tests'],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['draft', 'active', 'paused', 'completed', 'cancelled'] },
            promptSlug: { type: 'string' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of A/B tests',
            properties: {
              items: { type: 'array' },
              continuationToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await abTestService.list(tenantId, {
        status: request.query.status as any,
        promptSlug: request.query.promptSlug,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );
}
