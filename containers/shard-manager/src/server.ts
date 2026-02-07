/**
 * Shard Manager Module Server
 * Per ModuleImplementationGuide Section 3
 */

import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import { initializeDatabase, getDatabaseClient, connectDatabase, disconnectDatabase, setupJWT, setupHealthCheck } from '@coder/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { loadConfig } from './config';
import { registerRoutes } from './routes';

// Global instance
let app: FastifyInstance | null = null;

/**
 * Build the Fastify application
 */
export async function buildApp(): Promise<FastifyInstance> {
  const config = loadConfig();
  
  const fastify = Fastify({
    logger: false,
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
    bodyLimit: 10485760, // 10MB
    requestTimeout: 30000,
    keepAliveTimeout: 5000,
  });

  // Register Swagger/OpenAPI
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Shard Manager Service API',
        description: 'Core data model management service for Castiel',
        version: '1.0.0',
      },
      servers: [
        {
          url: '/api/v1',
          description: 'API Version 1',
        },
      ],
      tags: [
        { name: 'Shards', description: 'Shard CRUD operations' },
        { name: 'ShardTypes', description: 'ShardType management' },
        { name: 'Relationships', description: 'Relationship management' },
        { name: 'Bulk', description: 'Bulk operations' },
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
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // Setup JWT
  await setupJWT(fastify, {
    secret: process.env.JWT_SECRET || '',
  });

  // Setup health checks
  setupHealthCheck(fastify);

  // Initialize database with config
  initializeDatabase({
    endpoint: config.cosmos_db.endpoint,
    key: config.cosmos_db.key,
    database: config.cosmos_db.database_id,
    containers: config.cosmos_db.containers,
  });

  // Connect to database
  try {
    await connectDatabase();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }

  // Ensure all platform Cosmos containers from central manifest (optional bootstrap)
  const bootstrap = config?.bootstrap;
  if (bootstrap?.ensure_cosmos_containers && bootstrap?.cosmos_containers_manifest_path) {
    try {
      const { ensureCosmosContainers } = await import('./startup/ensureCosmosContainers.js');
      await ensureCosmosContainers(bootstrap.cosmos_containers_manifest_path);
      fastify.log.info(
        { manifestPath: bootstrap.cosmos_containers_manifest_path },
        'Bootstrap: ensured all Cosmos containers from manifest'
      );
    } catch (err) {
      fastify.log.warn({ err, service: 'shard-manager' }, 'Bootstrap ensure Cosmos containers failed');
    }
  }

  // Initialize event publisher
  try {
    const { initializeEventPublisher } = await import('./events/publishers/ShardEventPublisher.js');
    await initializeEventPublisher();
  } catch (error) {
    console.warn('Failed to initialize event publisher', error);
    // Don't fail startup if event publisher fails
  }

  // Register routes
  await registerRoutes(fastify, config);

  app = fastify;
  return fastify;
}

/**
 * Start the server
 */
export async function start(): Promise<void> {
  try {
    const server = await buildApp();
    const config = loadConfig();
    
    await server.listen({
      port: config.server.port,
      host: config.server.host,
    });
    
    console.log(`Shard Manager service listening on http://${config.server.host}:${config.server.port}`);
  } catch (error) {
    console.error('Failed to start Shard Manager service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down gracefully`);
  if (app) {
    await app.close();
  }
  try {
    const { closeEventPublisher } = await import('./events/publishers/ShardEventPublisher.js');
    await closeEventPublisher();
  } catch (error) {
    console.warn('Failed to close event publisher', error);
  }
  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start if run directly
if (require.main === module) {
  start();
}

