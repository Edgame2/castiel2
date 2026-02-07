/**
 * Route registration for web_search module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { WebSearchService } from '../services/WebSearchService';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, _config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const webSearchService = new WebSearchService();

    // Perform web search
    fastify.post<{ Body: { query: string; limit?: number; useCache?: boolean } }>(
      '/api/v1/web-search',
      {
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
        schema: {
          description: 'Perform web search',
          tags: ['Web Search'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { query, limit, useCache } = request.body;
          const tenantId = (request as any).user!.tenantId;

          const result = await webSearchService.search(tenantId, query, { limit, useCache });

          return reply.send(result);
        } catch (error: any) {
          log.error('Failed to perform web search', error, { service: 'web-search' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'WEB_SEARCH_FAILED',
              message: error.message || 'Failed to perform web search',
            },
          });
        }
      }
    );

    log.info('Web search routes registered', { service: 'web-search' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'web-search' });
    throw error;
  }
}
