/**
 * Collaboration Services Initialization
 * Initializes collaboration-related services (collaborative insights, sharing, memory)
 */

import type { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { getRouteRegistrationTracker } from '../../utils/route-registration-tracker.js';

export interface CollaborationServicesResult {
  collaborativeInsightsService?: any;
  memoryContextService?: any;
  memoryController?: any;
  sharingService?: any;
}

/**
 * Initialize collaboration services
 */
export async function initializeCollaborationServices(
  server: FastifyInstance,
  monitoring: IMonitoringProvider
): Promise<CollaborationServicesResult> {
  const tracker = getRouteRegistrationTracker();
  const result: CollaborationServicesResult = {};

  try {
    // Collaboration services are typically initialized in routes/index.ts
    // This module provides a structure for extracting collaboration service initialization
    result.collaborativeInsightsService = (server as any).collaborativeInsightsService;
    result.memoryContextService = (server as any).memoryContextService;
    result.memoryController = (server as any).memoryController;
    result.sharingService = (server as any).sharingService;

    if (result.collaborativeInsightsService || result.memoryContextService) {
      server.log.info('✅ Collaboration Services available');
    } else {
      server.log.warn('⚠️ Collaboration Services not fully initialized');
    }
  } catch (err) {
    server.log.warn({ err }, '⚠️ Collaboration Services initialization check failed');
  }

  return result;
}
