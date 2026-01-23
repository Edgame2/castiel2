/**
 * Project Auto-Attachment Processor Function (Phase 2)
 * 
 * Consumes shard-created events from Service Bus and automatically links
 * shards to projects based on overlap rules (entity, actor, time, explicit references).
 * 
 * Trigger: Service Bus queue (shard-created)
 * Output: Updates shards with project relationships
 */

import { app, ServiceBusMessage } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../../apps/api/src/repositories/shard.repository.js';
import { ProjectAutoAttachmentService } from '../../apps/api/src/services/project-auto-attachment.service.js';
import type { Shard } from '../../apps/api/src/types/shard.types.js';

interface ShardCreatedMessage {
  shardId: string;
  tenantId: string;
  shardTypeId: string;
  shard: Shard;
}

interface ProcessorConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  serviceBusConnectionString: string;
}

class ProjectAutoAttachmentProcessor {
  private cosmosClient: CosmosClient;
  private shardRepository: ShardRepository;
  private autoAttachmentService: ProjectAutoAttachmentService;
  private monitoring: IMonitoringProvider;
  private config: ProcessorConfig;

  constructor(config: ProcessorConfig, monitoring: IMonitoringProvider) {
    this.config = config;
    this.monitoring = monitoring;
    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });

    // Initialize ShardRepository
    const container = this.cosmosClient.database(config.databaseId).container('shards');
    this.shardRepository = new ShardRepository(
      this.cosmosClient,
      config.databaseId,
      'shards',
      monitoring,
      undefined, // cacheService - optional
      undefined  // serviceBusService - not needed here
    );

    // Initialize ProjectAutoAttachmentService
    this.autoAttachmentService = new ProjectAutoAttachmentService(
      monitoring,
      this.shardRepository,
      {
        serviceBusConnectionString: config.serviceBusConnectionString,
      }
    );
  }

  /**
   * Process a shard-created event message
   */
  async processMessage(message: ServiceBusMessage, context: any): Promise<void> {
    const startTime = Date.now();
    const executionId = context.invocationId;

    try {
      // Parse message body
      const event: ShardCreatedMessage = message.body as ShardCreatedMessage;

      if (!event.shardId || !event.tenantId || !event.shard) {
        throw new Error('Invalid message: missing required fields (shardId, tenantId, shard)');
      }

      context.log(`[ProjectAutoAttachmentProcessor] Processing shard-created event for shard: ${event.shardId}`);

      // Process auto-attachment
      await this.autoAttachmentService.processShardCreated(event.shard);

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('project_auto_attachment.processed', {
        shardId: event.shardId,
        tenantId: event.tenantId,
        shardTypeId: event.shardTypeId,
        duration,
        executionId,
      });

      context.log(`[ProjectAutoAttachmentProcessor] Successfully processed shard ${event.shardId} in ${duration}ms`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      context.error(`[ProjectAutoAttachmentProcessor] Error processing message: ${errorMessage}`, error);

      this.monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
        component: 'ProjectAutoAttachmentProcessor',
        operation: 'processMessage',
        executionId,
        duration,
      });

      // Re-throw to trigger Service Bus retry mechanism
      throw error;
    }
  }
}

// Initialize processor with config from environment
const config: ProcessorConfig = {
  cosmosEndpoint: process.env.COSMOS_DB_ENDPOINT || '',
  cosmosKey: process.env.COSMOS_DB_KEY || '',
  databaseId: process.env.COSMOS_DB_DATABASE || 'castiel',
  serviceBusConnectionString: process.env.AZURE_SERVICE_BUS_CONNECTION_STRING || '',
};

// Create a mock monitoring provider for the function
// In production, this would be initialized from Application Insights
const mockMonitoring: IMonitoringProvider = {
  trackEvent: (name: string, properties?: Record<string, any>) => {
    console.log(`[Monitoring] Event: ${name}`, properties);
  },
  trackException: (error: Error, properties?: Record<string, any>) => {
    console.error(`[Monitoring] Exception:`, error, properties);
  },
  trackMetric: (name: string, value: number, properties?: Record<string, any>) => {
    console.log(`[Monitoring] Metric: ${name} = ${value}`, properties);
  },
  trackDependency: (
    name: string,
    type: string,
    target: string,
    duration: number,
    success: boolean,
    data?: string
  ) => {
    console.log(`[Monitoring] Dependency: ${name} (${type}) -> ${target} [${duration}ms] ${success ? 'OK' : 'FAIL'}`);
  },
};

const processor = new ProjectAutoAttachmentProcessor(config, mockMonitoring);

// Register Service Bus trigger
app.serviceBusQueue('project-auto-attachment-processor', {
  connection: 'AZURE_SERVICE_BUS_CONNECTION_STRING',
  queueName: process.env.AZURE_SERVICE_BUS_SHARD_CREATED_QUEUE || 'shard-created',
  handler: (message, context) => processor.processMessage(message, context),
});




