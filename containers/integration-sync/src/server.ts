/**
 * Integration Sync Module Server
 * Integration synchronization and adapter management
 */

import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import { initializeDatabase, connectDatabase } from '@coder/shared';
import { setupJWT } from '@coder/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { loadConfig } from './config';
import { log } from './utils/logger';

let app: FastifyInstance | null = null;
let syncScheduler: any = null;
let tokenRefreshService: any = null;

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
        title: 'Integration Sync Service API',
        description: 'Integration synchronization and adapter management.',
        version: '1.0.0',
      },
      servers: [{ url: '/api/v1', description: 'API Version 1' }],
      tags: [
        { name: 'Sync', description: 'Synchronization operations' },
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
      sync_tasks: config.cosmos_db.containers.sync_tasks,
      executions: config.cosmos_db.containers.executions,
      conflicts: config.cosmos_db.containers.conflicts,
      webhooks: config.cosmos_db.containers.webhooks,
    },
  });
  
  try {
    await connectDatabase();
    log.info('Database connected successfully', { service: 'integration-sync' });
  } catch (error) {
    log.error('Failed to connect to database', error, { service: 'integration-sync' });
    throw error;
  }

  try {
    const { initializeEventPublisher } = await import('./events/publishers/IntegrationSyncEventPublisher');
    await initializeEventPublisher();
    const { initializeEventConsumer } = await import('./events/consumers/IntegrationSyncEventConsumer');
    await initializeEventConsumer(fastify);
    
    // Initialize sync task event consumer (for scheduled syncs)
    const { initializeEventConsumer: initializeSyncTaskConsumer } = await import('./events/consumers/SyncTaskEventConsumer');
    await initializeSyncTaskConsumer(fastify);
    
    log.info('Event publisher and consumers initialized', { service: 'integration-sync' });
  } catch (error) {
    log.warn('Failed to initialize event handlers', { error, service: 'integration-sync' });
  }

  // Initialize sync scheduler
  try {
    const { SyncSchedulerService } = await import('./services/SyncSchedulerService');
    syncScheduler = new SyncSchedulerService(fastify);
    await syncScheduler.start();
    log.info('Sync scheduler initialized and started', { service: 'integration-sync' });
  } catch (error) {
    log.warn('Failed to initialize sync scheduler', { error, service: 'integration-sync' });
  }

  // Initialize token refresh worker
  try {
    const { TokenRefreshService } = await import('./services/TokenRefreshService');
    tokenRefreshService = new TokenRefreshService(fastify);
    await tokenRefreshService.start();
    log.info('Token refresh worker initialized and started', { service: 'integration-sync' });
  } catch (error) {
    log.warn('Failed to initialize token refresh worker', { error, service: 'integration-sync' });
  }

  fastify.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
    log.error('Request error', error, {
      requestId: request.id,
      path: request.url,
      method: request.method,
      service: 'integration-sync',
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
      service: 'integration-sync',
    });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    log.debug('Request completed', {
      requestId: request.id,
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
      service: 'integration-sync',
    });
  });

  const { registerRoutes } = await import('./routes');
  await registerRoutes(fastify, config);

  fastify.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'integration-sync',
  }));

  fastify.get('/ready', async () => {
    let dbStatus = 'unknown';
    try {
      // Check Cosmos DB connection by reading a container
      const { getContainer } = await import('@coder/shared/database');
      const container = getContainer('integration_sync_tasks');
      await container.read();
      dbStatus = 'ok';
    } catch (error) {
      dbStatus = 'error';
    }
    return {
      status: dbStatus === 'ok' ? 'ready' : 'not_ready',
      checks: { database: { status: dbStatus } },
      timestamp: new Date().toISOString(),
      service: 'integration-sync',
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
    log.info(`Integration Sync service listening on http://${config.server.host}:${config.server.port}`, {
      port: config.server.port,
      host: config.server.host,
      service: 'integration-sync',
    });
  } catch (error) {
    log.error('Failed to start integration sync service', error, { service: 'integration-sync' });
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  log.info(`${signal} received, shutting down gracefully`, { service: 'integration-sync' });
  try {
    // Stop sync scheduler
    if (syncScheduler) {
      await syncScheduler.stop();
    }
    
    // Stop token refresh worker
    if (tokenRefreshService) {
      await tokenRefreshService.stop();
    }
    
    // Close event handlers
    const { closeEventPublisher } = await import('./events/publishers/IntegrationSyncEventPublisher');
    await closeEventPublisher();
    const { closeEventConsumer } = await import('./events/consumers/IntegrationSyncEventConsumer');
    await closeEventConsumer();
    const { closeEventConsumer: closeSyncTaskConsumer } = await import('./events/consumers/SyncTaskEventConsumer');
    await closeSyncTaskConsumer();
  } catch (error) {
    log.error('Error during graceful shutdown', error, { service: 'integration-sync' });
  }
  if (app) await app.close();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error: Error) => {
  log.error('Uncaught exception', error, { service: 'integration-sync' });
  gracefulShutdown('uncaughtException').catch(() => process.exit(1));
});
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  log.error('Unhandled promise rejection', reason instanceof Error ? reason : new Error(String(reason)), { service: 'integration-sync', promise: String(promise) });
});

if (require.main === module) {
  start().catch((error) => {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  });
}
