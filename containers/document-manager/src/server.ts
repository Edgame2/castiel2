/**
 * Document Manager Module Server
 * Per ModuleImplementationGuide Section 3
 */

import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import { getDatabaseClient, connectDatabase, disconnectDatabase, setupJWT, setupHealthCheck } from '@coder/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
import { loadConfig } from './config';
import { registerRoutes } from './routes';

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
    bodyLimit: 104857600, // 100MB for file uploads
    requestTimeout: 300000, // 5 minutes for large uploads
  });

  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
    },
  });

  // Register Swagger/OpenAPI
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Document Manager Service API',
        description: 'Document and file management service for Coder IDE',
        version: '1.0.0',
      },
      servers: [
        {
          url: '/api/v1',
          description: 'API Version 1',
        },
      ],
      tags: [
        { name: 'Documents', description: 'Document CRUD operations' },
        { name: 'Files', description: 'File upload/download' },
        { name: 'Collections', description: 'Document collections' },
        { name: 'Templates', description: 'Document templates' },
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
    
    console.log(`Document Manager service listening on http://${config.server.host}:${config.server.port}`);
  } catch (error) {
    console.error('Failed to start Document Manager service:', error);
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

if (require.main === module) {
  start();
}

