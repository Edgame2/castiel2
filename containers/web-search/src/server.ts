/**
 * Web Search Module Server
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
        title: 'Web Search Service API',
        description: 'Web Search service.',
        version: '1.0.0',
      },
      servers: [{ url: '/api/v1', description: 'API Version 1' }],
      tags: [
        { name: 'Web Search', description: 'Web Search operations' },
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
      results: config.cosmos_db.containers.results,
      cache: config.cosmos_db.containers.cache,
      schedules: config.cosmos_db.containers.schedules,
    },
  });
  
  try {
    await connectDatabase();
    log.info('Database connected successfully', { service: 'web_search' });
  } catch (error) {
    log.error('Failed to connect to database', error, { service: 'web_search' });
    throw error;
  }

  try {
    const { initializeEventPublisher } = await import('./events/publishers/WebSearchEventPublisher.js');
    await initializeEventPublisher();
    log.info('Event publisher initialized', { service: 'web_search' });
  } catch (error) {
    log.warn('Failed to initialize event publisher', { error, service: 'web_search' });
  }

  fastify.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
    log.error('Request error', error, {
      requestId: request.id,
      path: request.url,
      method: request.method,
      service: 'web_search',
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
      service: 'web_search',
    });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    log.debug('Request completed', {
      requestId: request.id,
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
      service: 'web_search',
    });
  });

  const { registerRoutes } = await import('./routes/index.js');
  await registerRoutes(fastify, config);

  // Recurring search scheduler (Phase 4.1): run due schedules every 5 min
  const SCHEDULER_INTERVAL_MS = 5 * 60 * 1000;
  let schedulerTimer: ReturnType<typeof setInterval> | null = null;
  fastify.addHook('onReady', async () => {
    schedulerTimer = setInterval(async () => {
      try {
        const { ScheduleService } = await import('./services/ScheduleService.js');
        const { WebSearchService } = await import('./services/WebSearchService.js');
        const scheduleService = new ScheduleService();
        const webSearchService = new WebSearchService(fastify);
        const due = await scheduleService.getDue();
        for (const s of due) {
          try {
            await webSearchService.search(s.tenantId, s.query, { userId: s.userId });
            const nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            await scheduleService.setNextRun(s.id, s.tenantId, nextRun);
          } catch (err) {
            log.warn('Scheduled search failed', { scheduleId: s.id, error: (err as Error).message, service: 'web-search' });
          }
        }
      } catch (err) {
        log.warn('Scheduler tick failed', { error: (err as Error).message, service: 'web-search' });
      }
    }, SCHEDULER_INTERVAL_MS);
  });
  fastify.addHook('onClose', async () => {
    if (schedulerTimer) clearInterval(schedulerTimer);
  });

  fastify.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'web_search',
  }));

  fastify.get('/ready', async () => {
    let dbStatus = 'unknown';
    try {
      const { getContainer } = await import('@coder/shared/database');
      const container = getContainer('web_search_cache');
      await container.read();
      dbStatus = 'ok';
    } catch (error) {
      dbStatus = 'error';
    }
    return {
      status: dbStatus === 'ok' ? 'ready' : 'not_ready',
      checks: { database: { status: dbStatus } },
      timestamp: new Date().toISOString(),
      service: 'web_search',
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
    log.info(`Web Search service listening on http://${config.server.host}:${config.server.port}`, {
      port: config.server.port,
      host: config.server.host,
      service: 'web_search',
    });
  } catch (error) {
    log.error('Failed to start web_search service', error, { service: 'web_search' });
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  log.info(`${signal} received, shutting down gracefully`, { service: 'web_search' });
  try {
    const { closeEventPublisher } = await import('./events/publishers/WebSearchEventPublisher.js');
    await closeEventPublisher();
  } catch (error) {
    log.error('Error closing event publisher', error, { service: 'web_search' });
  }
  if (app) await app.close();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error: Error) => {
  log.error('Uncaught exception', error, { service: 'web_search' });
  gracefulShutdown('uncaughtException').catch(() => process.exit(1));
});
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  log.error('Unhandled promise rejection', reason as Error, { service: 'web_search', promise: promise.toString() });
});

start().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
