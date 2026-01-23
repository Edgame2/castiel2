/**
 * Workers Ingestion - Main Entry Point
 * 
 * External data ingestion workers for Castiel platform.
 * Handles ingestion from Salesforce, Google Drive, Slack, etc.
 */

import Fastify from 'fastify';
import { Worker } from 'bullmq';
import { QueueName } from '@castiel/queue';
import { MonitoringService } from '@castiel/monitoring';
import { createRedisConnection } from '@castiel/queue';
import type { IngestionEventMessage } from '@castiel/queue';
import { SalesforceIngestionWorker } from './workers/salesforce-ingestion-worker.js';
import { GDriveIngestionWorker } from './workers/gdrive-ingestion-worker.js';
import { SlackIngestionWorker } from './workers/slack-ingestion-worker.js';

// Configuration
const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'production',
  redisUrl: process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '' 
    ? process.env.REDIS_URL 
    : (process.env.REDIS_HOST 
      ? `${process.env.REDIS_TLS === 'true' ? 'rediss' : 'redis'}://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || '6379'}`
      : undefined),
};

// Initialize services
let monitoring: ReturnType<typeof MonitoringService.initialize>;
let salesforceIngestionWorker: SalesforceIngestionWorker;
let gdriveIngestionWorker: GDriveIngestionWorker;
let slackIngestionWorker: SlackIngestionWorker;
let httpServer: ReturnType<typeof Fastify>;

// Graceful shutdown
const shutdown = async (signal: string) => {
  if (monitoring) {
    monitoring.trackEvent('workers-ingestion.shutdown.initiated', { signal });
  }

    try {
      if (salesforceIngestionWorker) {
        await salesforceIngestionWorker.close();
      }
      if (gdriveIngestionWorker) {
        await gdriveIngestionWorker.close();
      }
      if (slackIngestionWorker) {
        await slackIngestionWorker.close();
      }
      if (httpServer) {
        await httpServer.close();
      }
    if (monitoring) {
      monitoring.trackEvent('workers-ingestion.shutdown.complete', { signal });
    }
    process.exit(0);
  } catch (error) {
    if (monitoring) {
      monitoring.trackException(error as Error, {
        context: 'workers-ingestion.shutdown',
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

    monitoring.trackEvent('workers-ingestion.initialization.started');

    // Log Redis URL for debugging (mask password)
    if (config.redisUrl) {
      const maskedUrl = config.redisUrl.replace(/:([^:@]+)@/, ':***@');
      console.log(`[workers-ingestion] Using Redis URL: ${maskedUrl}`);
    } else {
      console.warn('[workers-ingestion] REDIS_URL is not set!');
    }

    // Initialize Redis
    if (!config.redisUrl) {
      console.error('[workers-ingestion] ERROR: config.redisUrl is undefined!');
      console.error('[workers-ingestion] REDIS_URL env:', process.env.REDIS_URL);
      console.error('[workers-ingestion] REDIS_HOST env:', process.env.REDIS_HOST);
      throw new Error('Redis URL is required but not configured');
    }
    
    const redis = createRedisConnection({
      url: config.redisUrl,
    });

    // Initialize ingestion workers for each source
    salesforceIngestionWorker = new SalesforceIngestionWorker(
      {
        cosmosEndpoint: process.env.COSMOS_DB_ENDPOINT || '',
        cosmosKey: process.env.COSMOS_DB_KEY || '',
        databaseId: process.env.COSMOS_DB_DATABASE || 'castiel',
        keyVaultUrl: process.env.KEY_VAULT_URL || '',
      },
      monitoring,
      redis
    );
    monitoring.trackEvent('workers-ingestion.worker.started', { worker: 'salesforce' });

    gdriveIngestionWorker = new GDriveIngestionWorker(
      {
        cosmosEndpoint: process.env.COSMOS_DB_ENDPOINT || '',
        cosmosKey: process.env.COSMOS_DB_KEY || '',
        databaseId: process.env.COSMOS_DB_DATABASE || 'castiel',
        keyVaultUrl: process.env.KEY_VAULT_URL || '',
      },
      monitoring,
      redis
    );
    monitoring.trackEvent('workers-ingestion.worker.started', { worker: 'gdrive' });

    slackIngestionWorker = new SlackIngestionWorker(
      {
        cosmosEndpoint: process.env.COSMOS_DB_ENDPOINT || '',
        cosmosKey: process.env.COSMOS_DB_KEY || '',
        databaseId: process.env.COSMOS_DB_DATABASE || 'castiel',
        keyVaultUrl: process.env.KEY_VAULT_URL || '',
      },
      monitoring,
      redis
    );
    monitoring.trackEvent('workers-ingestion.worker.started', { worker: 'slack' });

    // Initialize HTTP server for health checks
    httpServer = Fastify({
      logger: config.nodeEnv === 'development',
    });

    // Health check endpoints
    httpServer.get('/health', async (request: any, reply: any) => {
      return reply.code(200).send({ 
        status: 'healthy',
        service: 'workers-ingestion',
        timestamp: new Date().toISOString(),
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
        const { CosmosClient } = await import('@azure/cosmos');
        const cosmosClient = new CosmosClient({
          endpoint: process.env.COSMOS_DB_ENDPOINT || '',
          key: process.env.COSMOS_DB_KEY || '',
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
        service: 'workers-ingestion',
        timestamp: new Date().toISOString(),
        checks,
      });
    });

    // Liveness check - simple check to verify the service process is running
    httpServer.get('/liveness', async (request: any, reply: any) => {
      return reply.code(200).send({
        status: 'alive',
        service: 'workers-ingestion',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    await httpServer.listen({ port: config.port, host: '0.0.0.0' });
    monitoring.trackEvent('workers-ingestion.http-server.started', {
      port: config.port,
    });

    monitoring.trackEvent('workers-ingestion.started', {
      port: config.port,
      environment: config.nodeEnv,
    });
  } catch (error) {
    if (monitoring) {
      monitoring.trackException(error as Error, {
        context: 'workers-ingestion.startup',
      });
    } else {
      // Fallback to console.error if monitoring not initialized
      console.error('Failed to start workers-ingestion:', error);
    }
    if (monitoring) {
      monitoring.trackException(error as Error, {
        context: 'workers-ingestion.startup',
      });
    }
    process.exit(1);
  }
}

// Start the application
start();

