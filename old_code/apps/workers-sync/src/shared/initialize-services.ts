/**
 * Shared Service Initialization for Workers
 * 
 * Provides centralized service initialization for all worker apps.
 */

import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { MonitoringService } from '@castiel/monitoring';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { KeyVaultService } from '@castiel/key-vault';
import {
  SecureCredentialService,
  SyncTaskService,
  SyncTaskRepository,
  SyncExecutionRepository,
  SyncConflictRepository,
  ConversionSchemaRepository,
  ConversionSchemaService,
  ShardRepository,
  IntegrationAdapterRegistry,
  IntegrationShardService,
  IntegrationDeduplicationService,
  BidirectionalSyncEngine,
  ShardRelationshipService,
  IntegrationConnectionRepository,
  IntegrationRepository,
  IntegrationProviderRepository,
  IntegrationRateLimiter,
  WebhookManagementService,
} from '@castiel/api-core/workers-sync';
import { Redis } from 'ioredis';

export interface WorkerServicesConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  keyVaultUrl: string;
  redisUrl?: string;
}

export interface InitializedServices {
  cosmosClient: CosmosClient;
  monitoring: IMonitoringProvider;
  keyVaultService: KeyVaultService;
  secureCredentialService: SecureCredentialService;
  syncTaskService?: SyncTaskService;
  bidirectionalSyncEngine?: BidirectionalSyncEngine;
  integrationShardService?: IntegrationShardService;
  integrationRateLimiter?: IntegrationRateLimiter;
  webhookManagementService?: WebhookManagementService;
  integrationRepository?: IntegrationRepository;
  connectionRepository?: IntegrationConnectionRepository;
  redis?: Redis;
}

/**
 * Initialize all services required by workers
 */
export async function initializeServices(
  config: WorkerServicesConfig
): Promise<InitializedServices> {
  // Initialize Cosmos DB
  const cosmosClient = new CosmosClient({
    endpoint: config.cosmosEndpoint,
    key: config.cosmosKey,
  });

  const database = cosmosClient.database(config.databaseId);

  // Initialize Monitoring
  const monitoring = MonitoringService.initialize({
    enabled: process.env.MONITORING_ENABLED !== 'false',
    provider: (process.env.MONITORING_PROVIDER || 'application-insights') as 'application-insights' | 'mock',
    instrumentationKey: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || '',
    samplingRate: parseFloat(process.env.MONITORING_SAMPLING_RATE || '1.0'),
  });

  // Initialize Key Vault
  const credential = new DefaultAzureCredential();
  const keyVaultService = new KeyVaultService({
    vaultUrl: config.keyVaultUrl,
    useManagedIdentity: true,
    cacheTTL: 3600000,
  });

  // Initialize Redis (optional)
  let redis: Redis | undefined;
  if (config.redisUrl) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
    });
  }

  // Initialize Repositories
  const connectionRepository = new IntegrationConnectionRepository(
    cosmosClient,
    config.databaseId,
    'integration_connections'
  );
  const integrationRepository = new IntegrationRepository(
    cosmosClient,
    config.databaseId,
    'integrations'
  );
  const providerRepository = new IntegrationProviderRepository(
    cosmosClient,
    config.databaseId,
    'integration_providers'
  );
  const syncTaskRepository = new SyncTaskRepository(
    cosmosClient,
    config.databaseId,
    'sync_tasks'
  );
  const syncExecutionRepository = new SyncExecutionRepository(
    cosmosClient,
    config.databaseId,
    'sync_executions'
  );
  const syncConflictRepository = new SyncConflictRepository(
    cosmosClient,
    config.databaseId,
    'sync_conflicts'
  );
  const conversionSchemaRepository = new ConversionSchemaRepository(
    cosmosClient,
    config.databaseId,
    'conversion_schemas'
  );
  const shardRepository = new ShardRepository(monitoring);

  // Initialize Services
  const secureCredentialService = new SecureCredentialService({
    keyVault: keyVaultService,
    monitoring,
    connectionRepository,
    integrationRepository,
  });

  const conversionSchemaService = new ConversionSchemaService(
    conversionSchemaRepository,
    monitoring
  );

  const adapterRegistry = new IntegrationAdapterRegistry(monitoring);

  // Initialize ShardRelationshipService (required by IntegrationShardService)
  const relationshipService = new ShardRelationshipService(
    monitoring,
    shardRepository
  );

  const shardService = new IntegrationShardService(
    monitoring,
    shardRepository,
    relationshipService
  );

  const deduplicationService = new IntegrationDeduplicationService(
    monitoring,
    shardRepository
  );

  const bidirectionalSyncEngine = new BidirectionalSyncEngine(monitoring);

  // Initialize Sync Task Service
  const syncTaskService = new SyncTaskService({
    monitoring,
    redis,
    syncTaskRepository,
    syncExecutionRepository,
    syncConflictRepository,
    conversionSchemaRepository,
    conversionSchemaService,
    shardRepository,
    adapterRegistry,
    shardService,
    deduplicationService,
    bidirectionalSyncEngine,
    connectionRepository,
  });

  // Initialize Integration Rate Limiter (optional)
  let integrationRateLimiter: IntegrationRateLimiter | undefined;

  // Initialize Webhook Management Service (optional)
  let webhookManagementService: WebhookManagementService | undefined;
  const webhookUrl = process.env.WEBHOOK_BASE_URL;
  const eventGridTopicEndpoint = process.env.EVENTGRID_ENDPOINT;
  const eventGridAccessKey = process.env.EVENTGRID_KEY;
  
  if (webhookUrl && eventGridTopicEndpoint && eventGridAccessKey) {
    webhookManagementService = new WebhookManagementService({
      connectionRepository: connectionRepository,
      integrationRepository: providerRepository,
      syncTaskRepository: syncTaskRepository,
      monitoring,
      redis,
      webhookUrl,
      eventGridTopicEndpoint,
      eventGridAccessKey,
    });
  }

  return {
    cosmosClient,
    monitoring,
    keyVaultService,
    secureCredentialService,
    syncTaskService,
    bidirectionalSyncEngine,
    integrationShardService: shardService,
    integrationRateLimiter,
    webhookManagementService,
    integrationRepository,
    connectionRepository,
    redis,
  };
}



