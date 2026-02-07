/**
 * Learning Service Module Server (Plan W6 Layer 7 – Feedback Loop)
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
    bodyLimit: 1048576,
    requestTimeout: 30000,
    keepAliveTimeout: 5000,
  });

  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Learning Service API',
        description: 'Feedback loop: record feedback, outcomes, summary, trends (Plan W6 Layer 7).',
        version: '1.0.0',
      },
      servers: [{ url: '/api/v1', description: 'API Version 1' }],
      tags: [
        { name: 'Feedback', description: 'User feedback and outcomes' },
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
    transformStaticCSP: (header: string) => header,
  });

  await setupJWT(fastify, { secret: config.jwt.secret });

  initializeDatabase({
    endpoint: config.cosmos_db.endpoint,
    key: config.cosmos_db.key,
    database: config.cosmos_db.database_id,
    containers: {
      user_feedback: config.cosmos_db.containers.user_feedback,
      outcome: config.cosmos_db.containers.outcome,
    },
  });

  try {
    await connectDatabase();
    log.info('Database connected successfully', { service: 'learning-service' });
  } catch (error) {
    log.error('Failed to connect to database', error, { service: 'learning-service' });
    throw error;
  }

  try {
    const { initializeEventPublisher } = await import('./events/publishers/FeedbackLearningEventPublisher.js');
    await initializeEventPublisher();
    log.info('Event publisher initialized', { service: 'learning-service' });
  } catch (error) {
    log.warn('Failed to initialize event publisher', { error, service: 'learning-service' });
  }

  fastify.setErrorHandler(
    (error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
      log.error('Request error', error, {
        requestId: request.id,
        path: request.url,
        method: request.method,
        service: 'learning-service',
      });
      if (error.validation) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.validation },
        });
      }
      return reply.status((error as { statusCode?: number }).statusCode || 500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message:
            process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
        },
      });
    }
  );

  fastify.addHook('onRequest', async (request) => {
    log.debug('Request received', {
      requestId: request.id,
      method: request.method,
      path: request.url,
      service: 'learning-service',
    });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    log.debug('Request completed', {
      requestId: request.id,
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
      service: 'learning-service',
    });
  });

  const { registerRoutes } = await import('./routes/index.js');
  await registerRoutes(fastify, config);

  fastify.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'learning-service',
  }));

  fastify.get('/ready', async () => {
    let dbStatus = 'unknown';
    try {
      const { getContainer } = await import('@coder/shared/database');
      const feedbackContainer = getContainer(config.cosmos_db.containers.user_feedback);
      await feedbackContainer.read();
      dbStatus = 'ok';
    } catch (error) {
      dbStatus = 'error';
    }
    return {
      status: dbStatus === 'ok' ? 'ready' : 'not_ready',
      checks: { database: { status: dbStatus } },
      timestamp: new Date().toISOString(),
      service: 'learning-service',
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
    log.info(`Learning service listening on http://${config.server.host}:${config.server.port}`, {
      port: config.server.port,
      host: config.server.host,
      service: 'learning-service',
    });
  } catch (error) {
    log.error('Failed to start learning-service', error, { service: 'learning-service' });
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  log.info(`${signal} received, shutting down gracefully`, { service: 'learning-service' });
  try {
    const { closeEventPublisher } = await import('./events/publishers/FeedbackLearningEventPublisher.js');
    await closeEventPublisher();
  } catch (error) {
    log.error('Error closing event publisher', error, { service: 'learning-service' });
  }
  if (app) await app.close();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error: Error) => {
  log.error('Uncaught exception', error, { service: 'learning-service' });
  gracefulShutdown('uncaughtException').catch(() => process.exit(1));
});
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  log.error('Unhandled promise rejection', reason as Error, {
    service: 'learning-service',
    promise: String(promise),
  });
});

if (process.argv[1]?.endsWith('server.js')) {
  start().catch((error) => {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  });
}
