import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import { connectCache, disconnectCache, setupJWT, setupHealthCheck } from '@coder/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { loadConfig } from './config';
import { registerRoutes } from './routes';
import {
  initializeCacheManagementEventPublisher,
  closeCacheManagementEventPublisher,
} from './events/publishers/CacheManagementEventPublisher';

let app: FastifyInstance | null = null;

export async function buildApp(): Promise<FastifyInstance> {
  const config = loadConfig();
  const fastify = Fastify({
    logger: false,
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
    bodyLimit: 10485760,
    requestTimeout: 30000,
  });

  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Cache Service API',
        description: 'Centralized caching service',
        version: '1.0.0',
      },
      servers: [{ url: '/api/v1', description: 'API Version 1' }],
      tags: [
        { name: 'Cache', description: 'Cache operations' },
        { name: 'Health', description: 'Health check endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: false },
  });

  await setupJWT(fastify, { secret: process.env.JWT_SECRET || '' });
  setupHealthCheck(fastify);

  // Initialize Redis connection
  try {
    await connectCache({
      url: config.redis?.url || process.env.REDIS_URL,
      host: config.redis?.host,
      port: config.redis?.port,
      password: config.redis?.password,
    });
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw error;
  }

  // Cache management event publisher (merged from cache-management)
  await initializeCacheManagementEventPublisher();

  // Register routes
  await registerRoutes(fastify, config);

  app = fastify;
  return fastify;
}

export async function start(): Promise<void> {
  try {
    const server = await buildApp();
    const config = loadConfig();
    await server.listen({ port: config.server.port, host: config.server.host });
    console.log(`Cache Service listening on http://${config.server.host}:${config.server.port}`);
  } catch (error) {
    console.error('Failed to start Cache Service:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down gracefully`);
  if (app) await app.close();
  await closeCacheManagementEventPublisher();
  await disconnectCache();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
  start();
}

