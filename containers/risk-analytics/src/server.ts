/**
 * Risk Analytics Module Server
 * Asynchronous risk evaluation and revenue analytics system (event-driven) with CAIS integration
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
        title: 'Risk Analytics Service API',
        description: `
          Asynchronous risk evaluation and revenue analytics system with CAIS integration.
          
          ## Features
          - **Risk Evaluation**: Asynchronous risk evaluation via events
          - **Risk Scoring**: ML-based risk scoring with CAIS integration
          - **Revenue at Risk**: Revenue calculations
          - **Early Warning**: Early warning system
          - **CAIS Integration**: Hybrid approach (REST for weights, Events for outcomes)
        `,
        version: '1.0.0',
      },
      servers: [{ url: '/api/v1', description: 'API Version 1' }],
      tags: [
        { name: 'Risk Evaluation', description: 'Risk evaluation operations' },
        { name: 'Risk Scoring', description: 'ML-based risk scoring' },
        { name: 'Revenue', description: 'Revenue at risk calculations' },
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Sales Methodology', description: 'Plan W8 tenant sales methodology (stages, requirements, MEDDIC)' },
        { name: 'Reactivation', description: 'W9 Layer 6 reactivation evaluation and events' },
        { name: 'Tenant ML Config', description: 'W10 tenant ML configuration (risk tolerance, decision/model preferences)' },
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
      evaluations: config.cosmos_db.containers.evaluations,
      snapshots: config.cosmos_db.containers.snapshots ?? 'risk_snapshots',
      predictions: config.cosmos_db.containers.predictions ?? 'risk_predictions',
      revenue_at_risk: config.cosmos_db.containers.revenue_at_risk,
      quotas: config.cosmos_db.containers.quotas,
      warnings: config.cosmos_db.containers.warnings,
      simulations: config.cosmos_db.containers.simulations,
      anomaly_alerts: config.cosmos_db.containers.anomaly_alerts ?? 'risk_anomaly_alerts',
      sentiment_trends: config.cosmos_db.containers.sentiment_trends ?? 'risk_sentiment_trends',
      explanations: config.cosmos_db.containers.explanations ?? 'risk_explanations',
      global_feature_importance: config.cosmos_db.containers.global_feature_importance ?? 'risk_global_feature_importance',
      decisions: config.cosmos_db.containers.decisions ?? 'risk_decisions',
      rules: config.cosmos_db.containers.rules ?? 'risk_rules',
      sales_methodology: config.cosmos_db.containers.sales_methodology ?? 'risk_sales_methodology',
      tenant_ml_config: config.cosmos_db.containers.tenant_ml_config ?? 'risk_tenant_ml_config',
    },
  });
  
  try {
    await connectDatabase();
    log.info('Database connected successfully', { service: 'risk-analytics' });
  } catch (error) {
    log.error('Failed to connect to database', error, { service: 'risk-analytics' });
    throw error;
  }

  try {
    const { initializeEventPublisher } = await import('./events/publishers/RiskAnalyticsEventPublisher');
    await initializeEventPublisher();
    const { initializeEventConsumer } = await import('./events/consumers/RiskAnalyticsEventConsumer');
    await initializeEventConsumer();
    log.info('Event publisher and consumer initialized', { service: 'risk-analytics' });
  } catch (error) {
    log.warn('Failed to initialize event handlers', { error, service: 'risk-analytics' });
  }

  try {
    const { initializeBatchJobWorker } = await import('./events/consumers/BatchJobWorker');
    await initializeBatchJobWorker();
  } catch (error) {
    log.warn('Failed to initialize batch job worker', { error, service: 'risk-analytics' });
  }

  fastify.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
    log.error('Request error', error, {
      requestId: request.id,
      path: request.url,
      method: request.method,
      service: 'risk-analytics',
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
      service: 'risk-analytics',
    });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const route = (request as { routerPath?: string }).routerPath ?? (request as { routeOptions?: { url?: string } }).routeOptions?.url ?? String((request as { url?: string }).url || '').split('?')[0] || 'unknown';
    httpRequestsTotal.inc({ method: request.method, route, status: String(reply.statusCode) });
    httpRequestDurationSeconds.observe({ method: request.method, route }, (reply.elapsedTime ?? 0) / 1000);
    log.debug('Request completed', {
      requestId: request.id,
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
      service: 'risk-analytics',
    });
  });

  const { registerRoutes } = await import('./routes');
  await registerRoutes(fastify, config);

  fastify.get('/health', async () => {
    const { getLastRiskSnapshotBackfillAt } = await import('./events/consumers/BatchJobWorker');
    const last = getLastRiskSnapshotBackfillAt();
    let mlServiceReachable: 'ok' | 'unreachable' | 'not_configured' = 'not_configured';
    const mlUrl = config.services?.ml_service?.url;
    if (typeof mlUrl === 'string' && mlUrl.length > 0) {
      try {
        const u = mlUrl.replace(/\/$/, '');
        const res = await globalThis.fetch(`${u}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
        mlServiceReachable = res?.ok ? 'ok' : 'unreachable';
      } catch {
        mlServiceReachable = 'unreachable';
      }
    }
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'risk-analytics',
      lastRiskSnapshotBackfillAt: last ? last.toISOString() : null,
      mlServiceReachable,
    };
  });

  fastify.get('/ready', async () => {
    let dbStatus = 'unknown';
    try {
      // Check Cosmos DB connection by reading a container
      const { getContainer } = await import('@coder/shared/database');
      const container = getContainer('risk_evaluations');
      await container.read();
      dbStatus = 'ok';
    } catch (error) {
      dbStatus = 'error';
    }
    return {
      status: dbStatus === 'ok' ? 'ready' : 'not_ready',
      checks: { database: { status: dbStatus } },
      timestamp: new Date().toISOString(),
      service: 'risk-analytics',
    };
  });

  const metricsConf = config.metrics!;
  fastify.get(metricsConf.path, async (request, reply) => {
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
    log.info(`Risk Analytics service listening on http://${config.server.host}:${config.server.port}`, {
      port: config.server.port,
      host: config.server.host,
      service: 'risk-analytics',
    });
  } catch (error) {
    log.error('Failed to start risk analytics service', error, { service: 'risk-analytics' });
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  log.info(`${signal} received, shutting down gracefully`, { service: 'risk-analytics' });
  try {
    const { closeBatchJobWorker } = await import('./events/consumers/BatchJobWorker');
    await closeBatchJobWorker();
  } catch (error) {
    log.error('Error closing batch job worker', error, { service: 'risk-analytics' });
  }
  try {
    const { closeEventPublisher } = await import('./events/publishers/RiskAnalyticsEventPublisher');
    await closeEventPublisher();
    const { closeEventConsumer } = await import('./events/consumers/RiskAnalyticsEventConsumer');
    await closeEventConsumer();
  } catch (error) {
    log.error('Error closing event handlers', error, { service: 'risk-analytics' });
  }
  if (app) await app.close();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error: Error) => {
  log.error('Uncaught exception', error, { service: 'risk-analytics' });
  gracefulShutdown('uncaughtException').catch(() => process.exit(1));
});
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  log.error('Unhandled promise rejection', reason as Error, { service: 'risk-analytics', promise: promise.toString() });
});

if (require.main === module) {
  start().catch((error) => {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  });
}
