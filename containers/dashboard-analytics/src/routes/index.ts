/**
 * Route registration for dashboard_analytics module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { DashboardAnalyticsService } from '../services/DashboardAnalyticsService';
import { PortfolioAnalyticsService } from '../services/PortfolioAnalyticsService';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const dashboardAnalyticsService = new DashboardAnalyticsService();
    const portfolioAnalyticsService = new PortfolioAnalyticsService();

    // Prioritized opportunities for "Recommended today" (Plan §941). Rank by revenue-at-risk × risk × early-warning; suggestedAction.
    fastify.get(
      '/api/v1/dashboards/manager/prioritized',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get prioritized opportunities for Recommended today (Plan §941). Rank by revenue-at-risk × risk × early-warning; suggestedAction. Calls risk-analytics /prioritized-opportunities when configured.',
          tags: ['Dashboard Analytics'],
          security: [{ bearerAuth: [] }],
          response: {
            200: {
              type: 'object',
              properties: {
                opportunities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      opportunityId: { type: 'string' },
                      revenueAtRisk: { type: 'number' },
                      riskScore: { type: 'number' },
                      earlyWarningScore: { type: 'number' },
                      suggestedAction: { type: 'string' },
                      rankScore: { type: 'number' },
                    },
                  },
                },
                suggestedAction: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const authHeader = typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
          const out = await dashboardAnalyticsService.getPrioritizedOpportunities(tenantId, authHeader);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('getPrioritizedOpportunities failed', error instanceof Error ? error : new Error(msg), { service: 'dashboard-analytics' });
          return reply.status(statusCode).send({
            error: { code: 'PRIORITIZED_OPPORTUNITIES_FAILED', message: msg || 'Failed to get prioritized opportunities' },
          });
        }
      }
    );

    // Manager dashboard (Plan §4.5, §10 Phase 1): widget data for manager view
    fastify.get(
      '/api/v1/dashboards/manager',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get manager dashboard widget data. Aggregates from risk-analytics (revenue-at-risk) and forecasting (tenant forecast) when configured.',
          tags: ['Dashboard Analytics'],
          security: [{ bearerAuth: [] }],
          response: {
            200: {
              type: 'object',
              properties: {
                dashboardType: { type: 'string', enum: ['manager'] },
                widgets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { id: { type: 'string' }, type: { type: 'string' }, title: { type: 'string' }, data: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const authHeader = typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
          const out = await dashboardAnalyticsService.getManagerDashboard(tenantId, authHeader);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('getManagerDashboard failed', error instanceof Error ? error : new Error(msg), { service: 'dashboard-analytics' });
          return reply.status(statusCode).send({
            error: { code: 'MANAGER_DASHBOARD_FAILED', message: msg || 'Failed to get manager dashboard' },
          });
        }
      }
    );

    // Executive dashboard (Plan §4.5, §932): C-suite. Aggregates risk, forecast, competitive; risk_heatmap and industry_benchmark stubbed.
    fastify.get(
      '/api/v1/dashboards/executive',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get executive (C-suite) dashboard. Aggregates from risk-analytics (revenue-at-risk, competitive-intelligence) and forecasting; risk_heatmap and industry_benchmark stubbed.',
          tags: ['Dashboard Analytics'],
          security: [{ bearerAuth: [] }],
          response: {
            200: {
              type: 'object',
              properties: {
                dashboardType: { type: 'string', enum: ['executive'] },
                widgets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { id: { type: 'string' }, type: { type: 'string' }, title: { type: 'string' }, data: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const authHeader = typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
          const out = await dashboardAnalyticsService.getExecutiveDashboard(tenantId, authHeader);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('getExecutiveDashboard failed', error instanceof Error ? error : new Error(msg), { service: 'dashboard-analytics' });
          return reply.status(statusCode).send({
            error: { code: 'EXECUTIVE_DASHBOARD_FAILED', message: msg || 'Failed to get executive dashboard' },
          });
        }
      }
    );

    // Board dashboard (Plan §4.5, §932): high-level KPIs.
    fastify.get(
      '/api/v1/dashboards/board',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get board dashboard. High-level: revenue-at-risk, forecast, competitive win/loss.',
          tags: ['Dashboard Analytics'],
          security: [{ bearerAuth: [] }],
          response: {
            200: {
              type: 'object',
              properties: {
                dashboardType: { type: 'string', enum: ['board'] },
                widgets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { id: { type: 'string' }, type: { type: 'string' }, title: { type: 'string' }, data: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const authHeader = typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
          const out = await dashboardAnalyticsService.getBoardDashboard(tenantId, authHeader);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('getBoardDashboard failed', error instanceof Error ? error : new Error(msg), { service: 'dashboard-analytics' });
          return reply.status(statusCode).send({
            error: { code: 'BOARD_DASHBOARD_FAILED', message: msg || 'Failed to get board dashboard' },
          });
        }
      }
    );

    // Portfolio drill-down (Plan §957): GET /portfolios/:id/summary, /portfolios/:id/accounts; GET /accounts/:id/opportunities; GET /opportunities/:id/activities
    fastify.get<{ Params: { id: string } }>(
      '/api/v1/portfolios/:id/summary',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Portfolio summary (Plan §957). Tenant-level: opportunityCount, accountsCount, totalPipeline from shard-manager.',
          tags: ['Dashboard Analytics'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          response: { 200: { type: 'object', properties: { opportunityCount: { type: 'number' }, accountsCount: { type: 'number' }, totalPipeline: { type: 'number' } } } },
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const tenantId = request.user!.tenantId;
          const authHeader = typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
          const out = await portfolioAnalyticsService.getSummary(id, tenantId, authHeader);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('portfolios summary failed', error instanceof Error ? error : new Error(msg), { service: 'dashboard-analytics' });
          return reply.status(statusCode).send({ error: { code: 'PORTFOLIO_SUMMARY_FAILED', message: msg || 'Failed to get portfolio summary' } });
        }
      }
    );

    fastify.get<{ Params: { id: string } }>(
      '/api/v1/portfolios/:id/accounts',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Portfolio accounts for drill-down (Plan §957). c_account from shard-manager.',
          tags: ['Dashboard Analytics'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          response: { 200: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } } } },
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const tenantId = request.user!.tenantId;
          const authHeader = typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
          const out = await portfolioAnalyticsService.getAccounts(id, tenantId, authHeader);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('portfolios accounts failed', error instanceof Error ? error : new Error(msg), { service: 'dashboard-analytics' });
          return reply.status(statusCode).send({ error: { code: 'PORTFOLIO_ACCOUNTS_FAILED', message: msg || 'Failed to get portfolio accounts' } });
        }
      }
    );

    fastify.get<{ Params: { id: string } }>(
      '/api/v1/accounts/:id/opportunities',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Opportunities for an account (Plan §957). c_opportunity where AccountId=id from shard-manager.',
          tags: ['Dashboard Analytics'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          response: { 200: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, amount: { type: 'number' }, stageName: { type: 'string' } } } } },
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const tenantId = request.user!.tenantId;
          const authHeader = typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
          const out = await portfolioAnalyticsService.getOpportunitiesForAccount(id, tenantId, authHeader);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('accounts opportunities failed', error instanceof Error ? error : new Error(msg), { service: 'dashboard-analytics' });
          return reply.status(statusCode).send({ error: { code: 'ACCOUNTS_OPPORTUNITIES_FAILED', message: msg || 'Failed to get account opportunities' } });
        }
      }
    );

    fastify.get<{ Params: { id: string } }>(
      '/api/v1/opportunities/:id/activities',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Activities for an opportunity (Plan §957). has_activity related shards (c_email, c_call, c_meeting, etc.) from shard-manager.',
          tags: ['Dashboard Analytics'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          response: { 200: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, type: { type: 'string' }, createdAt: { type: 'string' }, summary: { type: 'string' } } } } },
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const tenantId = request.user!.tenantId;
          const authHeader = typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
          const out = await portfolioAnalyticsService.getActivitiesForOpportunity(id, tenantId, authHeader);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('opportunities activities failed', error instanceof Error ? error : new Error(msg), { service: 'dashboard-analytics' });
          return reply.status(statusCode).send({ error: { code: 'OPPORTUNITIES_ACTIVITIES_FAILED', message: msg || 'Failed to get opportunity activities' } });
        }
      }
    );

    // Record dashboard view
    fastify.post<{ Body: { dashboardId: string; widgetId?: string } }>(
      '/api/v1/dashboard/analytics/view',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Record dashboard view',
          tags: ['Dashboard Analytics'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { dashboardId, widgetId } = request.body;
          const tenantId = request.user!.tenantId;

          await dashboardAnalyticsService.recordView(tenantId, dashboardId, widgetId);

          return reply.status(204).send();
        } catch (error: any) {
          log.error('Failed to record dashboard view', error, { service: 'dashboard-analytics' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'VIEW_RECORDING_FAILED',
              message: error.message || 'Failed to record dashboard view',
            },
          });
        }
      }
    );

    // Get widget cache
    fastify.get<{ Params: { widgetId: string } }>(
      '/api/v1/dashboard/widgets/:widgetId/cache',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get widget cache',
          tags: ['Dashboard Analytics'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { widgetId } = request.params;
          const tenantId = request.user!.tenantId;

          const cache = await dashboardAnalyticsService.getWidgetCache(tenantId, widgetId);

          if (!cache) {
            return reply.status(404).send({
              error: {
                code: 'CACHE_NOT_FOUND',
                message: 'Widget cache not found or expired',
              },
            });
          }

          return reply.send(cache);
        } catch (error: any) {
          log.error('Failed to get widget cache', error, { service: 'dashboard-analytics' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'CACHE_RETRIEVAL_FAILED',
              message: error.message || 'Failed to retrieve widget cache',
            },
          });
        }
      }
    );

    log.info('Dashboard analytics routes registered', { service: 'dashboard-analytics' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'dashboard-analytics' });
    throw error;
  }
}
