/**
 * Integration Processors Service
 * Main entry point for integration data processors
 * @module integration-processors
 */

import Fastify from 'fastify';
import {
  initializeDatabase,
  connectDatabase,
  disconnectDatabase,
  setupJWT,
  ServiceClient,
  EventPublisher,
} from '@coder/shared';
import { loadConfig } from './config';
import { log } from './utils/logger';
import { registerRoutes } from './routes';
import { ensureShardTypes } from './startup/ensureShardTypes';
import { ensureQueues } from './startup/ensureQueues';
import { startConsumers, ConsumerDependencies, BaseConsumer } from './consumers';
import { MLFieldRecalculationJob } from './jobs/mlFieldRecalculation';
import { MonitoringService } from './services/MonitoringService';

/**
 * Wait for a service to be ready
 */
async function waitForService(
  name: string,
  checkFn: () => Promise<boolean>,
  maxRetries: number,
  retryDelay: number
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const healthy = await checkFn();
      if (healthy) {
        log.info(`${name} is ready`, { service: 'integration-processors' });
        return;
      }
    } catch (error) {
      log.debug(`${name} not ready (attempt ${i + 1}/${maxRetries})`, {
        service: 'integration-processors',
      });
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }

  throw new Error(`${name} not ready after ${maxRetries} attempts`);
}

/**
 * Check if RabbitMQ is ready
 */
async function checkRabbitMQ(url: string): Promise<boolean> {
  try {
    const amqp = await import('amqplib');
    const connection = await amqp.connect(url);
    await connection.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Shard Manager is ready
 */
async function checkShardManager(client: ServiceClient): Promise<boolean> {
  try {
    await client.get('/health');
    return true;
  } catch {
    return false;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const consumerType = process.env.CONSUMER_TYPE || 'all';

  log.info(`Starting integration-processors (type: ${consumerType})...`, {
    service: 'integration-processors',
  });

  // 1. Load configuration
  const config = loadConfig();

  // 2. Initialize Fastify (for health checks, metrics)
  const app = Fastify({
    logger: false,
    requestIdHeader: 'x-request-id',
    bodyLimit: 1048576,
    requestTimeout: 30000,
  });

  await setupJWT(app, { secret: config.jwt.secret });

  // 3. Initialize dependencies
  // Shard Manager client with enhanced retry strategy and circuit breaker
  const shardManager = new ServiceClient({
    baseURL: config.services.shard_manager?.url || '',
    timeout: 30000,
    retries: 3, // Max 3 retries with exponential backoff
    circuitBreaker: {
      enabled: true,
      threshold: 5, // Open circuit after 5 failures
      timeout: 60000, // 60 seconds before attempting half-open
    },
  });

  const integrationManager = new ServiceClient({
    baseURL: config.services.integration_manager?.url || '',
    timeout: 30000,
    retries: 3,
    circuitBreaker: { enabled: true },
  });

  let eventPublisher: EventPublisher | null = null;
  if (config.rabbitmq?.url) {
    eventPublisher = new EventPublisher(
      {
        url: config.rabbitmq.url,
        exchange: config.rabbitmq.exchange || 'coder_events',
        exchangeType: 'topic',
      },
      'integration-processors'
    );
    await eventPublisher.connect();
  }

  // 4. Wait for external dependencies to be ready
  const maxRetries = 30;
  const retryDelay = 2000; // 2 seconds

  log.info('Waiting for dependencies...', { service: 'integration-processors' });

  // Wait for RabbitMQ
  if (config.rabbitmq?.url) {
    await waitForService(
      'RabbitMQ',
      () => checkRabbitMQ(config.rabbitmq!.url!),
      maxRetries,
      retryDelay
    );
  }

  // Wait for Shard Manager
  await waitForService(
    'Shard Manager',
    () => checkShardManager(shardManager),
    maxRetries,
    retryDelay
  );

  log.info('All dependencies ready', { service: 'integration-processors' });

  // 5. Ensure all RabbitMQ queues exist (BEFORE consumers start)
  if (config.rabbitmq?.url) {
    try {
      await ensureQueues(config.rabbitmq.url, config.rabbitmq.exchange || 'coder_events');
      log.info('All RabbitMQ queues ensured', { service: 'integration-processors' });
    } catch (error) {
      log.error('Failed to ensure RabbitMQ queues', error, {
        service: 'integration-processors',
      });
      // Don't fail startup - queues will be created when consumers connect
      // But log warning so it's visible
    }
  }

  // 6. Initialize database
  const containers: Record<string, string> = {
    suggested_links: config.cosmos_db.containers.suggested_links,
  };
  if (config.cosmos_db.containers.entity_linking_settings) containers.entity_linking_settings = config.cosmos_db.containers.entity_linking_settings;
  if (config.cosmos_db.containers.linking_rules) containers.linking_rules = config.cosmos_db.containers.linking_rules;
  if (config.cosmos_db.containers.processing_settings) containers.processing_settings = config.cosmos_db.containers.processing_settings;
  initializeDatabase({
    endpoint: config.cosmos_db.endpoint,
    key: config.cosmos_db.key,
    database: config.cosmos_db.database_id,
    containers,
  });

  try {
    await connectDatabase();
    log.info('Database connected successfully', { service: 'integration-processors' });
  } catch (error) {
    log.error('Failed to connect to database', error, { service: 'integration-processors' });
    throw error;
  }

  // 7. Ensure all shard types exist (BEFORE consumers start)
  // This must happen regardless of eventPublisher since shard types are needed for API operations
  await ensureShardTypes(shardManager);

  // 8. Create monitoring service
  const monitoringService = new MonitoringService(
    shardManager,
    integrationManager,
    consumerType
  );

  // 9. Register routes (health, metrics, suggested-links API, monitoring API)
  await registerRoutes(app, monitoringService);

  // 10. Start HTTP server (health checks available immediately)
  const port = parseInt(process.env.PORT || String(config.server.port) || '3000');
  await app.listen({ port, host: config.server.host || '0.0.0.0' });
  log.info(`HTTP server listening on port ${port}`, { service: 'integration-processors' });

  // 11. Start consumers (based on CONSUMER_TYPE)
  let activeConsumers: BaseConsumer[] = [];
  if (eventPublisher) {
    // Optional AI service for entity linking (if configured)
    const aiService = config.services.ai_service?.url
      ? new ServiceClient({
          baseURL: config.services.ai_service.url,
          timeout: 30000,
          retries: 3,
          circuitBreaker: { enabled: true },
        })
      : undefined;

    const deps: ConsumerDependencies = {
      shardManager,
      eventPublisher,
      integrationManager,
      aiService,
    };
    activeConsumers = await startConsumers(consumerType, deps);
  }

  // 12. Start periodic jobs (only in 'light' or 'all' mode)
  let mlFieldRecalculationJob: MLFieldRecalculationJob | null = null;
  if ((consumerType === 'light' || consumerType === 'all') && eventPublisher) {
    mlFieldRecalculationJob = new MLFieldRecalculationJob(shardManager, eventPublisher);
    mlFieldRecalculationJob.start();
    log.info('Periodic jobs started', { service: 'integration-processors' });
  }

  // 13. Graceful shutdown
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      log.warn('Shutdown already in progress, ignoring signal', {
        signal,
        service: 'integration-processors',
      });
      return;
    }
    isShuttingDown = true;

    log.info(`Received ${signal}, shutting down gracefully...`, {
      service: 'integration-processors',
    });

    try {
      // 1. Stop accepting new messages (stop consumers)
      if (activeConsumers.length > 0) {
        log.info(`Stopping ${activeConsumers.length} consumers...`, {
          service: 'integration-processors',
        });
        await Promise.all(activeConsumers.map((consumer) => consumer.stop()));
        log.info('All consumers stopped', { service: 'integration-processors' });
      }

      // 2. Stop periodic jobs
      if (mlFieldRecalculationJob) {
        mlFieldRecalculationJob.stop();
        log.info('Periodic jobs stopped', { service: 'integration-processors' });
      }

      // 3. Close HTTP server (stop accepting new requests)
      await app.close();
      log.info('HTTP server closed', { service: 'integration-processors' });

      // 4. Close event publisher
      if (eventPublisher) {
        await eventPublisher.close();
        log.info('Event publisher closed', { service: 'integration-processors' });
      }

      // 5. Disconnect from database
      try {
        await disconnectDatabase();
        log.info('Database disconnected', { service: 'integration-processors' });
      } catch (error) {
        log.error('Error disconnecting from database', error, {
          service: 'integration-processors',
        });
      }

      log.info('Shutdown complete', { service: 'integration-processors' });
      process.exit(0);
    } catch (error) {
      log.error('Error during shutdown', error, { service: 'integration-processors' });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    log.error('Uncaught exception', error, { service: 'integration-processors' });
    shutdown('uncaughtException').catch(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled rejection', reason as Error, {
      promise: String(promise),
      service: 'integration-processors',
    });
    shutdown('unhandledRejection').catch(() => process.exit(1));
  });

  log.info(`Integration processors started (type: ${consumerType})`, {
    service: 'integration-processors',
  });
}

main().catch((error) => {
  log.error('Failed to start integration-processors', error, {
    service: 'integration-processors',
  });
  process.exit(1);
});
