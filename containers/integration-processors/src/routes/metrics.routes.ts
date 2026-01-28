/**
 * Prometheus metrics routes
 * @module integration-processors/routes/metrics
 */

import { FastifyInstance } from 'fastify';
import { collectDefaultMetrics } from 'prom-client';
import { register } from '../metrics';
import { loadConfig } from '../config';

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

export async function metricsRoutes(app: FastifyInstance): Promise<void> {
  const config = loadConfig();
  
  app.get('/metrics', async (request, reply) => {
    // Check if metrics require authentication
    if (config.metrics?.require_auth) {
      const authHeader = request.headers.authorization;
      const expectedToken = config.metrics.bearer_token || process.env.METRICS_BEARER_TOKEN;
      
      if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
        return reply.code(401).send('Unauthorized');
      }
    }
    
    reply.type('text/plain; version=0.0.4');
    return register.metrics();
  });
}
