/**
 * AI Analytics API Routes
 * Endpoints for AI usage metrics, quality monitoring, and insights
 */

import { FastifyInstance } from 'fastify';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { AIAnalyticsService, createAIAnalyticsService } from '../services/ai-analytics.service.js';
import { SemanticCacheService } from '../services/semantic-cache.service.js';
import type { PromptAnalyticsService } from '../services/prompt-analytics.service.js';
import type { ModelRouterService } from '../services/model-router.service.js';

export async function aiAnalyticsRoutes(
  fastify: FastifyInstance,
  options: {
    monitoring: IMonitoringProvider;
    redis: Redis;
    semanticCache?: SemanticCacheService;
    promptAnalytics?: PromptAnalyticsService;
    modelRouter?: ModelRouterService;
  }
) {
  const { monitoring, redis, semanticCache, promptAnalytics, modelRouter } = options;
  const analyticsService = createAIAnalyticsService(redis, monitoring);

  // ============================================
  // Metrics Endpoints
  // ============================================

  /**
   * Get AI metrics for a period
   * GET /ai/analytics/metrics
   */
  fastify.get<{
    Querystring: { period?: 'hour' | 'day' | 'week' | 'month' };
  }>(
    '/ai/analytics/metrics',
    {
      schema: {
        description: 'Get AI usage and quality metrics',
        tags: ['ai-analytics'],
        querystring: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['hour', 'day', 'week', 'month'], default: 'day' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = (request.user as any)?.tenantId || (request as any).user?.tenantId;
      const { period = 'day' } = request.query;

      const metrics = await analyticsService.getMetrics(tenantId, period);
      return metrics;
    }
  );

  /**
   * Get daily metrics for a date range
   * GET /ai/analytics/daily
   */
  fastify.get<{
    Querystring: { startDate: string; endDate: string };
  }>(
    '/ai/analytics/daily',
    {
      schema: {
        description: 'Get daily AI metrics for a date range',
        tags: ['ai-analytics'],
        querystring: {
          type: 'object',
          required: ['startDate', 'endDate'],
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = (request.user as any)?.tenantId || (request as any).user?.tenantId;
      const { startDate, endDate } = request.query;

      const dailyMetrics = await analyticsService.getDailyMetrics(
        tenantId,
        new Date(startDate),
        new Date(endDate)
      );

      return { daily: dailyMetrics };
    }
  );

  /**
   * Get model comparison metrics
   * GET /ai/analytics/models
   */
  fastify.get(
    '/ai/analytics/models',
    {
      schema: {
        description: 'Get AI model comparison metrics',
        tags: ['ai-analytics'],
      },
    },
    async (request, reply) => {
      const tenantId = (request.user as any)?.tenantId || (request as any).user?.tenantId;
      const comparison = await analyticsService.getModelComparison(tenantId);
      return { models: comparison };
    }
  );

  /**
   * Get quality insights and recommendations
   * GET /ai/analytics/insights
   */
  fastify.get(
    '/ai/analytics/insights',
    {
      schema: {
        description: 'Get AI quality insights and recommendations',
        tags: ['ai-analytics'],
      },
    },
    async (request, reply) => {
      const tenantId = (request.user as any)?.tenantId || (request as any).user?.tenantId;
      const insights = await analyticsService.getQualityInsights(tenantId);
      return { insights };
    }
  );

  // ============================================
  // Prompt Analytics Endpoints
  // ============================================

  /**
   * Get prompt performance metrics
   * GET /ai/analytics/prompts/:promptId
   */
  fastify.get<{
    Params: { promptId: string };
    Querystring: { period?: 'hour' | 'day' | 'week' | 'month' };
  }>(
    '/ai/analytics/prompts/:promptId',
    {
      schema: {
        description: 'Get performance metrics for a specific prompt',
        tags: ['ai-analytics'],
        params: {
          type: 'object',
          required: ['promptId'],
          properties: {
            promptId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['hour', 'day', 'week', 'month'], default: 'week' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = (request.user as any)?.tenantId || (request as any).user?.tenantId;
      const { promptId } = request.params;
      const { period = 'week' } = request.query;

      if (!promptAnalytics) {
        return reply.status(503).send({
          error: 'Prompt analytics service not available',
          message: 'Redis is required for prompt analytics',
        });
      }

      const metrics = await promptAnalytics.getPromptMetrics(promptId, tenantId, period);
      
      if (!metrics) {
        return reply.status(404).send({
          error: 'Metrics not found',
          message: `No metrics found for prompt ${promptId} in the specified period`,
        });
      }

      return { metrics };
    }
  );

  /**
   * Get prompt quality insights
   * GET /ai/analytics/prompts/insights
   */
  fastify.get(
    '/ai/analytics/prompts/insights',
    {
      schema: {
        description: 'Get quality insights and recommendations for prompts',
        tags: ['ai-analytics'],
      },
    },
    async (request, reply) => {
      const tenantId = (request.user as any)?.tenantId || (request as any).user?.tenantId;

      if (!promptAnalytics) {
        return reply.status(503).send({
          error: 'Prompt analytics service not available',
          message: 'Redis is required for prompt analytics',
        });
      }

      const insights = await promptAnalytics.getQualityInsights(tenantId);
      return { insights };
    }
  );

  // ============================================
  // Model Performance Endpoints
  // ============================================

  /**
   * Get model performance metrics
   * GET /ai/analytics/models/:modelId/performance
   */
  fastify.get<{
    Params: { modelId: string };
  }>(
    '/ai/analytics/models/:modelId/performance',
    {
      schema: {
        description: 'Get performance metrics for a specific AI model',
        tags: ['ai-analytics'],
        params: {
          type: 'object',
          required: ['modelId'],
          properties: {
            modelId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { modelId } = request.params;

      if (!modelRouter) {
        return reply.status(503).send({
          error: 'Model router service not available',
          message: 'Model performance tracking requires ModelRouterService',
        });
      }

      const performance = await modelRouter.getModelPerformance(modelId);
      
      if (!performance) {
        return reply.status(404).send({
          error: 'Performance data not found',
          message: `No performance data found for model ${modelId}`,
        });
      }

      return { performance };
    }
  );

  // ============================================
  // Cache Statistics
  // ============================================

  /**
   * Get semantic cache statistics
   * GET /ai/analytics/cache
   */
  fastify.get(
    '/ai/analytics/cache',
    {
      schema: {
        description: 'Get semantic cache statistics',
        tags: ['ai-analytics'],
      },
    },
    async (request, reply) => {
      const tenantId = (request.user as any)?.tenantId || (request as any).user?.tenantId;

      if (!semanticCache) {
        return {
          enabled: false,
          stats: null,
        };
      }

      const stats = await semanticCache.getStats(tenantId);
      return {
        enabled: true,
        stats,
      };
    }
  );

  /**
   * Clear semantic cache
   * DELETE /ai/analytics/cache
   */
  fastify.delete(
    '/ai/analytics/cache',
    {
      schema: {
        description: 'Clear semantic cache for tenant',
        tags: ['ai-analytics'],
      },
    },
    async (request, reply) => {
      const tenantId = (request.user as any)?.tenantId || (request as any).user?.tenantId;

      if (!semanticCache) {
        return reply.status(400).send({ error: 'Semantic cache not enabled' });
      }

      await semanticCache.clearAll(tenantId);
      return { success: true, message: 'Cache cleared' };
    }
  );

  // ============================================
  // Admin Endpoints (Super Admin)
  // ============================================

  /**
   * Get system-wide AI metrics
   * GET /admin/ai/analytics/metrics
   */
  fastify.get<{
    Querystring: { period?: 'hour' | 'day' | 'week' | 'month' };
  }>(
    '/admin/ai/analytics/metrics',
    {
      schema: {
        description: 'Get system-wide AI metrics (Super Admin)',
        tags: ['ai-admin'],
      },
    },
    async (request, reply) => {
      const { period = 'day' } = request.query;

      // Get metrics across all tenants
      const systemMetrics = await analyticsService.getMetrics('system', period);
      return systemMetrics;
    }
  );

  /**
   * Get AI metrics by tenant
   * GET /admin/ai/analytics/tenants
   */
  fastify.get<{
    Querystring: { period?: 'hour' | 'day' | 'week' | 'month'; limit?: number };
  }>(
    '/admin/ai/analytics/tenants',
    {
      schema: {
        description: 'Get AI metrics grouped by tenant (Super Admin)',
        tags: ['ai-admin'],
      },
    },
    async (request, reply) => {
      // In production, aggregate from all tenant keys
      // For now, return placeholder
      return {
        tenants: [],
        message: 'Tenant aggregation not yet implemented',
      };
    }
  );

  /**
   * Get AI cost breakdown
   * GET /admin/ai/analytics/costs
   */
  fastify.get<{
    Querystring: { period?: 'day' | 'week' | 'month' };
  }>(
    '/admin/ai/analytics/costs',
    {
      schema: {
        description: 'Get AI cost breakdown (Super Admin)',
        tags: ['ai-admin'],
      },
    },
    async (request, reply) => {
      const { period = 'month' } = request.query;
      const metrics = await analyticsService.getMetrics('system', period);

      return {
        period,
        totalCost: metrics.totalCost,
        costByModel: metrics.costByModel,
        cacheSavings: metrics.cacheCostSavings,
        avgCostPerRequest: metrics.avgCostPerRequest,
        projectedMonthlyCost: metrics.totalCost * (period === 'day' ? 30 : period === 'week' ? 4 : 1),
      };
    }
  );
}











