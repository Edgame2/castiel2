/**
 * Infrastructure Services Initialization
 * Initializes infrastructure services (Redis, Cosmos DB, Blob Storage, Key Vault)
 * 
 * Note: Some infrastructure services are initialized in index.ts (main server startup).
 * This module provides a way to access and verify infrastructure services for route registration.
 */

import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../../config/env.js';
import { ServiceHealthTracker, extractErrorCode, extractDependencies } from '../../utils/service-health-tracker.js';

export interface InfrastructureServicesResult {
  redis?: Redis | null;
  cosmosClient?: any;
  cosmosDatabase?: any;
  cosmosContainer?: any;
  keyVaultService?: any;
  blobStorageService?: any;
  cacheService?: any;
  cacheSubscriber?: any;
  cacheManager?: any;
}

/**
 * Initialize or verify infrastructure services
 * Most infrastructure is initialized in index.ts, this verifies availability
 */
export async function initializeInfrastructureServices(
  server: FastifyInstance,
  redis: Redis | null,
  monitoring: IMonitoringProvider,
  serviceHealthTracker: ServiceHealthTracker
): Promise<InfrastructureServicesResult> {
  const result: InfrastructureServicesResult = {
    redis: redis || undefined,
  };

  try {
    // Get Redis from server if not passed
    if (!result.redis) {
      result.redis = (server as any).redisClient || (server as any).cache || null;
    }

    // Get Cosmos DB services from server (initialized in index.ts)
    result.cosmosClient = (server as any).cosmos || (server as any).cosmosClient;
    result.cosmosDatabase = (server as any).cosmosDatabase;
    result.cosmosContainer = (server as any).cosmosContainer;

    // Get cache services from server
    result.cacheService = (server as any).cache;
    result.cacheSubscriber = (server as any).cacheSubscriber;
    result.cacheManager = (server as any).cacheManager;

    // Get Key Vault service from server
    result.keyVaultService = (server as any).keyVaultService;

    // Get Blob Storage service from server (usually from document controller)
    const documentController = (server as any).documentController;
    result.blobStorageService = documentController?.blobStorageService;

    // Verify critical services
    if (result.cosmosClient || result.cosmosDatabase) {
      server.log.info('✅ Infrastructure services available');
      serviceHealthTracker.trackSuccess('Infrastructure Services', 'verification', ['CosmosDB']);
    } else {
      server.log.warn('⚠️ Infrastructure services not fully available');
      serviceHealthTracker.trackFailure({
        serviceName: 'Infrastructure Services',
        operation: 'verification',
        error: new Error('Cosmos DB not available'),
        criticality: 'critical',
        dependencies: extractDependencies(new Error('Cosmos DB not available'), { dependencies: ['CosmosDB'] }),
        errorCode: extractErrorCode(new Error('Cosmos DB not available')),
      });
    }

    if (result.redis) {
      serviceHealthTracker.trackSuccess('Infrastructure Services', 'verification', ['Redis']);
    } else {
      server.log.warn('⚠️ Redis not available - some features may be limited');
    }
  } catch (err) {
    server.log.warn({ err }, '⚠️ Infrastructure services verification failed');
    serviceHealthTracker.trackFailure({
      serviceName: 'Infrastructure Services',
      operation: 'verification',
      error: err,
      criticality: 'critical',
      dependencies: extractDependencies(err, { dependencies: ['CosmosDB', 'Redis'] }),
      errorCode: extractErrorCode(err),
    });
  }

  return result;
}
