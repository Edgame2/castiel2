/**
 * Logging Module Server
 * Per ModuleImplementationGuide Section 3
 */

import './instrumentation';

import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import { setupJWT, initializeDatabase, connectDatabase } from '@coder/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { dump } from 'js-yaml';
import { loadConfig } from './config';
import { httpRequestsTotal, httpRequestDurationSeconds, register } from './metrics';
import { registerRoutes } from './routes';
import { createStorageProvider } from './services/providers/storage/ProviderFactory';
import { IngestionService } from './services/IngestionService';
import { ConfigurationService } from './services/ConfigurationService';
import { createSIEMProvider } from './services/providers/siem/SIEMProviderFactory';
import { RetentionService } from './services/RetentionService';
import { AuditEventConsumer, DataLakeCollector, MLAuditConsumer } from './events';
import { AlertJob } from './jobs';
import { createArchiveProvider } from './services/providers/archive';
import { log } from './utils/logger';

// Global instances
let app: FastifyInstance | null = null;
let ingestionService: IngestionService | null = null;
let eventConsumer: AuditEventConsumer | null = null;
let dataLakeCollector: DataLakeCollector | null = null;
let mlAuditConsumer: MLAuditConsumer | null = null;
let alertJob: AlertJob | null = null;

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
          - **Multi-tenant**: Tenant-isolated logs with Super Admin cross-tenant access
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
        { name: 'Configuration', description: 'Tenant audit configuration' },
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
  
  // Logging module requires Cosmos DB only (no Postgres)
  if (config.storage?.provider !== 'cosmos' || !config.cosmos_db?.endpoint || !config.cosmos_db?.key || !config.cosmos_db?.containers) {
    throw new Error('Logging module requires Cosmos DB: set storage.provider to "cosmos" and configure cosmos_db (endpoint, key, containers).');
  }
  const containers = config.cosmos_db.containers;
  if (!containers.audit_logs) {
    throw new Error('cosmos_db.containers.audit_logs is required.');
  }

  initializeDatabase({
    endpoint: config.cosmos_db.endpoint,
    key: config.cosmos_db.key,
    database: config.cosmos_db.database_id,
    containers: config.cosmos_db.containers,
  });
  await connectDatabase();
  log.info('Cosmos DB initialized');

  const storageProvider = createStorageProvider(
    { provider: config.storage.provider },
    containers.audit_logs
  );

  const { CosmosConfigurationRepository } = await import('./data/cosmos/configuration');
  const cosmosConfigRepo = new CosmosConfigurationRepository(containers.audit_configurations);
  const configService = new ConfigurationService(cosmosConfigRepo);
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
  
  const { HashChainService } = await import('./services/HashChainService');
  const { QueryService } = await import('./services/QueryService');
  const { ExportService } = await import('./services/ExportService');
  const { AlertService } = await import('./services/AlertService');

  const { CosmosRetentionPoliciesRepository } = await import('./data/cosmos/retention-policies');
  const cosmosRetentionRepo = new CosmosRetentionPoliciesRepository(containers.audit_retention_policies);
  const retentionService = new RetentionService(cosmosRetentionRepo);

  const { CosmosHashCheckpointsRepository } = await import('./data/cosmos/hash-checkpoints');
  const cosmosCheckpointsRepo = new CosmosHashCheckpointsRepository(containers.audit_hash_checkpoints);
  const hashChainService = new HashChainService(storageProvider, cosmosCheckpointsRepo);
  const queryService = new QueryService(storageProvider);
  const { CosmosExportsRepository } = await import('./data/cosmos/exports');
  const cosmosExportsRepo = new CosmosExportsRepository(containers.audit_exports);
  const exportService = new ExportService(storageProvider, cosmosExportsRepo);

  let alertService: InstanceType<typeof AlertService>;
  let cosmosAlertRulesRepository: import('./data/cosmos/alert-rules').CosmosAlertRulesRepository | undefined;
  if (containers.audit_alert_rules) {
    const { CosmosAlertRulesRepository } = await import('./data/cosmos/alert-rules');
    cosmosAlertRulesRepository = new CosmosAlertRulesRepository(containers.audit_alert_rules);
    alertService = new AlertService(storageProvider, cosmosAlertRulesRepository);
  } else {
    throw new Error('cosmos_db.containers.audit_alert_rules is required.');
  }

  (fastify as any).storageProvider = storageProvider;
  (fastify as any).ingestionService = ingestionService;
  (fastify as any).configService = configService;
  (fastify as any).hashChainService = hashChainService;
  (fastify as any).queryService = queryService;
  (fastify as any).retentionService = retentionService;
  (fastify as any).exportService = exportService;
  (fastify as any).alertService = alertService;
  (fastify as any).cosmosAlertRulesRepository = cosmosAlertRulesRepository;
  
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
    const route = (request as { routerPath?: string }).routerPath ?? (request as { routeOptions?: { url?: string } }).routeOptions?.url ?? (String((request as { url?: string }).url || '').split('?')[0] || 'unknown');
    httpRequestsTotal.inc({ method: request.method, route, status: String(reply.statusCode) });
    httpRequestDurationSeconds.observe({ method: request.method, route }, (reply.elapsedTime ?? 0) / 1000);
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

  const metricsConf = config.metrics ?? { path: '/metrics', require_auth: false, bearer_token: '' };
  fastify.get(metricsConf.path || '/metrics', async (request, reply) => {
    if (metricsConf.require_auth) {
      const raw = (request.headers.authorization as string) || '';
      const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
      if (token !== (metricsConf.bearer_token || '')) {
        return reply.status(401).send('Unauthorized');
      }
    }
    return reply.type('text/plain; version=0.0.4').send(await register.metrics());
  });
  
  return fastify;
}

/**
 * Start the server
 */
export async function start(): Promise<void> {
  const config = loadConfig();
  
  try {
    app = await buildApp();
    
    // Setup JWT for authentication (cast for cross-package Fastify type compatibility)
    await setupJWT(app as any, { secret: process.env.JWT_SECRET || '' });
    log.info('JWT authentication configured');
    
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

    // DataLakeCollector (risk.evaluated → Parquet) and MLAuditConsumer (risk/ml/remediation → Blob audit)
    if (config.rabbitmq?.url && config.data_lake?.connection_string) {
      try {
        dataLakeCollector = new DataLakeCollector();
        await dataLakeCollector.start();
      } catch (error) {
        log.warn('Failed to start DataLakeCollector', { error });
      }
      try {
        mlAuditConsumer = new MLAuditConsumer();
        await mlAuditConsumer.start();
      } catch (error) {
        log.warn('Failed to start MLAuditConsumer', { error });
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
    
    // Retention job and Archive job require Prisma; not started in Cosmos-only mode.
    // Partition job is Postgres-specific; not started.

    // Alert job (Cosmos)
    if (config.jobs.alerts.enabled && (app as any).cosmosAlertRulesRepository) {
      const cosmosRepo = (app as any).cosmosAlertRulesRepository;
      alertJob = new AlertJob(storageProvider, cosmosRepo);
      alertJob.start(config.jobs.alerts.schedule);
      log.info('Alert job started', { schedule: config.jobs.alerts.schedule });
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
  
  if (alertJob) {
    alertJob.stop();
  }

  // Stop event consumers
  if (eventConsumer) {
    await eventConsumer.stop();
  }
  if (dataLakeCollector) {
    await dataLakeCollector.stop();
  }
  if (mlAuditConsumer) {
    await mlAuditConsumer.stop();
  }
  
  // Flush remaining logs
  if (ingestionService) {
    await ingestionService.shutdown();
  }
  
  // Close server
  if (app) {
    await app.close();
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
