/**
 * Workflow Orchestrator Module Server
 * Orchestrates asynchronous workflows for opportunity change events
 */

import './instrumentation';

import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import { initializeDatabase, connectDatabase } from '@coder/shared';
import { setupJWT } from '@coder/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { loadConfig } from './config';
import { log } from './utils/logger';
import { httpRequestsTotal, httpRequestDurationSeconds, register } from './metrics';

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
        title: 'Workflow Orchestrator Service API',
        description: 'Orchestrates asynchronous workflows for opportunity change events, coordinating parallel execution of risk analysis, scoring, forecasting, and recommendations.',
        version: '1.0.0',
      },
      servers: [{ url: '/api/v1', description: 'API Version 1' }],
      tags: [
        { name: 'Workflows', description: 'Workflow management' },
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
      workflows: config.cosmos_db.containers.workflows,
      steps: config.cosmos_db.containers.steps,
      executions: config.cosmos_db.containers.executions,
      hitl_approvals: config.cosmos_db.containers.hitl_approvals ?? 'hitl_approvals',
    },
  });
  
  try {
    await connectDatabase();
    log.info('Database connected successfully', { service: 'workflow-orchestrator' });
  } catch (error) {
    log.error('Failed to connect to database', error, { service: 'workflow-orchestrator' });
    throw error;
  }

  try {
    const { initializeEventPublisher } = await import('./events/publishers/WorkflowEventPublisher');
    await initializeEventPublisher();
    const { initializeEventConsumer } = await import('./events/consumers/WorkflowOrchestratorEventConsumer');
    await initializeEventConsumer();
    log.info('Event publisher and consumer initialized', { service: 'workflow-orchestrator' });
  } catch (error) {
    log.warn('Failed to initialize event handlers', { error, service: 'workflow-orchestrator' });
  }

  try {
    const { startBatchJobScheduler } = await import('./jobs/BatchJobScheduler');
    await startBatchJobScheduler();
  } catch (error) {
    log.warn('Failed to start batch job scheduler', { error, service: 'workflow-orchestrator' });
  }

  fastify.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
    log.error('Request error', error, {
      requestId: request.id,
      path: request.url,
      method: request.method,
      service: 'workflow-orchestrator',
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
      service: 'workflow-orchestrator',
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
      service: 'workflow-orchestrator',
    });
  });

  const { registerRoutes } = await import('./routes');
  await registerRoutes(fastify as any, config);

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
    service: 'workflow-orchestrator',
  }));

  fastify.get('/ready', async () => {
    let dbStatus = 'unknown';
    try {
      // Check Cosmos DB connection by reading a container
      const { getContainer } = await import('@coder/shared/database');
      const container = getContainer('workflow_workflows');
      await container.read();
      dbStatus = 'ok';
    } catch (error) {
      dbStatus = 'error';
    }
    return {
      status: dbStatus === 'ok' ? 'ready' : 'not_ready',
      checks: { database: { status: dbStatus } },
      timestamp: new Date().toISOString(),
      service: 'workflow-orchestrator',
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
    log.info(`Workflow Orchestrator service listening on http://${config.server.host}:${config.server.port}`, {
      port: config.server.port,
      host: config.server.host,
      service: 'workflow-orchestrator',
    });
  } catch (error) {
    log.error('Failed to start workflow orchestrator service', error, { service: 'workflow-orchestrator' });
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  log.info(`${signal} received, shutting down gracefully`, { service: 'workflow-orchestrator' });
  try {
    const { stopBatchJobScheduler } = await import('./jobs/BatchJobScheduler');
    stopBatchJobScheduler();
  } catch (error) {
    log.error('Error stopping batch job scheduler', error, { service: 'workflow-orchestrator' });
  }
  try {
    const { closeEventPublisher } = await import('./events/publishers/WorkflowEventPublisher');
    await closeEventPublisher();
    const { closeEventConsumer } = await import('./events/consumers/WorkflowOrchestratorEventConsumer');
    await closeEventConsumer();
  } catch (error) {
    log.error('Error closing event handlers', error, { service: 'workflow-orchestrator' });
  }
  if (app) await app.close();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error: Error) => {
  log.error('Uncaught exception', error, { service: 'workflow-orchestrator' });
  gracefulShutdown('uncaughtException').catch(() => process.exit(1));
});
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  log.error('Unhandled promise rejection', reason as Error, { service: 'workflow-orchestrator', promise: promise.toString() });
});

if (require.main === module) {
  start().catch((error) => {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  });
}
