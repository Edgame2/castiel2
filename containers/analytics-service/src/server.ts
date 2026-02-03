import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import { initializeDatabase, connectDatabase, disconnectDatabase, setupJWT, setupHealthCheck } from '@coder/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { loadConfig } from './config';
import { register } from './metrics';
import { registerRoutes } from './routes';

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
        title: 'Analytics Service API',
        description: 'Analytics and reporting service',
        version: '1.0.0',
      },
      servers: [{ url: '/api/v1', description: 'API Version 1' }],
      tags: [
        { name: 'Analytics', description: 'Analytics and metrics' },
        { name: 'Reports', description: 'Report generation' },
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

  initializeDatabase({
    endpoint: config.cosmos_db.endpoint,
    key: config.cosmos_db.key,
    database: config.cosmos_db.database_id,
    containers: config.cosmos_db.containers,
  });

  await setupJWT(fastify as any, { secret: process.env.JWT_SECRET || '' });
  setupHealthCheck(fastify as any);

  try {
    await connectDatabase();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }

  try {
    const { initializeUsageTrackingConsumer } = await import('./events/consumers/UsageTrackingConsumer.js');
    await initializeUsageTrackingConsumer();
  } catch (error) {
    console.warn('UsageTrackingConsumer init failed (continuing)', error);
  }

  // Register routes
  await registerRoutes(fastify, config);

  // Prometheus /metrics (Plan §8.5.2)
  fastify.get('/metrics', async (_request, reply) => {
    return reply.type('text/plain; version=0.0.4').send(await register.metrics());
  });

  app = fastify;
  return fastify;
}

export async function start(): Promise<void> {
  try {
    const server = await buildApp();
    const config = loadConfig();
    await server.listen({ port: config.server.port, host: config.server.host });
    console.log(`Analytics Service listening on http://${config.server.host}:${config.server.port}`);
  } catch (error) {
    console.error('Failed to start Analytics Service:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down gracefully`);
  try {
    const { closeUsageTrackingConsumer } = await import('./events/consumers/UsageTrackingConsumer.js');
    await closeUsageTrackingConsumer();
  } catch (e) {
    console.warn('Error closing UsageTrackingConsumer', e);
  }
  if (app) await app.close();
  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
  start();
}

