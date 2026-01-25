/**
 * Route Registration
 * AI Insights routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { InsightService } from '../../services/InsightService';
import { ProactiveInsightService } from '../../services/ProactiveInsightService';
import { RiskAnalysisService } from '../../services/RiskAnalysisService';
import {
  CreateInsightInput,
  UpdateInsightInput,
  GenerateInsightRequest,
  InsightType,
  InsightStatus,
  ProactiveInsightStatus,
  RiskLevel,
} from '../../types/insight.types';

export async function registerInsightsRoutes(app: FastifyInstance, config: any): Promise<void> {
  const insightService = new InsightService();
  const proactiveInsightService = new ProactiveInsightService();
  const riskAnalysisService = new RiskAnalysisService();

  // ===== INSIGHT ROUTES =====

  /**
   * Create insight
   * POST /api/v1/insights
   */
  app.post<{ Body: CreateInsightInput }>(
    '/api/v1/insights',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new insight',
        tags: ['Insights'],
        body: {
          type: 'object',
          required: ['type', 'priority', 'title', 'summary'],
          properties: {
            type: { type: 'string', enum: ['opportunity', 'risk', 'trend', 'anomaly', 'recommendation', 'prediction', 'pattern', 'custom'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            title: { type: 'string' },
            summary: { type: 'string' },
            detailedContent: { type: 'string' },
            shardId: { type: 'string', format: 'uuid' },
            shardName: { type: 'string' },
            shardTypeId: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 100 },
            evidence: { type: 'array', items: { type: 'object' } },
            suggestedActions: { type: 'array', items: { type: 'object' } },
            relatedShards: { type: 'array', items: { type: 'object' } },
            metadata: { type: 'object' },
            expiresAt: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Insight created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateInsightInput = {
        ...request.body,
        tenantId,
        userId,
      };

      const insight = await insightService.create(input);
      reply.code(201).send(insight);
    }
  );

  /**
   * Generate insight using AI
   * POST /api/v1/insights/generate
   */
  app.post<{ Body: GenerateInsightRequest }>(
    '/api/v1/insights/generate',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Generate insight using AI',
        tags: ['Insights'],
        body: {
          type: 'object',
          properties: {
            shardIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
            shardTypeIds: { type: 'array', items: { type: 'string' } },
            insightType: { type: 'string', enum: ['opportunity', 'risk', 'trend', 'anomaly', 'recommendation', 'prediction', 'pattern', 'custom'] },
            context: { type: 'string' },
            includeEvidence: { type: 'boolean' },
            includeActions: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'AI-generated insight',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const requestBody: GenerateInsightRequest = {
        ...request.body,
        tenantId,
        userId,
      };

      const insight = await insightService.generate(requestBody);
      reply.send(insight);
    }
  );

  /**
   * Get insight by ID
   * GET /api/v1/insights/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/insights/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get insight by ID',
        tags: ['Insights'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Insight details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const insight = await insightService.getById(request.params.id, tenantId);
      reply.send(insight);
    }
  );

  /**
   * Update insight
   * PUT /api/v1/insights/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateInsightInput }>(
    '/api/v1/insights/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update insight',
        tags: ['Insights'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['new', 'acknowledged', 'dismissed', 'actioned', 'expired'] },
            acknowledgedBy: { type: 'string' },
            dismissedBy: { type: 'string' },
            dismissReason: { type: 'string' },
            actionedBy: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Insight updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: UpdateInsightInput = {
        ...request.body,
        acknowledgedBy: request.body.acknowledgedBy || (request.body.status === 'acknowledged' ? userId : undefined),
        dismissedBy: request.body.dismissedBy || (request.body.status === 'dismissed' ? userId : undefined),
        actionedBy: request.body.actionedBy || (request.body.status === 'actioned' ? userId : undefined),
      };

      const insight = await insightService.update(request.params.id, tenantId, input);
      reply.send(insight);
    }
  );

  /**
   * Delete insight
   * DELETE /api/v1/insights/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/insights/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete insight',
        tags: ['Insights'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Insight deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await insightService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List insights
   * GET /api/v1/insights
   */
  app.get<{
    Querystring: {
      type?: string;
      status?: string;
      priority?: string;
      shardId?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/insights',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List insights',
        tags: ['Insights'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['opportunity', 'risk', 'trend', 'anomaly', 'recommendation', 'prediction', 'pattern', 'custom'] },
            status: { type: 'string', enum: ['new', 'acknowledged', 'dismissed', 'actioned', 'expired'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            shardId: { type: 'string', format: 'uuid' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of insights',
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
      const result = await insightService.list(tenantId, {
        type: request.query.type as any,
        status: request.query.status as any,
        priority: request.query.priority,
        shardId: request.query.shardId,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== PROACTIVE INSIGHT ROUTES =====

  /**
   * Get proactive insight by ID
   * GET /api/v1/proactive-insights/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/proactive-insights/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get proactive insight by ID',
        tags: ['Proactive Insights'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Proactive insight details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const insight = await proactiveInsightService.getById(request.params.id, tenantId);
      reply.send(insight);
    }
  );

  /**
   * Update proactive insight
   * PUT /api/v1/proactive-insights/:id
   */
  app.put<{ Params: { id: string }; Body: { status?: string; dismissedBy?: string; dismissReason?: string; actionedBy?: string } }>(
    '/api/v1/proactive-insights/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update proactive insight',
        tags: ['Proactive Insights'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['new', 'acknowledged', 'dismissed', 'actioned', 'expired'] },
            dismissedBy: { type: 'string' },
            dismissReason: { type: 'string' },
            actionedBy: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Proactive insight updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const insight = await proactiveInsightService.update(request.params.id, tenantId, {
        status: request.body.status as any,
        dismissedBy: request.body.dismissedBy || (request.body.status === 'dismissed' ? userId : undefined),
        dismissReason: request.body.dismissReason,
        actionedBy: request.body.actionedBy || (request.body.status === 'actioned' ? userId : undefined),
      });
      reply.send(insight);
    }
  );

  /**
   * List proactive insights
   * GET /api/v1/proactive-insights
   */
  app.get<{
    Querystring: {
      status?: string;
      type?: string;
      priority?: string;
      triggerId?: string;
      limit?: number;
    };
  }>(
    '/api/v1/proactive-insights',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List proactive insights',
        tags: ['Proactive Insights'],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['new', 'acknowledged', 'dismissed', 'actioned', 'expired'] },
            type: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            triggerId: { type: 'string', format: 'uuid' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of proactive insights',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const insights = await proactiveInsightService.list(tenantId, {
        status: request.query.status as any,
        type: request.query.type,
        priority: request.query.priority,
        triggerId: request.query.triggerId,
        limit: request.query.limit,
      });
      reply.send(insights);
    }
  );

  // ===== RISK ANALYSIS ROUTES =====

  /**
   * Create risk analysis
   * POST /api/v1/risk-analysis
   */
  app.post<{ Body: any }>(
    '/api/v1/risk-analysis',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create risk analysis',
        tags: ['Risk Analysis'],
        body: {
          type: 'object',
          required: ['shardId', 'shardName', 'shardTypeId', 'riskFactors'],
          properties: {
            shardId: { type: 'string', format: 'uuid' },
            shardName: { type: 'string' },
            shardTypeId: { type: 'string' },
            riskFactors: { type: 'array', items: { type: 'object' } },
            revenueAtRisk: { type: 'number' },
            probability: { type: 'number', minimum: 0, maximum: 100 },
            impact: { type: 'number', minimum: 0, maximum: 100 },
            mitigationStrategies: { type: 'array', items: { type: 'object' } },
            earlyWarningIndicators: { type: 'array', items: { type: 'object' } },
            metadata: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Risk analysis created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input = {
        ...request.body,
        tenantId,
        userId,
      };

      const analysis = await riskAnalysisService.create(input);
      reply.code(201).send(analysis);
    }
  );

  /**
   * Get risk analysis by ID
   * GET /api/v1/risk-analysis/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/risk-analysis/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get risk analysis by ID',
        tags: ['Risk Analysis'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Risk analysis details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const analysis = await riskAnalysisService.getById(request.params.id, tenantId);
      reply.send(analysis);
    }
  );

  /**
   * Update risk analysis
   * PUT /api/v1/risk-analysis/:id
   */
  app.put<{ Params: { id: string }; Body: any }>(
    '/api/v1/risk-analysis/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update risk analysis',
        tags: ['Risk Analysis'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            riskFactors: { type: 'array', items: { type: 'object' } },
            revenueAtRisk: { type: 'number' },
            probability: { type: 'number', minimum: 0, maximum: 100 },
            impact: { type: 'number', minimum: 0, maximum: 100 },
            mitigationStrategies: { type: 'array', items: { type: 'object' } },
            earlyWarningIndicators: { type: 'array', items: { type: 'object' } },
            metadata: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Risk analysis updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const analysis = await riskAnalysisService.update(request.params.id, tenantId, request.body);
      reply.send(analysis);
    }
  );

  /**
   * Delete risk analysis
   * DELETE /api/v1/risk-analysis/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/risk-analysis/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete risk analysis',
        tags: ['Risk Analysis'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Risk analysis deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await riskAnalysisService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List risk analyses
   * GET /api/v1/risk-analysis
   */
  app.get<{
    Querystring: {
      shardId?: string;
      shardTypeId?: string;
      riskLevel?: string;
      limit?: number;
    };
  }>(
    '/api/v1/risk-analysis',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List risk analyses',
        tags: ['Risk Analysis'],
        querystring: {
          type: 'object',
          properties: {
            shardId: { type: 'string', format: 'uuid' },
            shardTypeId: { type: 'string' },
            riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of risk analyses',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const analyses = await riskAnalysisService.list(tenantId, {
        shardId: request.query.shardId,
        shardTypeId: request.query.shardTypeId,
        riskLevel: request.query.riskLevel as any,
        limit: request.query.limit,
      });
      reply.send(analyses);
    }
  );
}
