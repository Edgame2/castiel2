/**
 * AI Conversation Module Server
 * Per ModuleImplementationGuide Section 3
 */

import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import { initializeDatabase, connectDatabase } from '@coder/shared';
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
    bodyLimit: 10485760, // 10MB body size limit (for large conversations)
    requestTimeout: 60000, // 60 seconds request timeout
    keepAliveTimeout: 5000, // 5 seconds keep-alive timeout
  });

  // Register Swagger/OpenAPI
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'AI Conversation Service API',
        description: `
          AI conversation and context management service for Coder IDE.
          
          ## Authentication
          All endpoints (except health checks) require JWT authentication via Bearer token:
          \`\`\`
          Authorization: Bearer <token>
          \`\`\`
          
          ## Features
          - **Conversation Management**: Create, update, and manage AI conversations
          - **Message Handling**: Send messages, edit messages, manage message history
          - **Context Assembly**: Assemble context from shards for conversations
          - **Grounding**: Response grounding and citation
          - **Intent Analysis**: Intent classification and analysis
          - **Context Quality**: Context quality assessment
          - **Citation Validation**: Validate citations in responses
          - **Conversation Summarization**: Summarize long conversations
          - **Context Retrieval**: Retrieve conversation context
          - **Prompt Injection Defense**: Defend against prompt injection attacks
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
        { name: 'Conversations', description: 'Conversation management' },
        { name: 'Messages', description: 'Message handling' },
        { name: 'Context', description: 'Context assembly and management' },
        { name: 'Grounding', description: 'Response grounding and citation' },
        { name: 'Intent', description: 'Intent analysis' },
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
    containers: {
      conversations: config.cosmos_db.containers.conversations,
      messages: config.cosmos_db.containers.messages,
      contexts: config.cosmos_db.containers.contexts,
      citations: config.cosmos_db.containers.citations,
    },
  });
  
  // Connect to database
  try {
    await connectDatabase();
    log.info('Database connected successfully', { service: 'ai-conversation' });
  } catch (error) {
    log.error('Failed to connect to database', error, { service: 'ai-conversation' });
    throw error;
  }

  // Initialize event publisher and consumer
  try {
    const { initializeEventPublisher } = await import('./events/publishers/ConversationEventPublisher');
    await initializeEventPublisher();
    const { initializeEventConsumer } = await import('./events/consumers/ConversationEventConsumer');
    await initializeEventConsumer();
    log.info('Event publisher and consumer initialized', { service: 'ai-conversation' });
  } catch (error) {
    log.warn('Failed to initialize event handlers (events will not be published/consumed)', { error, service: 'ai-conversation' });
    // Don't fail startup if event handlers fail - service can still function
  }

  // Register global error handler
  fastify.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
    log.error('Request error', error, {
      requestId: request.id,
      path: request.url,
      method: request.method,
      service: 'ai-conversation',
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
      service: 'ai-conversation',
    });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    log.debug('Request completed', {
      requestId: request.id,
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
      service: 'ai-conversation',
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
      service: 'ai-conversation',
    };
  });

  fastify.get('/ready', async () => {
    let dbStatus = 'unknown';
    try {
      // Check Cosmos DB connection by reading a container
      const { getContainer } = await import('@coder/shared/database');
      const container = getContainer('conversation_conversations');
      await container.read();
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
      service: 'ai-conversation',
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
    
    log.info(`AI Conversation service listening on http://${config.server.host}:${config.server.port}`, {
      port: config.server.port,
      host: config.server.host,
      service: 'ai-conversation',
    });
  } catch (error) {
    log.error('Failed to start AI conversation service', error, { service: 'ai-conversation' });
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string): Promise<void> {
  log.info(`${signal} received, shutting down gracefully`, { service: 'ai-conversation' });
  try {
    const { closeEventPublisher } = await import('./events/publishers/ConversationEventPublisher');
    await closeEventPublisher();
    const { closeEventConsumer } = await import('./events/consumers/ConversationEventConsumer');
    await closeEventConsumer();
  } catch (error) {
    log.error('Error closing event handlers', error, { service: 'ai-conversation' });
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
  log.error('Uncaught exception', error, { service: 'ai-conversation' });
  gracefulShutdown('uncaughtException').catch(() => {
    process.exit(1);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  log.error('Unhandled promise rejection', reason as Error, {
    service: 'ai-conversation',
    promise: promise.toString(),
  });
  // Don't exit on unhandled rejection - log and continue
});

// Start server if this file is run directly
if (require.main === module) {
  start().catch((error) => {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  });
}
