/**
 * Data Enrichment Module Server
 * Data enrichment and vectorization pipeline
 */

import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import { initializeDatabase, connectDatabase } from '@coder/shared';
import { setupJWT } from '@coder/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { loadConfig } from './config/index.js';
import { log } from './utils/logger.js';

let app: FastifyInstance | null = null;

export async function buildApp(): Promise<FastifyInstance> {
  const config = loadConfig();
  
  const fastify = Fastify({
    logger: false,
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
    bodyLimit: 10485760, // 10MB for large enrichment jobs
    requestTimeout: 60000,
    keepAliveTimeout: 5000,
  });

  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Data Enrichment Service API',
        description: 'Data enrichment and vectorization pipeline for shards.',
        version: '1.0.0',
      },
      servers: [{ url: '/api/v1', description: 'API Version 1' }],
      tags: [
        { name: 'Enrichment', description: 'Data enrichment operations' },
        { name: 'Vectorization', description: 'Vectorization operations' },
        { name: 'Health', description: 'Health check endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: false },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });
  
  await setupJWT(fastify as any, { secret: config.jwt.secret });
  
  initializeDatabase({
    endpoint: config.cosmos_db.endpoint,
    key: config.cosmos_db.key,
    database: config.cosmos_db.database_id,
    containers: {
      enrichment_jobs: config.cosmos_db.containers.enrichment_jobs,
      enrichment_results: config.cosmos_db.containers.enrichment_results,
      enrichment_configurations: config.cosmos_db.containers.enrichment_configurations ?? 'enrichment_configurations',
      enrichment_history: config.cosmos_db.containers.enrichment_history ?? 'enrichment_history',
      vectorization_jobs: config.cosmos_db.containers.vectorization_jobs,
      shard_relationships: config.cosmos_db.containers.shard_relationships,
      shard_acls: config.cosmos_db.containers.shard_acls,
    },
  });
  
  try {
    await connectDatabase();
    log.info('Database connected successfully', { service: 'data-enrichment' });
  } catch (error) {
    log.error('Failed to connect to database', error, { service: 'data-enrichment' });
    throw error;
  }

  try {
    const { initializeEventPublisher } = await import('./events/publishers/EnrichmentEventPublisher.js');
    await initializeEventPublisher();
    const { initializeEventConsumer } = await import('./events/consumers/EnrichmentEventConsumer');
    await initializeEventConsumer(fastify);
    log.info('Event publisher and consumer initialized', { service: 'data-enrichment' });
  } catch (error) {
    log.warn('Failed to initialize event handlers', { error, service: 'data-enrichment' });
  }

  try {
    const { ReembeddingSchedulerService } = await import('./services/ReembeddingSchedulerService');
    const reembeddingScheduler = new ReembeddingSchedulerService(fastify as any);
    await reembeddingScheduler.start();
    (fastify as any).reembeddingScheduler = reembeddingScheduler;
  } catch (error) {
    log.warn('Failed to start re-embedding scheduler', { error, service: 'data-enrichment' });
  }

  fastify.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
    log.error('Request error', error, {
      requestId: request.id,
      path: request.url,
      method: request.method,
      service: 'data-enrichment',
    });
    
    if (error.validation) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.validation },
      });
    }
    
    return reply.status(error.statusCode || 500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
      },
    });
  });

  fastify.addHook('onRequest', async (request) => {
    log.debug('Request received', {
      requestId: request.id,
      method: request.method,
      path: request.url,
      service: 'data-enrichment',
    });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    log.debug('Request completed', {
      requestId: request.id,
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
      service: 'data-enrichment',
    });
  });

  const { registerRoutes } = await import('./routes/index.js');
  await registerRoutes(fastify as any, config);

  fastify.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'data-enrichment',
  }));

  fastify.get('/ready', async () => {
    let dbStatus = 'unknown';
    try {
      // Check Cosmos DB connection by reading a container
      const { getContainer } = await import('@coder/shared/database');
      const container = getContainer('enrichment_jobs');
      await container.read();
      dbStatus = 'ok';
    } catch (error) {
      dbStatus = 'error';
    }
    return {
      status: dbStatus === 'ok' ? 'ready' : 'not_ready',
      checks: { database: { status: dbStatus } },
      timestamp: new Date().toISOString(),
      service: 'data-enrichment',
    };
  });

  app = fastify;
  return fastify;
}

export async function start(): Promise<void> {
  try {
    const server = await buildApp();
    const config = loadConfig();
    await server.listen({ port: config.server.port, host: config.server.host });
    log.info(`Data Enrichment service listening on http://${config.server.host}:${config.server.port}`, {
      port: config.server.port,
      host: config.server.host,
      service: 'data-enrichment',
    });
  } catch (error) {
    log.error('Failed to start data enrichment service', error, { service: 'data-enrichment' });
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  log.info(`${signal} received, shutting down gracefully`, { service: 'data-enrichment' });
  try {
    const { closeEventPublisher } = await import('./events/publishers/EnrichmentEventPublisher.js');
    await closeEventPublisher();
    const { closeEventConsumer } = await import('./events/consumers/EnrichmentEventConsumer.js');
    await closeEventConsumer();
    const sched = app && (app as any).reembeddingScheduler;
    if (sched && typeof sched.stop === 'function') await sched.stop();
  } catch (error) {
    log.error('Error during shutdown', error, { service: 'data-enrichment' });
  }
  if (app) await app.close();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error: Error) => {
  log.error('Uncaught exception', error, { service: 'data-enrichment' });
  gracefulShutdown('uncaughtException').catch(() => process.exit(1));
});
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  log.error('Unhandled promise rejection', reason instanceof Error ? reason : new Error(String(reason)), { service: 'data-enrichment', promise: String(promise) });
});

start().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
