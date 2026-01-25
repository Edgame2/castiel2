/**
 * Route registration for forecasting module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { ForecastingService } from '../services/ForecastingService';
import { ForecastAccuracyService } from '../services/ForecastAccuracyService';
import { getContainer } from '@coder/shared/database';
import type { ForecastType, TeamForecastAggregateRequest } from '../types/forecasting.types';
import { forecastsGeneratedTotal } from '../metrics';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const forecastingService = new ForecastingService(fastify);
    const accuracyService = new ForecastAccuracyService();

    // P10/P50/P90 scenarios for period (FIRST_STEPS §8, Plan §4.3)
    fastify.get<{ Params: { period: string } }>(
      '/api/v1/forecasts/:period/scenarios',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get P10/P50/P90 scenario forecast for a period (ForecastingService.getScenarioForecast). Stub: derives from tenant aggregate.',
          tags: ['Forecasting'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { period: { type: 'string' } } },
          response: {
            200: {
              type: 'object',
              properties: {
                period: { type: 'string' },
                p10: { type: 'number' },
                p50: { type: 'number' },
                p90: { type: 'number' },
                scenarios: {
                  type: 'array',
                  items: { type: 'object', properties: { scenario: { type: 'string' }, forecast: { type: 'number' }, probability: { type: 'number' } } },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { period } = request.params;
          const tenantId = request.user!.tenantId;
          const out = await forecastingService.getScenarioForecast(tenantId, period);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Scenarios forecast failed', error instanceof Error ? error : new Error(msg), { service: 'forecasting' });
          return reply.status(statusCode).send({
            error: { code: 'SCENARIOS_FORECAST_FAILED', message: msg || 'Failed to get scenario forecast' },
          });
        }
      }
    );

    // Risk-adjusted forecast for period (FIRST_STEPS §8, Plan §4.3)
    fastify.get<{ Params: { period: string } }>(
      '/api/v1/forecasts/:period/risk-adjusted',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get risk-adjusted forecast for a period (ForecastingService.getRiskAdjustedForecast). Uses tenant aggregate; risk from risk-analytics when stored.',
          tags: ['Forecasting'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { period: { type: 'string' } } },
          response: {
            200: {
              type: 'object',
              properties: {
                period: { type: 'string' },
                forecast: { type: 'number' },
                riskAdjustedForecast: { type: 'number' },
                opportunityCount: { type: 'number' },
                startDate: { type: 'string' },
                endDate: { type: 'string' },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { period } = request.params;
          const tenantId = request.user!.tenantId;
          const out = await forecastingService.getRiskAdjustedForecast(tenantId, period);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Risk-adjusted forecast failed', error instanceof Error ? error : new Error(msg), { service: 'forecasting' });
          return reply.status(statusCode).send({
            error: { code: 'RISK_ADJUSTED_FORECAST_FAILED', message: msg || 'Failed to get risk-adjusted forecast' },
          });
        }
      }
    );

    // ML-only forecast for period (FIRST_STEPS §8, Plan §4.3)
    fastify.get<{ Params: { period: string } }>(
      '/api/v1/forecasts/:period/ml',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get ML-only forecast for a period (ForecastingService.getMLForecast). Stub: tenant aggregate + P10/P50/P90 band; modelId=stub. Wire to ml-service revenue-forecasting-model when available.',
          tags: ['Forecasting'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { period: { type: 'string' } } },
          response: {
            200: {
              type: 'object',
              properties: {
                period: { type: 'string' },
                pointForecast: { type: 'number' },
                uncertainty: { type: 'object', properties: { p10: { type: 'number' }, p50: { type: 'number' }, p90: { type: 'number' } } },
                modelId: { type: 'string' },
                scenarios: {
                  type: 'array',
                  items: { type: 'object', properties: { scenario: { type: 'string' }, forecast: { type: 'number' }, probability: { type: 'number' } } },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { period } = request.params;
          const tenantId = request.user!.tenantId;
          const out = await forecastingService.getMLForecast(tenantId, period);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('ML forecast failed', error instanceof Error ? error : new Error(msg), { service: 'forecasting' });
          return reply.status(statusCode).send({
            error: { code: 'ML_FORECAST_FAILED', message: msg || 'Failed to get ML forecast' },
          });
        }
      }
    );

    // Get forecast by ID
    fastify.get<{ Params: { forecastId: string } }>(
      '/api/v1/forecasts/:forecastId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get forecast by ID',
          tags: ['Forecasting'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { forecastId } = request.params;
          const tenantId = request.user!.tenantId;

          const container = getContainer('forecast_decompositions');
          const { resource } = await container.item(forecastId, tenantId).read();

          if (!resource) {
            return reply.status(404).send({
              error: {
                code: 'FORECAST_NOT_FOUND',
                message: 'Forecast not found',
              },
            });
          }

          return reply.send(resource);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get forecast', error instanceof Error ? error : new Error(msg), { service: 'forecasting' });
          return reply.status(statusCode).send({
            error: { code: 'FORECAST_RETRIEVAL_FAILED', message: msg || 'Failed to retrieve forecast' },
          });
        }
      }
    );

    // Get forecasts for opportunity
    fastify.get<{ Querystring: { opportunityId: string } }>(
      '/api/v1/forecasts',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get forecasts for opportunity',
          tags: ['Forecasting'],
          security: [{ bearerAuth: [] }],
          querystring: {
            type: 'object',
            properties: {
              opportunityId: { type: 'string' },
            },
            required: ['opportunityId'],
          },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.query;
          const tenantId = request.user!.tenantId;

          const container = getContainer('forecast_decompositions');
          const { resources } = await container.items
            .query({
              query: 'SELECT * FROM c WHERE c.opportunityId = @opportunityId AND c.tenantId = @tenantId ORDER BY c.calculatedAt DESC',
              parameters: [
                { name: '@opportunityId', value: opportunityId },
                { name: '@tenantId', value: tenantId },
              ],
            })
            .fetchNext();

          return reply.send({
            forecasts: resources,
            total: resources.length,
          });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to list forecasts', error instanceof Error ? error : new Error(msg), { service: 'forecasting' });
          return reply.status(statusCode).send({
            error: { code: 'FORECAST_LISTING_FAILED', message: msg || 'Failed to list forecasts' },
          });
        }
      }
    );

    // Trigger forecast generation (synchronous)
    fastify.post<{ Body: { opportunityId: string; includeDecomposition?: boolean; includeConsensus?: boolean; includeCommitment?: boolean } }>(
      '/api/v1/forecasts',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Trigger forecast generation for an opportunity',
          tags: ['Forecasting'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId, includeDecomposition, includeConsensus, includeCommitment } = request.body;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          const forecast = await forecastingService.generateForecast({
            opportunityId,
            tenantId,
            userId,
            includeDecomposition,
            includeConsensus,
            includeCommitment,
          });
          forecastsGeneratedTotal.inc();

          return reply.status(202).send({
            forecastId: forecast.forecastId,
            status: 'completed',
            forecast,
          });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to trigger forecast', error instanceof Error ? error : new Error(msg), { service: 'forecasting' });
          return reply.status(statusCode).send({
            error: { code: 'FORECAST_GENERATION_FAILED', message: msg || 'Failed to generate forecast' },
          });
        }
      }
    );

    // Record actual value for forecast accuracy (MISSING_FEATURES 5.4)
    fastify.post<{
      Body: { opportunityId: string; forecastType: ForecastType; actualValue: number; actualAt?: string; predictionId?: string };
    }>(
      '/api/v1/accuracy/actuals',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Record actual outcome for a forecast prediction',
          tags: ['Forecasting', 'Accuracy'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            required: ['opportunityId', 'forecastType', 'actualValue'],
            properties: {
              opportunityId: { type: 'string' },
              forecastType: { type: 'string', enum: ['revenue', 'closeDate'] },
              actualValue: { type: 'number' },
              actualAt: { type: 'string', format: 'date-time' },
              predictionId: { type: 'string' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const body = request.body;
          const updated = await accuracyService.recordActual(tenantId, {
            opportunityId: body.opportunityId,
            forecastType: body.forecastType,
            actualValue: body.actualValue,
            actualAt: body.actualAt,
            predictionId: body.predictionId,
          });
          if (!updated) {
            return reply.status(404).send({
              error: { code: 'PREDICTION_NOT_FOUND', message: 'No matching prediction found for this opportunity and forecast type' },
            });
          }
          return reply.send(updated);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to record actual', error instanceof Error ? error : new Error(msg), { service: 'forecasting' });
          return reply.status(500).send({
            error: { code: 'RECORD_ACTUAL_FAILED', message: msg || 'Failed to record actual' },
          });
        }
      }
    );

    // Team-level forecast aggregation (MISSING_FEATURES 5.5)
    fastify.post<{ Body: TeamForecastAggregateRequest }>(
      '/api/v1/forecasts/team',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Team-level forecast aggregate: total pipeline, risk-adjusted; requires opportunityIds (from pipeline/shard/analytics)',
          tags: ['Forecasting'],
          body: {
            type: 'object',
            required: ['teamId', 'opportunityIds'],
            properties: {
              teamId: { type: 'string' },
              opportunityIds: { type: 'array', items: { type: 'string' }, minItems: 0 },
              startDate: { type: 'string' },
              endDate: { type: 'string' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const result = await forecastingService.aggregateTeamForecast(tenantId, request.body);
          return reply.send(result);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Team forecast aggregate failed', error instanceof Error ? error : new Error(msg), { service: 'forecasting' });
          return reply.status(statusCode).send({
            error: { code: 'TEAM_FORECAST_FAILED', message: msg || 'Failed to aggregate team forecast' },
          });
        }
      }
    );

    // Tenant-level forecast aggregation (MISSING_FEATURES 5.5)
    fastify.get<{ Querystring: { startDate?: string; endDate?: string } }>(
      '/api/v1/forecasts/tenant',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Tenant-level forecast aggregate: total revenue, risk-adjusted, opportunity count',
          tags: ['Forecasting'],
          querystring: {
            type: 'object',
            properties: { startDate: { type: 'string' }, endDate: { type: 'string' } },
          },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const result = await forecastingService.aggregateTenantForecast(tenantId, {
            startDate: request.query.startDate,
            endDate: request.query.endDate,
          });
          return reply.send(result);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Tenant forecast aggregate failed', error instanceof Error ? error : new Error(msg), { service: 'forecasting' });
          return reply.status(statusCode).send({
            error: { code: 'TENANT_FORECAST_FAILED', message: msg || 'Failed to aggregate tenant forecast' },
          });
        }
      }
    );

    // Get forecast accuracy metrics (MAPE, bias, R²)
    fastify.get<{ Querystring: { forecastType?: ForecastType; startDate?: string; endDate?: string } }>(
      '/api/v1/accuracy/metrics',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get forecast accuracy metrics: MAPE, forecast bias, R²',
          tags: ['Forecasting', 'Accuracy'],
          security: [{ bearerAuth: [] }],
          querystring: {
            type: 'object',
            properties: {
              forecastType: { type: 'string', enum: ['revenue', 'closeDate'] },
              startDate: { type: 'string' },
              endDate: { type: 'string' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const { forecastType, startDate, endDate } = request.query;
          const metrics = await accuracyService.getAccuracyMetrics(tenantId, {
            forecastType,
            startDate,
            endDate,
          });
          return reply.send(metrics);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get accuracy metrics', error instanceof Error ? error : new Error(msg), { service: 'forecasting' });
          return reply.status(500).send({
            error: { code: 'ACCURACY_METRICS_FAILED', message: msg || 'Failed to get accuracy metrics' },
          });
        }
      }
    );

    log.info('Forecasting routes registered', { service: 'forecasting' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'forecasting' });
    throw error;
  }
}
