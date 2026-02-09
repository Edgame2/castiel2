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
import { createInMemoryStore, createRedisStore } from './middleware/rateLimitStore';

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

  // Register CORS (origin from config or env fallback)
  const corsOrigin = config.cors?.origin ?? process.env.FRONTEND_URL ?? '*';
  await fastify.register(cors, {
    origin: corsOrigin,
    credentials: true,
  });

  // Setup JWT
  await setupJWT(fastify, {
    secret: config.jwt.secret,
  });

  // Setup health checks
  setupHealthCheck(fastify);

  // Initialize proxy service (circuit breaker config from config file)
  const proxyService = new ProxyService({
    circuitBreaker: config.circuit_breaker,
  });

  // Rate limit store: Redis when configured (multi-instance), else in-memory
  const rateLimitStore = config.redis?.url
    ? createRedisStore(config.redis.url)
    : createInMemoryStore();
  const rateLimitMiddleware = createRateLimitMiddleware(
    {
      max: config.rate_limit?.max || 100,
      timeWindow: config.rate_limit?.timeWindow || 60000,
    },
    rateLimitStore
  );

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

