import './instrumentation';

import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { initializeDatabase, connectDatabase, disconnectDatabase, setupJWT, healthCheck as dbHealthCheck } from '@coder/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { loadConfig } from './config';
import { registerRoutes } from './routes';
import { httpRequestsTotal, httpRequestDurationSeconds, register } from './metrics';

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
        title: 'ML Service API',
        description: 'Machine learning model management service',
        version: '1.0.0',
      },
      servers: [{ url: '/api/v1', description: 'API Version 1' }],
      tags: [
        { name: 'Models', description: 'ML model management' },
        { name: 'Features', description: 'Feature store management' },
        { name: 'Training', description: 'Model training' },
        { name: 'Predictions', description: 'Model predictions' },
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

  // /health (Plan §11.7): includes Azure ML endpoints reachable
  fastify.get('/health', {
    schema: {
      description: 'Health check (Plan §11.7). Includes azureMl.endpoints reachability.',
      tags: ['Health'],
      response: { 200: { type: 'object', properties: { status: { type: 'string' }, timestamp: { type: 'string' }, azureMl: { type: 'object' } } } },
    },
  }, async () => {
    const ep = config.azure_ml?.endpoints ?? {};
    const entries = Object.entries(ep).filter(([, u]) => typeof u === 'string' && u.length > 0) as [string, string][];
    const endpoints: Record<string, 'ok' | 'unreachable'> = {};
    for (const [modelId, url] of entries) {
      try {
        await globalThis.fetch(url, { method: 'GET', signal: AbortSignal.timeout(2000) });
        endpoints[modelId] = 'ok'; // any HTTP response = reachable
      } catch {
        endpoints[modelId] = 'unreachable';
      }
    }
    const allOk = entries.length === 0 || Object.values(endpoints).every((v) => v === 'ok');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      azureMl: {
        status: entries.length === 0 ? 'not_configured' : allOk ? 'ok' : 'degraded',
        endpoints: Object.keys(endpoints).length ? endpoints : undefined,
      },
    };
  });

  // /ready: database and readiness
  fastify.get('/ready', {
    schema: {
      description: 'Readiness probe',
      tags: ['Health'],
      response: { 200: { description: 'Ready' }, 503: { description: 'Not ready' } },
    },
  }, async (_req, reply) => {
    let dbOk = false;
    try {
      dbOk = await dbHealthCheck();
    } catch { /* ignore */ }
    const allOk = dbOk;
    return reply.status(allOk ? 200 : 503).send({
      status: allOk ? 'ready' : 'not_ready',
      checks: { database: { status: dbOk ? 'ok' : 'error' } },
      timestamp: new Date().toISOString(),
    });
  });

  try {
    await connectDatabase();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }

  const { initializeEventPublisher } = await import('./events/publishers/MLServiceEventPublisher.js');
  await initializeEventPublisher();

  fastify.addHook('onResponse', async (request, reply) => {
    const route = (request as { routerPath?: string }).routerPath ?? (request as { routeOptions?: { url?: string } }).routeOptions?.url ?? (String((request as { url?: string }).url || '').split('?')[0] || 'unknown');
    httpRequestsTotal.inc({ method: request.method, route, status: String(reply.statusCode) });
    httpRequestDurationSeconds.observe({ method: request.method, route }, (reply.elapsedTime ?? 0) / 1000);
  });

  // Register routes
  await registerRoutes(fastify, config);

  const metricsConf = config.metrics ?? { path: '/metrics', require_auth: false, bearer_token: '' };
  const metricsPath = metricsConf.path ?? '/metrics';
  fastify.get(metricsPath, async (request: FastifyRequest, reply: FastifyReply) => {
    if (metricsConf.require_auth) {
      const raw = (request.headers.authorization as string) || '';
      const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
      if (token !== (metricsConf.bearer_token || '')) {
        return reply.status(401).send('Unauthorized');
      }
    }
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
    console.log(`ML Service listening on http://${config.server.host}:${config.server.port}`);
  } catch (error) {
    console.error('Failed to start ML Service:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down gracefully`);
  const { closeEventPublisher } = await import('./events/publishers/MLServiceEventPublisher.js');
  await closeEventPublisher();
  if (app) await app.close();
  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
  start();
}

