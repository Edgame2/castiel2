/**
 * Route registration for forecasting module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { ForecastingService } from '../services/ForecastingService';
import { getContainer } from '@coder/shared/database';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const forecastingService = new ForecastingService(fastify);

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
        } catch (error: any) {
          log.error('Failed to get forecast', error, { service: 'forecasting' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'FORECAST_RETRIEVAL_FAILED',
              message: error.message || 'Failed to retrieve forecast',
            },
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
        } catch (error: any) {
          log.error('Failed to list forecasts', error, { service: 'forecasting' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'FORECAST_LISTING_FAILED',
              message: error.message || 'Failed to list forecasts',
            },
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

          return reply.status(202).send({
            forecastId: forecast.forecastId,
            status: 'completed',
            forecast,
          });
        } catch (error: any) {
          log.error('Failed to trigger forecast', error, { service: 'forecasting' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'FORECAST_GENERATION_FAILED',
              message: error.message || 'Failed to generate forecast',
            },
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
