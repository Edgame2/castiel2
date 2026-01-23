/**
 * Shard Manager Module Server
 * Per ModuleImplementationGuide Section 3
 */

import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import { getDatabaseClient, connectDatabase, disconnectDatabase, setupJWT, setupHealthCheck } from '@coder/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { loadConfig } from './config';

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
        description: 'Core data model management service for Coder IDE',
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

  // Connect to database
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
  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start if run directly
if (require.main === module) {
  start();
}

