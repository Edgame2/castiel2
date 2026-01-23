import { FastifyInstance } from 'fastify';
import { AIRecommendationService } from '../services/ai-insights/ai-recommendation.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { AIRecommendationRequest, AIRecommendationResponse } from '@castiel/shared-types';

/**
 * Register AI recommendation routes
 */
export async function registerAIRecommendationRoutes(
  fastify: FastifyInstance,
  aiRecommendationService: AIRecommendationService
): Promise<void> {
  /**
   * POST /api/v1/ai-recommendations/generate
   * Generate an AI recommendation
   */
  fastify.post<{
    Body: AIRecommendationRequest;
    Reply: AIRecommendationResponse | { error: string };
  }>('/ai-recommendations/generate', {
    preHandler: authenticate(null),
    schema: {
      tags: ['AI Recommendations'],
      description: 'Generate an AI-powered recommendation',
      body: {
        type: 'object',
        required: ['type', 'context'],
        properties: {
          type: {
            type: 'string',
            enum: [
              'schemaRecommendation',
              'embeddingTemplate',
              'uiSchemaRecommendation',
              'computedFieldRecommendation',
              'searchQueryRecommendation',
              'validationRuleRecommendation',
              'userIntentRecommendation',
              'promptGenerationRecommendation',
              'projectImprovementRecommendation',
            ],
          },
          context: {
            type: 'object',
            properties: {
              tenantId: { type: 'string' },
              userId: { type: 'string' },
              shardType: { type: 'object' },
              parentShardType: { type: 'object' },
              relatedShardTypes: { type: 'array' },
              dataSamples: { type: 'array' },
              tenantConventions: { type: 'object' },
              userPreferences: { type: 'object' },
              field: { type: 'object' },
              additionalContext: { type: 'object' },
            },
          },
          options: {
            type: 'object',
            properties: {
              maxOptions: { type: 'number', minimum: 1, maximum: 5 },
              temperature: { type: 'number', minimum: 0, maximum: 1 },
              maxTokens: { type: 'number' },
              preferredModel: { type: 'string' },
            },
          },
        },
      },
      response: {
        200: {
          description: 'Recommendation generated successfully',
          type: 'object',
          properties: {
            type: { type: 'string' },
            options: { type: 'array' },
            metadata: { type: 'object' },
            suggestedNextAction: { type: 'object' },
          },
        },
        400: {
          description: 'Invalid request',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        429: {
          description: 'Rate limit exceeded',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        500: {
          description: 'Server error',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { type, context, options } = request.body;

      // Extract user/tenant from auth token
      const user = (request as any).user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Merge auth context with request context
      const enrichedContext = {
        ...context,
        tenantId: user.tenantId,
        userId: user.id,
      };

      // Check if recommendation type is supported
      if (!aiRecommendationService.isSupported(type)) {
        return reply.status(400).send({
          error: `Recommendation type '${type}' is not supported. Supported types: ${aiRecommendationService
            .getSupportedTypes()
            .join(', ')}`,
        });
      }

      // Generate recommendation
      const response = await aiRecommendationService.generate({
        type,
        context: enrichedContext,
        options,
      });

      return reply.status(200).send(response);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const err = error instanceof Error ? error : new Error(errorMessage);

      // Handle rate limit errors
      if (errorMessage.includes('Rate limit exceeded')) {
        return reply.status(429).send({ error: errorMessage });
      }

      // Handle validation errors
      if (errorMessage.includes('No prompt found') || errorMessage.includes('validation')) {
        return reply.status(400).send({ error: errorMessage });
      }

      // Log and return generic error
      fastify.log.error(err, 'Error generating AI recommendation');
      return reply.status(500).send({
        error: 'Failed to generate recommendation. Please try again.',
      });
    }
  });

  /**
   * GET /api/v1/ai-recommendations/types
   * Get list of supported recommendation types
   */
  fastify.get<{
    Reply: { types: string[] } | { error: string };
  }>('/ai-recommendations/types', {
    preHandler: authenticate(null),
    schema: {
      tags: ['AI Recommendations'],
      description: 'Get list of supported recommendation types',
      response: {
        200: {
          description: 'List of supported types',
          type: 'object',
          properties: {
            types: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const types = aiRecommendationService.getSupportedTypes();
    return reply.status(200).send({ types });
  });

  /**
   * GET /api/v1/ai-recommendations/rate-limit
   * Get rate limit status for current user
   */
  fastify.get<{
    Reply: any;
  }>('/ai-recommendations/rate-limit', {
    preHandler: authenticate(null),
    schema: {
      tags: ['AI Recommendations'],
      description: 'Get rate limit status for current user',
      response: {
        200: {
          description: 'Rate limit status',
          type: 'object',
          properties: {
            user: { type: 'object' },
            tenant: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userStatus = aiRecommendationService.getRateLimitStatus(user.tenantId, user.userId);
    const tenantStatus = aiRecommendationService.getRateLimitStatus(user.tenantId);

    return reply.status(200).send({
      user: userStatus,
      tenant: tenantStatus,
    });
  });

  /**
   * GET /api/v1/ai-recommendations/costs
   * Get cost tracking data for current tenant
   */
  fastify.get<{
    Querystring: { startDate?: string; endDate?: string };
    Reply: any;
  }>('/ai-recommendations/costs', {
    preHandler: authenticate(null),
    schema: {
      tags: ['AI Recommendations'],
      description: 'Get cost tracking data for current tenant',
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        200: {
          description: 'Cost tracking data',
          type: 'object',
          properties: {
            entries: { type: 'array' },
            monthlyTotal: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { startDate, endDate } = request.query;

    const entries = aiRecommendationService.getCostTracking(
      user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    const monthlyTotal = aiRecommendationService.getMonthlyTotal(user.tenantId);

    return reply.status(200).send({
      entries,
      monthlyTotal,
    });
  });
}
