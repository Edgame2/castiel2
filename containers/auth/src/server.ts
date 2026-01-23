/**
 * Authentication Module Server
 * Per ModuleImplementationGuide Section 3
 */

import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import { initializeDatabase, getDatabaseClient, connectDatabase } from '@coder/shared';
import { setupJWT } from '@coder/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { dump } from 'js-yaml';
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
        title: 'Authentication Service API',
        description: `
          Authentication service for Coder IDE with multi-provider support.
          
          ## Authentication
          Most endpoints (except health checks and public auth endpoints) require JWT authentication via Bearer token:
          \`\`\`
          Authorization: Bearer <token>
          \`\`\`
          
          ## Features
          - **Multi-Provider**: Email/password, Google OAuth, GitHub OAuth, SAML/SSO
          - **JWT Tokens**: Secure token generation, validation, and refresh
          - **Session Management**: Multi-device session tracking and revocation
          - **Password Security**: Bcrypt hashing, password history, strength validation
          - **Account Security**: Login attempt tracking, account lockout, email verification
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
        { name: 'Authentication', description: 'User authentication endpoints' },
        { name: 'Sessions', description: 'Session management' },
        { name: 'Password', description: 'Password management' },
        { name: 'Providers', description: 'Authentication provider management' },
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
    log.info('Database connected successfully', { service: 'auth' });
  } catch (error) {
    log.error('Failed to connect to database', error, { service: 'auth' });
    throw error;
  }

  // Initialize event publisher
  try {
    const { initializeEventPublisher } = await import('./events/publishers/AuthEventPublisher');
    await initializeEventPublisher();
    log.info('Event publisher initialized', { service: 'auth' });
  } catch (error) {
    log.warn('Failed to initialize event publisher (events will not be published)', { error, service: 'auth' });
    // Don't fail startup if event publisher fails - service can still function
  }

  // Setup OAuth providers (if configured)
  if (config.oauth?.google?.enabled && config.oauth.google.client_id && config.oauth.google.client_secret) {
    const { setupGoogleOAuth } = await import('./services/providers/GoogleOAuth');
    setupGoogleOAuth(fastify, {
      clientId: config.oauth.google.client_id,
      clientSecret: config.oauth.google.client_secret,
      redirectUri: config.oauth.google.redirect_uri || (config.server.base_url 
        ? `${config.server.base_url}/api/v1/auth/google/callback`
        : `http://localhost:${config.server.port}/api/v1/auth/google/callback`),
    });
    log.info('Google OAuth configured', { service: 'auth' });
  }

  if (config.oauth?.github?.enabled && config.oauth.github.client_id && config.oauth.github.client_secret) {
    const { setupGitHubOAuth } = await import('./services/providers/GitHubOAuth');
    setupGitHubOAuth(fastify, {
      clientId: config.oauth.github.client_id,
      clientSecret: config.oauth.github.client_secret,
      redirectUri: config.oauth.github.redirect_uri || (config.server.base_url 
        ? `${config.server.base_url}/api/v1/auth/oauth/github/callback`
        : `http://localhost:${config.server.port}/api/v1/auth/oauth/github/callback`),
    });
    log.info('GitHub OAuth configured', { service: 'auth' });
  }

  // Register global error handler
  fastify.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
    log.error('Request error', error, {
      requestId: request.id,
      path: request.url,
      method: request.method,
      service: 'auth',
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
      service: 'auth',
    });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    log.debug('Request completed', {
      requestId: request.id,
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
      service: 'auth',
    });
  });

  // Register routes
  const { registerRoutes } = await import('./routes');
  await registerRoutes(fastify, config);

  // Health check endpoints (no auth required)
  fastify.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'auth',
    };
  });

  fastify.get('/ready', async () => {
    const db = getDatabaseClient();
    let dbStatus = 'unknown';
    let redisStatus = 'unknown';
    let rabbitmqStatus = 'unknown';
    
    try {
      await db.$queryRaw`SELECT 1`;
      dbStatus = 'ok';
    } catch (error) {
      dbStatus = 'error';
    }

    // Check Redis connection
    try {
      const { redis } = await import('./utils/redis');
      await redis.ping();
      redisStatus = 'ok';
    } catch (error) {
      redisStatus = 'error';
    }

    // Check RabbitMQ connection
    try {
      const { getChannel } = await import('@coder/shared');
      await getChannel();
      rabbitmqStatus = 'ok';
    } catch (error) {
      rabbitmqStatus = 'error';
    }

    const allOk = dbStatus === 'ok' && redisStatus === 'ok' && rabbitmqStatus === 'ok';

    return {
      status: allOk ? 'ready' : 'not_ready',
      checks: {
        database: { status: dbStatus },
        redis: { status: redisStatus },
        rabbitmq: { status: rabbitmqStatus },
      },
      timestamp: new Date().toISOString(),
      service: 'auth',
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
    
    log.info(`Authentication service listening on http://${config.server.host}:${config.server.port}`, {
      port: config.server.port,
      host: config.server.host,
      service: 'auth',
    });

    // Export OpenAPI spec to YAML file (after server is ready)
    Promise.resolve(server.ready()).then(() => {
      try {
        if (!server) return;
        const openApiSpec = (server as any).swagger();
        const yamlSpec = dump(openApiSpec, { indent: 2 });
        const docsDir = join(__dirname, '../docs');
        const specPath = join(docsDir, 'openapi.yaml');

        // Ensure docs directory exists
        try {
          mkdirSync(docsDir, { recursive: true });
        } catch (e) {
          // Directory might already exist, ignore error
        }

        writeFileSync(specPath, yamlSpec, 'utf8');
        log.info('OpenAPI specification exported', { path: specPath, service: 'auth' });
      } catch (error: any) {
        log.warn('Failed to export OpenAPI spec', { error: error.message, service: 'auth' });
        // Don't fail startup if spec export fails
      }
    }).catch((error: Error) => {
      log.warn('Failed to export OpenAPI spec', { error: error.message, service: 'auth' });
    });
  } catch (error) {
    log.error('Failed to start authentication service', error, { service: 'auth' });
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string): Promise<void> {
  log.info(`${signal} received, shutting down gracefully`, { service: 'auth' });
  try {
    const { closeEventPublisher } = await import('./events/publishers/AuthEventPublisher');
    await closeEventPublisher();
  } catch (error) {
    log.error('Error closing event publisher', error, { service: 'auth' });
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
  log.error('Uncaught exception', error, { service: 'auth' });
  gracefulShutdown('uncaughtException').catch(() => {
    process.exit(1);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  log.error('Unhandled promise rejection', reason as Error, {
    service: 'auth',
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

