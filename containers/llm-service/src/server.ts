/**
 * LLM Service Module Server (Plan W5 Layer 5 – LLM Reasoning)
 */

import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import { initializeDatabase, connectDatabase } from '@coder/shared';
import { setupJWT } from '@coder/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { loadConfig } from './config';
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
        title: 'LLM Service API',
        description: 'LLM reasoning: natural language explanations, recommendations, scenarios, summary, playbook (Plan W5 Layer 5).',
        version: '1.0.0',
      },
      servers: [{ url: '/api/v1', description: 'API Version 1' }],
      tags: [
        { name: 'LLM', description: 'LLM reasoning operations' },
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
      llm_outputs: config.cosmos_db.containers.llm_outputs,
    },
  });

  try {
    await connectDatabase();
    log.info('Database connected successfully', { service: 'llm-service' });
  } catch (error) {
    log.error('Failed to connect to database', error, { service: 'llm-service' });
    throw error;
  }

  try {
    const { initializeEventPublisher } = await import('./events/publishers/LLMReasoningEventPublisher');
    await initializeEventPublisher();
    log.info('Event publisher initialized', { service: 'llm-service' });
  } catch (error) {
    log.warn('Failed to initialize event publisher', { error, service: 'llm-service' });
  }

  fastify.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
    log.error('Request error', error, {
      requestId: request.id,
      path: request.url,
      method: request.method,
      service: 'llm-service',
    });
    if (error.validation) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.validation },
      });
    }
    return reply.status((error as { statusCode?: number }).statusCode || 500).send({
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
      service: 'llm-service',
    });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    log.debug('Request completed', {
      requestId: request.id,
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
      service: 'llm-service',
    });
  });

  const { registerRoutes } = await import('./routes');
  await registerRoutes(fastify, config);

  fastify.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'llm-service',
  }));

  fastify.get('/ready', async () => {
    let dbStatus = 'unknown';
    try {
      const { getContainer } = await import('@coder/shared/database');
      const container = getContainer(config.cosmos_db.containers.llm_outputs);
      await container.read();
      dbStatus = 'ok';
    } catch (error) {
      dbStatus = 'error';
    }
    return {
      status: dbStatus === 'ok' ? 'ready' : 'not_ready',
      checks: { database: { status: dbStatus } },
      timestamp: new Date().toISOString(),
      service: 'llm-service',
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
    log.info(`LLM service listening on http://${config.server.host}:${config.server.port}`, {
      port: config.server.port,
      host: config.server.host,
      service: 'llm-service',
    });
  } catch (error) {
    log.error('Failed to start llm-service', error, { service: 'llm-service' });
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  log.info(`${signal} received, shutting down gracefully`, { service: 'llm-service' });
  try {
    const { closeEventPublisher } = await import('./events/publishers/LLMReasoningEventPublisher');
    await closeEventPublisher();
  } catch (error) {
    log.error('Error closing event publisher', error, { service: 'llm-service' });
  }
  if (app) await app.close();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error: Error) => {
  log.error('Uncaught exception', error, { service: 'llm-service' });
  gracefulShutdown('uncaughtException').catch(() => process.exit(1));
});
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  log.error('Unhandled promise rejection', reason as Error, { service: 'llm-service', promise: String(promise) });
});

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  start().catch((error) => {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  });
}
