/**
 * API Gateway Server
 * Routes requests to microservices with authentication and tenant isolation
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { setupJWT, setupHealthCheck } from '@coder/shared';
import { loadConfig } from './config';
import { ProxyService } from './services/ProxyService';
import { registerRoutes } from './routes';
import { createRateLimitMiddleware } from './middleware/rateLimit';

let app: FastifyInstance | null = null;

/**
 * Build the Fastify application
 */
export async function buildApp(): Promise<FastifyInstance> {
  const config = loadConfig();
  
  const fastify = Fastify({
    logger: true,
    requestIdHeader: 'x-request-id',
    bodyLimit: 10485760, // 10MB
  });

  // Register CORS
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });

  // Setup JWT
  await setupJWT(fastify, {
    secret: config.jwt.secret,
  });

  // Setup health checks
  setupHealthCheck(fastify);

  // Initialize proxy service
  const proxyService = new ProxyService();

  // Register rate limiting middleware
  const rateLimitMiddleware = createRateLimitMiddleware({
    max: config.rate_limit?.max || 100,
    timeWindow: config.rate_limit?.timeWindow || 60000,
  });

  // Apply rate limiting to all routes (except health checks)
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.url !== '/health' && request.url !== '/ready') {
      await rateLimitMiddleware(request, reply);
    }
  });

  // Register routes
  await registerRoutes(fastify, proxyService, config);

  // Error handler
  fastify.setErrorHandler((error: unknown, request, reply) => {
    fastify.log.error(error);
    const err = error as { statusCode?: number; message?: string };
    reply.code(err.statusCode || 500).send({
      error: err.message || 'Internal server error',
    });
  });

  app = fastify;
  return fastify;
}

/**
 * Start the server
 */
export async function start(): Promise<void> {
  const config = loadConfig();
  const server = await buildApp();
  
  await server.listen({
    port: config.server.port,
    host: config.server.host,
  });

  console.log(`API Gateway listening on ${config.server.host}:${config.server.port}`);
}

// Start if run directly
if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start API Gateway:', error);
    process.exit(1);
  });
}

