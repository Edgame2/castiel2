/**
 * Route registration for signal_intelligence module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { SignalIntelligenceService } from '../services/SignalIntelligenceService.js';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, _config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const signalIntelligenceService = new SignalIntelligenceService();

    // Analyze signal
    fastify.post<{ Body: { signalType: string; source: string; data: any } }>(
      '/api/v1/signals/analyze',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Analyze signal',
          tags: ['Signal Intelligence'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { signalType, source, data } = request.body;
          const tenantId = (request as any).user?.tenantId;

          const signal = await signalIntelligenceService.analyzeSignal(tenantId, {
            signalType: signalType as any,
            source,
            data,
            analyzed: false,
          });

          return reply.status(201).send(signal);
        } catch (error: any) {
          log.error('Failed to analyze signal', error, { service: 'signal-intelligence' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'SIGNAL_ANALYSIS_FAILED',
              message: error.message || 'Failed to analyze signal',
            },
          });
        }
      }
    );

    log.info('Signal intelligence routes registered', { service: 'signal-intelligence' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'signal-intelligence' });
    throw error;
  }
}
