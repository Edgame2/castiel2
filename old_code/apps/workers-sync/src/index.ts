/**
 * Workers Sync - Main Entry Point
 * 
 * Sync workers for Castiel platform running on Container Apps.
 * Handles sync scheduling, inbound/outbound sync processing, token refresh,
 * connection cleanup, and webhook reception.
 */

import Fastify from 'fastify';
import cron from 'node-cron';
import { Worker } from 'bullmq';
import { createRedisConnection } from '@castiel/queue';
import { initializeServices } from './shared/initialize-services.js';
import { SyncScheduler } from './schedulers/sync-scheduler.js';
import { TokenRefresher } from './schedulers/token-refresher.js';
import { ConnectionCleanupScheduler } from './schedulers/connection-cleanup.js';
import { TeamSyncScheduler } from './schedulers/team-sync-scheduler.js';
import { SyncInboundWorker } from './workers/sync-inbound-worker.js';
import { SyncOutboundWorker } from './workers/sync-outbound-worker.js';
import { registerWebhookRoutes } from './http/webhook-receiver.js';

// Configuration
const config = {
  cosmosEndpoint: process.env.COSMOS_DB_ENDPOINT || '',
  cosmosKey: process.env.COSMOS_DB_KEY || '',
  databaseId: process.env.COSMOS_DB_DATABASE || 'castiel',
  keyVaultUrl: process.env.KEY_VAULT_URL || '',
  redisUrl: process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '' 
    ? process.env.REDIS_URL 
    : (process.env.REDIS_HOST 
      ? `${process.env.REDIS_TLS === 'true' ? 'rediss' : 'redis'}://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || '6379'}`
      : undefined),
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'production',
};

// Initialize services
let services: Awaited<ReturnType<typeof initializeServices>>;
let syncScheduler: SyncScheduler;
let tokenRefresher: TokenRefresher;
let connectionCleanupScheduler: ConnectionCleanupScheduler;
let teamSyncScheduler: TeamSyncScheduler;
let syncInboundWorker: SyncInboundWorker;
let syncOutboundWorker: SyncOutboundWorker;
let httpServer: ReturnType<typeof Fastify>;

// Graceful shutdown
const shutdown = async (signal: string) => {
  if (services) {
    services.monitoring.trackEvent('workers-sync.shutdown.initiated', { signal });
  }

  try {
    // Stop cron jobs
    cron.getTasks().forEach((task) => task.stop());

    // Close workers
    if (syncInboundWorker) {
      await syncInboundWorker.close();
    }
    if (syncOutboundWorker) {
      await syncOutboundWorker.close();
    }

    // Close HTTP server
    if (httpServer) {
      await httpServer.close();
    }

    if (services) {
      services.monitoring.trackEvent('workers-sync.shutdown.complete', { signal });
    }
    process.exit(0);
  } catch (error) {
    if (services) {
      services.monitoring.trackException(error as Error, {
        context: 'workers-sync.shutdown',
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
    
    // Initialize services first for structured logging
    services = await initializeServices({
      cosmosEndpoint: config.cosmosEndpoint,
      cosmosKey: config.cosmosKey,
      databaseId: config.databaseId,
      keyVaultUrl: config.keyVaultUrl,
      redisUrl: config.redisUrl,
    });

    services.monitoring.trackEvent('workers-sync.initialization.started');

    // Log Redis URL for debugging (mask password)
    if (config.redisUrl) {
      const maskedUrl = config.redisUrl.replace(/:([^:@]+)@/, ':***@');
      console.log(`[workers-sync] Using Redis URL: ${maskedUrl}`);
    } else {
      console.warn('[workers-sync] REDIS_URL is not set!');
    }

    // Initialize Redis connection for BullMQ
    if (!config.redisUrl) {
      console.error('[workers-sync] ERROR: config.redisUrl is undefined!');
      console.error('[workers-sync] REDIS_URL env:', process.env.REDIS_URL);
      console.error('[workers-sync] REDIS_HOST env:', process.env.REDIS_HOST);
      throw new Error('Redis URL is required but not configured');
    }
    
    const redis = createRedisConnection({
      url: config.redisUrl,
    });

    // Initialize sync scheduler
    syncScheduler = new SyncScheduler(
      {
        cosmosEndpoint: config.cosmosEndpoint,
        cosmosKey: config.cosmosKey,
        databaseId: config.databaseId,
        containerId: 'sync-tasks',
        keyVaultUrl: config.keyVaultUrl,
        batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '100', 10),
        maxRetries: parseInt(process.env.SYNC_MAX_RETRIES || '3', 10),
      },
      services
    );

    // Schedule sync scheduler to run every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await syncScheduler.execute();
      } catch (error) {
        services.monitoring.trackException(error as Error, {
          context: 'SyncScheduler.cron',
        });
      }
    });

    services.monitoring.trackEvent('workers-sync.scheduler.started', {
      scheduler: 'sync-scheduler',
      schedule: 'every hour',
    });

    // Initialize token refresher
    tokenRefresher = new TokenRefresher(
      {
        databaseId: config.databaseId,
        credentialsContainerId: 'integration-connections',
        tokenExpiryThresholdMinutes: parseInt(
          process.env.TOKEN_EXPIRY_THRESHOLD_MINUTES || '360',
          10
        ),
        maxRefreshRetries: parseInt(
          process.env.MAX_REFRESH_RETRIES || '3',
          10
        ),
      },
      services
    );

    // Schedule token refresher to run every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      try {
        await tokenRefresher.execute();
      } catch (error) {
        services.monitoring.trackException(error as Error, {
          context: 'TokenRefresher.cron',
        });
      }
    });

    services.monitoring.trackEvent('workers-sync.scheduler.started', {
      scheduler: 'token-refresher',
      schedule: 'every 6 hours',
    });

    // Initialize connection cleanup scheduler
    connectionCleanupScheduler = new ConnectionCleanupScheduler(
      {
        databaseId: config.databaseId,
        unusedDaysThreshold: parseInt(
          process.env.CONNECTION_UNUSED_DAYS_THRESHOLD || '90',
          10
        ),
        expiredUnusedDaysThreshold: parseInt(
          process.env.CONNECTION_EXPIRED_UNUSED_DAYS_THRESHOLD || '30',
          10
        ),
        archiveInsteadOfDelete: process.env.CONNECTION_ARCHIVE_INSTEAD_OF_DELETE !== 'false',
      },
      services
    );

    // Schedule connection cleanup to run daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        await connectionCleanupScheduler.execute();
      } catch (error) {
        services.monitoring.trackException(error as Error, {
          context: 'ConnectionCleanupScheduler.cron',
        });
      }
    });

    services.monitoring.trackEvent('workers-sync.scheduler.started', {
      scheduler: 'connection-cleanup',
      schedule: 'daily at 2 AM',
    });

    // Initialize team sync scheduler
    teamSyncScheduler = new TeamSyncScheduler(
      {
        databaseId: config.databaseId,
        syncSchedule: process.env.TEAM_SYNC_SCHEDULE || '0 2 * * *',
        batchSize: parseInt(process.env.TEAM_SYNC_BATCH_SIZE || '50', 10),
        maxRetries: parseInt(process.env.TEAM_SYNC_MAX_RETRIES || '3', 10),
      },
      services
    );

    // Schedule team sync to run daily at 2 AM (or custom schedule)
    cron.schedule(process.env.TEAM_SYNC_SCHEDULE || '0 2 * * *', async () => {
      try {
        await teamSyncScheduler.execute();
      } catch (error) {
        services.monitoring.trackException(error as Error, {
          context: 'TeamSyncScheduler.cron',
        });
      }
    });

    services.monitoring.trackEvent('workers-sync.scheduler.started', {
      scheduler: 'team-sync',
      schedule: process.env.TEAM_SYNC_SCHEDULE || 'daily at 2 AM',
    });

    // Initialize sync workers
    syncInboundWorker = new SyncInboundWorker(services, redis);
    services.monitoring.trackEvent('workers-sync.worker.started', { worker: 'sync-inbound' });

    // Initialize sync outbound worker
    syncOutboundWorker = new SyncOutboundWorker(services, redis);
    services.monitoring.trackEvent('workers-sync.worker.started', { worker: 'sync-outbound' });

    // Initialize HTTP server for webhooks
    httpServer = Fastify({
      logger: config.nodeEnv === 'development',
    });

    // Register webhook routes
    registerWebhookRoutes(httpServer, services, {
      databaseId: config.databaseId,
      containerId: 'webhook-audit',
    });

    // Start HTTP server
    await httpServer.listen({ port: config.port, host: '0.0.0.0' });
    services.monitoring.trackEvent('workers-sync.http-server.started', {
      port: config.port,
    });

    services.monitoring.trackEvent('workers-sync.started', {
      port: config.port,
      environment: config.nodeEnv,
    });
  } catch (error) {
    if (services) {
      services.monitoring.trackException(error as Error, {
        context: 'workers-sync.startup',
      });
    } else {
      // Fallback to console.error if monitoring not initialized
      console.error('Failed to start workers-sync:', error);
    }
    if (services) {
      services.monitoring.trackException(error as Error, {
        context: 'workers-sync.startup',
      });
    }
    process.exit(1);
  }
}

// Start the application
start();

