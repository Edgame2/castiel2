/**
 * Utility Services Module Server
 * Per ModuleImplementationGuide Section 3
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
        title: 'Utility Services Service API',
        description: 'Utility Services service.',
        version: '1.0.0',
      },
      servers: [{ url: '/api/v1', description: 'API Version 1' }],
      tags: [
        { name: 'Utility Services', description: 'Utility Services operations' },
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
  
  await setupJWT(fastify, { secret: config.jwt.secret });
  
  initializeDatabase({
    endpoint: config.cosmos_db.endpoint,
    key: config.cosmos_db.key,
    database: config.cosmos_db.database_id,
    containers: {
      imports: config.cosmos_db.containers.imports,
      exports: config.cosmos_db.containers.exports,
      migrations: config.cosmos_db.containers.migrations,
      ...(config.cosmos_db.containers.notifications && { notifications: config.cosmos_db.containers.notifications }),
      ...(config.cosmos_db.containers.batches && { batches: config.cosmos_db.containers.batches }),
      ...(config.cosmos_db.containers.preferences && { preferences: config.cosmos_db.containers.preferences }),
      ...(config.cosmos_db.containers.templates && { templates: config.cosmos_db.containers.templates }),
    },
  });
  
  try {
    await connectDatabase();
    log.info('Database connected successfully', { service: 'utility_services' });
  } catch (error) {
    log.error('Failed to connect to database', error, { service: 'utility_services' });
    throw error;
  }

  try {
    const { initializeEventPublisher } = await import('./events/publishers/UtilityServicesEventPublisher.js');
    await initializeEventPublisher();
    log.info('Event publisher initialized', { service: 'utility_services' });
  } catch (error) {
    log.warn('Failed to initialize event publisher', { error, service: 'utility_services' });
  }

  // Start notification event consumer and scheduled job (from notification-manager)
  try {
    const { startEventConsumer } = await import('./consumers/eventConsumer.js');
    await startEventConsumer();
    log.info('Notification event consumer started', { service: 'utility_services' });
  } catch (error) {
    log.warn('Failed to start notification event consumer', { error, service: 'utility_services' });
  }

  try {
    const { ScheduledNotificationJob } = await import('./jobs/ScheduledNotificationJob.js');
    const scheduledJob = new ScheduledNotificationJob();
    scheduledJob.start();
    log.info('Scheduled notification job started', { service: 'utility_services' });
  } catch (error) {
    log.warn('Failed to start scheduled notification job', { error, service: 'utility_services' });
  }

  fastify.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
    log.error('Request error', error, {
      requestId: request.id,
      path: request.url,
      method: request.method,
      service: 'utility_services',
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
      service: 'utility_services',
    });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    log.debug('Request completed', {
      requestId: request.id,
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
      service: 'utility_services',
    });
  });

  const { registerRoutes } = await import('./routes/index.js');
  await registerRoutes(fastify, config);

  fastify.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'utility_services',
  }));

  fastify.get('/ready', async () => {
    let dbStatus = 'unknown';
    try {
      const { getContainer } = await import('@coder/shared/database');
      const container = getContainer('utility_imports');
      await container.read();
      dbStatus = 'ok';
    } catch (error) {
      dbStatus = 'error';
    }
    return {
      status: dbStatus === 'ok' ? 'ready' : 'not_ready',
      checks: { database: { status: dbStatus } },
      timestamp: new Date().toISOString(),
      service: 'utility_services',
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
    log.info(`Utility Services service listening on http://${config.server.host}:${config.server.port}`, {
      port: config.server.port,
      host: config.server.host,
      service: 'utility_services',
    });
  } catch (error) {
    log.error('Failed to start utility_services service', error, { service: 'utility_services' });
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  log.info(`${signal} received, shutting down gracefully`, { service: 'utility_services' });
  try {
    const { closeEventPublisher } = await import('./events/publishers/UtilityServicesEventPublisher.js');
    await closeEventPublisher();
  } catch (error) {
    log.error('Error closing event publisher', error, { service: 'utility_services' });
  }
  if (app) await app.close();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error: Error) => {
  log.error('Uncaught exception', error, { service: 'utility_services' });
  gracefulShutdown('uncaughtException').catch(() => process.exit(1));
});
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  log.error('Unhandled promise rejection', reason as Error, { service: 'utility_services', promise: promise.toString() });
});

start().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
