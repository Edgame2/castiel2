/**
 * Recommendations Module Server
 * Asynchronous recommendation generation service with CAIS integration and user feedback loop
 */

import './instrumentation';

import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import { initializeDatabase, connectDatabase } from '@coder/shared';
import { setupJWT } from '@coder/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { loadConfig } from './config';
import { httpRequestsTotal, httpRequestDurationSeconds, register } from './metrics';
import { log } from './utils/logger';

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
        title: 'Recommendations Service API',
        description: `
          Asynchronous recommendation generation service with CAIS integration and user feedback loop.
          
          ## Features
          - **Multi-Factor Recommendations**: Vector search, collaborative filtering, temporal, content-based
          - **ML-Enhanced**: ML-enhanced recommendations via ml-service
          - **CAIS Integration**: Hybrid approach (REST for weights, Events for outcomes)
          - **User Feedback**: Accept/ignore/irrelevant feedback loop for continuous improvement
        `,
        version: '1.0.0',
      },
      servers: [{ url: '/api/v1', description: 'API Version 1' }],
      tags: [
        { name: 'Recommendations', description: 'Recommendation operations' },
        { name: 'Feedback', description: 'User feedback on recommendations' },
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
      recommendations: config.cosmos_db.containers.recommendations,
      feedback: config.cosmos_db.containers.feedback,
      metrics: config.cosmos_db.containers.metrics,
      remediation_workflows: config.cosmos_db.containers.remediation_workflows ?? 'recommendation_remediation_workflows',
      mitigation_actions: config.cosmos_db.containers.mitigation_actions ?? 'recommendation_mitigation_actions',
    },
  });
  
  try {
    await connectDatabase();
    log.info('Database connected successfully', { service: 'recommendations' });
  } catch (error) {
    log.error('Failed to connect to database', error, { service: 'recommendations' });
    throw error;
  }

  try {
    const { initializeEventPublisher } = await import('./events/publishers/RecommendationEventPublisher');
    await initializeEventPublisher();
    const { initializeEventConsumer } = await import('./events/consumers/RecommendationEventConsumer');
    await initializeEventConsumer();
    log.info('Event publisher and consumer initialized', { service: 'recommendations' });
  } catch (error) {
    log.warn('Failed to initialize event handlers', { error, service: 'recommendations' });
  }

  fastify.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
    log.error('Request error', error, {
      requestId: request.id,
      path: request.url,
      method: request.method,
      service: 'recommendations',
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
      service: 'recommendations',
    });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const route = (request as { routerPath?: string }).routerPath ?? (request as { routeOptions?: { url?: string } }).routeOptions?.url ?? (String((request as { url?: string }).url || '').split('?')[0] || 'unknown');
    httpRequestsTotal.inc({ method: request.method, route, status: String(reply.statusCode) });
    httpRequestDurationSeconds.observe({ method: request.method, route }, (reply.elapsedTime ?? 0) / 1000);
    log.debug('Request completed', {
      requestId: request.id,
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
      service: 'recommendations',
    });
  });

  const { registerRoutes } = await import('./routes');
  await registerRoutes(fastify, config);

  const metricsConf = config.metrics ?? { path: '/metrics', require_auth: false, bearer_token: '' };
  fastify.get(metricsConf.path || '/metrics', async (request, reply) => {
    if (metricsConf.require_auth) {
      const raw = (request.headers.authorization as string) || '';
      const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
      if (token !== (metricsConf.bearer_token || '')) {
        return reply.status(401).send('Unauthorized');
      }
    }
    return reply.type('text/plain; version=0.0.4').send(await register.metrics());
  });

  fastify.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'recommendations',
  }));

  fastify.get('/ready', async () => {
    let dbStatus = 'unknown';
    try {
      // Check Cosmos DB connection by reading a container
      const { getContainer } = await import('@coder/shared/database');
      const container = getContainer('recommendation_recommendations');
      await container.read();
      dbStatus = 'ok';
    } catch (error) {
      dbStatus = 'error';
    }
    return {
      status: dbStatus === 'ok' ? 'ready' : 'not_ready',
      checks: { database: { status: dbStatus } },
      timestamp: new Date().toISOString(),
      service: 'recommendations',
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
    log.info(`Recommendations service listening on http://${config.server.host}:${config.server.port}`, {
      port: config.server.port,
      host: config.server.host,
      service: 'recommendations',
    });
  } catch (error) {
    log.error('Failed to start recommendations service', error, { service: 'recommendations' });
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  log.info(`${signal} received, shutting down gracefully`, { service: 'recommendations' });
  try {
    const { closeEventPublisher } = await import('./events/publishers/RecommendationEventPublisher');
    await closeEventPublisher();
    const { closeEventConsumer } = await import('./events/consumers/RecommendationEventConsumer');
    await closeEventConsumer();
  } catch (error) {
    log.error('Error closing event handlers', error, { service: 'recommendations' });
  }
  if (app) await app.close();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error: Error) => {
  log.error('Uncaught exception', error, { service: 'recommendations' });
  gracefulShutdown('uncaughtException').catch(() => process.exit(1));
});
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  log.error('Unhandled promise rejection', reason as Error, { service: 'recommendations', promise: promise.toString() });
});

if (require.main === module) {
  start().catch((error) => {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  });
}
