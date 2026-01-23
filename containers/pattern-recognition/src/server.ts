import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import { initializeDatabase, connectDatabase, disconnectDatabase, setupJWT, setupHealthCheck } from '@coder/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { loadConfig } from './config';
import { registerRoutes } from './routes';

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
        title: 'Pattern Recognition API',
        description: 'Learn and enforce codebase patterns',
        version: '1.0.0',
      },
      servers: [{ url: '/api/v1', description: 'API Version 1' }],
      tags: [
        { name: 'Patterns', description: 'Pattern management' },
        { name: 'Pattern Scanning', description: 'Pattern scanning and matching' },
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
    containers: {
      patterns: 'pattern_patterns',
      scans: 'pattern_scans',
      matches: 'pattern_matches',
      libraries: 'pattern_libraries',
    },
  });

  await setupJWT(fastify, { secret: process.env.JWT_SECRET || '' });
  setupHealthCheck(fastify);

  try {
    await connectDatabase({
      endpoint: config.cosmos_db.endpoint,
      key: config.cosmos_db.key,
      databaseId: config.cosmos_db.database_id,
    });
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }

  // Register routes
  await registerRoutes(fastify, config);

  app = fastify;
  return fastify;
}

export async function start(): Promise<void> {
  try {
    const server = await buildApp();
    const config = loadConfig();
    await server.listen({ port: config.server.port, host: config.server.host });
    console.log(`Pattern Recognition listening on http://${config.server.host}:${config.server.port}`);
  } catch (error) {
    console.error('Failed to start Pattern Recognition:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down gracefully`);
  if (app) await app.close();
  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
  start();
}

