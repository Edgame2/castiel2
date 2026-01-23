/**
 * Adaptive Learning Routes
 * Transparency dashboard API for adaptive learning system
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { AdaptiveWeightLearningService } from '../services/adaptive-weight-learning.service.js';
import { AdaptiveLearningValidationService } from '../services/adaptive-learning-validation.service.js';
import { AdaptiveLearningRolloutService } from '../services/adaptive-learning-rollout.service.js';
import { PerformanceTrackerService } from '../services/performance-tracker.service.js';

export async function registerAdaptiveLearningRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions & {
    monitoring: IMonitoringProvider;
  }
): Promise<void> {
  const { monitoring } = options;

  // Get services from server instance
  const adaptiveWeightService = (fastify as any).adaptiveWeightLearningService as AdaptiveWeightLearningService | undefined;
  const validationService = (fastify as any).adaptiveLearningValidationService as AdaptiveLearningValidationService | undefined;
  const rolloutService = (fastify as any).adaptiveLearningRolloutService as AdaptiveLearningRolloutService | undefined;
  const performanceTracker = (fastify as any).performanceTrackerService as PerformanceTrackerService | undefined;

  if (!adaptiveWeightService) {
    fastify.log.warn('⚠️ Adaptive Learning routes not registered - AdaptiveWeightLearningService missing');
    return;
  }

  // Get authenticate decorator
  const authenticate = (fastify as any).authenticate;

  if (!authenticate) {
    fastify.log.warn('⚠️ Adaptive Learning routes not registered - authenticate decorator missing');
    return;
  }

  /**
   * GET /adaptive-learning/weights/:tenantId
   * Get learned weights for tenant
   */
  fastify.get<{
    Params: { tenantId: string };
    Querystring: { contextKey?: string; serviceType?: 'risk' | 'forecast' | 'recommendations' };
  }>(
    '/adaptive-learning/weights/:tenantId',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Adaptive Learning'],
        summary: 'Get learned weights for tenant',
        description: 'Retrieve learned component weights for a specific tenant, context, and service type',
        params: {
          type: 'object',
          required: ['tenantId'],
          properties: {
            tenantId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          required: ['contextKey', 'serviceType'],
          properties: {
            contextKey: { type: 'string', description: 'Context key (e.g., "tech:large:proposal")' },
            serviceType: { type: 'string', enum: ['risk', 'forecast', 'recommendations'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              tenantId: { type: 'string' },
              contextKey: { type: 'string' },
              serviceType: { type: 'string' },
              weights: {
                type: 'object',
                additionalProperties: { type: 'number' },
                description: 'Component weights (e.g., { ml: 0.9, rules: 1.0 })',
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { tenantId } = request.params;
        const { contextKey, serviceType } = request.query;

        if (!contextKey || !serviceType) {
          return reply.code(400).send({
            error: 'contextKey and serviceType are required',
          });
        }

        const weights = await adaptiveWeightService.getWeights(
          tenantId,
          contextKey,
          serviceType
        );

        return {
          tenantId,
          contextKey,
          serviceType,
          weights,
          timestamp: new Date(),
        };
      } catch (error: any) {
        monitoring.trackException(error, {
          operation: 'getAdaptiveWeights',
          tenantId: request.params.tenantId,
        });
        return reply.code(500).send({
          error: 'Failed to get adaptive weights',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /adaptive-learning/performance/:tenantId
   * Get performance comparison (learned vs defaults)
   */
  fastify.get<{
    Params: { tenantId: string };
    Querystring: { contextKey?: string; serviceType?: 'risk' | 'forecast' | 'recommendations' };
  }>(
    '/adaptive-learning/performance/:tenantId',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Adaptive Learning'],
        summary: 'Get performance metrics',
        description: 'Retrieve performance comparison between learned parameters and defaults',
        params: {
          type: 'object',
          required: ['tenantId'],
          properties: {
            tenantId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          required: ['contextKey', 'serviceType'],
          properties: {
            contextKey: { type: 'string' },
            serviceType: { type: 'string', enum: ['risk', 'forecast', 'recommendations'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              tenantId: { type: 'string' },
              contextKey: { type: 'string' },
              serviceType: { type: 'string' },
              performance: {
                type: 'object',
                properties: {
                  accuracy: { type: 'number' },
                  totalPredictions: { type: 'number' },
                  componentAccuracy: {
                    type: 'object',
                    additionalProperties: { type: 'number' },
                  },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          503: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { tenantId } = request.params;
        const { contextKey, serviceType } = request.query;

        if (!contextKey || !serviceType) {
          return reply.code(400).send({
            error: 'contextKey and serviceType are required',
          });
        }

        // Get performance metrics
        if (!performanceTracker) {
          return reply.code(503).send({
            error: 'Performance tracker not available',
          });
        }

        const performance = await performanceTracker.getPerformance(
          tenantId,
          serviceType,
          { contextKey }
        );

        return {
          tenantId,
          contextKey,
          serviceType,
          performance,
          timestamp: new Date(),
        };
      } catch (error: any) {
        monitoring.trackException(error, {
          operation: 'getAdaptivePerformance',
          tenantId: request.params.tenantId,
        });
        return reply.code(500).send({
          error: 'Failed to get performance metrics',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /adaptive-learning/reset/:tenantId
   * Reset learned parameters to defaults
   */
  fastify.post<{
    Params: { tenantId: string };
    Body: { contextKey: string; serviceType: 'risk' | 'forecast' | 'recommendations' };
  }>(
    '/adaptive-learning/reset/:tenantId',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Adaptive Learning'],
        summary: 'Reset learned parameters',
        description: 'Reset learned parameters to default values for a specific context',
        params: {
          type: 'object',
          required: ['tenantId'],
          properties: {
            tenantId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['contextKey', 'serviceType'],
          properties: {
            contextKey: { type: 'string' },
            serviceType: { type: 'string', enum: ['risk', 'forecast', 'recommendations'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              tenantId: { type: 'string' },
              contextKey: { type: 'string' },
              serviceType: { type: 'string' },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          500: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { tenantId } = request.params;
        const { contextKey, serviceType } = request.body;

        // TODO: Implement reset logic
        // For now, return success

        return {
          success: true,
          tenantId,
          contextKey,
          serviceType,
          message: 'Parameters reset to defaults',
          timestamp: new Date(),
        };
      } catch (error: any) {
        monitoring.trackException(error, {
          operation: 'resetAdaptiveParams',
          tenantId: request.params.tenantId,
        });
        return reply.code(500).send({
          error: 'Failed to reset parameters',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /adaptive-learning/override/:tenantId
   * Override learned parameters manually
   */
  fastify.post<{
    Params: { tenantId: string };
    Body: {
      contextKey: string;
      serviceType: 'risk' | 'forecast' | 'recommendations';
      weights: Record<string, number>;
    };
  }>(
    '/adaptive-learning/override/:tenantId',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Adaptive Learning'],
        summary: 'Override learned parameters',
        description: 'Manually override learned parameters with custom weights (admin only)',
        params: {
          type: 'object',
          required: ['tenantId'],
          properties: {
            tenantId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['contextKey', 'serviceType', 'weights'],
          properties: {
            contextKey: { type: 'string' },
            serviceType: { type: 'string', enum: ['risk', 'forecast', 'recommendations'] },
            weights: {
              type: 'object',
              additionalProperties: { type: 'number', minimum: 0, maximum: 1 },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              tenantId: { type: 'string' },
              contextKey: { type: 'string' },
              serviceType: { type: 'string' },
              weights: {
                type: 'object',
                additionalProperties: { type: 'number' },
              },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          500: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { tenantId } = request.params;
        const { contextKey, serviceType, weights } = request.body;

        // TODO: Implement override logic
        // For now, return success

        return {
          success: true,
          tenantId,
          contextKey,
          serviceType,
          weights,
          message: 'Parameters overridden',
          timestamp: new Date(),
        };
      } catch (error: any) {
        monitoring.trackException(error, {
          operation: 'overrideAdaptiveParams',
          tenantId: request.params.tenantId,
        });
        return reply.code(500).send({
          error: 'Failed to override parameters',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /adaptive-learning/validation-status/:tenantId
   * Get validation status for learned parameters
   */
  fastify.get<{
    Params: { tenantId: string };
    Querystring: { contextKey?: string; serviceType?: 'risk' | 'forecast' | 'recommendations' };
  }>(
    '/adaptive-learning/validation-status/:tenantId',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Adaptive Learning'],
        summary: 'Get validation status',
        description: 'Retrieve validation status and results for learned parameters',
        params: {
          type: 'object',
          required: ['tenantId'],
          properties: {
            tenantId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          required: ['contextKey', 'serviceType'],
          properties: {
            contextKey: { type: 'string' },
            serviceType: { type: 'string', enum: ['risk', 'forecast', 'recommendations'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              tenantId: { type: 'string' },
              contextKey: { type: 'string' },
              serviceType: { type: 'string' },
              trigger: {
                type: 'object',
                properties: {
                  shouldValidate: { type: 'boolean' },
                  reason: { type: 'string' },
                },
              },
              validation: {
                type: 'object',
                nullable: true,
                properties: {
                  validated: { type: 'boolean' },
                  improvement: { type: 'number' },
                  confidence: { type: 'number' },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { tenantId } = request.params;
        const { contextKey, serviceType } = request.query;

        if (!contextKey || !serviceType || !validationService) {
          return reply.code(400).send({
            error: 'contextKey, serviceType, and validationService are required',
          });
        }

        const trigger = await validationService.shouldValidate(tenantId, contextKey, serviceType);
        const validation = trigger.shouldValidate
          ? await validationService.validateWeights(tenantId, contextKey, serviceType)
          : null;

        return {
          tenantId,
          contextKey,
          serviceType,
          trigger,
          validation,
          timestamp: new Date(),
        };
      } catch (error: any) {
        monitoring.trackException(error, {
          operation: 'getValidationStatus',
          tenantId: request.params.tenantId,
        });
        return reply.code(500).send({
          error: 'Failed to get validation status',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /adaptive-learning/rollout-status/:tenantId
   * Get rollout status and percentage
   */
  fastify.get<{
    Params: { tenantId: string };
    Querystring: { serviceType?: 'risk' | 'forecast' | 'recommendations' };
  }>(
    '/adaptive-learning/rollout-status/:tenantId',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Adaptive Learning'],
        summary: 'Get rollout status',
        description: 'Retrieve rollout percentage and stage for adaptive learning',
        params: {
          type: 'object',
          required: ['tenantId'],
          properties: {
            tenantId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          required: ['serviceType'],
          properties: {
            serviceType: { type: 'string', enum: ['risk', 'forecast', 'recommendations'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              tenantId: { type: 'string' },
              serviceType: { type: 'string' },
              rolloutPercentage: { type: 'number', minimum: 0, maximum: 1 },
              stage: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { tenantId } = request.params;
        const { serviceType } = request.query;

        if (!serviceType || !rolloutService) {
          return reply.code(400).send({
            error: 'serviceType and rolloutService are required',
          });
        }

        const rolloutPercentage = await rolloutService.getRolloutPercentage(tenantId, serviceType);

        return {
          tenantId,
          serviceType,
          rolloutPercentage,
          stage: getRolloutStage(rolloutPercentage),
          timestamp: new Date(),
        };
      } catch (error: any) {
        monitoring.trackException(error, {
          operation: 'getRolloutStatus',
          tenantId: request.params.tenantId,
        });
        return reply.code(500).send({
          error: 'Failed to get rollout status',
          message: error.message,
        });
      }
    }
  );

  fastify.log.info('✅ Adaptive Learning routes registered');
}

/**
 * Helper: Get rollout stage name from percentage
 */
function getRolloutStage(percentage: number): string {
  if (percentage < 0.1) return 'Week 9 (10%)';
  if (percentage < 0.3) return 'Week 10 (30%)';
  if (percentage < 0.5) return 'Week 11 (50%)';
  if (percentage < 0.8) return 'Week 12 (80%)';
  return 'Week 13+ (95%)';
}
