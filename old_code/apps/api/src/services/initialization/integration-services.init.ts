/**
 * Integration Services Initialization
 * Initializes integration-related services (adapters, sync, visibility)
 */

import type { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { getRouteRegistrationTracker } from '../../utils/route-registration-tracker.js';

export interface IntegrationServicesResult {
  integrationService?: any;
  adapterManager?: any;
  integrationSyncService?: any;
  integrationVisibilityService?: any;
  ssoTeamSyncService?: any;
}

/**
 * Initialize integration services
 */
export async function initializeIntegrationServices(
  server: FastifyInstance,
  monitoring: IMonitoringProvider
): Promise<IntegrationServicesResult> {
  const tracker = getRouteRegistrationTracker();
  const result: IntegrationServicesResult = {};

  try {
    // Integration services are typically initialized in routes/index.ts
    // This module provides a structure for extracting integration service initialization
    result.integrationService = (server as any).integrationService;
    result.adapterManager = (server as any).adapterManager;
    result.integrationSyncService = (server as any).integrationSyncService;
    result.integrationVisibilityService = (server as any).integrationVisibilityService;
    result.ssoTeamSyncService = (server as any).ssoTeamSyncService;

    if (result.integrationService) {
      server.log.info('✅ Integration Services available');
    } else {
      server.log.warn('⚠️ Integration Services not fully initialized');
    }
  } catch (err) {
    server.log.warn({ err }, '⚠️ Integration Services initialization check failed');
  }

  return result;
}
