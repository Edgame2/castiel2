/**
 * Data Services Initialization
 * Initializes data-related services (shards, repositories, relationships)
 */

import type { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { getRouteRegistrationTracker } from '../../utils/route-registration-tracker.js';

export interface DataServicesResult {
  shardRepository?: any;
  shardTypeRepository?: any;
  shardRelationshipService?: any;
  shardCacheService?: any;
  cacheSubscriberService?: any;
}

/**
 * Initialize data services
 * These services are typically initialized early and used by many other services
 */
export async function initializeDataServices(
  server: FastifyInstance,
  monitoring: IMonitoringProvider
): Promise<DataServicesResult> {
  const tracker = getRouteRegistrationTracker();
  const result: DataServicesResult = {};

  try {
    // Data services are typically initialized in routes/index.ts
    // This module provides a structure for extracting data service initialization
    result.shardRepository = (server as any).shardRepository;
    result.shardTypeRepository = (server as any).shardTypeRepository;
    result.shardRelationshipService = (server as any).shardRelationshipService;
    result.shardCacheService = (server as any).shardCacheService;
    result.cacheSubscriberService = (server as any).cacheSubscriberService;

    if (result.shardRepository) {
      server.log.info('✅ Data Services available');
    } else {
      server.log.warn('⚠️ Data Services not fully initialized');
    }
  } catch (err) {
    server.log.warn({ err }, '⚠️ Data Services initialization check failed');
  }

  return result;
}
