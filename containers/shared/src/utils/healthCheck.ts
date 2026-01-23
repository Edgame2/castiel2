/**
 * Health Check Utilities
 * @module @coder/shared/utils
 */

import { FastifyInstance } from 'fastify';
import { healthCheck as dbHealthCheck } from '../database';

/**
 * Setup health check endpoints
 * Registers /health (liveness) and /ready (readiness) endpoints
 */
export function setupHealthCheck(server: FastifyInstance): void {
  // Liveness probe - is the process running?
  server.get('/health', {
    schema: {
      description: 'Health check endpoint (liveness probe)',
      tags: ['Health'],
      summary: 'Liveness probe',
      response: {
        200: {
          description: 'Service is healthy',
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness probe - can it handle requests?
  server.get('/ready', {
    schema: {
      description: 'Readiness probe endpoint',
      tags: ['Health'],
      summary: 'Readiness probe',
      response: {
        200: {
          description: 'Service is ready',
          type: 'object',
        },
        503: {
          description: 'Service is not ready',
          type: 'object',
        },
      },
    },
  }, async (request, reply) => {
    const checks: Record<string, { status: string; message?: string }> = {};

    // Check database connection
    try {
      const dbHealthy = await dbHealthCheck();
      checks.database = {
        status: dbHealthy ? 'ok' : 'error',
        message: dbHealthy ? 'Connected' : 'Connection failed',
      };
    } catch (error: any) {
      checks.database = {
        status: 'error',
        message: error.message || 'Database check failed',
      };
    }

    // Check if all critical checks passed
    const allOk = Object.values(checks).every(c => c.status === 'ok');

    return reply.status(allOk ? 200 : 503).send({
      status: allOk ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    });
  });
}

