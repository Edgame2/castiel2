/**
 * Logging Module Server
 * Per ModuleImplementationGuide Section 3
 */

import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import { PrismaClient } from '.prisma/logging-client';
import { setupJWT } from '@coder/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { dump } from 'js-yaml';
import { loadConfig } from './config';
import { registerRoutes } from './routes';
import { createStorageProvider } from './services/providers/storage/ProviderFactory';
import { IngestionService } from './services/IngestionService';
import { ConfigurationService } from './services/ConfigurationService';
import { createSIEMProvider } from './services/providers/siem/SIEMProviderFactory';
import { RetentionService } from './services/RetentionService';
import { AuditEventConsumer } from './events';
import { RetentionJob, ArchiveJob, AlertJob, PartitionJob } from './jobs';
import { createArchiveProvider } from './services/providers/archive';
import { log } from './utils/logger';

// Global instances
let app: FastifyInstance | null = null;
let prisma: PrismaClient | null = null;
let ingestionService: IngestionService | null = null;
let eventConsumer: AuditEventConsumer | null = null;
let retentionJob: RetentionJob | null = null;
let archiveJob: ArchiveJob | null = null;
let alertJob: AlertJob | null = null;
let partitionJob: PartitionJob | null = null;

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
  });

  // Register Swagger/OpenAPI
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Logging Service API',
        description: `
          Enterprise-grade audit logging service with tamper-evident hash chains, retention policies, and compliance features.
          
          ## Authentication
          All endpoints (except health checks) require JWT authentication via Bearer token:
          \`\`\`
          Authorization: Bearer <token>
          \`\`\`
          
          ## Features
          - **Multi-tenant**: Organization-isolated logs with Super Admin cross-org access
          - **Tamper Evidence**: Hash chain verification for audit integrity
          - **Retention Policies**: Configurable per log type, category, and severity
          - **Export**: CSV/JSON export for auditors
          - **Alerts**: Pattern-based alert rules with notifications
          - **Search**: Full-text search with advanced filtering
          - **Compliance**: SOC2, GDPR, PCI-DSS compliant
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
        { name: 'Logs', description: 'Log ingestion and retrieval' },
        { name: 'Search', description: 'Log search and filtering' },
        { name: 'Export', description: 'Log export functionality' },
        { name: 'Policies', description: 'Retention policy management' },
        { name: 'Configuration', description: 'Organization configuration' },
        { name: 'Alerts', description: 'Alert rule management' },
        { name: 'Verification', description: 'Hash chain verification' },
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
  
  // Initialize Prisma
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: config.database.url,
      },
    },
  });
  
  // Create storage provider
  const storageProvider = createStorageProvider(
    { provider: config.storage.provider, postgres: config.storage.postgres },
    prisma
  );
  
  // Create configuration service
  const configService = new ConfigurationService(prisma);
  const getOrganizationConfig = async (orgId: string) => {
    return configService.getOrganizationConfig(orgId);
  };
  
  // Create SIEM provider if enabled
  let siemProvider = null;
  if (config.siem?.enabled && config.siem?.provider) {
    try {
      siemProvider = createSIEMProvider(config.siem);
      log.info('SIEM provider initialized', { provider: config.siem.provider });
    } catch (error) {
      log.error('Failed to initialize SIEM provider', error);
      // Don't fail startup if SIEM fails - continue without SIEM
    }
  }
  
  // Create ingestion service
  ingestionService = new IngestionService({
    storageProvider,
    getOrganizationConfig,
    siemProvider: siemProvider || undefined,
  });
  
  // Create retention service
  const retentionService = new RetentionService(prisma);
  
  // Create all remaining services
  const { HashChainService } = await import('./services/HashChainService');
  const { QueryService } = await import('./services/QueryService');
  const { ExportService } = await import('./services/ExportService');
  const { AlertService } = await import('./services/AlertService');
  
  const hashChainService = new HashChainService(prisma, storageProvider);
  const queryService = new QueryService(storageProvider);
  const exportService = new ExportService(prisma, storageProvider);
  const alertService = new AlertService(prisma, storageProvider);
  
  // Attach services to app for route handlers
  (fastify as any).storageProvider = storageProvider;
  (fastify as any).ingestionService = ingestionService;
  (fastify as any).prisma = prisma;
  (fastify as any).configService = configService;
  (fastify as any).hashChainService = hashChainService;
  (fastify as any).queryService = queryService;
  (fastify as any).retentionService = retentionService;
  (fastify as any).exportService = exportService;
  (fastify as any).alertService = alertService;
  
  // Register error handler
  fastify.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
    log.error('Request error', error, {
      requestId: request.id,
      path: request.url,
      method: request.method,
    });
    
    // Handle known error types
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
  
  // Register request logging
  fastify.addHook('onRequest', async (request) => {
    log.debug('Request received', {
      requestId: request.id,
      method: request.method,
      path: request.url,
    });
  });
  
  fastify.addHook('onResponse', async (request, reply) => {
    log.debug('Request completed', {
      requestId: request.id,
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
    });
  });
  
  // Register routes
  await registerRoutes(fastify);
  
  return fastify;
}

/**
 * Start the server
 */
export async function start(): Promise<void> {
  const config = loadConfig();
  
  try {
    app = await buildApp();
    
    // Setup JWT for authentication
    await setupJWT(app);
    log.info('JWT authentication configured');
    
    // Connect to database
    await prisma?.$connect();
    log.info('Connected to database');
    
    // Start event consumer (if RabbitMQ is configured)
    if (config.rabbitmq.url && ingestionService) {
      try {
        eventConsumer = new AuditEventConsumer(ingestionService);
        await eventConsumer.start();
        log.info('Event consumer started');
      } catch (error) {
        log.warn('Failed to start event consumer, running without RabbitMQ', { error });
        // Don't fail startup - RabbitMQ is optional
      }
    }
    
    // Start server
    const address = await app.listen({
      port: config.server.port,
      host: config.server.host,
    });
    
    log.info('Server started', {
      address,
      port: config.server.port,
      env: process.env.NODE_ENV || 'development',
    });

    // Export OpenAPI spec to YAML file (after server is ready)
    Promise.resolve(app.ready()).then(() => {
      try {
        if (!app) return;
        const openApiSpec = (app as any).swagger();
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
        log.info('OpenAPI specification exported', { path: specPath });
      } catch (error: any) {
        log.warn('Failed to export OpenAPI spec', { error: error.message });
        // Don't fail startup if spec export fails
      }
    }).catch((error: Error) => {
      log.warn('Failed to export OpenAPI spec', { error: error.message });
    });

    // Start background jobs (after server is ready)
    const storageProvider = (app as any).storageProvider;
    
    // Retention job
    if (config.jobs.retention.enabled && prisma) {
      retentionJob = new RetentionJob(prisma, storageProvider);
      retentionJob.start(config.jobs.retention.schedule);
      log.info('Retention job started', { schedule: config.jobs.retention.schedule });
    }

    // Archive job (with optional archive provider)
    if (config.jobs.archive.enabled && prisma) {
      archiveJob = new ArchiveJob(prisma, storageProvider);
      
      // Configure archive provider if settings exist
      if (config.archive?.enabled && config.archive?.provider) {
        try {
          const { createArchiveProvider } = await import('./services/providers/archive/ArchiveProviderFactory');
          const archiveProvider = createArchiveProvider(config.archive);
          archiveJob.setArchiveProvider(archiveProvider);
        } catch (error) {
          log.warn('Failed to configure archive provider', { error });
        }
      }
      
      archiveJob.start(config.jobs.archive.schedule);
      log.info('Archive job started', { schedule: config.jobs.archive.schedule });
    }

    // Alert job
    if (config.jobs.alerts.enabled && prisma) {
      alertJob = new AlertJob(prisma, storageProvider);
      alertJob.start(config.jobs.alerts.schedule);
      log.info('Alert job started', { schedule: config.jobs.alerts.schedule });
    }

    // Partition job
    if (config.jobs.partition.enabled && prisma) {
      const partitionBy = config.storage.postgres?.partition_by || 'month';
      partitionJob = new PartitionJob(prisma, partitionBy, 12);
      partitionJob.start(config.jobs.partition.schedule);
      log.info('Partition job started', { schedule: config.jobs.partition.schedule });
    }
  } catch (error) {
    log.error('Failed to start server', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
export async function shutdown(): Promise<void> {
  log.info('Shutting down...');
  
  // Stop background jobs
  if (retentionJob) {
    retentionJob.stop();
  }
  if (archiveJob) {
    archiveJob.stop();
  }
  if (alertJob) {
    alertJob.stop();
  }
  if (partitionJob) {
    partitionJob.stop();
  }

  // Stop event consumer
  if (eventConsumer) {
    await eventConsumer.stop();
  }
  
  // Flush remaining logs
  if (ingestionService) {
    await ingestionService.shutdown();
  }
  
  // Close server
  if (app) {
    await app.close();
  }
  
  // Disconnect database
  if (prisma) {
    await prisma.$disconnect();
  }
  
  log.info('Shutdown complete');
}

// Handle shutdown signals
process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});

// Start server if this is the main module
if (require.main === module) {
  start();
}
