/**
 * Workers Processing - Main Entry Point
 * 
 * Document and data processing workers for Castiel platform.
 * Handles document processing, embedding generation, enrichment, and other processors.
 */

import Fastify from 'fastify';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { MonitoringService } from '@castiel/monitoring';
import { createRedisConnection } from '@castiel/queue';
import cron from 'node-cron';
import { EmbeddingWorker } from './workers/embedding-worker.js';
import { DocumentChunkWorker } from './workers/document-chunk-worker.js';
import { DocumentCheckWorker } from './workers/document-check-worker.js';
import { ContentGenerationWorker } from './workers/content-generation-worker.js';
import { EnrichmentWorker } from './workers/enrichment-worker.js';
import { RiskEvaluationWorker } from './workers/risk-evaluation-worker.js';
import { OpportunityAutoLinkingWorker } from './workers/opportunity-auto-linking-worker.js';
import { ProjectAutoAttachmentWorker } from './workers/project-auto-attachment-worker.js';
import { DigestProcessorScheduler } from './schedulers/digest-processor.js';

// Configuration
const config = {
  cosmosEndpoint: process.env.COSMOS_DB_ENDPOINT || '',
  cosmosKey: process.env.COSMOS_DB_KEY || '',
  databaseId: process.env.COSMOS_DB_DATABASE || 'castiel',
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'production',
  openaiEndpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
  openaiKey: process.env.AZURE_OPENAI_API_KEY || '',
  embeddingDeployment: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-ada-002',
  embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10),
  redisUrl: process.env.REDIS_URL || (process.env.REDIS_HOST 
    ? `rediss://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || '6380'}`
    : undefined),
};

// Initialize services
let monitoring: ReturnType<typeof MonitoringService.initialize>;
let embeddingWorker: EmbeddingWorker;
let documentChunkWorker: DocumentChunkWorker;
let documentCheckWorker: DocumentCheckWorker;
let contentGenerationWorker: ContentGenerationWorker;
let enrichmentWorker: EnrichmentWorker;
let riskEvaluationWorker: RiskEvaluationWorker;
let opportunityAutoLinkingWorker: OpportunityAutoLinkingWorker;
let projectAutoAttachmentWorker: ProjectAutoAttachmentWorker;
let digestProcessorScheduler: DigestProcessorScheduler;
let httpServer: ReturnType<typeof Fastify>;

// Graceful shutdown
const shutdown = async (signal: string) => {
  if (monitoring) {
    monitoring.trackEvent('workers-processing.shutdown.initiated', { signal });
  }

    try {
      if (embeddingWorker) {
        await embeddingWorker.close();
      }
      if (documentChunkWorker) {
        await documentChunkWorker.close();
      }
      if (documentCheckWorker) {
        await documentCheckWorker.close();
      }
      if (contentGenerationWorker) {
        await contentGenerationWorker.close();
      }
      if (enrichmentWorker) {
        await enrichmentWorker.close();
      }
      if (riskEvaluationWorker) {
        await riskEvaluationWorker.close();
      }
      if (opportunityAutoLinkingWorker) {
        await opportunityAutoLinkingWorker.close();
      }
      if (projectAutoAttachmentWorker) {
        await projectAutoAttachmentWorker.close();
      }
      // Stop cron jobs
      cron.getTasks().forEach((task) => task.stop());
      if (httpServer) {
        await httpServer.close();
      }
    if (monitoring) {
      monitoring.trackEvent('workers-processing.shutdown.complete', { signal });
    }
    process.exit(0);
  } catch (error) {
    if (monitoring) {
      monitoring.trackException(error as Error, {
        context: 'workers-processing.shutdown',
        signal,
      });
    }
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

/**
 * Validate required environment variables
 */
function validateEnvironment(): void {
  const errors: string[] = [];

  // Required environment variables
  if (!process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_DB_ENDPOINT.trim() === '') {
    errors.push('Missing required environment variable: COSMOS_DB_ENDPOINT');
  }

  if (!process.env.COSMOS_DB_KEY || process.env.COSMOS_DB_KEY.trim() === '') {
    errors.push('Missing required environment variable: COSMOS_DB_KEY');
  }

  // Redis configuration (either REDIS_URL or REDIS_HOST must be set)
  const hasRedisUrl = !!process.env.REDIS_URL;
  const hasRedisHost = !!process.env.REDIS_HOST;
  if (!hasRedisUrl && !hasRedisHost) {
    errors.push('Missing Redis configuration: Either REDIS_URL or REDIS_HOST must be set');
  }

  if (hasRedisHost && !process.env.REDIS_PASSWORD) {
    errors.push('Missing required environment variable: REDIS_PASSWORD (required when using REDIS_HOST)');
  }

  // Monitoring (if enabled, connection string is required)
  const monitoringEnabled = process.env.MONITORING_ENABLED !== 'false';
  if (monitoringEnabled && !process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    errors.push('Missing required environment variable: APPLICATIONINSIGHTS_CONNECTION_STRING (required when monitoring is enabled)');
  }

  // Optional but recommended for processing workers
  if (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_API_KEY) {
    // Warning will be tracked by monitoring after initialization in start()
    // Using console.warn here for immediate visibility during startup
    console.warn('⚠️  Warning: Azure OpenAI not configured. Embedding and enrichment features will be disabled.');
  }

  if (errors.length > 0) {
    // Use console.error for startup failures before monitoring is initialized
    console.error('❌ Environment validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    console.error('\nPlease set the required environment variables and try again.');
    process.exit(1);
  }
}

// Main startup
async function start() {
  try {
    // Validate environment variables before starting
    validateEnvironment();
    
    // Initialize monitoring first for structured logging
    monitoring = MonitoringService.initialize({
      enabled: process.env.MONITORING_ENABLED !== 'false',
      provider: (process.env.MONITORING_PROVIDER || 'application-insights') as 'application-insights' | 'mock',
      instrumentationKey: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || '',
      samplingRate: parseFloat(process.env.MONITORING_SAMPLING_RATE || '1.0'),
    });

    monitoring.trackEvent('workers-processing.initialization.started');

    // Initialize Redis
    const redis = createRedisConnection({
      url: config.redisUrl,
    });

    // Initialize embedding worker
    embeddingWorker = new EmbeddingWorker(
      {
        cosmosEndpoint: config.cosmosEndpoint,
        cosmosKey: config.cosmosKey,
        databaseId: config.databaseId,
        containerId: process.env.COSMOS_DB_SHARDS_CONTAINER || 'shards',
        openaiEndpoint: config.openaiEndpoint,
        openaiKey: config.openaiKey,
        embeddingDeployment: config.embeddingDeployment,
        embeddingDimensions: config.embeddingDimensions,
      },
      monitoring,
      redis
    );

    monitoring.trackEvent('workers-processing.worker.started', { worker: 'embedding' });

    // Initialize document chunk worker
    documentChunkWorker = new DocumentChunkWorker(
      {
        cosmosEndpoint: config.cosmosEndpoint,
        cosmosKey: config.cosmosKey,
        databaseId: config.databaseId,
        blobStorageConnectionString: process.env.BLOB_STORAGE_CONNECTION_STRING || '',
      },
      monitoring,
      redis
    );
    monitoring.trackEvent('workers-processing.worker.started', { worker: 'document-chunk' });

    // Initialize document check worker
    documentCheckWorker = new DocumentCheckWorker(
      {
        cosmosEndpoint: config.cosmosEndpoint,
        cosmosKey: config.cosmosKey,
        databaseId: config.databaseId,
        blobStorageConnectionString: process.env.BLOB_STORAGE_CONNECTION_STRING || '',
        maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10),
        enableVirusScan: process.env.ENABLE_VIRUS_SCAN !== 'false',
      },
      monitoring,
      redis
    );
    monitoring.trackEvent('workers-processing.worker.started', { worker: 'document-check' });

    // Initialize content generation worker
    contentGenerationWorker = new ContentGenerationWorker(
      {
        cosmosEndpoint: config.cosmosEndpoint,
        cosmosKey: config.cosmosKey,
        databaseId: config.databaseId,
        redisUrl: config.redisUrl,
        keyVaultUrl: process.env.KEY_VAULT_URL,
        openaiEndpoint: config.openaiEndpoint,
        openaiKey: config.openaiKey,
        openaiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
        credentialEncryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY,
      },
      monitoring,
      redis
    );
    monitoring.trackEvent('workers-processing.worker.started', { worker: 'content-generation' });

    // Initialize enrichment worker
    enrichmentWorker = new EnrichmentWorker(
      {
        cosmosEndpoint: config.cosmosEndpoint,
        cosmosKey: config.cosmosKey,
        databaseId: config.databaseId,
        openaiEndpoint: config.openaiEndpoint,
        openaiKey: config.openaiKey,
        openaiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
      },
      monitoring,
      redis
    );
    monitoring.trackEvent('workers-processing.worker.started', { worker: 'enrichment' });

    // Initialize risk evaluation worker
    riskEvaluationWorker = new RiskEvaluationWorker(
      {
        cosmosEndpoint: config.cosmosEndpoint,
        cosmosKey: config.cosmosKey,
        databaseId: config.databaseId,
        openaiEndpoint: config.openaiEndpoint,
        openaiKey: config.openaiKey,
      },
      monitoring,
      redis
    );
    monitoring.trackEvent('workers-processing.worker.started', { worker: 'risk-evaluation' });

    // Initialize opportunity auto-linking worker
    opportunityAutoLinkingWorker = new OpportunityAutoLinkingWorker(
      {
        cosmosEndpoint: config.cosmosEndpoint,
        cosmosKey: config.cosmosKey,
        databaseId: config.databaseId,
      },
      monitoring,
      redis
    );
    monitoring.trackEvent('workers-processing.worker.started', { worker: 'opportunity-auto-linking' });

    // Initialize project auto-attachment worker
    projectAutoAttachmentWorker = new ProjectAutoAttachmentWorker(
      {
        cosmosEndpoint: config.cosmosEndpoint,
        cosmosKey: config.cosmosKey,
        databaseId: config.databaseId,
      },
      monitoring,
      redis
    );
    monitoring.trackEvent('workers-processing.worker.started', { worker: 'project-auto-attachment' });

    // Initialize digest processor scheduler
    const cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });

    digestProcessorScheduler = new DigestProcessorScheduler(
      {
        databaseId: config.databaseId,
        batchSize: parseInt(process.env.DIGEST_BATCH_SIZE || '50', 10),
        baseUrl: process.env.BASE_URL,
      },
      cosmosClient,
      monitoring
    );

    // Schedule digest processor to run every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      try {
        await digestProcessorScheduler.execute();
      } catch (error) {
        monitoring.trackException(error as Error, {
          context: 'DigestProcessorScheduler.cron',
        });
      }
    });

    monitoring.trackEvent('workers-processing.scheduler.started', {
      scheduler: 'digest-processor',
      schedule: 'every 15 minutes',
    });

    // Note: Normalization is handled in workers-ingestion as part of the ingestion process
    // Ingestion workers normalize data and create shards directly

    // Initialize HTTP server for health checks
    httpServer = Fastify({
      logger: config.nodeEnv === 'development',
    });

    // Health check endpoints
    httpServer.get('/health', async (request: any, reply: any) => {
      // Collect worker metrics
      const workerMetrics: any[] = [];
      
      try {
        if (embeddingWorker) {
          const metrics = await embeddingWorker.getHealthMetrics();
          workerMetrics.push(metrics);
        }
        if (documentChunkWorker) {
          const metrics = await documentChunkWorker.getHealthMetrics();
          workerMetrics.push(metrics);
        }
        if (documentCheckWorker) {
          const metrics = await documentCheckWorker.getHealthMetrics();
          workerMetrics.push(metrics);
        }
        if (contentGenerationWorker) {
          const metrics = await contentGenerationWorker.getHealthMetrics();
          workerMetrics.push(metrics);
        }
        if (enrichmentWorker) {
          const metrics = await enrichmentWorker.getHealthMetrics();
          workerMetrics.push(metrics);
        }
        if (riskEvaluationWorker) {
          const metrics = await riskEvaluationWorker.getHealthMetrics();
          workerMetrics.push(metrics);
        }
        if (opportunityAutoLinkingWorker) {
          const metrics = await opportunityAutoLinkingWorker.getHealthMetrics();
          workerMetrics.push(metrics);
        }
        if (projectAutoAttachmentWorker) {
          const metrics = await projectAutoAttachmentWorker.getHealthMetrics();
          workerMetrics.push(metrics);
        }
      } catch (error) {
        // Log error but don't fail health check
        if (monitoring) {
          monitoring.trackException(error as Error, {
            context: 'workers-processing.health-check',
          });
        }
      }
      
      return reply.code(200).send({ 
        status: 'healthy',
        service: 'workers-processing',
        timestamp: new Date().toISOString(),
        workers: workerMetrics,
      });
    });

    // Readiness check - verifies service is ready to accept traffic
    httpServer.get('/readiness', async (request: any, reply: any) => {
      const checks: {
        redis: { status: string; message?: string };
        cosmos: { status: string; message?: string };
        overall: 'ready' | 'not_ready';
      } = {
        redis: { status: 'unknown' },
        cosmos: { status: 'unknown' },
        overall: 'ready',
      };

      // Check Redis connection
      try {
        const redisPing = await redis.ping();
        if (redisPing === 'PONG') {
          checks.redis = { status: 'connected' };
        } else {
          checks.redis = { status: 'error', message: 'Unexpected ping response' };
          checks.overall = 'not_ready';
        }
      } catch (error) {
        checks.redis = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        checks.overall = 'not_ready';
      }

      // Check Cosmos DB connection (basic check)
      try {
        const cosmosClient = new CosmosClient({
          endpoint: config.cosmosEndpoint,
          key: config.cosmosKey,
        });
        await cosmosClient.databases.readAll().fetchAll();
        checks.cosmos = { status: 'connected' };
      } catch (error) {
        checks.cosmos = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        checks.overall = 'not_ready';
      }

      const statusCode = checks.overall === 'ready' ? 200 : 503;
      return reply.code(statusCode).send({
        status: checks.overall,
        service: 'workers-processing',
        timestamp: new Date().toISOString(),
        checks,
      });
    });

    // Liveness check - simple check to verify the service process is running
    httpServer.get('/liveness', async (request: any, reply: any) => {
      return reply.code(200).send({
        status: 'alive',
        service: 'workers-processing',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // Metrics endpoint - exposes queue depth and worker metrics for auto-scaling
    httpServer.get('/metrics', async (request: any, reply: any) => {
      const queueMetrics: any[] = [];
      
      try {
        // Get queue depth for each worker
        if (embeddingWorker) {
          const depth = await embeddingWorker.getQueueDepth();
          queueMetrics.push({
            queueName: 'embedding-jobs',
            depth,
            workerName: 'embedding-worker',
          });
        }
        if (documentChunkWorker) {
          const depth = await documentChunkWorker.getQueueDepth();
          queueMetrics.push({
            queueName: 'document-chunk-jobs',
            depth,
            workerName: 'document-chunk-worker',
          });
        }
        if (documentCheckWorker) {
          const depth = await documentCheckWorker.getQueueDepth();
          queueMetrics.push({
            queueName: 'document-check-jobs',
            depth,
            workerName: 'document-check-worker',
          });
        }
        if (contentGenerationWorker) {
          const depth = await contentGenerationWorker.getQueueDepth();
          queueMetrics.push({
            queueName: 'content-generation-jobs',
            depth,
            workerName: 'content-generation-worker',
          });
        }
        if (enrichmentWorker) {
          const depth = await enrichmentWorker.getQueueDepth();
          queueMetrics.push({
            queueName: 'enrichment-jobs',
            depth,
            workerName: 'enrichment-worker',
          });
        }
        if (riskEvaluationWorker) {
          const depth = await riskEvaluationWorker.getQueueDepth();
          queueMetrics.push({
            queueName: 'risk-evaluations',
            depth,
            workerName: 'risk-evaluation-worker',
          });
        }
        if (opportunityAutoLinkingWorker) {
          const depth = await opportunityAutoLinkingWorker.getQueueDepth();
          queueMetrics.push({
            queueName: 'shard-created',
            depth,
            workerName: 'opportunity-auto-linking-worker',
          });
        }
        if (projectAutoAttachmentWorker) {
          const depth = await projectAutoAttachmentWorker.getQueueDepth();
          queueMetrics.push({
            queueName: 'shard-created',
            depth,
            workerName: 'project-auto-attachment-worker',
          });
        }
      } catch (error) {
        // Log error but don't fail metrics endpoint
        if (monitoring) {
          monitoring.trackException(error as Error, {
            context: 'workers-processing.metrics',
          });
        }
      }
      
      // Calculate total queue depth across all queues
      const totalDepth = queueMetrics.reduce((sum, m) => sum + (m.depth || 0), 0);
      
      return reply.code(200).send({
        service: 'workers-processing',
        timestamp: new Date().toISOString(),
        queues: queueMetrics,
        totalQueueDepth: totalDepth,
        // Prometheus-style metrics format for potential future use
        prometheus: queueMetrics.map(m => 
          `queue_depth{queue="${m.queueName}",worker="${m.workerName}"} ${m.depth}`
        ).join('\n'),
      });
    });

    await httpServer.listen({ port: config.port, host: '0.0.0.0' });
    monitoring.trackEvent('workers-processing.http-server.started', {
      port: config.port,
    });

    monitoring.trackEvent('workers-processing.started', {
      port: config.port,
      environment: config.nodeEnv,
    });
  } catch (error) {
    if (monitoring) {
      monitoring.trackException(error as Error, {
        context: 'workers-processing.startup',
      });
    } else {
      // Fallback to console.error if monitoring not initialized
      console.error('Failed to start workers-processing:', error);
    }
    if (monitoring) {
      monitoring.trackException(error as Error, {
        context: 'workers-processing.startup',
      });
    }
    process.exit(1);
  }
}

// Start the application
start();

