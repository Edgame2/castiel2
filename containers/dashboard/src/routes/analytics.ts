/**
 * Dashboard analytics routes (merged from dashboard-analytics container).
 * Paths: /api/v1/dashboards/..., /api/v1/portfolios/..., /api/v1/accounts/..., /api/v1/opportunities/..., /api/v1/dashboard/analytics/...
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { DashboardAnalyticsService } from '../services/DashboardAnalyticsService';
import { PortfolioAnalyticsService } from '../services/PortfolioAnalyticsService';
import { log } from '../utils/logger';

export async function analyticsRoutes(fastify: FastifyInstance): Promise<void> {
  const dashboardAnalyticsService = new DashboardAnalyticsService();
  const portfolioAnalyticsService = new PortfolioAnalyticsService();

  fastify.get(
    '/api/v1/dashboards/manager/prioritized',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get prioritized opportunities for Recommended today',
        tags: ['Dashboard Analytics'],
        response: { 200: { type: 'object', properties: { opportunities: { type: 'array' }, suggestedAction: { type: ['string', 'null'] } } } },
      } as any,
    },
    async (request, reply) => {
      try {
        const tenantId = (request as any).user?.tenantId;
        const authHeader = typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
        const out = await dashboardAnalyticsService.getPrioritizedOpportunities(tenantId, authHeader);
        return reply.send(out);
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
        const msg = error instanceof Error ? error.message : String(error);
        log.error('getPrioritizedOpportunities failed', error instanceof Error ? error : new Error(msg), { service: 'dashboard' });
        return (reply as any).status(statusCode).send({ error: { code: 'PRIORITIZED_OPPORTUNITIES_FAILED', message: msg || 'Failed to get prioritized opportunities' } });
      }
    }
  );

  fastify.get(
    '/api/v1/dashboards/manager',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get manager dashboard widget data',
        tags: ['Dashboard Analytics'],
        response: { 200: { type: 'object', properties: { dashboardType: { type: 'string', enum: ['manager'] }, widgets: { type: 'array' } } } },
      } as any,
    },
    async (request, reply) => {
      try {
        const tenantId = (request as any).user?.tenantId;
        const authHeader = typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
        const out = await dashboardAnalyticsService.getManagerDashboard(tenantId, authHeader);
        return reply.send(out);
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
        const msg = error instanceof Error ? error.message : String(error);
        log.error('getManagerDashboard failed', error instanceof Error ? error : new Error(msg), { service: 'dashboard' });
        return (reply as any).status(statusCode).send({ error: { code: 'MANAGER_DASHBOARD_FAILED', message: msg || 'Failed to get manager dashboard' } });
      }
    }
  );

  fastify.get(
    '/api/v1/dashboards/executive',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get executive (C-suite) dashboard',
        tags: ['Dashboard Analytics'],
        response: { 200: { type: 'object', properties: { dashboardType: { type: 'string', enum: ['executive'] }, widgets: { type: 'array' } } } },
      } as any,
    },
    async (request, reply) => {
      try {
        const tenantId = (request as any).user?.tenantId;
        const authHeader = typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
        const out = await dashboardAnalyticsService.getExecutiveDashboard(tenantId, authHeader);
        return reply.send(out);
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
        const msg = error instanceof Error ? error.message : String(error);
        log.error('getExecutiveDashboard failed', error instanceof Error ? error : new Error(msg), { service: 'dashboard' });
        return (reply as any).status(statusCode).send({ error: { code: 'EXECUTIVE_DASHBOARD_FAILED', message: msg || 'Failed to get executive dashboard' } });
      }
    }
  );

  fastify.get(
    '/api/v1/dashboards/board',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get board dashboard',
        tags: ['Dashboard Analytics'],
        response: { 200: { type: 'object', properties: { dashboardType: { type: 'string', enum: ['board'] }, widgets: { type: 'array' } } } },
      } as any,
    },
    async (request, reply) => {
      try {
        const tenantId = (request as any).user?.tenantId;
        const authHeader = typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
        const out = await dashboardAnalyticsService.getBoardDashboard(tenantId, authHeader);
        return reply.send(out);
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
        const msg = error instanceof Error ? error.message : String(error);
        log.error('getBoardDashboard failed', error instanceof Error ? error : new Error(msg), { service: 'dashboard' });
        return (reply as any).status(statusCode).send({ error: { code: 'BOARD_DASHBOARD_FAILED', message: msg || 'Failed to get board dashboard' } });
      }
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/api/v1/portfolios/:id/summary',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: { description: 'Portfolio summary', tags: ['Dashboard Analytics'], params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }, response: { 200: { type: 'object' } } } as any,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tenantId = (request as any).user?.tenantId;
        const authHeader = typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
        const out = await portfolioAnalyticsService.getSummary(id, tenantId, authHeader);
        return reply.send(out);
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
        const msg = error instanceof Error ? error.message : String(error);
        log.error('portfolios summary failed', error instanceof Error ? error : new Error(msg), { service: 'dashboard' });
        return (reply as any).status(statusCode).send({ error: { code: 'PORTFOLIO_SUMMARY_FAILED', message: msg || 'Failed to get portfolio summary' } });
      }
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/api/v1/portfolios/:id/accounts',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: { description: 'Portfolio accounts', tags: ['Dashboard Analytics'], params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }, response: { 200: { type: 'array' } } } as any,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tenantId = (request as any).user?.tenantId;
        const authHeader = typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
        const out = await portfolioAnalyticsService.getAccounts(id, tenantId, authHeader);
        return reply.send(out);
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
        const msg = error instanceof Error ? error.message : String(error);
        log.error('portfolios accounts failed', error instanceof Error ? error : new Error(msg), { service: 'dashboard' });
        return (reply as any).status(statusCode).send({ error: { code: 'PORTFOLIO_ACCOUNTS_FAILED', message: msg || 'Failed to get portfolio accounts' } });
      }
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/api/v1/accounts/:id/opportunities',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: { description: 'Opportunities for an account', tags: ['Dashboard Analytics'], params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }, response: { 200: { type: 'array' } } } as any,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tenantId = (request as any).user?.tenantId;
        const authHeader = typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
        const out = await portfolioAnalyticsService.getOpportunitiesForAccount(id, tenantId, authHeader);
        return reply.send(out);
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
        const msg = error instanceof Error ? error.message : String(error);
        log.error('accounts opportunities failed', error instanceof Error ? error : new Error(msg), { service: 'dashboard' });
        return (reply as any).status(statusCode).send({ error: { code: 'ACCOUNTS_OPPORTUNITIES_FAILED', message: msg || 'Failed to get account opportunities' } });
      }
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/api/v1/opportunities/:id/activities',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: { description: 'Activities for an opportunity', tags: ['Dashboard Analytics'], params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }, response: { 200: { type: 'array' } } } as any,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tenantId = (request as any).user?.tenantId;
        const authHeader = typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
        const out = await portfolioAnalyticsService.getActivitiesForOpportunity(id, tenantId, authHeader);
        return reply.send(out);
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
        const msg = error instanceof Error ? error.message : String(error);
        log.error('opportunities activities failed', error instanceof Error ? error : new Error(msg), { service: 'dashboard' });
        return (reply as any).status(statusCode).send({ error: { code: 'OPPORTUNITIES_ACTIVITIES_FAILED', message: msg || 'Failed to get opportunity activities' } });
      }
    }
  );

  fastify.post<{ Body: { dashboardId: string; widgetId?: string } }>(
    '/api/v1/dashboard/analytics/view',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: { description: 'Record dashboard view', tags: ['Dashboard Analytics'] } as any,
    },
    async (request, reply) => {
      try {
        const { dashboardId, widgetId } = request.body;
        const tenantId = (request as any).user?.tenantId;
        await dashboardAnalyticsService.recordView(tenantId, dashboardId, widgetId);
        return reply.status(204).send();
      } catch (error: any) {
        log.error('Failed to record dashboard view', error, { service: 'dashboard' });
        return reply.status(error.statusCode || 500).send({
          error: { code: 'VIEW_RECORDING_FAILED', message: error.message || 'Failed to record dashboard view' },
        });
      }
    }
  );

  fastify.get<{ Params: { widgetId: string } }>(
    '/api/v1/dashboard/widgets/:widgetId/cache',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: { description: 'Get widget cache', tags: ['Dashboard Analytics'] } as any,
    },
    async (request, reply) => {
      try {
        const { widgetId } = request.params;
        const tenantId = (request as any).user?.tenantId;
        const cache = await dashboardAnalyticsService.getWidgetCache(tenantId, widgetId);
        if (!cache) {
          return reply.status(404).send({ error: { code: 'CACHE_NOT_FOUND', message: 'Widget cache not found or expired' } });
        }
        return reply.send(cache);
      } catch (error: any) {
        log.error('Failed to get widget cache', error, { service: 'dashboard' });
        return reply.status(error.statusCode || 500).send({
          error: { code: 'CACHE_RETRIEVAL_FAILED', message: error.message || 'Failed to retrieve widget cache' },
        });
      }
    }
  );

  log.info('Dashboard analytics routes registered', { service: 'dashboard' });
}
