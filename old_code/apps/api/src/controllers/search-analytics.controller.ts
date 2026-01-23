/**
 * Search Analytics Controller
 * 
 * Handles HTTP requests for search analytics
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { SearchAnalyticsService } from '../services/search-analytics.service.js';
import { getUser } from '../middleware/authenticate.js';
import type {
  SearchAnalyticsRequest,
} from '../types/search-analytics.types.js';

export class SearchAnalyticsController {
  constructor(
    private readonly analyticsService: SearchAnalyticsService
  ) {}

  /**
   * GET /api/v1/search/analytics/query
   * Get analytics for a specific query
   */
  async getQueryAnalytics(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const query = request.query as {
        q: string;
        filters?: string; // JSON string
      };

      if (!query.q) {
        reply.status(400).send({
          error: 'Bad Request',
          message: 'Query parameter "q" is required',
        });
        return;
      }

      const filters = (() => {
        try {
          return query.filters ? JSON.parse(query.filters) : undefined;
        } catch (error) {
          request.log.warn({ error, filtersValue: query.filters }, 'Failed to parse filters JSON');
          return undefined;
        }
      })();
      const analytics = await this.analyticsService.getQueryAnalytics(
        user.tenantId,
        query.q,
        filters
      );

      if (!analytics) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'No analytics found for this query',
        });
        return;
      }

      reply.status(200).send(analytics);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = error && typeof error === 'object' && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
      const errorName = error && typeof error === 'object' && 'name' in error ? (error as { name?: string }).name : undefined;
      request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to get query analytics');
      reply.status(statusCode || 500).send({
        error: errorName || 'Internal Server Error',
        message: errorMessage || 'Failed to get query analytics',
      });
    }
  }

  /**
   * GET /api/v1/search/analytics/zero-results
   * Get zero-result queries
   */
  async getZeroResultQueries(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const query = request.query as {
        startDate?: string;
        endDate?: string;
        limit?: string;
        shardTypeId?: string;
      };

      // Validate and sanitize limit if provided
      const validatedLimit = query.limit 
        ? (() => {
            const parsed = parseInt(query.limit, 10);
            return isNaN(parsed) || parsed < 1 ? undefined : Math.min(parsed, 1000); // Max 1000 items
          })()
        : undefined;

      const analyticsRequest: SearchAnalyticsRequest = {
        tenantId: user.tenantId,
        startDate: query.startDate ? (() => {
          const date = new Date(query.startDate);
          return isNaN(date.getTime()) ? undefined : date;
        })() : undefined,
        endDate: query.endDate ? (() => {
          const date = new Date(query.endDate);
          return isNaN(date.getTime()) ? undefined : date;
        })() : undefined,
        limit: validatedLimit,
        shardTypeId: query.shardTypeId,
      };

      const zeroResults = await this.analyticsService.getZeroResultQueries(analyticsRequest);

      reply.status(200).send({
        queries: zeroResults,
        count: zeroResults.length,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = error && typeof error === 'object' && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
      const errorName = error && typeof error === 'object' && 'name' in error ? (error as { name?: string }).name : undefined;
      request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to get zero-result queries');
      reply.status(statusCode || 500).send({
        error: errorName || 'Internal Server Error',
        message: errorMessage || 'Failed to get zero-result queries',
      });
    }
  }

  /**
   * GET /api/v1/search/analytics/satisfaction
   * Get satisfaction metrics
   */
  async getSatisfactionMetrics(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const query = request.query as {
        queryHash?: string;
      };

      const metrics = await this.analyticsService.getSatisfactionMetrics(
        user.tenantId,
        query.queryHash
      );

      reply.status(200).send({
        metrics,
        count: metrics.length,
      });
    } catch (error: unknown) {
      request.log.error({ error }, 'Failed to get satisfaction metrics');
      const statusCode = (error && typeof error === 'object' && 'statusCode' in error && typeof (error as { statusCode?: unknown }).statusCode === 'number')
        ? (error as { statusCode: number }).statusCode
        : 500;
      const errorName = error instanceof Error ? error.name : (error && typeof error === 'object' && 'name' in error && typeof (error as { name?: unknown }).name === 'string')
        ? (error as { name: string }).name
        : 'Internal Server Error';
      const errorMessage = error instanceof Error ? error.message : (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string')
        ? (error as { message: string }).message
        : 'Failed to get satisfaction metrics';
      reply.status(statusCode).send({
        error: errorName,
        message: errorMessage,
      });
    }
  }

  /**
   * GET /api/v1/search/analytics/dashboard
   * Get popular terms dashboard
   */
  async getDashboard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const query = request.query as {
        period?: 'day' | 'week' | 'month' | 'all';
        startDate?: string;
        endDate?: string;
        limit?: string;
        shardTypeId?: string;
      };

      // Validate and sanitize limit if provided
      const validatedLimit = query.limit 
        ? (() => {
            const parsed = parseInt(query.limit, 10);
            return isNaN(parsed) || parsed < 1 ? undefined : Math.min(parsed, 1000); // Max 1000 items
          })()
        : undefined;

      const analyticsRequest: SearchAnalyticsRequest = {
        tenantId: user.tenantId,
        period: query.period,
        startDate: query.startDate ? (() => {
          const date = new Date(query.startDate);
          return isNaN(date.getTime()) ? undefined : date;
        })() : undefined,
        endDate: query.endDate ? (() => {
          const date = new Date(query.endDate);
          return isNaN(date.getTime()) ? undefined : date;
        })() : undefined,
        limit: validatedLimit,
        shardTypeId: query.shardTypeId,
      };

      const dashboard = await this.analyticsService.getPopularTermsDashboard(analyticsRequest);

      reply.status(200).send(dashboard);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = error && typeof error === 'object' && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
      const errorName = error && typeof error === 'object' && 'name' in error ? (error as { name?: string }).name : undefined;
      request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to get dashboard');
      reply.status(statusCode || 500).send({
        error: errorName || 'Internal Server Error',
        message: errorMessage || 'Failed to get dashboard',
      });
    }
  }

  /**
   * POST /api/v1/search/analytics/interaction
   * Record a user interaction with search results
   */
  async recordInteraction(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const body = request.body as {
        query: string;
        filters?: Record<string, any>;
        interactionType: 'click' | 'view' | 'satisfaction';
        resultId?: string;
        satisfactionScore?: number;
      };

      if (!body.query || !body.interactionType) {
        reply.status(400).send({
          error: 'Bad Request',
          message: 'Query and interactionType are required',
        });
        return;
      }

      if (body.interactionType === 'satisfaction' && !body.satisfactionScore) {
        reply.status(400).send({
          error: 'Bad Request',
          message: 'satisfactionScore is required for satisfaction interactions',
        });
        return;
      }

      await this.analyticsService.recordInteraction({
        query: body.query,
        filters: body.filters,
        userId: user.id,
        tenantId: user.tenantId,
        interactionType: body.interactionType,
        resultId: body.resultId,
        satisfactionScore: body.satisfactionScore,
        timestamp: new Date(),
      });

      reply.status(201).send({
        success: true,
        message: 'Interaction recorded',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = error && typeof error === 'object' && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
      const errorName = error && typeof error === 'object' && 'name' in error ? (error as { name?: string }).name : undefined;
      request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to record interaction');
      reply.status(statusCode || 500).send({
        error: errorName || 'Internal Server Error',
        message: errorMessage || 'Failed to record interaction',
      });
    }
  }
}

