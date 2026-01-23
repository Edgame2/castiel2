/**
 * Route Registration
 * Pipeline Manager routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { OpportunityService } from '../services/OpportunityService';
import { PipelineViewService } from '../services/PipelineViewService';
import { PipelineAnalyticsService } from '../services/PipelineAnalyticsService';
import {
  CreateOpportunityInput,
  UpdateOpportunityInput,
  CreatePipelineViewInput,
  UpdatePipelineViewInput,
  SalesStage,
  OpportunityStatus,
} from '../types/pipeline.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const opportunityService = new OpportunityService(config.services.shard_manager.url);
  const pipelineViewService = new PipelineViewService();
  const pipelineAnalyticsService = new PipelineAnalyticsService(opportunityService);

  // ===== OPPORTUNITY ROUTES =====

  /**
   * Create opportunity
   * POST /api/v1/opportunities
   */
  app.post<{ Body: CreateOpportunityInput }>(
    '/api/v1/opportunities',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new opportunity',
        tags: ['Opportunities'],
        body: {
          type: 'object',
          required: ['name', 'stage', 'ownerId'],
          properties: {
            name: { type: 'string' },
            opportunityNumber: { type: 'string' },
            type: { type: 'string', enum: ['new_business', 'existing_business', 'renewal', 'upsell', 'cross_sell', 'expansion', 'other'] },
            stage: { type: 'string', enum: ['prospecting', 'qualification', 'needs_analysis', 'value_proposition', 'id_decision_makers', 'perception_analysis', 'proposal_price_quote', 'negotiation_review', 'closed_won', 'closed_lost'] },
            status: { type: 'string', enum: ['open', 'won', 'lost'] },
            amount: { type: 'number' },
            currency: { type: 'string' },
            probability: { type: 'number', minimum: 0, maximum: 100 },
            closeDate: { type: 'string', format: 'date-time' },
            nextStepDate: { type: 'string', format: 'date-time' },
            accountId: { type: 'string', format: 'uuid' },
            accountName: { type: 'string' },
            contactId: { type: 'string', format: 'uuid' },
            contactName: { type: 'string' },
            ownerId: { type: 'string', format: 'uuid' },
            ownerName: { type: 'string' },
            description: { type: 'string' },
            nextStep: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            rating: { type: 'string', enum: ['hot', 'warm', 'cold'] },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Opportunity created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateOpportunityInput = {
        ...request.body,
        tenantId,
        userId,
      };

      const opportunity = await opportunityService.create(input);
      reply.code(201).send(opportunity);
    }
  );

  /**
   * Get opportunity by ID
   * GET /api/v1/opportunities/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/opportunities/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get opportunity by ID',
        tags: ['Opportunities'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Opportunity details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const opportunity = await opportunityService.getById(request.params.id, tenantId);
      reply.send(opportunity);
    }
  );

  /**
   * Update opportunity
   * PUT /api/v1/opportunities/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateOpportunityInput }>(
    '/api/v1/opportunities/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update opportunity',
        tags: ['Opportunities'],
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
            type: { type: 'string', enum: ['new_business', 'existing_business', 'renewal', 'upsell', 'cross_sell', 'expansion', 'other'] },
            stage: { type: 'string', enum: ['prospecting', 'qualification', 'needs_analysis', 'value_proposition', 'id_decision_makers', 'perception_analysis', 'proposal_price_quote', 'negotiation_review', 'closed_won', 'closed_lost'] },
            status: { type: 'string', enum: ['open', 'won', 'lost'] },
            amount: { type: 'number' },
            currency: { type: 'string' },
            probability: { type: 'number', minimum: 0, maximum: 100 },
            closeDate: { type: 'string', format: 'date-time' },
            description: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            rating: { type: 'string', enum: ['hot', 'warm', 'cold'] },
            lostReason: { type: 'string', enum: ['price', 'competition', 'no_decision', 'other'] },
            lostReasonDetail: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Opportunity updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const opportunity = await opportunityService.update(request.params.id, tenantId, request.body);
      reply.send(opportunity);
    }
  );

  /**
   * Delete opportunity
   * DELETE /api/v1/opportunities/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/opportunities/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete opportunity',
        tags: ['Opportunities'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Opportunity deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await opportunityService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List opportunities
   * GET /api/v1/opportunities
   */
  app.get<{
    Querystring: {
      stage?: string;
      status?: string;
      ownerId?: string;
      accountId?: string;
      type?: string;
      tags?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/opportunities',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List opportunities with filtering',
        tags: ['Opportunities'],
        querystring: {
          type: 'object',
          properties: {
            stage: { type: 'string', enum: ['prospecting', 'qualification', 'needs_analysis', 'value_proposition', 'id_decision_makers', 'perception_analysis', 'proposal_price_quote', 'negotiation_review', 'closed_won', 'closed_lost'] },
            status: { type: 'string', enum: ['open', 'won', 'lost'] },
            ownerId: { type: 'string', format: 'uuid' },
            accountId: { type: 'string', format: 'uuid' },
            type: { type: 'string' },
            tags: { type: 'string' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of opportunities',
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
      const tags = request.query.tags ? request.query.tags.split(',') : undefined;
      const result = await opportunityService.list(tenantId, {
        stage: request.query.stage as any,
        status: request.query.status as any,
        ownerId: request.query.ownerId,
        accountId: request.query.accountId,
        type: request.query.type,
        tags,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== PIPELINE VIEW ROUTES =====

  /**
   * Create pipeline view
   * POST /api/v1/pipelines/views
   */
  app.post<{ Body: CreatePipelineViewInput }>(
    '/api/v1/pipelines/views',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create pipeline view',
        tags: ['Pipeline Views'],
        body: {
          type: 'object',
          required: ['name', 'stages'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            stages: { type: 'array', items: { type: 'object' } },
            filters: { type: 'object' },
            isDefault: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Pipeline view created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreatePipelineViewInput = {
        ...request.body,
        tenantId,
        userId,
      };

      const view = await pipelineViewService.create(input);
      reply.code(201).send(view);
    }
  );

  /**
   * Get pipeline view by ID
   * GET /api/v1/pipelines/views/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/pipelines/views/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get pipeline view by ID',
        tags: ['Pipeline Views'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Pipeline view details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const view = await pipelineViewService.getById(request.params.id, tenantId);
      reply.send(view);
    }
  );

  /**
   * Update pipeline view
   * PUT /api/v1/pipelines/views/:id
   */
  app.put<{ Params: { id: string }; Body: UpdatePipelineViewInput }>(
    '/api/v1/pipelines/views/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update pipeline view',
        tags: ['Pipeline Views'],
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
            stages: { type: 'array', items: { type: 'object' } },
            filters: { type: 'object' },
            isDefault: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Pipeline view updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const view = await pipelineViewService.update(request.params.id, tenantId, request.body);
      reply.send(view);
    }
  );

  /**
   * Delete pipeline view
   * DELETE /api/v1/pipelines/views/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/pipelines/views/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete pipeline view',
        tags: ['Pipeline Views'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Pipeline view deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await pipelineViewService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List pipeline views
   * GET /api/v1/pipelines/views
   */
  app.get<{ Querystring: { isDefault?: boolean; limit?: number } }>(
    '/api/v1/pipelines/views',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List pipeline views',
        tags: ['Pipeline Views'],
        querystring: {
          type: 'object',
          properties: {
            isDefault: { type: 'boolean' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of pipeline views',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const views = await pipelineViewService.list(tenantId, {
        isDefault: request.query.isDefault,
        limit: request.query.limit,
      });
      reply.send(views);
    }
  );

  // ===== ANALYTICS ROUTES =====

  /**
   * Get pipeline analytics
   * GET /api/v1/pipelines/analytics
   */
  app.get<{
    Querystring: {
      ownerId?: string;
      accountId?: string;
      startDate?: string;
      endDate?: string;
    };
  }>(
    '/api/v1/pipelines/analytics',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get pipeline analytics',
        tags: ['Analytics'],
        querystring: {
          type: 'object',
          properties: {
            ownerId: { type: 'string', format: 'uuid' },
            accountId: { type: 'string', format: 'uuid' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Pipeline analytics',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const analytics = await pipelineAnalyticsService.getAnalytics(tenantId, {
        ownerId: request.query.ownerId,
        accountId: request.query.accountId,
        dateRange:
          request.query.startDate || request.query.endDate
            ? {
                startDate: request.query.startDate ? new Date(request.query.startDate) : undefined,
                endDate: request.query.endDate ? new Date(request.query.endDate) : undefined,
              }
            : undefined,
      });
      reply.send(analytics);
    }
  );

  /**
   * Get pipeline forecast
   * GET /api/v1/pipelines/forecast
   */
  app.get<{
    Querystring: {
      startDate: string;
      endDate: string;
      fiscalYear?: number;
      fiscalQuarter?: number;
    };
  }>(
    '/api/v1/pipelines/forecast',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get pipeline forecast',
        tags: ['Analytics'],
        querystring: {
          type: 'object',
          required: ['startDate', 'endDate'],
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            fiscalYear: { type: 'number' },
            fiscalQuarter: { type: 'number' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Pipeline forecast',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const forecast = await pipelineAnalyticsService.getForecast(tenantId, {
        startDate: new Date(request.query.startDate),
        endDate: new Date(request.query.endDate),
        fiscalYear: request.query.fiscalYear,
        fiscalQuarter: request.query.fiscalQuarter,
      });
      reply.send(forecast);
    }
  );
}
