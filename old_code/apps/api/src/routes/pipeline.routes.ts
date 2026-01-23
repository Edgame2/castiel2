/**
 * Pipeline API Routes
 * REST endpoints for pipeline views, analytics, forecasting, and summaries
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from '../types/auth.types.js';
import { PipelineViewService } from '../services/pipeline-view.service.js';
import { PipelineAnalyticsService } from '../services/pipeline-analytics.service.js';
import { PipelineSummaryService } from '../services/pipeline-summary.service.js';
import { RevenueForecastService } from '../services/revenue-forecast.service.js';
import { requireAuth } from '../middleware/authorization.js';
import { getUser } from '../middleware/authenticate.js';
import type { PipelineViewType, PipelineFilters } from '../types/opportunity.types.js';
import type { ForecastPeriod } from '../services/revenue-forecast.service.js';

interface PipelineRoutesOptions {
  pipelineViewService: PipelineViewService;
  pipelineAnalyticsService: PipelineAnalyticsService;
  pipelineSummaryService: PipelineSummaryService;
  revenueForecastService: RevenueForecastService;
}

/**
 * Register pipeline routes
 */
export async function registerPipelineRoutes(
  server: FastifyInstance,
  options: PipelineRoutesOptions
): Promise<void> {
  const {
    pipelineViewService,
    pipelineAnalyticsService,
    pipelineSummaryService,
    revenueForecastService,
  } = options;

  // Get authentication decorator
  const authDecorator = (server as any).authenticate;
  if (!authDecorator) {
    server.log.warn('⚠️  Pipeline routes not registered - authentication decorator missing');
    return;
  }

  const authGuards = [authDecorator, requireAuth()];

  // ===============================================
  // PIPELINE VIEW ROUTES
  // ===============================================

  /**
   * GET /api/v1/pipeline
   * Get pipeline view (all, active, stage, kanban)
   * Query params:
   *   - viewType: 'all' | 'active' | 'stage' | 'kanban' (default: 'all')
   *   - includeClosed: boolean (default: false)
   *   - stage: string | string[] (filter by stage)
   *   - accountId: string (filter by account)
   *   - riskLevel: 'high' | 'medium' | 'low' | string[] (filter by risk level)
   */
  server.get(
    '/api/v1/pipeline',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Pipeline'],
        summary: 'Get pipeline view',
        description: 'Get pipeline view with different visualization options',
        querystring: {
          type: 'object',
          properties: {
            viewType: {
              type: 'string',
              enum: ['all', 'active', 'stage', 'kanban'],
              default: 'all',
            },
            includeClosed: { type: 'boolean', default: false },
            stage: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } },
              ],
            },
            accountId: { type: 'string' },
            riskLevel: {
              oneOf: [
                { type: 'string', enum: ['high', 'medium', 'low'] },
                { type: 'array', items: { type: 'string', enum: ['high', 'medium', 'low'] } },
              ],
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request as AuthenticatedRequest);
        const query = request.query as Record<string, unknown>;

        const viewType: PipelineViewType = (query.viewType === 'kanban' || query.viewType === 'stage' || query.viewType === 'active')
          ? query.viewType
          : 'all';

        const filters: PipelineFilters = {};
        
        if (query.stage) {
          filters.stage = Array.isArray(query.stage)
            ? query.stage.filter((s): s is string => typeof s === 'string')
            : typeof query.stage === 'string' ? [query.stage] : [];
        }
        if (query.accountId && typeof query.accountId === 'string') {
          filters.accountId = query.accountId;
        }
        if (query.riskLevel) {
          const validRiskLevels = ['high', 'medium', 'low'] as const;
          filters.riskLevel = Array.isArray(query.riskLevel)
            ? query.riskLevel.filter((r): r is typeof validRiskLevels[number] => typeof r === 'string' && validRiskLevels.includes(r as typeof validRiskLevels[number]))
            : typeof query.riskLevel === 'string' && validRiskLevels.includes(query.riskLevel as typeof validRiskLevels[number]) ? [query.riskLevel as typeof validRiskLevels[number]] : undefined;
        }
        filters.includeClosed = query.includeClosed === true || query.includeClosed === 'true';

        const view = await pipelineViewService.getPipelineView(
          user.id,
          user.tenantId,
          viewType,
          filters
        );

        return reply.code(200).send({
          success: true,
          data: view,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        server.log.error(error instanceof Error ? error : new Error(errorMessage), 'Error getting pipeline view');
        return reply.code(500).send({
          success: false,
          error: errorMessage || 'Failed to get pipeline view',
        });
      }
    }
  );

  // ===============================================
  // PIPELINE ANALYTICS ROUTES
  // ===============================================

  /**
   * GET /api/v1/pipeline/metrics
   * Get pipeline metrics for the authenticated user
   */
  server.get(
    '/api/v1/pipeline/metrics',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Pipeline'],
        summary: 'Get pipeline metrics',
        description: 'Get pipeline metrics including total value, expected revenue, and risk-adjusted value',
        querystring: {
          type: 'object',
          properties: {
            includeClosed: { type: 'boolean', default: false },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request as AuthenticatedRequest);
        const query = request.query as Record<string, unknown>;

        let dateRange: { startDate: Date; endDate: Date } | undefined;
        if (query.startDate && query.endDate) {
          const startDate = typeof query.startDate === 'string' ? new Date(query.startDate) : null;
          const endDate = typeof query.endDate === 'string' ? new Date(query.endDate) : null;
          if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            dateRange = { startDate, endDate };
          }
        }

        const metrics = await pipelineAnalyticsService.calculatePipelineMetrics(
          user.id,
          user.tenantId,
          {
            includeClosed: query.includeClosed === true || query.includeClosed === 'true',
            dateRange,
          }
        );

        return reply.code(200).send({
          success: true,
          data: metrics,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        server.log.error(error instanceof Error ? error : new Error(errorMessage), 'Error calculating pipeline metrics');
        return reply.code(500).send({
          success: false,
          error: errorMessage || 'Failed to calculate pipeline metrics',
        });
      }
    }
  );

  /**
   * GET /api/v1/pipeline/closed-won-lost
   * Get closed won/lost metrics
   */
  server.get(
    '/api/v1/pipeline/closed-won-lost',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Pipeline'],
        summary: 'Get closed won/lost metrics',
        description: 'Get metrics for closed won and lost opportunities in a period',
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
          required: ['startDate', 'endDate'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request as AuthenticatedRequest);
        const query = request.query as { startDate: string; endDate: string };

        if (!query.startDate || !query.endDate) {
          return reply.code(400).send({
            success: false,
            error: 'Bad Request',
            message: 'startDate and endDate are required',
          });
        }

        const metrics = await pipelineAnalyticsService.calculateClosedWonLost(
          user.id,
          user.tenantId,
          {
            startDate: new Date(query.startDate),
            endDate: new Date(query.endDate),
          }
        );

        return reply.code(200).send({
          success: true,
          data: metrics,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        server.log.error(error instanceof Error ? error : new Error(errorMessage), 'Error calculating closed won/lost metrics');
        return reply.code(500).send({
          success: false,
          error: errorMessage || 'Failed to calculate closed won/lost metrics',
        });
      }
    }
  );

  /**
   * GET /api/v1/pipeline/risk-organization
   * Organize pipeline by risk level
   */
  server.get(
    '/api/v1/pipeline/risk-organization',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Pipeline'],
        summary: 'Organize pipeline by risk level',
        description: 'Get opportunities organized by risk level (high, medium, low)',
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request as AuthenticatedRequest);

        const organization = await pipelineAnalyticsService.organizeByRiskLevel(
          user.id,
          user.tenantId
        );

        return reply.code(200).send({
          success: true,
          data: organization,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        server.log.error(error instanceof Error ? error : new Error(errorMessage), 'Error organizing pipeline by risk level');
        return reply.code(500).send({
          success: false,
          error: errorMessage || 'Failed to organize pipeline by risk level',
        });
      }
    }
  );

  /**
   * GET /api/v1/pipeline/opportunities/:opportunityId/recommendations
   * Get recommendations for an opportunity
   */
  server.get(
    '/api/v1/pipeline/opportunities/:opportunityId/recommendations',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Pipeline'],
        summary: 'Get opportunity recommendations',
        description: 'Get AI-generated recommendations for an opportunity',
        params: {
          type: 'object',
          properties: {
            opportunityId: { type: 'string' },
          },
          required: ['opportunityId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request as AuthenticatedRequest);
        const params = request.params as { opportunityId: string };

        const recommendations = await pipelineAnalyticsService.generateRecommendations(
          params.opportunityId,
          user.tenantId,
          user.id
        );

        return reply.code(200).send({
          success: true,
          data: recommendations,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        server.log.error(error instanceof Error ? error : new Error(errorMessage), 'Error generating recommendations');
        if (errorMessage.includes('not found')) {
          return reply.code(404).send({
            success: false,
            error: 'Opportunity not found',
            message: errorMessage,
          });
        }
        return reply.code(500).send({
          success: false,
          error: errorMessage || 'Failed to generate recommendations',
        });
      }
    }
  );

  // ===============================================
  // PIPELINE SUMMARY ROUTES
  // ===============================================

  /**
   * GET /api/v1/pipeline/summary
   * Get comprehensive pipeline summary
   */
  server.get(
    '/api/v1/pipeline/summary',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Pipeline'],
        summary: 'Get pipeline summary',
        description: 'Get high-level pipeline summary with metrics and risk distribution',
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request as AuthenticatedRequest);

        const summary = await pipelineSummaryService.getSummary(user.id, user.tenantId);

        return reply.code(200).send({
          success: true,
          data: summary,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        server.log.error(error instanceof Error ? error : new Error(errorMessage), 'Error getting pipeline summary');
        return reply.code(500).send({
          success: false,
          error: errorMessage || 'Failed to get pipeline summary',
        });
      }
    }
  );

  // ===============================================
  // REVENUE FORECAST ROUTES
  // ===============================================

  /**
   * GET /api/v1/pipeline/forecast
   * Generate revenue forecast
   */
  server.get(
    '/api/v1/pipeline/forecast',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Pipeline'],
        summary: 'Generate revenue forecast',
        description: 'Generate revenue forecast for month, quarter, year, or custom range',
        querystring: {
          type: 'object',
          properties: {
            period: {
              type: 'string',
              enum: ['month', 'quarter', 'year', 'custom'],
              default: 'month',
            },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request as AuthenticatedRequest);
        const query = request.query as {
          period?: ForecastPeriod;
          startDate?: string;
          endDate?: string;
        };

        const period: ForecastPeriod = query.period || 'month';
        
        // Validate custom range
        if (period === 'custom' && (!query.startDate || !query.endDate)) {
          return reply.code(400).send({
            success: false,
            error: 'Bad Request',
            message: 'startDate and endDate are required for custom period',
          });
        }

        const range = query.startDate && query.endDate
          ? {
              startDate: new Date(query.startDate),
              endDate: new Date(query.endDate),
            }
          : undefined;

        const forecast = await revenueForecastService.generateForecast(
          user.id,
          user.tenantId,
          period,
          range
        );

        return reply.code(200).send({
          success: true,
          data: forecast,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        server.log.error(error instanceof Error ? error : new Error(errorMessage), 'Error generating revenue forecast');
        return reply.code(500).send({
          success: false,
          error: errorMessage || 'Failed to generate revenue forecast',
        });
      }
    }
  );

  server.log.info('✅ Pipeline routes registered');
}

