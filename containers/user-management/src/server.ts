/**
 * User Management Module Server
 * Per ModuleImplementationGuide Section 3
 */

import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import { initializeDatabase, getDatabaseClient, connectDatabase } from '@coder/shared';
import { setupJWT } from '@coder/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { loadConfig } from './config';
import { log } from './utils/logger';

// Global instances
let app: FastifyInstance | null = null;

/**
 * Build the Fastify application
 */
export async function buildApp(): Promise<FastifyInstance> {
  const config = loadConfig();
  
  // Create Fastify instance
  const fastify = Fastify({
    logger: false, // We use our own structured logger
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
    bodyLimit: 1048576, // 1MB body size limit
    requestTimeout: 30000, // 30 seconds request timeout
    keepAliveTimeout: 5000, // 5 seconds keep-alive timeout
  });

  // Register Swagger/OpenAPI
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'User Management Service API',
        description: `
          User management service for Castiel with organizations, teams, roles, and permissions.
          
          ## Authentication
          All endpoints (except health checks) require JWT authentication via Bearer token:
          \`\`\`
          Authorization: Bearer <token>
          \`\`\`
          
          ## Features
          - **User Profiles**: User profile management and preferences
          - **Organizations**: Multi-tenant organization management
          - **Teams**: Team creation, membership, and hierarchy
          - **RBAC**: Role-based access control with custom roles
          - **Invitations**: User invitation system
          - **Memberships**: Organization membership management
        `,
        version: '1.0.0',
      },
      servers: [
        {
          url: '/api/v1',
          description: 'API Version 1',
        },
      ],
      tags: [
        { name: 'Users', description: 'User profile management' },
        { name: 'Organizations', description: 'Organization management' },
        { name: 'Teams', description: 'Team management' },
        { name: 'Roles', description: 'Role and permission management' },
        { name: 'Invitations', description: 'User invitation management' },
        { name: 'Memberships', description: 'Organization membership management' },
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
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });
  
  // Setup JWT
  await setupJWT(fastify, {
    secret: config.jwt.secret,
  });
  
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
    log.info('Database connected successfully', { service: 'user-management' });
  } catch (error) {
    log.error('Failed to connect to database', error, { service: 'user-management' });
    throw error;
  }

  // Initialize event publisher
  try {
    const { initializeEventPublisher } = await import('./events/publishers/UserManagementEventPublisher.js');
    await initializeEventPublisher();
    log.info('Event publisher initialized', { service: 'user-management' });
  } catch (error) {
    log.warn('Failed to initialize event publisher (events will not be published)', { error, service: 'user-management' });
    // Don't fail startup if event publisher fails - service can still function
  }

  // Register global error handler
  fastify.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
    log.error('Request error', error, {
      requestId: request.id,
      path: request.url,
      method: request.method,
      service: 'user-management',
    });
    
    // Handle validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: error.validation,
        },
      });
    }
    
    // Generic error response
    return reply.status(error.statusCode || 500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : error.message,
      },
    });
  });

  // Register request/response logging hooks
  fastify.addHook('onRequest', async (request) => {
    log.debug('Request received', {
      requestId: request.id,
      method: request.method,
      path: request.url,
      service: 'user-management',
    });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    log.debug('Request completed', {
      requestId: request.id,
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
      service: 'user-management',
    });
  });

  // Register routes
  const { registerRoutes } = await import('./routes/index.js');
  await registerRoutes(fastify, config);

  // Health check endpoints (no auth required)
  fastify.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'user-management',
    };
  });

  fastify.get('/ready', async () => {
    const db = getDatabaseClient() as unknown as {
      $queryRaw?: (template: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
    };
    let dbStatus = 'unknown';
    
    try {
      if (typeof db.$queryRaw === 'function') {
        await db.$queryRaw`SELECT 1`;
      }
      dbStatus = 'ok';
    } catch (error) {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'ready' : 'not_ready',
      checks: {
        database: { status: dbStatus },
      },
      timestamp: new Date().toISOString(),
      service: 'user-management',
    };
  });

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
      host: config.server.host 
    });
    
    log.info(`User Management service listening on http://${config.server.host}:${config.server.port}`, {
      port: config.server.port,
      host: config.server.host,
      service: 'user-management',
    });
  } catch (error) {
    log.error('Failed to start user management service', error, { service: 'user-management' });
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string): Promise<void> {
  log.info(`${signal} received, shutting down gracefully`, { service: 'user-management' });
  try {
    const { closeEventPublisher } = await import('./events/publishers/UserManagementEventPublisher.js');
    await closeEventPublisher();
  } catch (error) {
    log.error('Error closing event publisher', error, { service: 'user-management' });
  }
  if (app) {
    await app.close();
  }
  process.exit(0);
}

// Graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  log.error('Uncaught exception', error, { service: 'user-management' });
  gracefulShutdown('uncaughtException').catch(() => {
    process.exit(1);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  log.error('Unhandled promise rejection', reason as Error, {
    service: 'user-management',
    promise: promise.toString(),
  });
  // Don't exit on unhandled rejection - log and continue
  // This allows the application to continue running
});

// Start server if this file is run directly
if (require.main === module) {
  start().catch((error) => {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  });
}

