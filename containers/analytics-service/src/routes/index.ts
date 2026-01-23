/**
 * Route Registration
 * Analytics Service routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { AnalyticsService } from '../services/AnalyticsService';
import { ReportService } from '../services/ReportService';
import {
  CreateAnalyticsEventInput,
  AnalyticsQuery,
  CreateAnalyticsReportInput,
  MetricType,
  TimeAggregation,
} from '../types/analytics.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const analyticsService = new AnalyticsService();
  const reportService = new ReportService(analyticsService);

  // ===== EVENT TRACKING ROUTES =====

  /**
   * Track analytics event
   * POST /api/v1/analytics/events
   */
  app.post<{ Body: Omit<CreateAnalyticsEventInput, 'tenantId' | 'userId'> }>(
    '/api/v1/analytics/events',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Track analytics event',
        tags: ['Analytics'],
        body: {
          type: 'object',
          required: ['eventName', 'category', 'action'],
          properties: {
            projectId: { type: 'string', format: 'uuid' },
            eventType: { type: 'string' },
            eventName: { type: 'string' },
            category: { type: 'string' },
            action: { type: 'string' },
            label: { type: 'string' },
            value: { type: 'number' },
            metadata: { type: 'object' },
            sessionId: { type: 'string' },
            duration: { type: 'number' },
            url: { type: 'string' },
            referrer: { type: 'string' },
            userAgent: { type: 'string' },
            ipAddress: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Event tracked successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateAnalyticsEventInput = {
        ...request.body,
        tenantId,
        userId,
      };

      const event = await analyticsService.trackEvent(input);
      reply.code(201).send(event);
    }
  );

  /**
   * Track batch events
   * POST /api/v1/analytics/events/batch
   */
  app.post<{ Body: { events: Omit<CreateAnalyticsEventInput, 'tenantId' | 'userId'>[] } }>(
    '/api/v1/analytics/events/batch',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Track multiple analytics events',
        tags: ['Analytics'],
        body: {
          type: 'object',
          required: ['events'],
          properties: {
            events: {
              type: 'array',
              items: {
                type: 'object',
                required: ['eventName', 'category', 'action'],
                properties: {
                  projectId: { type: 'string', format: 'uuid' },
                  eventType: { type: 'string' },
                  eventName: { type: 'string' },
                  category: { type: 'string' },
                  action: { type: 'string' },
                  label: { type: 'string' },
                  value: { type: 'number' },
                  metadata: { type: 'object' },
                },
              },
            },
          },
        },
        response: {
          201: {
            type: 'array',
            description: 'Events tracked successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const events = request.body.events.map((e) => ({
        ...e,
        tenantId,
        userId,
      }));

      const results = await analyticsService.trackBatchEvents(events);
      reply.code(201).send(results);
    }
  );

  // ===== METRICS ROUTES =====

  /**
   * Get aggregate metrics
   * POST /api/v1/analytics/metrics/aggregate
   */
  app.post<{ Body: Omit<AnalyticsQuery, 'tenantId'> }>(
    '/api/v1/analytics/metrics/aggregate',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get aggregate metrics',
        tags: ['Analytics'],
        body: {
          type: 'object',
          required: ['startDate', 'endDate'],
          properties: {
            metricNames: { type: 'array', items: { type: 'string' } },
            metricTypes: { type: 'array', items: { type: 'string', enum: ['user_action', 'system_metric', 'performance', 'business', 'conversion'] } },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            aggregation: { type: 'string', enum: ['minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'] },
            filters: {
              type: 'object',
              properties: {
                projectId: { type: 'string', format: 'uuid' },
                userId: { type: 'string', format: 'uuid' },
                category: { type: 'string' },
                action: { type: 'string' },
                dimensions: { type: 'object', additionalProperties: { type: 'string' } },
              },
            },
            groupBy: { type: 'array', items: { type: 'string' } },
            sortBy: { type: 'string' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'] },
            limit: { type: 'number', minimum: 1, maximum: 1000 },
            offset: { type: 'number', minimum: 0 },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'Aggregate metrics',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const query: AnalyticsQuery = {
        ...request.body,
        tenantId,
        startDate: new Date(request.body.startDate),
        endDate: new Date(request.body.endDate),
        metricTypes: request.body.metricTypes as any,
        aggregation: request.body.aggregation as any,
      };

      const metrics = await analyticsService.getAggregateMetrics(query);
      reply.send(metrics);
    }
  );

  /**
   * Get trending analysis
   * GET /api/v1/analytics/trends/:metricName
   */
  app.get<{
    Params: { metricName: string };
    Querystring: {
      currentStartDate: string;
      currentEndDate: string;
      previousStartDate: string;
      previousEndDate: string;
    };
  }>(
    '/api/v1/analytics/trends/:metricName',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get trending analysis for a metric',
        tags: ['Analytics'],
        params: {
          type: 'object',
          properties: {
            metricName: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          required: ['currentStartDate', 'currentEndDate', 'previousStartDate', 'previousEndDate'],
          properties: {
            currentStartDate: { type: 'string', format: 'date-time' },
            currentEndDate: { type: 'string', format: 'date-time' },
            previousStartDate: { type: 'string', format: 'date-time' },
            previousEndDate: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Trending analysis',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const analysis = await analyticsService.getTrendingAnalysis(
        tenantId,
        request.params.metricName,
        {
          startDate: new Date(request.query.currentStartDate),
          endDate: new Date(request.query.currentEndDate),
        },
        {
          startDate: new Date(request.query.previousStartDate),
          endDate: new Date(request.query.previousEndDate),
        }
      );
      reply.send(analysis);
    }
  );

  /**
   * Get dashboard metrics
   * GET /api/v1/analytics/dashboard
   */
  app.get<{
    Querystring: {
      metricNames?: string;
      startDate: string;
      endDate: string;
      comparisonStartDate?: string;
      comparisonEndDate?: string;
    };
  }>(
    '/api/v1/analytics/dashboard',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get dashboard metrics',
        tags: ['Analytics'],
        querystring: {
          type: 'object',
          required: ['startDate', 'endDate'],
          properties: {
            metricNames: { type: 'string' }, // Comma-separated
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            comparisonStartDate: { type: 'string', format: 'date-time' },
            comparisonEndDate: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'Dashboard metrics',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const metricNames = request.query.metricNames
        ? request.query.metricNames.split(',').map((m) => m.trim())
        : [];

      const metrics = await analyticsService.getDashboardMetrics(
        tenantId,
        metricNames,
        {
          startDate: new Date(request.query.startDate),
          endDate: new Date(request.query.endDate),
        },
        request.query.comparisonStartDate && request.query.comparisonEndDate
          ? {
              startDate: new Date(request.query.comparisonStartDate),
              endDate: new Date(request.query.comparisonEndDate),
            }
          : undefined
      );
      reply.send(metrics);
    }
  );

  // ===== REPORT ROUTES =====

  /**
   * Generate analytics report
   * POST /api/v1/analytics/reports
   */
  app.post<{ Body: Omit<CreateAnalyticsReportInput, 'tenantId' | 'userId'> }>(
    '/api/v1/analytics/reports',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Generate analytics report',
        tags: ['Reports'],
        body: {
          type: 'object',
          required: ['reportName', 'reportType', 'period', 'startDate', 'endDate'],
          properties: {
            projectId: { type: 'string', format: 'uuid' },
            reportName: { type: 'string' },
            reportType: { type: 'string', enum: ['performance', 'usage', 'user_behavior', 'feature_adoption', 'revenue', 'custom'] },
            description: { type: 'string' },
            period: { type: 'string', enum: ['minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'] },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            schedule: {
              type: 'object',
              properties: {
                frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
                recipient: { type: 'string' },
              },
            },
            exportFormats: { type: 'array', items: { type: 'string', enum: ['pdf', 'excel', 'json'] } },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Report generated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateAnalyticsReportInput = {
        ...request.body,
        tenantId,
        userId,
        period: request.body.period as any,
        startDate: new Date(request.body.startDate),
        endDate: new Date(request.body.endDate),
      };

      const report = await reportService.generateReport(input);
      reply.code(201).send(report);
    }
  );

  /**
   * Get report by ID
   * GET /api/v1/analytics/reports/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/analytics/reports/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get analytics report by ID',
        tags: ['Reports'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Report details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const report = await reportService.getById(request.params.id, tenantId);
      reply.send(report);
    }
  );

  /**
   * Update report
   * PUT /api/v1/analytics/reports/:id
   */
  app.put<{ Params: { id: string }; Body: { reportName?: string; description?: string; schedule?: any; exportFormats?: string[] } }>(
    '/api/v1/analytics/reports/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update analytics report',
        tags: ['Reports'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            reportName: { type: 'string' },
            description: { type: 'string' },
            schedule: { type: 'object' },
            exportFormats: { type: 'array', items: { type: 'string', enum: ['pdf', 'excel', 'json'] } },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Report updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const report = await reportService.update(request.params.id, tenantId, request.body);
      reply.send(report);
    }
  );

  /**
   * Delete report
   * DELETE /api/v1/analytics/reports/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/analytics/reports/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete analytics report',
        tags: ['Reports'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Report deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await reportService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List reports
   * GET /api/v1/analytics/reports
   */
  app.get<{
    Querystring: {
      reportType?: string;
      projectId?: string;
      limit?: number;
    };
  }>(
    '/api/v1/analytics/reports',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List analytics reports',
        tags: ['Reports'],
        querystring: {
          type: 'object',
          properties: {
            reportType: { type: 'string', enum: ['performance', 'usage', 'user_behavior', 'feature_adoption', 'revenue', 'custom'] },
            projectId: { type: 'string', format: 'uuid' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of analytics reports',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const reports = await reportService.list(tenantId, {
        reportType: request.query.reportType,
        projectId: request.query.projectId,
        limit: request.query.limit,
      });
      reply.send(reports);
    }
  );
}
